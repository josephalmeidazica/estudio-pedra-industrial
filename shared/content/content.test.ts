import { expect, test } from "vitest";
import { FAQ } from "./faq";
import { HOME } from "./home";
import { PROCESSO, homeSteps } from "./processo";
import { SITE, addressLines } from "./site";
import { SOBRE } from "./sobre";

const BRACKET = /\[[^\]]*[A-Za-zÀ-ú0-9]/;
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

test("no illustrative [bracketed] text in any content module", () => {
  for (const s of strings([SITE, PROCESSO, FAQ, HOME, SOBRE])) expect(s, s).not.toMatch(BRACKET);
});

test("processo: five steps with icons, four on the home with Projeto shortened", () => {
  expect(PROCESSO.steps.map((s) => s.n)).toEqual(["01", "02", "03", "04", "05"]);
  expect(PROCESSO.steps.map((s) => s.icon)).toEqual(["whatsapp", "ruler", "pencil-ruler", "wrench", "truck"]);
  expect(homeSteps().map((s) => s.homeTitle ?? s.title)).toEqual(["Conversa", "Projeto", "Fabricação", "Entrega"]);
  for (const s of PROCESSO.steps) expect(s.bullets).toHaveLength(3);
});

test("faq: five themes with slugs and at least two items each", () => {
  expect(FAQ.map((t) => t.theme)).toEqual(["Prazo e pedido", "Pagamento", "Entrega e instalação", "Materiais e cuidados", "Garantia"]);
  for (const t of FAQ) expect(t.items.length).toBeGreaterThanOrEqual(2);
});

test("home: four diferenciais and three serviços", () => {
  expect(HOME.diferenciais.map((d) => d.label)).toEqual(["Fabricação própria", "Peças sob medida", "Garantia de 3 meses", "BH e região metropolitana"]);
  expect(HOME.servicos).toHaveLength(3);
});

test("site facts default to hidden until confirmed; address is fixed", () => {
  expect([SITE.leadTime, SITE.catalogPdf, SITE.reviews, SITE.instagramPosts, SITE.professionals]).toEqual([null, null, null, [], null]);
  expect(SITE.stats.map((s) => s.value)).toEqual(["3 meses", "100%"]);
  expect(addressLines()).toEqual(["Rua João Gualberto dos Santos, 714 · Céu Azul", "Belo Horizonte — MG"]);
  expect(SOBRE.valoresDetalhe.map((v) => v.title)).toEqual(["Personalidade", "Cuidado", "Criatividade"]);
});
