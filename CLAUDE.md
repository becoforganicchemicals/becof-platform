# Becof web app — rules for contributors and AI assistants

## Layout width: every section matches the navbar and footer

The navbar and footer use Tailwind's `container` (see `tailwind.config.ts`: centred, `2rem`
side padding, max `1400px`). **Every page, section and component must use exactly that width**,
so its left and right edges line up with the logo and the "Shop Now" button in the navbar.

**Do**
- Wrap each section's content in `<div className="container">` — nothing more, nothing less.
- Put full-bleed backgrounds on the `<section>` and the `container` inside it:
  `<section className="py-16 bg-muted/30"><div className="container">…</div></section>`.
- Fill the width with columns rather than narrowing. Reading-heavy pages use a main column plus
  a sidebar — e.g. the Learn article (`lg:grid-cols-[minmax(0,1fr)_20rem]`) and the FAQ
  (category sidebar). Grids of cards span the full container.
- Add `min-w-0` to grid/flex columns that hold long content, or the page overflows sideways on
  phones.

**Don't**
- `container max-w-3xl` (or any `max-w-*` on a container).
- `max-w-* mx-auto` wrappers around sections, grids, card lists, forms, articles or calculators.
- A `container` inside another `container`, or `<section>`s nested inside another section's
  container (it double-indents the content and clips the backgrounds).
- Custom `px-*` / `max-w-*` page wrappers instead of `container`.

**The only allowed exceptions**
1. Line length of an intro paragraph or heading block under a centred section heading
   (`max-w-2xl` / `max-w-3xl` on the text element only — the section stays full width).
2. A single form control, such as the FAQ search box.
3. Small single-task cards, centred: sign-in, the M-Pesa payment step, order confirmation,
   application status lookup, password setup, and the empty-cart banner.

**How to check:** view the page at 1440 px wide. The outermost content edges of every section
should line up with the navbar's logo (left) and "Shop Now" button (right), and at 390 px wide
nothing should scroll sideways.
