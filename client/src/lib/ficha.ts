import type { SITE } from "@shared/content/site";
import type { PublicProduct } from "./types";

export type FichaRow = { label: string; value: string };

/** Ficha técnica rows: Medidas, Materiais, Acabamentos, Detalhes, Prazo (once known), Garantia. Empty values are skipped. */
export function fichaRows(
  p: Pick<PublicProduct, "dimensions" | "materials" | "finishes" | "details" | "isCustom">,
  site: Pick<typeof SITE, "leadTime" | "warranty">,
): FichaRow[] {
  const dimensions = p.dimensions.trim();
  const details = p.details
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" · ");
  const rows: FichaRow[] = [
    { label: "Medidas", value: dimensions && !p.isCustom ? `${dimensions} · feita na medida do seu espaço` : dimensions },
    { label: "Materiais", value: p.materials.trim() },
    { label: "Acabamentos", value: p.finishes.trim() },
    { label: "Detalhes", value: details },
    { label: "Prazo", value: site.leadTime?.trim() ?? "" },
    { label: "Garantia", value: site.warranty.trim() },
  ];
  return rows.filter((r) => r.value !== "");
}
