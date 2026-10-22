import { expect, test } from "vitest";
import { categoryIcon } from "./categoryIcons";

test("maps known categories by slug or label; unknown → null", () => {
  expect(categoryIcon("Luminárias")).toBe("/brand/icons/luminaria-lua.png");
  expect(categoryIcon("mesas")).toBe("/brand/icons/mesa-urb.png");
  expect(categoryIcon("Personalizados")).toBe("/brand/simbolo-preto.png");
  expect(categoryIcon("Cadeiras")).toBeNull();
  expect(categoryIcon("")).toBeNull();
});
