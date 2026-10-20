import type { PublicProduct } from "./types";

/**
 * "Veja também": other pieces in the same category first, then the rest in
 * catalog order. The custom piece only appears when nothing else is left.
 */
export function relatedProducts(all: PublicProduct[], current: PublicProduct, n = 3): PublicProduct[] {
  const others = all.filter((p) => p.id !== current.id);
  const regular = others.filter((p) => !p.isCustom);
  const same = regular.filter((p) => p.category && p.category === current.category);
  const rest = regular.filter((p) => !same.includes(p));
  const ordered = [...same, ...rest];
  if (ordered.length === 0) return others.slice(0, n);
  return ordered.slice(0, n);
}
