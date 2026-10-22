import { slugify } from "@shared/slug";

const ICONS: Record<string, string> = {
  estantes: "/brand/icons/estante-divisio.png",
  estruturas: "/brand/icons/estrutura-gaia.png",
  luminarias: "/brand/icons/luminaria-lua.png",
  mesas: "/brand/icons/mesa-urb.png",
  penteadeiras: "/brand/icons/penteadeira.png",
  floreiras: "/brand/icons/floreira.png",
  reformas: "/brand/icons/reforma-sofa.png",
  personalizados: "/brand/simbolo-preto.png",
};

/** Brand icon for a category slug or label; null when there is none. */
export function categoryIcon(slugOrLabel: string): string | null {
  return ICONS[slugify(slugOrLabel)] ?? null;
}
