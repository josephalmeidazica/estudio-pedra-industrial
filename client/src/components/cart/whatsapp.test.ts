import { expect, test } from "vitest";
import type { MessageLine } from "./resolve";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "./whatsapp";

const EXPECTED = `Olá! Meu nome é Maria e moro no bairro Savassi. Gostaria de um orçamento dos seguintes produtos do catálogo:

• Mesa Urb — Qtd: 2
  https://x.y/catalogo/mesa-urb
• Móvel personalizado — Qtd: 1
  Descrição: mesa de jantar 2 m

Total de itens: 3

Fico no aguardo. Obrigado(a)!`;

const lines: MessageLine[] = [
  { name: "Mesa Urb", quantity: 2, url: "https://x.y/catalogo/mesa-urb" },
  { name: "Móvel personalizado", quantity: 1, note: "mesa de jantar 2 m" },
];

test("message matches the PT-BR format exactly and trims the customer fields", () => {
  expect(buildWhatsAppMessage({ name: "  Maria ", bairro: " Savassi " }, lines)).toBe(EXPECTED);
});

test("url targets the studio number with encoded text", () => {
  const url = buildWhatsAppUrl({ name: "Maria", bairro: "Savassi" }, lines);
  expect(url.startsWith("https://wa.me/5531971803551?text=")).toBe(true);
  expect(decodeURIComponent(url.split("text=")[1])).toBe(EXPECTED);
});
