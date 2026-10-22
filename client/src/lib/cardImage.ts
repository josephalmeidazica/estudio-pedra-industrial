import type { PublicImage, PublicProduct } from "./types";

/** Photo shown on a catalog card; null for the custom piece or a piece without photos. */
export function cardImage(product: Pick<PublicProduct, "isCustom" | "images">): PublicImage | null {
  if (product.isCustom) return null;
  return product.images[0] ?? null;
}
