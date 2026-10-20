import { expect, test } from "vitest";
import { isHeic, planVariantWidths, variantFileName } from "./imagePipeline";

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
