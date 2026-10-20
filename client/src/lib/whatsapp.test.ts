import { expect, test } from "vitest";
import { GENERIC_QUOTE_MESSAGE, WHATSAPP_LINK, productQuoteMessage, whatsappUrl } from "./whatsapp";

test("bare link and generic message target the studio number", () => {
  expect(WHATSAPP_LINK).toBe("https://wa.me/5531971803551");
  expect(whatsappUrl(GENERIC_QUOTE_MESSAGE)).toBe(
    "https://wa.me/5531971803551?text=" + encodeURIComponent(GENERIC_QUOTE_MESSAGE)
  );
  expect(GENERIC_QUOTE_MESSAGE).toBe(
    "Olá! Vim pelo site do Estúdio Pedra Industrial e gostaria de um orçamento."
  );
});

test("product quote message names the product and links the catalog", () => {
  const msg = productQuoteMessage("Mesa Urb", "https://example.com/catalogo");
  expect(msg).toBe(
    "Olá! Tenho interesse no produto *Mesa Urb* do catálogo do Estúdio Pedra Industrial e gostaria de um orçamento.\n\nhttps://example.com/catalogo"
  );
});

test("special characters in product names survive the URL round-trip", () => {
  const msg = productQuoteMessage("Mesa & Banco Ñ #2", "https://x.y/catalogo");
  const url = whatsappUrl(msg);
  expect(url).toContain("%0A");
  expect(decodeURIComponent(url.split("text=")[1])).toBe(msg);
});
