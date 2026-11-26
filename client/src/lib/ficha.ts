import type { SITE } from "@shared/content/site";
import type { PublicProduct } from "./types";

export type FichaRow = { label: string; value: string };

const MADE_TO_MEASURE = "feita na medida do seu espaço";

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** One line reads "60 × 40 × 65 cm · feita na medida…"; several (one per version) keep their own lines. */
function measurements(dimensions: string, isCustom: boolean): string {
  const ls = lines(dimensions);
  if (ls.length === 0 || isCustom) return ls.join("\n");
  if (ls.length === 1) return `${ls[0]} · ${MADE_TO_MEASURE}`;
  return [...ls, MADE_TO_MEASURE[0].toUpperCase() + MADE_TO_MEASURE.slice(1)].join("\n");
}

/**
 * Ficha técnica rows: Medidas, Materiais, Acabamentos, Detalhes, Prazo, Garantia. Empty values are skipped.
 * Prazo is the piece's own when set, else the site-wide one (hidden while that is unknown too).
 */
export function fichaRows(
  p: Pick<PublicProduct, "dimensions" | "materials" | "finishes" | "details" | "isCustom"> & { leadTime?: string },
  site: Pick<typeof SITE, "leadTime" | "warranty">,
): FichaRow[] {
  const rows: FichaRow[] = [
    { label: "Medidas", value: measurements(p.dimensions, p.isCustom) },
    { label: "Materiais", value: p.materials.trim() },
    { label: "Acabamentos", value: p.finishes.trim() },
    { label: "Detalhes", value: lines(p.details).join(" · ") },
    { label: "Prazo", value: p.leadTime?.trim() || (site.leadTime?.trim() ?? "") },
    { label: "Garantia", value: site.warranty.trim() },
  ];
  return rows.filter((r) => r.value !== "");
}
