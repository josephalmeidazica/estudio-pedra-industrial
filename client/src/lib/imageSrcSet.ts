/** The four image columns the API returns; legacy rows have 0/0 and {}. */
export type ImageLike = {
  url: string;
  width: number;
  height: number;
  variants: Record<string, string>;
};

/** One column on phones, half on tablets, a third on desktop (catalog grid). */
export const CARD_SIZES = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";

function sortedWidths(img: ImageLike): number[] {
  return Object.keys(img.variants)
    .map(Number)
    .filter((w) => Number.isFinite(w))
    .sort((a, b) => a - b);
}

/** `url 480w, url 960w, ...` ascending; undefined for legacy rows. */
export function buildSrcSet(img: ImageLike): string | undefined {
  const widths = sortedWidths(img);
  if (widths.length === 0) return undefined;
  return widths.map((w) => `${img.variants[String(w)]} ${w}w`).join(", ");
}

/** Smallest variant for thumbnails, else the single legacy url. */
export function thumbUrl(img: ImageLike): string {
  const widths = sortedWidths(img);
  return widths.length === 0 ? img.url : img.variants[String(widths[0])];
}

export function hasDimensions(img: ImageLike): boolean {
  return img.width > 0 && img.height > 0;
}
