import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { UNSUPPORTED_IMAGE_MESSAGE, decodeDataUrl, uploadsDir } from "./images";

export { UNSUPPORTED_IMAGE_MESSAGE };

// ---- pure planning -------------------------------------------------------

export const VARIANT_WIDTHS = [480, 960, 1600] as const;
export const MAX_VARIANT_WIDTH = 1600;
export const MAX_DECODED_BYTES = 20 * 1024 * 1024;
const WEBP_QUALITY = 80;

export const HEIC_MESSAGE =
  'Fotos em HEIC não são aceitas por este navegador. Envie em JPEG — no iPhone: Ajustes → Câmera → Formatos → "Mais compatível".';
export const UPLOAD_TOO_LARGE_MESSAGE =
  "Imagem muito grande (máximo de 20 MB). Envie uma foto menor.";

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

// ---- sharp processing ----------------------------------------------------

export type ProcessedImage = {
  /** Public URL of the largest variant. */
  url: string;
  /** Intrinsic size of the largest variant. */
  width: number;
  height: number;
  /** width (as string) -> public URL, ascending. */
  variants: Record<string, string>;
};

/**
 * Decode `buffer`, auto-orient it, and write WebP variants into `dir`.
 * Throws `UNSUPPORTED_IMAGE_MESSAGE` when sharp cannot decode the bytes.
 */
export async function processImage(buffer: Buffer, dir: string = uploadsDir()): Promise<ProcessedImage> {
  let meta: Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new Error(UNSUPPORTED_IMAGE_MESSAGE);
  }
  if (!meta.width || !meta.height) throw new Error(UNSUPPORTED_IMAGE_MESSAGE);

  // EXIF orientations 5-8 rotate by 90°, so the displayed width is the stored height.
  const sourceWidth = (meta.orientation ?? 1) >= 5 ? meta.height : meta.width;
  const widths = planVariantWidths(sourceWidth);

  fs.mkdirSync(dir, { recursive: true });
  const id = crypto.randomUUID();
  const variants: Record<string, string> = {};
  let width = 0;
  let height = 0;
  for (const w of widths) {
    const file = variantFileName(id, w);
    const info = await sharp(buffer)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(path.join(dir, file));
    variants[String(w)] = `/uploads/${file}`;
    width = info.width;
    height = info.height;
  }
  return { url: variants[String(widths[widths.length - 1])], width, height, variants };
}

/** Full upload path: data URL -> size cap -> HEIC guard -> variants. */
export async function processUpload(dataUrl: string): Promise<ProcessedImage> {
  const { buffer, mime } = decodeDataUrl(dataUrl);
  if (buffer.length > MAX_DECODED_BYTES) throw new Error(UPLOAD_TOO_LARGE_MESSAGE);
  if (isHeic(buffer, mime)) throw new Error(HEIC_MESSAGE);
  return processImage(buffer);
}
