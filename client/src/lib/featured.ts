import type { PublicProduct } from "./types";

/**
 * Pieces for the home "Destaques" grid: the ones marked featured, in catalog
 * order. When fewer than `min` are featured, pad with the first non-featured
 * pieces so the grid never looks empty; never more than `max`.
 */
export function selectFeatured(products: PublicProduct[], max = 6, min = 3): PublicProduct[] {
  const featured = products.filter((p) => p.featured);
  if (featured.length >= min) return featured.slice(0, max);
  const rest = products.filter((p) => !p.featured);
  return [...featured, ...rest].slice(0, max);
}
