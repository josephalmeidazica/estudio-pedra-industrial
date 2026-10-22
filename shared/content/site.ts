export type ProfessionalsContent = {
  lead: string;
  offers: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  ctaTitle: string;
  ctaText: string;
};

export const INSTAGRAM_URL = "https://instagram.com/estudio.pedraindustrial";
export const INSTAGRAM_HANDLE = "@estudio.pedraindustrial";
export const PHONE_DISPLAY = "(31) 97180-3551";
export const HOURS = ["Segunda a sexta: 8h às 18h", "Sábado: 9h às 12h", "Domingo: fechado"];

/** Facts the client has not confirmed are null/empty and hide their block. */
export const SITE = {
  responseTime: "Respondemos em até 1 dia útil",
  warranty: "3 meses contra defeitos de fabricação",
  serviceArea: "Belo Horizonte e região metropolitana",
  address: { street: "Rua João Gualberto dos Santos, 714", district: "Céu Azul", city: "Belo Horizonte — MG" },
  professionals: null as null | ProfessionalsContent,
  leadTime: null as string | null,
  stats: [
    { value: "3 meses", label: "de garantia contra defeitos de fabricação" },
    { value: "100%", label: "das peças com projeto aprovado antes de produzir" },
  ] as { value: string; label: string }[],
  catalogPdf: null as null | { url: string; sizeLabel?: string; updatedLabel?: string },
  reviews: null as null | {
    rating: string;
    count: number;
    url: string;
    quotes: { text: string; author: string; context: string }[];
  },
  instagramPosts: [] as string[],
};

export function addressLines(): [string, string] {
  const { street, district, city } = SITE.address;
  return [`${street} · ${district}`, city];
}
