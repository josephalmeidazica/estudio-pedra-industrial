import { slugify } from "@shared/slug";
import type { PublicProduct } from "./types";

export type Category = { label: string; slug: string };

export function categorySlug(label: string): string {
  return slugify(label);
}

/** Distinct non-empty categories in first-appearance order. */
export function extractCategories(products: PublicProduct[]): Category[] {
  const seen = new Set<string>();
  const out: Category[] = [];
  for (const p of products) {
    if (!p.category) continue;
    const slug = categorySlug(p.category);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ label: p.category, slug });
  }
  return out;
}

/**
 * Filter the grid by category slug. `null` or an unknown slug means "Todos".
 * The custom piece is always shown, pinned as the last card.
 */
export function filterByCategory(products: PublicProduct[], slug: string | null): PublicProduct[] {
  const known = slug !== null && extractCategories(products).some((c) => c.slug === slug);
  const regular = products.filter((p) => !p.isCustom);
  const custom = products.filter((p) => p.isCustom);
  const matching = known ? regular.filter((p) => categorySlug(p.category) === slug) : regular;
  return [...matching, ...custom];
}
