import { thumbUrl } from "@/lib/imageSrcSet";
import type { PublicProduct } from "@/lib/types";
import type { CartItem } from "./cartReducer";

/** A cart line joined to its live product. */
export type ResolvedLine = CartItem & {
  slug: string;
  liveName: string;
  category: string;
  thumb?: string;
};

/** What the message builder needs per line: a link for catalog pieces, a description for the custom one. */
export type MessageLine = { name: string; quantity: number; url?: string; note?: string };

/**
 * Join cart lines to the published products. A line whose product is gone
 * (deleted or unpublished) is "unavailable": shown greyed out, never sent.
 */
export function resolveCartLines(
  items: CartItem[],
  products: PublicProduct[]
): { available: ResolvedLine[]; unavailable: CartItem[] } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const available: ResolvedLine[] = [];
  const unavailable: CartItem[] = [];
  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p) {
      unavailable.push(item);
      continue;
    }
    available.push({
      ...item,
      slug: p.slug,
      liveName: p.name,
      category: p.category,
      thumb: p.images[0] ? thumbUrl(p.images[0]) : undefined,
    });
  }
  return { available, unavailable };
}

export function toMessageLines(available: ResolvedLine[], origin: string): MessageLine[] {
  return available.map((l) =>
    l.note !== undefined
      ? { name: l.liveName, quantity: l.quantity, note: l.note }
      : { name: l.liveName, quantity: l.quantity, url: `${origin}/catalogo/${l.slug}` }
  );
}
