import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, expect, test } from "vitest";

beforeAll(() => {
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-up-"));
});

test("decodeDataUrl parses a jpeg data URL", async () => {
  const { decodeDataUrl } = await import("./images");
  const { buffer, ext } = decodeDataUrl("data:image/jpeg;base64," + Buffer.from("hi").toString("base64"));
  expect(ext).toBe("jpg");
  expect(buffer.toString()).toBe("hi");
});

test("decodeDataUrl rejects non-image data", async () => {
  const { decodeDataUrl } = await import("./images");
  expect(() => decodeDataUrl("data:text/plain;base64,aGk=")).toThrow();
  expect(() => decodeDataUrl("not-a-data-url")).toThrow();
});

test("saveImageBuffer writes a file and deleteImageByUrl removes it", async () => {
  const { saveImageBuffer, deleteImageByUrl, UPLOADS_DIR } = await import("./images");
  const url = saveImageBuffer(Buffer.from("data"), "png");
  expect(url).toMatch(/^\/uploads\/.+\.png$/);
  const file = path.join(UPLOADS_DIR, url.replace("/uploads/", ""));
  expect(fs.existsSync(file)).toBe(true);
  deleteImageByUrl(url);
  expect(fs.existsSync(file)).toBe(false);
});
