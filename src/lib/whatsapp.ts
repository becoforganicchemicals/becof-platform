export const WHATSAPP_NUMBER = "254735283397";

export const WHATSAPP_DEFAULT_MESSAGE =
  "Hi Becof Organic Chemicals! I'd like to know more about your products.";

export const buildWhatsAppLink = (message: string = WHATSAPP_DEFAULT_MESSAGE) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
