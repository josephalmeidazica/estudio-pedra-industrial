/** ISO-BMFF `ftyp` brands used by HEIC/HEIF stills (iPhone photos). */
const HEIC_BRANDS = ["heic", "heix", "mif1", "msf1", "hevc", "hevx", "heim", "heis"];

/**
 * True when the file looks like HEIC/HEIF: by MIME type, by extension, or by
 * the `ftyp` brand in its first bytes (Android/Windows often report an empty
 * type for these files).
 */
export function isHeicFile(file: { name: string; type: string }, head: Uint8Array): boolean {
  if (/^image\/hei[cf]$/i.test(file.type)) return true;
  if (/\.hei[cf]$/i.test(file.name)) return true;
  if (head.length >= 12) {
    const ascii = (from: number, len: number) => String.fromCharCode(...head.subarray(from, from + len));
    if (ascii(4, 4) === "ftyp" && HEIC_BRANDS.includes(ascii(8, 4).toLowerCase())) return true;
  }
  return false;
}

/**
 * Converts a HEIC/HEIF file to JPEG in the browser. The decoder is heavy, so
 * it is loaded only the first time a HEIC actually needs converting.
 */
export async function convertHeicToJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  return Array.isArray(out) ? out[0] : out;
}
