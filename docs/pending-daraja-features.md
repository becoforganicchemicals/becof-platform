# Pending Safaricom Daraja Features

Three M-Pesa/Daraja features were scoped but not built. This doc is the reference
to pick back up from once the credential blocker (shared by two of the three) is
resolved with Safaricom support.

| # | Feature | Status | Blocked on |
|---|---------|--------|------------|
| 1 | Dynamic QR Code | Unblocked — not yet built | Nothing. Can be built with existing credentials. |
| 2 | Transaction Status | Blocked | `DARAJA_INITIATOR_NAME` + `DARAJA_SECURITY_CREDENTIAL` |
| 3 | Reversal | Blocked | `DARAJA_INITIATOR_NAME` + `DARAJA_SECURITY_CREDENTIAL` (same credential as #2) |

The app already has working Daraja integration for **STK Push** (customer-initiated
payment, `mpesa-stk-push` / `mpesa-callback` / `mpesa-stk-query`). These three are
additive, separate API products on top of that.

---

## 1. Dynamic QR Code

**What it does:** Generates a scannable QR code that pre-fills a PayBill number,
amount, and account reference into whoever scans it's M-Pesa app — they confirm
with their PIN, no manual entry.

**Why it isn't wired into checkout:** QR-code payments route through M-Pesa's
regular **C2B PayBill** rails. Becof's Daraja app has STK Push, QR, Transaction
Status, and Reversal registered — **not C2B validation/confirmation URLs**. That
means a QR-initiated payment has no automatic webhook telling Becof it succeeded,
unlike STK Push (which has its own dedicated `mpesa-callback`). Wiring QR into
self-serve checkout would mean customers pay but see no confirmation — worse UX
than the already-reliable STK flow.

**Planned implementation:** Build as an **admin tool**, not a customer checkout
option:
- New edge function `mpesa-qr-generate` (admin-only, mirrors the auth pattern in
  `mpesa-stk-query` — verifies caller is admin via `is_admin_or_super()` RPC).
- Calls `POST https://api.safaricom.co.ke/mpesa/qrcode/v1/generate` with
  `MerchantName`, `RefNo` (order reference), `Amount`, `TrxCode: "PB"`,
  `CPI: <DARAJA_SHORTCODE>`, `Size: "300"`. Returns a base64 QR image.
- In Admin → Orders, add a "Generate Payment QR" button next to the existing
  "Check M-Pesa Status" button. Opens a dialog showing the QR code, for the admin
  to send to a customer via WhatsApp/in person — e.g. phone orders, walk-ins, or
  when STK push keeps failing for someone.
- Since there's no auto-confirmation, the admin still marks the order paid
  manually (same as any manual reconciliation today) once they see the M-Pesa
  receipt.
- Credentials needed: none beyond what's already set (`DARAJA_CONSUMER_KEY`,
  `DARAJA_CONSUMER_SECRET`, `DARAJA_SHORTCODE`).

*If auto-confirming QR payments is wanted later, the real fix is registering C2B
validation/confirmation URLs with Safaricom — a separate, fairly small addition.*

---

## 2. Transaction Status

**What it does:** Given any M-Pesa transaction/receipt number, ask Safaricom for
that transaction's full status and details. Useful when a customer says "I paid,
here's my receipt" but the order shows unpaid — or any general reconciliation
lookup not tied to a specific pending order.

**Planned implementation (once credentials are in hand):**
- New edge function `mpesa-transaction-status` (admin-only). Two parts, since
  this Daraja API is asynchronous — the initial call only acknowledges receipt;
  the real result arrives later via a callback:
  - **Initiate**: `POST /mpesa/transactionstatus/v1/query` with `Initiator`,
    `SecurityCredential`, `CommandID: "TransactionStatusQuery"`, `TransactionID`
    (the receipt number being looked up), `PartyA` (shortcode), `IdentifierType`,
    `ResultURL`, `QueueTimeOutURL`, `Remarks`, `Occasion`.
  - **Callback**: a second function (`mpesa-transaction-status-callback`,
    `verify_jwt = false` in `supabase/config.toml`, same posture as
    `mpesa-callback`) receives Safaricom's async result.
- New table `mpesa_transaction_queries` (transaction_id, order_id nullable,
  status: `pending`/`resolved`, result_code, result_desc, raw_result jsonb,
  created_at) so the admin panel can show "pending → resolved" rather than a
  request that just hangs.
- UI: a "Look Up Transaction" tool in Admin → Orders — enter a receipt number,
  see the query land as pending, then resolve once the callback fires (React
  Query polling while any row is pending is enough — no need for realtime
  subscriptions).

---

## 3. Reversal

**What it does:** Actually sends money back to a customer's M-Pesa, reversing a
completed transaction — real refund automation instead of what happens today
(admin just flips the order's status label to "refunded"; no money actually
moves through the platform).

**Planned implementation (once credentials are in hand):**
- New edge function `mpesa-reversal` (admin-only). Same async shape as
  Transaction Status:
  - **Initiate**: `POST /mpesa/reversal/v1/request` with `Initiator`,
    `SecurityCredential`, `CommandID: "TransactionReversal"`, `TransactionID`
    (the order's `mpesa_receipt_number`), `Amount`, `ReceiverParty` (shortcode),
    `RecieverIdentifierType`, `ResultURL`, `QueueTimeOutURL`, `Remarks`,
    `Occasion`.
  - **Callback**: `mpesa-reversal-callback` (`verify_jwt = false`), receives the
    async result and only then updates the order.
- In `AdminOrders.tsx`, add a "Refund via M-Pesa" action next to the order
  status control. When an admin refunds an order, this triggers the real
  reversal instead of (or alongside) manually setting `status = 'refunded'`.
  `payment_status` only flips once Safaricom's callback actually confirms
  success — not the moment the button is clicked.
- Ties into the affiliate program: `award_affiliate_commission()` already voids
  a commission when an order's status becomes `cancelled`/`refunded` (see
  `supabase/migrations/20260911230016_*.sql`) — real Reversal support closes the
  loop so that status change reflects money that actually moved back, not just a
  label.

---

## Credential Setup — Progress So Far

Both #2 and #3 need the same credential pair, set as Supabase Edge Function
secrets (same place `DARAJA_CONSUMER_KEY` etc. already live):

- `DARAJA_INITIATOR_NAME`
- `DARAJA_SECURITY_CREDENTIAL`

### What's done

1. Logged into the M-PESA Organization Portal (`org.ke.m-pesa.com`) as the
   BECOF ORGANIC Business Administrator.
2. Added the "Organization Operator" service tile via **Home → Click to Add
   Service → checked "Organization Operator" → Confirm**.
3. Went to **Organization Operator → Operator List → + Create**.
4. Filled in the Create Organization Operator form:
   - Organization Short Code: `4325773` (auto-filled)
   - Access Channel: **API**
   - Rule Profile: **Default Assistant Rules**
   - Roles assigned: **Transaction Status query ORG API** + **Org Reversals
     Initiator** (deliberately excluded all B2C-related roles — not needed)
   - Username: **`BECOF.API.OPERATOR`** — this is the value for
     `DARAJA_INITIATOR_NAME` once live.
   - KYC/personal details: filled with the account holder's info.
5. Submitted successfully. The operator now appears in the Operator List with
   **Identity Status: Pending Active**.

### Where we got stuck

On the operator's detail page, both **"Set Password"** and **"Create Task"**
buttons are greyed out / unclickable. This blocks setting the operator's
password, which is required before it can be encrypted into a
`DARAJA_SECURITY_CREDENTIAL`.

Things already ruled out:
- The logged-in Business Administrator's own operator row has no "Detail" link
  (it's the org's root identity, not a regular operator record) — so granting
  ourselves "Manage Org Initiator Passwords" / "Set Restricted ORG API
  PASSWORD" the same way isn't possible through this screen.
- Neither "Set Password" nor "Create Task" become clickable on the new
  operator's own detail page.

Still worth checking before calling support:
- **My Tasks** (left nav item from the portal's main Home screen) — operator
  creation may have generated a pending approval task that needs clearing
  first.
- A hard refresh / re-login, in case the portal cached stale permission state.

### What to ask Safaricom support

> We created an API operator (`BECOF.API.OPERATOR`, org shortcode `4325773`)
> with the "Transaction Status query ORG API" and "Org Reversals Initiator"
> roles. Its Identity Status shows "Pending Active" and both "Set Password" and
> "Create Task" are greyed out on its detail page. What activates it / lets us
> set its password?

Once the password is set, the remaining step is entirely local and doesn't need
Safaricom's help:

### Part 4 — Encrypt the password (do this locally, once unblocked)

Download the **production** public certificate (`ProductionCertificate.cer`) —
look under **Go Live** or the Reversal/Transaction Status API docs pages on
`developer.safaricom.co.ke`, or check the original "you made it live" onboarding
email from Safaricom if it's not obviously placed in the portal.

```bash
echo -n "YourInitiatorPassword" > password.txt
openssl rsautl -encrypt -certin -inkey ProductionCertificate.cer -in password.txt | base64 > security_credential.txt
```

If `rsautl` is deprecated on your OpenSSL version:

```bash
openssl pkeyutl -encrypt -certin -inkey ProductionCertificate.cer -in password.txt -pkeyopt rsa_padding_mode:pkcs1 | base64 > security_credential.txt
```

The contents of `security_credential.txt` is `DARAJA_SECURITY_CREDENTIAL`. Set
it and `DARAJA_INITIATOR_NAME=BECOF.API.OPERATOR` as Supabase Edge Function
secrets, then come back — Transaction Status and Reversal can both be built
against them.
