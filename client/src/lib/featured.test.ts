import { expect, test } from "vitest";
import { selectFeatured } from "./featured";
import type { PublicProduct } from "./types";

const P = (id: number, featured: boolean) => ({ id, featured }) as PublicProduct;

test("selectFeatured pads to six when fewer than three are featured, else caps at six", () => {
  const all = [P(1, false), P(2, true), P(3, false), P(4, false), P(5, true), P(6, false), P(7, false), P(8, false)];
  expect(selectFeatured(all).map((x) => x.id)).toEqual([2, 5, 1, 3, 4, 6]);
  const many = [1, 2, 3, 4, 5, 6, 7].map((i) => P(i, true));
  expect(selectFeatured(many).map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(selectFeatured([P(1, true), P(2, true), P(3, true), P(4, false)]).map((x) => x.id)).toEqual([1, 2, 3]);
  expect(selectFeatured([])).toEqual([]);
});
