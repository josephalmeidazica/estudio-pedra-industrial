import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vitest";
import {
  HEIC_MESSAGE,
  UNSUPPORTED_IMAGE_MESSAGE,
  UPLOAD_TOO_LARGE_MESSAGE,
  isHeic,
  planVariantWidths,
  processImage,
  processUpload,
  variantFileName,
} from "./imagePipeline";

// ---- pure helpers ---------------------------------------------------------

test.each([
  [2000, [480, 960, 1600]],
  [1600, [480, 960, 1600]],
  [1500, [480, 960, 1500]],
  [960, [480, 960]],
  [800, [480, 800]],
  [480, [480]],
  [300, [300]],
])("planVariantWidths(%i) -> %j", (w, expected) => {
  expect(planVariantWidths(w)).toEqual(expected);
});

test("variantFileName", () => {
  expect(variantFileName("abc", 480)).toBe("abc-480.webp");
});

function ftyp(brand: string) {
  return Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftyp" + brand), Buffer.alloc(12)]);
}
test("isHeic by mime or by ftyp brand", () => {
  expect(isHeic(Buffer.alloc(32), "image/heic")).toBe(true);
  expect(isHeic(Buffer.alloc(32), "image/heif")).toBe(true);
  for (const b of ["heic", "heix", "mif1", "msf1"]) {
    expect(isHeic(ftyp(b), "application/octet-stream")).toBe(true);
  }
  expect(isHeic(ftyp("isom"), "application/octet-stream")).toBe(false); // plain MP4
  expect(isHeic(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]), "image/jpeg")).toBe(false);
  expect(isHeic(Buffer.alloc(4))).toBe(false); // too short
});

// ---- sharp processing -----------------------------------------------------

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "eps-pipe-"));
const solid = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#d2b389" } });

test("landscape 2000x1500 -> 480/960/1600 webp, url is the largest", async () => {
  const dir = tmpDir();
  const out = await processImage(await solid(2000, 1500).jpeg().toBuffer(), dir);
  expect(Object.keys(out.variants)).toEqual(["480", "960", "1600"]);
  expect(out.url).toBe(out.variants["1600"]);
  expect(out.url).toMatch(/^\/uploads\/[0-9a-f-]{36}-1600\.webp$/);
  expect([out.width, out.height]).toEqual([1600, 1200]);
  expect(fs.readdirSync(dir)).toHaveLength(3);
  const meta = await sharp(path.join(dir, path.basename(out.variants["480"]))).metadata();
  expect([meta.format, meta.width]).toEqual(["webp", 480]);
});

test("portrait 1500x2000 keeps its own width as the largest variant", async () => {
  const out = await processImage(await solid(1500, 2000).png().toBuffer(), tmpDir());
  expect(Object.keys(out.variants)).toEqual(["480", "960", "1500"]);
  expect([out.width, out.height]).toEqual([1500, 2000]);
});

test("tiny 300x200 source produces one variant, never upscaled", async () => {
  const out = await processImage(await solid(300, 200).jpeg().toBuffer(), tmpDir());
  expect(Object.keys(out.variants)).toEqual(["300"]);
  expect([out.width, out.height]).toEqual([300, 200]);
});

test("EXIF orientation 6 is applied: stored landscape 1200x800 comes out 800x1200", async () => {
  const buf = await solid(1200, 800).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const out = await processImage(buf, tmpDir());
  expect([out.width, out.height]).toEqual([800, 1200]);
  expect(Object.keys(out.variants)).toEqual(["480", "800"]);
});

test("processUpload rejects HEIC (declared or octet-stream), oversized, and garbage; writes nothing", async () => {
  process.env.UPLOADS_DIR = tmpDir();
  const b64 = (b: Buffer) => b.toString("base64");
  const heic = ftyp("heic");
  await expect(processUpload("data:image/heic;base64," + b64(heic))).rejects.toThrow(HEIC_MESSAGE);
  await expect(processUpload("data:application/octet-stream;base64," + b64(heic))).rejects.toThrow(
    HEIC_MESSAGE
  );
  await expect(
    processUpload("data:image/jpeg;base64," + b64(Buffer.alloc(20 * 1024 * 1024 + 1)))
  ).rejects.toThrow(UPLOAD_TOO_LARGE_MESSAGE);
  await expect(processUpload("data:image/jpeg;base64," + b64(Buffer.from("not an image")))).rejects.toThrow(
    UNSUPPORTED_IMAGE_MESSAGE
  );
  const dir = process.env.UPLOADS_DIR!;
  expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toEqual([]);
});

test("a truncated JPEG (header intact, body cut) is rejected with the unsupported message and leaves no files", async () => {
  process.env.UPLOADS_DIR = tmpDir();
  const whole = await solid(2000, 1500).jpeg().toBuffer();
  const truncated = whole.subarray(0, Math.floor(whole.length * 0.5));
  await expect(processUpload("data:image/jpeg;base64," + truncated.toString("base64"))).rejects.toThrow(
    UNSUPPORTED_IMAGE_MESSAGE
  );
  const dir = process.env.UPLOADS_DIR!;
  expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toEqual([]);
});

test("processUpload accepts a real png data url", async () => {
  process.env.UPLOADS_DIR = tmpDir();
  const png = await solid(100, 100).png().toBuffer();
  const out = await processUpload("data:image/png;base64," + png.toString("base64"));
  expect(Object.keys(out.variants)).toEqual(["100"]);
});
