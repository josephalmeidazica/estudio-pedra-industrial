/**
 * Page titles and descriptions shared by the server (rendered <head>) and
 * the client (document.title after in-app navigation), so the two never drift.
 */

export const SITE_NAME = "Estúdio Pedra Industrial";

export const DEFAULT_DESCRIPTION =
  "Móveis industriais sob medida em aço carbono e MDF, feitos em Belo Horizonte para BH e região metropolitana. Peça um orçamento pelo WhatsApp.";

const PRODUCT_TAIL = "Sob medida em BH e região metropolitana. Peça um orçamento pelo WhatsApp.";
export const DESCRIPTION_MAX = 160;

export const titles = {
  home: () => `${SITE_NAME} — Móveis industriais sob medida em Belo Horizonte`,
  catalog: () => `Portfólio — ${SITE_NAME}`,
  category: (label: string) => `${label} — Portfólio | ${SITE_NAME}`,
  product: (name: string) => `${name} — ${SITE_NAME}`,
  contact: () => `Contato — ${SITE_NAME}`,
  process: () => `Processo — ${SITE_NAME}`,
  faq: () => `Dúvidas frequentes — ${SITE_NAME}`,
  about: () => `Sobre nós — ${SITE_NAME}`,
  professionals: () => `Para profissionais — ${SITE_NAME}`,
  notFound: () => `Página não encontrada — ${SITE_NAME}`,
  admin: () => "Administração",
};

/** Up to and including the first sentence end (. ! ?) followed by whitespace or end, or the first line. */
export function firstSentence(text: string): string {
  const line = text.split(/\r?\n/)[0].trim();
  const m = /^(.*?[.!?])(?=\s|$)/.exec(line);
  return (m ? m[1] : line).trim();
}

/** Cut at the last space before `max - 1` and append an ellipsis; unchanged when short enough. */
export function truncateAtWord(text: string, max = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = (space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:]+$/, "");
  return `${base}…`;
}

function ensurePeriod(s: string): string {
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

export const descriptions = {
  catalog: () =>
    "Mesas, estantes, luminárias e peças sob medida em aço carbono e MDF. Veja o portfólio e peça um orçamento pelo WhatsApp.",
  category: (label: string) =>
    `Peças da categoria ${label} em aço carbono e MDF, sob medida. Peça um orçamento pelo WhatsApp.`,
  contact: () => `Fale com o ${SITE_NAME} pelo WhatsApp ou Instagram. Atendimento em Belo Horizonte e região metropolitana.`,
  process: () =>
    "Como uma ideia vira uma peça sob medida: conversa, medidas, projeto, fabricação e entrega em BH e região metropolitana. Peça um orçamento pelo WhatsApp.",
  faq: () =>
    "Prazos, pagamento, entrega, materiais e garantia das peças sob medida do Estúdio Pedra Industrial. Tire sua dúvida pelo WhatsApp.",
  about: () =>
    "Estúdio de móveis industriais sob medida em aço carbono e MDF, com oficina própria em Belo Horizonte. Peça um orçamento pelo WhatsApp.",
  professionals: () =>
    "Condições, fichas técnicas e prazos para arquitetos, designers e lojistas que especificam móveis sob medida. Fale com o estúdio pelo WhatsApp.",
  product: (description: string, materials: string): string => {
    const lead = firstSentence(description);
    if (!lead) return DEFAULT_DESCRIPTION;
    const parts = [ensurePeriod(lead)];
    if (materials.trim()) parts.push(`Materiais: ${ensurePeriod(materials.trim())}`);
    parts.push(PRODUCT_TAIL);
    return truncateAtWord(parts.join(" "));
  },
};
