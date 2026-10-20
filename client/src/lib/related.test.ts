import { expect, test } from "vitest";
import { relatedProducts } from "./related";
import type { PublicProduct } from "./types";

const p = (id: number, category: string, isCustom = false) =>
  ({ id, slug: `p${id}`, name: `P${id}`, category, isCustom, images: [] }) as unknown as PublicProduct;

test("relatedProducts prefers the same category, then catalog order, skips current and custom", () => {
  const all = [p(1, "Mesas"), p(2, "Luminárias"), p(3, "Mesas"), p(4, "Mesas"), p(5, "Estantes"), p(9, "Personalizados", true)];
  expect(relatedProducts(all, all[0]).map((x) => x.id)).toEqual([3, 4, 2]);
  expect(relatedProducts(all, all[1]).map((x) => x.id)).toEqual([1, 3, 4]);
  expect(relatedProducts([all[0], all[5]], all[0]).map((x) => x.id)).toEqual([9]);
  expect(relatedProducts(all, all[0], 1).map((x) => x.id)).toEqual([3]);
});
