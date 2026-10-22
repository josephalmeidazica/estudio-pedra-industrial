import { expect, test } from "vitest";
import { DEFAULT_DESCRIPTION, descriptions, firstSentence, titles, truncateAtWord } from "./seo-text";

test("titles follow the spec table", () => {
  expect(titles.home()).toBe("Estúdio Pedra Industrial — Móveis industriais sob medida em Belo Horizonte");
  expect(titles.catalog()).toBe("Portfólio — Estúdio Pedra Industrial");
  expect(titles.category("Mesas")).toBe("Mesas — Portfólio | Estúdio Pedra Industrial");
  expect(titles.product("Mesa Urb")).toBe("Mesa Urb — Estúdio Pedra Industrial");
  expect(titles.contact()).toBe("Contato — Estúdio Pedra Industrial");
  expect(titles.notFound()).toBe("Página não encontrada — Estúdio Pedra Industrial");
  expect(titles.admin()).toBe("Administração");
});

test("firstSentence and truncateAtWord", () => {
  expect(firstSentence("Mesa urbana em aço. Design contemporâneo.")).toBe("Mesa urbana em aço.");
  expect(firstSentence("Sem ponto final")).toBe("Sem ponto final");
  expect(firstSentence("Linha um\nLinha dois")).toBe("Linha um");
  expect(truncateAtWord("curto", 160)).toBe("curto");
  const long = "palavra ".repeat(40).trim();
  const t = truncateAtWord(long, 50);
  expect(t.length).toBeLessThanOrEqual(50);
  expect(t.endsWith("…")).toBe(true);
  expect(t).not.toMatch(/ …$/);
});

test("product description = first sentence + materials + tail, capped at 160", () => {
  expect(descriptions.product("Mesa urbana em aço carbono com design contemporâneo", "Aço carbono, MDF")).toBe(
    "Mesa urbana em aço carbono com design contemporâneo. Materiais: Aço carbono, MDF. Sob medida em BH e região metropolitana. Peça um orçamento pelo WhatsApp."
  );
  expect(descriptions.product("", "")).toBe(DEFAULT_DESCRIPTION);
  expect(descriptions.product("x".repeat(200), "").length).toBeLessThanOrEqual(160);
  expect(descriptions.category("Mesas")).toBe(
    "Peças da categoria Mesas em aço carbono e MDF, sob medida. Peça um orçamento pelo WhatsApp."
  );
  expect(descriptions.catalog()).toBe(
    "Mesas, estantes, luminárias e peças sob medida em aço carbono e MDF. Veja o portfólio e peça um orçamento pelo WhatsApp."
  );
  expect(descriptions.contact()).toBe(
    "Fale com o Estúdio Pedra Industrial pelo WhatsApp ou Instagram. Atendimento em Belo Horizonte e região metropolitana."
  );
});

test("new titles and the metropolitan-region descriptions", () => {
  expect(titles.process()).toBe("Processo — Estúdio Pedra Industrial");
  expect(titles.faq()).toBe("Dúvidas frequentes — Estúdio Pedra Industrial");
  expect(titles.about()).toBe("Sobre nós — Estúdio Pedra Industrial");
  for (const d of [DEFAULT_DESCRIPTION, descriptions.contact(), descriptions.process(), descriptions.faq(), descriptions.about(), descriptions.professionals()]) {
    expect(d.length).toBeLessThanOrEqual(160);
  }
  expect(DEFAULT_DESCRIPTION).toContain("região metropolitana");
});
