import { expect, test } from "vitest";
import { makeUniqueSlug, slugify } from "./slug";

test("slugify lowercases, strips accents, dashes non-alphanumerics", () => {
  expect(slugify("Estrutura Gaia")).toBe("estrutura-gaia");
  expect(slugify("Luminária Lua!")).toBe("luminaria-lua");
  expect(slugify("  Mesa   Office L  ")).toBe("mesa-office-l");
});

test("makeUniqueSlug appends a counter on collision", () => {
  const existing = new Set(["mesa-urb", "mesa-urb-2"]);
  expect(makeUniqueSlug("mesa-urb", existing)).toBe("mesa-urb-3");
  expect(makeUniqueSlug("nova", existing)).toBe("nova");
});
