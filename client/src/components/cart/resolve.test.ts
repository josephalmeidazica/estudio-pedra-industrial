import { expect, test } from "vitest";
import type { PublicProduct } from "@/lib/types";
import type { CartItem } from "./cartReducer";
import { resolveCartLines, toMessageLines } from "./resolve";

function prod(id: number, slug: string, name: string, category: string, isCustom = false): PublicProduct {
  return { id, slug, name, category, isCustom, images: [] } as unknown as PublicProduct;
}

test("while the catalog has not loaded, every line stays available under its snapshot name and the result is pending", () => {
  const items: CartItem[] = [
    { lineId: "a", productId: 1, name: "Mesa Urb", quantity: 2 },
    { lineId: "c", productId: 5, name: "Apagada", quantity: 1 },
  ];
  const r = resolveCartLines(items, undefined);
  expect(r.pending).toBe(true);
  expect(r.unavailable).toEqual([]);
  expect(r.available.map((l) => l.liveName)).toEqual(["Mesa Urb", "Apagada"]);
  expect(resolveCartLines(items, []).pending).toBe(false);
});

test("resolveCartLines uses live names and separates unavailable lines; toMessageLines links or describes", () => {
  const products = [
    prod(1, "mesa-urb", "Mesa Urb (nova)", "Mesas"),
    prod(9, "movel-personalizado", "Móvel personalizado", "Personalizados", true),
  ];
  const items: CartItem[] = [
    { lineId: "a", productId: 1, name: "Mesa Urb", quantity: 2 },
    { lineId: "b", productId: 9, name: "Móvel personalizado", quantity: 1, note: "mesa 2 m" },
    { lineId: "c", productId: 5, name: "Apagada", quantity: 1 },
  ];
  const { available, unavailable } = resolveCartLines(items, products);
  expect(available.map((l) => l.liveName)).toEqual(["Mesa Urb (nova)", "Móvel personalizado"]);
  expect(unavailable.map((l) => l.lineId)).toEqual(["c"]);
  expect(toMessageLines(available, "https://x.y")).toEqual([
    { name: "Mesa Urb (nova)", quantity: 2, url: "https://x.y/catalogo/mesa-urb" },
    { name: "Móvel personalizado", quantity: 1, note: "mesa 2 m" },
  ]);
});
