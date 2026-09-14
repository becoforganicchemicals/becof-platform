# Bug & UX Audit — Fix TODO

Generated from a full-app audit (3 parallel code-review passes + a live crawl of
every public page at desktop/mobile). Highest-severity items were independently
re-verified against the actual code before landing here. Fixing top-down,
critical first, one at a time — each item gets checked off as it's completed
and shipped.

## Critical — silently defeats a whole feature, or can crash a page

- [x] 1. Referral program never actually attributes signups — `SignIn.tsx` only
      resolves the referral code inside `if (!existingProfile)`, but the DB's
      auto-create-profile trigger already runs during `signUp()`, so that
      branch essentially never executes. **Fixed**: referral resolution now
      runs unconditionally and UPDATEs the trigger-created profile row
      instead of being bundled into an INSERT that rarely ran.
- [x] 2. Wishlist can crash — `Wishlist.tsx` doesn't null-check the joined
      `product`. Products auto-unpublish at 0 stock, which makes the embedded
      product come back `null` under RLS for a regular user, and the page
      throws on `item.product.slug`. **Fixed**: rows with a null product are
      filtered out after fetch, same convention as `CartContext`.
- [x] 3. Admin: duplicate React Query cache key — `AdminCareers.tsx` and
      `AdminPartners.tsx` both use `queryKey: ["admin-applications"]` for two
      different tables; switching tabs can render one page with the other's
      cached, wrong-shaped data. **Fixed**: renamed to
      `admin-career-applications` / `admin-partner-applications`.

## High — real money/data risk, not crash-level

- [x] 4. Loyalty points + coupon usage are consumed at order *creation*, not
      order *payment* — `Checkout.tsx` burns both before the M-Pesa prompt
      even fires. Abandoned/failed payments still cost the customer points and
      burn the coupon slot. Also has a TOCTOU race on `max_uses`. **Fixed**:
      moved both side effects out of Checkout.tsx entirely, into
      `mpesa-callback` and `mpesa-stk-query` — applied exactly once, at the
      moment `payment_status` actually transitions to `paid`, via an atomic
      conditional update (`.neq("payment_status","paid")`) so a Safaricom
      callback retry or a race between the webhook and the manual admin
      reconciliation path can't double-apply either one. Points redemption
      re-validates the balance at that point and skips (logs, doesn't block
      the payment) if it's no longer sufficient. The pre-existing
      `redeem-points` edge function is now unused (Checkout.tsx no longer
      calls it) — left deployed rather than removed, since deleting it isn't
      necessary to fix the bug and touching deployment state is out of scope
      here.
- [x] 5. No confirmation before promoting a user to `super_admin` —
      `AdminUsers.tsx` role dropdown fires the mutation on first click.
      **Fixed**: a native `confirm()` (matching the codebase's existing
      delete-confirmation convention) now gates specifically the transition
      to `super_admin` — other role changes are unaffected.
- [x] 6. Multiple admin pages don't check `.error` after Supabase calls, so a
      failed mutation still shows a success toast — `AdminInbox.tsx`,
      `AdminPartners.tsx`, `AdminImpact.tsx`, `AdminNotifications.tsx`,
      `AdminProducts.tsx` (delete/toggle). **Fixed**: every write now checks
      `error`, throws (React Query mutations) or early-returns with a
      destructive-variant toast (plain async handlers), instead of silently
      proceeding to a false "success" state.
- [x] 7. Homepage "Add to Cart" widgets skip the stock check `/products`
      enforces — `HeroSection.tsx`, `FeaturedProducts.tsx` don't fetch
      `stock_quantity`, so Add is always clickable even when out of stock.
      **Fixed**: both now fetch `stock_quantity` and show an "Out of Stock"
      badge/label with the Add button hidden, matching `Products.tsx`'s
      existing convention. (In practice this mainly protects a brand-new
      product created with 0 stock from the start — the existing
      auto-unpublish trigger already excludes anything that goes out of stock
      later, since these queries filter `is_published = true`.)
- [x] 8. "Start New Order" on the pending-order banner doesn't cancel the
      original order — `PendingOrderBanner.tsx` only hides it locally; a late
      M-Pesa confirmation on the original can mean paying for two orders.
      **Fixed**: now actually sets the abandoned order's `status` to
      `cancelled` server-side before dismissing, so it's genuinely cancelled
      rather than silently orphaned.

## Medium

- [ ] 9. `Partners.tsx` — "Kisumu" listed twice in the `COUNTIES` array
      (confirmed live via a React duplicate-key console warning).
- [ ] 10. Profile edits (name/avatar) don't propagate to `AuthContext` — navbar
       shows stale name/photo until a hard refresh.
- [ ] 11. `AdminAnalytics.tsx` "Total Revenue" KPI sums all orders including
       cancelled/refunded ones; only the sub-label is correctly filtered.
- [ ] 12. `Cart.tsx`, `Checkout.tsx`, `Wishlist.tsx`, `CustomOrder.tsx` flash a
       "please sign in" wall on hard refresh for already-logged-in users —
       they check `user` but not `AuthContext`'s `loading` flag first.
- [ ] 13. `ProductDetail.tsx` doesn't reset `selectedImage`/`quantity` when
       navigating between two different products.
- [ ] 14. Order status changes to `cancelled`/`refunded` in `AdminOrders.tsx`
       fire immediately on dropdown selection with no confirmation, despite
       triggering a customer email.
- [ ] 15. `AuthContext.tsx` role/profile fetches aren't cancelled on rapid
       sign-out/sign-in — a slow in-flight fetch can overwrite the new
       session's state with the previous user's data.

## Lower priority / polish

- [ ] 16. `AdminAffiliates.tsx` approve-flow skips the 0–50% commission-rate
       validation `updateRateMutation` has (DB `CHECK` constraint prevents
       actual corruption, but produces a raw Postgres error instead of a
       clean message).
- [ ] 17. `TestimonialForm.tsx` only checks the single most-recent submission,
       which can block leaving a testimonial for a second product.
- [ ] 18. `LearnDetail.tsx` renders article HTML via `dangerouslySetInnerHTML`
       with no sanitization — fine while only admins author content, a real
       risk if that ever changes.
- [ ] 19. Permission grants/revokes in `AdminPermissions.tsx` aren't
       audit-logged, unlike every other admin mutation.
- [ ] 20. M-Pesa phone number at checkout has no format validation before the
       STK push call — bad input just produces a generic failure toast.

---

**Working rule for this pass:** fix top-down, verify each with `tsc --noEmit` +
`npm run build` at minimum, browser-verify anything UI-visible, never touch
files outside what a given fix requires, and commit+push each fix (or tightly
related group) separately rather than batching unrelated changes together.
