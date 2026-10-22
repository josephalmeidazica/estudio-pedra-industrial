import { expect, test } from "vitest";
import { cardImage } from "./cardImage";
const img = { url: "/u/a-480.webp", width: 1, height: 1, variants: {} } as any;
test("custom piece and empty galleries have no card image", () => {
  expect(cardImage({ isCustom: true, images: [img] })).toBeNull();
  expect(cardImage({ isCustom: false, images: [] })).toBeNull();
  expect(cardImage({ isCustom: false, images: [img] })).toBe(img);
});
