import { expect, test } from "vitest";
import { buildSrcSet, hasDimensions, thumbUrl } from "./imageSrcSet";

const full = {
  url: "/uploads/a-1600.webp",
  width: 1600,
  height: 1200,
  variants: { "960": "/uploads/a-960.webp", "1600": "/uploads/a-1600.webp", "480": "/uploads/a-480.webp" },
};
const tiny = { url: "/uploads/b-300.webp", width: 300, height: 200, variants: { "300": "/uploads/b-300.webp" } };
const legacy = { url: "/products/mesa-urb.jpg", width: 0, height: 0, variants: {} };

test("buildSrcSet sorts by width and skips legacy rows", () => {
  expect(buildSrcSet(full)).toBe(
    "/uploads/a-480.webp 480w, /uploads/a-960.webp 960w, /uploads/a-1600.webp 1600w"
  );
  expect(buildSrcSet(tiny)).toBe("/uploads/b-300.webp 300w");
  expect(buildSrcSet(legacy)).toBeUndefined();
});

test("thumbUrl picks the smallest variant, falling back to url", () => {
  expect(thumbUrl(full)).toBe("/uploads/a-480.webp");
  expect(thumbUrl(legacy)).toBe("/products/mesa-urb.jpg");
});

test("hasDimensions is false for legacy rows", () => {
  expect(hasDimensions(full)).toBe(true);
  expect(hasDimensions(legacy)).toBe(false);
});
