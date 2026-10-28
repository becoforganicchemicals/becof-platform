// Frequently asked questions — shown on /faq, emitted as FAQPage structured
// data, and published in llms.txt. Answers are plain text so every channel
// can use them as-is. Keep claims to what Becof has confirmed: product labels,
// the approved crop programmes and handling notes, delivery and return terms.

import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, formatKes } from "@/lib/delivery";
import { cropNamesList } from "@/lib/cropProgrammes";

export const FAQ_CATEGORIES = [
  { id: "products", title: "Products & organic farming" },
  { id: "using", title: "Using the products" },
  { id: "ordering", title: "Ordering & delivery" },
  { id: "returns", title: "Returns" },
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]["id"];

export interface Faq {
  question: string;
  answer: string;
  category?: FaqCategory;
  link?: { to: string; label: string };
}

export const FAQS: Faq[] = [
  // ── Products & organic farming ──
  {
    category: "products",
    question: "Are Becof products suitable for organic farming?",
    answer:
      "Yes. Becof's biofertilizers — NitroFix™, RootMax™, TrichoShield™ and SoilFix™ — are 100% natural, made from beneficial microorganisms, and formulated for organic farming systems. NeemShield™ is a botanical product made from neem oil.",
  },
  {
    category: "products",
    question: "Are Becof products registered with Kenya's regulators?",
    answer:
      "Becof Organic Chemicals Limited is a registered Kenyan company, and we are committed to meeting every regulatory requirement for our products. We are completing product registration with Kenya's regulators, including the Pest Control Products Board (PCPB) for our biopesticides, NeemShield™ and TrichoShield™. Registration numbers will appear on each product page and label as they are issued. Questions about any product? Email info@becoforganic.com or call +254 735 283 397.",
  },
  {
    category: "products",
    question: "How do I choose the right product for my crop?",
    answer: `Start with what your crop needs. NitroFix™ is a rhizobium seed inoculant that lets dry beans and kidney beans make their own nitrogen. RootMax™ is a mycorrhiza granule that builds a stronger root system for better water and nutrient uptake (all crops). TrichoShield™ protects roots from soil-borne fungal disease. SoilFix™ revitalizes degraded soil and stabilizes pH and EC. NeemShield™ is a botanical insecticide, miticide and nematicide for pests such as whitefly, aphids, thrips and spider mites. Our crop guides for ${cropNamesList()} set out exactly which products to use and when.`,
    link: { to: "/crops", label: "See the crop guides" },
  },
  {
    category: "products",
    question: "What are the benefits of using Becof products?",
    answer:
      "Becof products work with the living soil instead of against it. NitroFix™ lets beans fix their own nitrogen from the air, cutting top-dressing costs. RootMax™ grows a stronger root system that takes up more water and nutrients and resists drought. TrichoShield™ protects roots from soil-borne fungal disease as a biological alternative to chemical fungicides, with a zero pre-harvest interval. SoilFix™ revitalizes degraded soils and stabilizes pH and EC. NeemShield™ controls a wide range of pests with neem's natural compounds.",
  },
  {
    // States prices — update this answer whenever pack prices change in the admin.
    category: "products",
    question: "What pack sizes are available?",
    answer:
      "NeemShield™ 1 L — KES 2,325. RootMax™ 1 kg — KES 2,100, or 5 kg — KES 10,000. NitroFix™ 100 g (with 30 g gum arabic adhesive) — KES 1,950. TrichoShield™ 1 kg — KES 3,200. SoilFix™ 1 L — KES 2,200.",
    link: { to: "/products", label: "Shop products" },
  },

  // ── Using the products ──
  {
    category: "using",
    question: "How much do I need per acre?",
    answer: `It depends on the product. NitroFix™: one 100 g pack coats the seed for one acre. RootMax™: 1–2 kg per acre for maize and other cereals, 4–5 kg per acre for beans, vegetables and other crops. TrichoShield™: about 400 g per acre as a drench. NeemShield™: about 1.2 L per acre as a foliar spray, or 2–3.2 L per acre as a drench. SoilFix™: 1 L in 1,000 L of water as a drench, or 10 ml in 20 L as a foliar spray. The calculator on every product page and crop guide works out the exact amount and the best-value packs for your farm size.`,
  },
  {
    category: "using",
    question: "When should I apply the products?",
    answer: `Apply at planting or transplanting, then repeat during the season — usually 3 to 6 weeks later depending on the crop and product. Each crop guide lists the exact timing for ${cropNamesList()}.`,
    link: { to: "/crops", label: "See application timing by crop" },
  },
  {
    category: "using",
    question: "How do I mix and apply the products?",
    answer:
      "Use clean, non-chlorinated water — chlorine kills live organisms. NitroFix™ is coated onto bean seed with the gum arabic adhesive included in the pack, then planted within 4 hours. RootMax™ granules go in at planting, mixed with your planting fertilizer. TrichoShield™ is mixed with water and applied to moist soil as a drench, drip or root dip. For NeemShield™, add water to the product (not the product to water) and stir to a good emulsion. Each product page has full step-by-step directions.",
  },
  {
    category: "using",
    question: "Can I use TrichoShield™ with chemical fungicides?",
    answer:
      "Not at the same time. TrichoShield™ contains a living beneficial fungus, and chemical fungicides, harsh chemicals and fumigants will kill it. It is compatible with fertilizers, organic fertilizers and biostimulants.",
  },
  {
    category: "using",
    question: "How do I store the products?",
    answer:
      "Store all Becof products in a cool, dry place away from direct sunlight. NitroFix™ contains live bacteria: keep unopened packs below 25°C, and use a whole pack once it is opened.",
  },

  // ── Ordering & delivery ──
  {
    category: "ordering",
    question: "How much does delivery cost?",
    answer: `Delivery anywhere in Kenya is a flat ${formatKes(DELIVERY_FEE)} per order, and free on orders of ${formatKes(FREE_DELIVERY_THRESHOLD)} or more. The fee is added at checkout and paid together with your order.`,
  },
  {
    category: "ordering",
    question: "How do I pay?",
    answer:
      "Pay securely with M-Pesa at checkout: we send a payment request to your phone, and your order is confirmed as soon as you enter your PIN.",
  },
  {
    category: "ordering",
    question: "I need a large quantity. How do I order?",
    answer:
      "Add as many packs as you need to your cart — the calculator on each product page and crop guide adds the right number for your farm in one click. For very large or recurring orders, contact us on WhatsApp or use the custom order form and our team will arrange it with you.",
    link: { to: "/contact", label: "Contact us" },
  },

  // ── Returns ──
  {
    category: "returns",
    question: "What if my order arrives damaged?",
    answer:
      "Because our products contain live microorganisms, we can't accept returns. But if an order arrives leaking or damaged, with a broken seal, the wrong product, or past its expiry date, contact us within 72 hours of delivery with your order number, photos and the batch number from the label, and we'll replace it or refund you.",
    link: { to: "/legal/terms#returns", label: "Read the full returns policy" },
  },
];

export const faqSchema = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
});
