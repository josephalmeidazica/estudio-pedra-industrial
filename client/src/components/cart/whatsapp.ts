import { WHATSAPP_NUMBER } from "@/config";
import { totalCount, type CartItem } from "./cartReducer";

export function buildWhatsAppMessage(customerName: string, items: CartItem[]): string {
  const name = customerName.trim();
  const lines = items.map((i) => `• ${i.name} — Qtd: ${i.quantity}`).join("\n");
  return (
    `Olá! Meu nome é ${name} e gostaria de solicitar um orçamento dos seguintes produtos do catálogo:\n\n` +
    `${lines}\n\n` +
    `Total de itens: ${totalCount(items)}\n\n` +
    `Fico no aguardo. Obrigado(a)!`
  );
}

export function buildWhatsAppUrl(customerName: string, items: CartItem[]): string {
  const text = encodeURIComponent(buildWhatsAppMessage(customerName, items));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
