import { expect, test } from "vitest";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "./whatsapp";
import type { CartItem } from "./cartReducer";

const items: CartItem[] = [
  { name: "Mesa Urb", quantity: 2 },
  { name: "Luminária Lua", quantity: 1 },
];

const EXPECTED = `Olá! Meu nome é Maria e gostaria de solicitar um orçamento dos seguintes produtos do catálogo:

• Mesa Urb — Qtd: 2
• Luminária Lua — Qtd: 1

Total de itens: 3

Fico no aguardo. Obrigado(a)!`;

test("message matches the PT-BR format exactly", () => {
  expect(buildWhatsAppMessage("Maria", items)).toBe(EXPECTED);
});

test("customer name is trimmed", () => {
  expect(buildWhatsAppMessage("  Ana  ", items)).toContain("Meu nome é Ana e gostaria");
});

test("url targets the studio number with encoded text", () => {
  const url = buildWhatsAppUrl("Maria", items);
  expect(url.startsWith("https://wa.me/5531971803551?text=")).toBe(true);
  expect(url).toContain("%0A"); // newlines are encoded
  expect(decodeURIComponent(url.split("text=")[1])).toBe(EXPECTED);
});
