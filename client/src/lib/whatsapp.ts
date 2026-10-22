import { WHATSAPP_NUMBER } from "@/config";

/** Bare chat link with no pre-filled text. */
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

/** Chat link that opens WhatsApp with `text` pre-filled. */
export function whatsappUrl(text: string): string {
  return `${WHATSAPP_LINK}?text=${encodeURIComponent(text)}`;
}

/** Default greeting used by the header button and the floating button. */
export const GENERIC_QUOTE_MESSAGE =
  "Olá! Vim pelo site do Estúdio Pedra Industrial e gostaria de um orçamento.";

/** Opens WhatsApp asking for the PDF catalogue. */
export const CATALOG_MESSAGE = "Olá! Gostaria de receber o catálogo em PDF do Estúdio Pedra Industrial.";

/** One-tap quote for a single product. `catalogUrl` is absolute. */
export function productQuoteMessage(productName: string, catalogUrl: string): string {
  return (
    `Olá! Tenho interesse no produto *${productName}* do catálogo do Estúdio Pedra Industrial e gostaria de um orçamento.\n\n` +
    catalogUrl
  );
}

export function openWhatsApp(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
