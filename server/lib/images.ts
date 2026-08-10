import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(PROJECT_ROOT, ".data", "uploads");
}
export const UPLOADS_DIR = uploadsDir();

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const [, mime, b64] = match;
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new Error(`Unsupported image type: ${mime}`);
  return { buffer: Buffer.from(b64, "base64"), ext };
}

export function saveImageBuffer(buffer: Buffer, ext: string): string {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  return `/uploads/${name}`;
}

export function deleteImageByUrl(url: string): void {
  const name = url.replace(/^\/uploads\//, "");
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return;
  try {
    fs.rmSync(path.join(uploadsDir(), name), { force: true });
  } catch {
    /* file already gone — ignore */
  }
}
