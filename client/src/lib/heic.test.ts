import { expect, test } from "vitest";
import { isHeicFile } from "./heic";

const ftyp = (brand: string) =>
  new Uint8Array([0, 0, 0, 24, ...Array.from(Buffer.from("ftyp" + brand)), ...new Array(12).fill(0)]);

test("isHeicFile by type, extension or brand", () => {
  expect(isHeicFile({ name: "IMG_1.HEIC", type: "" }, new Uint8Array(0))).toBe(true);
  expect(isHeicFile({ name: "x", type: "image/heif" }, new Uint8Array(0))).toBe(true);
  expect(isHeicFile({ name: "x.bin", type: "application/octet-stream" }, ftyp("heic"))).toBe(true);
  expect(isHeicFile({ name: "x.bin", type: "application/octet-stream" }, ftyp("hevc"))).toBe(true);
  expect(isHeicFile({ name: "a.jpg", type: "image/jpeg" }, new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
  expect(isHeicFile({ name: "v.mp4", type: "video/mp4" }, ftyp("isom"))).toBe(false);
});
