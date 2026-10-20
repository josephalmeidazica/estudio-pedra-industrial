import { expect, test } from "vitest";
import { categorySlug, extractCategories, filterByCategory } from "./catalogFilter";
import type { PublicProduct } from "./types";

const p = (id: number, category: string, isCustom = false) =>
  ({ id, slug: `p${id}`, name: `P${id}`, category, isCustom, images: [] }) as unknown as PublicProduct;

const all = [p(1, "Mesas"), p(2, "Luminárias"), p(3, "Mesas de Jantar"), p(4, ""), p(9, "Personalizados", true), p(5, "Luminárias")];

test("categorySlug handles accents and spaces", () => {
  expect(categorySlug("Luminárias")).toBe("luminarias");
  expect(categorySlug("Mesas de Jantar")).toBe("mesas-de-jantar");
});

test("extractCategories is distinct, ordered, skips empty", () => {
  expect(extractCategories(all).map((c) => c.slug)).toEqual(["mesas", "luminarias", "mesas-de-jantar", "personalizados"]);
  expect(extractCategories(all)[1]).toEqual({ label: "Luminárias", slug: "luminarias" });
});

test("filterByCategory pins the custom piece last and treats unknown slugs as Todos", () => {
  expect(filterByCategory(all, null).map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 9]);
  expect(filterByCategory(all, "luminarias").map((x) => x.id)).toEqual([2, 5, 9]);
  expect(filterByCategory(all, "nao-existe").map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 9]);
});
