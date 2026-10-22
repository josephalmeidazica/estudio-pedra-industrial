import { whatsappUrl } from "@/lib/whatsapp";
import type { MessageLine } from "./resolve";
import { deadlineLabel, type Customer } from "./storage";

export function buildWhatsAppMessage(customer: Customer, lines: MessageLine[]): string {
  const name = customer.name.trim();
  const bairro = customer.bairro.trim();
  const body = lines
    .map((l) => {
      const head = `• ${l.name} — Qtd: ${l.quantity}`;
      const detail = l.note !== undefined ? `  Descrição: ${l.note}` : l.url ? `  ${l.url}` : null;
      return detail ? `${head}\n${detail}` : head;
    })
    .join("\n");
  const total = lines.reduce((sum, l) => sum + l.quantity, 0);
  const measurements = customer.measurements?.trim();
  const when = customer.deadline ? deadlineLabel(customer.deadline) : null;
  const extras = [
    measurements ? `Medidas aproximadas: ${measurements}` : null,
    when ? `Para quando: ${when}` : null,
  ].filter((l): l is string => l !== null);
  return (
    `Olá! Meu nome é ${name} e moro no bairro ${bairro}. Gostaria de um orçamento dos seguintes produtos do catálogo:\n\n` +
    `${body}\n\n` +
    (extras.length > 0 ? `${extras.join("\n")}\n\n` : "") +
    `Total de itens: ${total}\n\n` +
    `Fico no aguardo. Obrigado(a)!`
  );
}

export function buildWhatsAppUrl(customer: Customer, lines: MessageLine[]): string {
  return whatsappUrl(buildWhatsAppMessage(customer, lines));
}
