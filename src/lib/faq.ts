// Frequently asked questions — shown on /faq, emitted as FAQPage structured
// data, and published in llms.txt. Answers are plain text so every channel
// can use them as-is. Keep claims to what Becof has confirmed: product labels,
// the approved crop programmes, delivery and return terms.

import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, formatKes } from "@/lib/delivery";
import { LITRES_PER_ACRE, WATER_LITRES_PER_ACRE } from "@/lib/packs";

export interface Faq {
  question: string;
  answer: string;
  link?: { to: string; label: string };
}

export const FAQS: Faq[] = [
  {
    question: "Are Becof products suitable for organic farming?",
    answer:
      "Yes. All Becof products are 100% natural, made from beneficial microorganisms, and formulated for organic farming systems.",
  },
  {
    question: "How do I choose the right product for my crop?",
    answer:
      "Start with what your crop needs. NitroFix™ supplies natural nitrogen for strong leaf and stem growth (maize, beans and vegetables). RootMax™ builds stronger roots and better nutrient uptake (vegetables, fruits and cereals). TrichoShield™ protects roots from soil-borne disease (all crops). SoilFix™ rebuilds soil health and stabilises pH (all crops). Our crop guides for maize, potatoes and vegetables set out exactly which products to use and when.",
    link: { to: "/crops", label: "See the crop guides" },
  },
  {
    question: "What are the benefits of using Becof products?",
    answer:
      "Becof biofertilizers work with the living soil instead of against it. They supply natural nitrogen and reduce your dependence on synthetic nitrogen fertilizer over time, build stronger roots that take up nutrients better, protect roots from soil-borne disease as a biological alternative to chemical fungicides, and improve soil health by stabilising pH and electrical conductivity. All are 100% natural and suited to organic farming.",
  },
  {
    question: "How much do I need per acre?",
    answer: `Each application is ${LITRES_PER_ACRE} litres per acre, mixed with ${WATER_LITRES_PER_ACRE} litres of water. Most crops get 2 applications per season, so a 5-acre farm needs about 20 litres of each product for the season. The calculator on every product page and crop guide works out the exact amount and the best-value packs for your farm size.`,
  },
  {
    question: "What pack sizes are available?",
    answer:
      "Every product comes in 1 L, 5 L, 10 L, 20 L and 50 L packs. Larger packs cost less per litre: KES 2,800 per litre from 5 L upwards for NitroFix™, TrichoShield™ and RootMax™ (KES 2,950 for 1 L), and KES 2,500 per litre for SoilFix™ (KES 2,650 for 1 L). Choose the size on the product page.",
  },
  {
    question: "When should I apply the products?",
    answer:
      "Apply at planting or transplanting, then repeat during the season — usually 3 to 6 weeks later depending on the crop and product. Each crop guide lists the exact timing for maize, potatoes and vegetables.",
    link: { to: "/crops", label: "See application timing by crop" },
  },
  {
    question: "How do I store the products?",
    answer:
      "Becof products contain live beneficial microorganisms. Store them in a cool, shaded place and mix each dose with clean water on the day you apply it.",
  },
  {
    question: "How much does delivery cost?",
    answer: `Delivery anywhere in Kenya is a flat ${formatKes(DELIVERY_FEE)} per order, and free on orders of ${formatKes(FREE_DELIVERY_THRESHOLD)} or more. The fee is added at checkout and paid together with your order.`,
  },
  {
    question: "How do I pay?",
    answer:
      "Pay securely with M-Pesa at checkout: we send a payment request to your phone, and your order is confirmed as soon as you enter your PIN.",
  },
  {
    question: "What if my order arrives damaged?",
    answer:
      "Because our products contain live microorganisms, we can't accept returns. But if an order arrives leaking or damaged, with a broken seal, the wrong product, or past its expiry date, contact us within 72 hours of delivery with your order number, photos and the batch number from the label, and we'll replace it or refund you.",
    link: { to: "/legal/terms#returns", label: "Read the full returns policy" },
  },
  {
    question: "I need more than 50 litres. How do I order?",
    answer:
      "Add as many packs as you need to your cart — for example two 50 L packs for 100 litres. For very large or recurring orders, contact us on WhatsApp or use the custom order form and our team will arrange it with you.",
    link: { to: "/contact", label: "Contact us" },
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
