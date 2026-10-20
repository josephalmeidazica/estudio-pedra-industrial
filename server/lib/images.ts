import fs from "node:fs";
import path from "node:path";

// Anchored to process.cwd() — see server/db/client.ts for why this must not
// be derived from __dirname (breaks once the server is bundled to dist/).
const PROJECT_ROOT = process.cwd();

export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(PROJECT_ROOT, ".data", "uploads");
}
export const UPLOADS_DIR = uploadsDir();

export const UNSUPPORTED_IMAGE_MESSAGE =
  "Formato de imagem não suportado. Envie JPEG, PNG, WebP ou GIF.";

/**
 * Split a base64 data URL into bytes + declared MIME. Accepts any `image/*`
 * plus `application/octet-stream` (what browsers declare for files they do
 * not recognise, e.g. HEIC on Chrome); the pipeline decides what the bytes
 * really are.
 */
export function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string } {
  const match = /^data:([^;,]*);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1].toLowerCase();
  const accepted = mime.startsWith("image/") || mime === "application/octet-stream" || mime === "";
  if (!accepted) throw new Error(UNSUPPORTED_IMAGE_MESSAGE);
  return { buffer: Buffer.from(match[2], "base64"), mime: mime || "application/octet-stream" };
}

const VARIANT_NAME = /^([0-9a-f-]{36})-\d+\.webp$/;

/**
 * Remove an uploaded file by its public URL. For a variant file
 * (`<uuid>-<width>.webp`) every sibling variant of the same uuid is removed
 * too. URLs outside `/uploads/` (e.g. `/products/...`) are ignored.
 */
export function deleteImageByUrl(url: string): void {
  const name = url.replace(/^\/uploads\//, "");
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return;
  const dir = uploadsDir();
  const rm = (file: string) => {
    try {
      fs.rmSync(path.join(dir, file), { force: true });
    } catch {
      /* file already gone — ignore */
    }
  };
  rm(name);
  const m = VARIANT_NAME.exec(name);
  if (!m) return;
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const f of entries) if (f.startsWith(`${m[1]}-`) && f.endsWith(".webp")) rm(f);
  rm(path.join("og", `${m[1]}.jpg`)); // the derived share-card JPEG, if it was ever requested
}
