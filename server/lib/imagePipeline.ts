// Server-side image pipeline: pure planning helpers (this file) plus the
// sharp-backed processing added in Task 7.

export const VARIANT_WIDTHS = [480, 960, 1600] as const;
export const MAX_VARIANT_WIDTH = 1600;
export const MAX_DECODED_BYTES = 20 * 1024 * 1024;

export const HEIC_MESSAGE =
  'Fotos em HEIC não são aceitas por este navegador. Envie em JPEG — no iPhone: Ajustes → Câmera → Formatos → "Mais compatível".';
export const UPLOAD_TOO_LARGE_MESSAGE =
  "Imagem muito grande (máximo de 20 MB). Envie uma foto menor.";
export const UNSUPPORTED_IMAGE_MESSAGE =
  "Formato de imagem não suportado. Envie JPEG, PNG, WebP ou GIF.";

/**
 * Widths to generate for a source of `sourceWidth` px: every standard width
 * below the cap, then the cap itself, where the cap is the source width or
 * 1600, whichever is smaller. Never upscales.
 */
export function planVariantWidths(sourceWidth: number): number[] {
  const cap = Math.min(sourceWidth, MAX_VARIANT_WIDTH);
  return [...VARIANT_WIDTHS.filter((w) => w < cap), cap];
}

export function variantFileName(id: string, width: number): string {
  return `${id}-${width}.webp`;
}

const HEIC_MIMES = new Set(["image/heic", "image/heif"]);
const HEIC_BRANDS = new Set(["heic", "heix", "mif1", "msf1"]);

/** HEIC/HEIF detection by declared MIME or by the ISO-BMFF `ftyp` brand. */
export function isHeic(buffer: Buffer, mime?: string): boolean {
  if (mime && HEIC_MIMES.has(mime.toLowerCase())) return true;
  if (buffer.length < 12) return false;
  if (buffer.toString("latin1", 4, 8) !== "ftyp") return false;
  return HEIC_BRANDS.has(buffer.toString("latin1", 8, 12));
}
