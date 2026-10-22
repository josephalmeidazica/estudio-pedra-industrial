import { expect, test } from "vitest";
import { galleryCaption } from "./galleryCaption";
test("appends the piece name unless already present", () => {
  expect(galleryCaption("Quarto", "Mesa de Cabeceira Loft")).toBe("Quarto · Mesa de Cabeceira Loft");
  expect(galleryCaption("Sala · luminária sol", "Luminária Sol")).toBe("Sala · luminária sol");
  expect(galleryCaption("", "Mesa Urb")).toBe("Mesa Urb");
  expect(galleryCaption("", undefined)).toBe("");
});
