import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, expect, test } from "vitest";

beforeAll(() => {
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-up-"));
});

test("decodeDataUrl returns buffer and mime for image and octet-stream data", async () => {
  const { decodeDataUrl } = await import("./images");
  const jpeg = decodeDataUrl("data:image/jpeg;base64," + Buffer.from("hi").toString("base64"));
  expect(jpeg.mime).toBe("image/jpeg");
  expect(jpeg.buffer.toString()).toBe("hi");
  expect(decodeDataUrl("data:application/octet-stream;base64,aGk=").mime).toBe(
    "application/octet-stream"
  );
});

test("decodeDataUrl rejects non-image data and malformed input", async () => {
  const { decodeDataUrl } = await import("./images");
  expect(() => decodeDataUrl("data:text/plain;base64,aGk=")).toThrow(/Formato de imagem/);
  expect(() => decodeDataUrl("not-a-data-url")).toThrow(/Invalid data URL/);
});

test("deleteImageByUrl removes all variants sharing the uuid, and nothing else", async () => {
  const { deleteImageByUrl, uploadsDir } = await import("./images");
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const id = "11111111-2222-3333-4444-555555555555";
  for (const w of [480, 960, 1600]) fs.writeFileSync(path.join(dir, `${id}-${w}.webp`), "x");
  fs.writeFileSync(path.join(dir, "other-480.webp"), "x");
  fs.writeFileSync(path.join(dir, "legacy.jpg"), "x");
  deleteImageByUrl(`/uploads/${id}-1600.webp`);
  expect(fs.readdirSync(dir).sort()).toEqual(["legacy.jpg", "other-480.webp"]);
  deleteImageByUrl("/uploads/legacy.jpg");
  expect(fs.existsSync(path.join(dir, "legacy.jpg"))).toBe(false);
});

test("deleteImageByUrl ignores non-upload urls", async () => {
  const { deleteImageByUrl } = await import("./images");
  const target = path.join(process.cwd(), "client", "public", "products", "mesa-urb.jpg");
  deleteImageByUrl("/products/mesa-urb.jpg");
  expect(fs.existsSync(target)).toBe(true);
});
