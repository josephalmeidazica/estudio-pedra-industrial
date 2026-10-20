import { expect, test } from "vitest";
import { cartReducer, totalCount, type CartItem } from "./cartReducer";

const L = (n: number) => `line-${n}`;

test("add merges by productId and keeps the first lineId; addCustom always appends", () => {
  let s: CartItem[] = [];
  s = cartReducer(s, { type: "add", lineId: L(1), productId: 7, name: "Mesa Urb" });
  s = cartReducer(s, { type: "add", lineId: L(2), productId: 7, name: "Mesa Urb" });
  s = cartReducer(s, { type: "addCustom", lineId: L(3), productId: 9, name: "Móvel personalizado", note: "mesa 2 m" });
  s = cartReducer(s, { type: "addCustom", lineId: L(4), productId: 9, name: "Móvel personalizado", note: "mesa 2 m" });
  expect(s).toEqual([
    { lineId: L(1), productId: 7, name: "Mesa Urb", quantity: 2 },
    { lineId: L(3), productId: 9, name: "Móvel personalizado", quantity: 1, note: "mesa 2 m" },
    { lineId: L(4), productId: 9, name: "Móvel personalizado", quantity: 1, note: "mesa 2 m" },
  ]);
});

test("setQuantity, setNote, remove, clear, replace key on lineId", () => {
  let s: CartItem[] = [
    { lineId: "a", productId: 1, name: "A", quantity: 1 },
    { lineId: "b", productId: 2, name: "B", quantity: 1, note: "x" },
  ];
  s = cartReducer(s, { type: "setQuantity", lineId: "a", quantity: 5 });
  s = cartReducer(s, { type: "setNote", lineId: "b", note: "y" });
  expect(s).toEqual([
    { lineId: "a", productId: 1, name: "A", quantity: 5 },
    { lineId: "b", productId: 2, name: "B", quantity: 1, note: "y" },
  ]);
  expect(cartReducer(s, { type: "setQuantity", lineId: "a", quantity: 0 })).toEqual([s[1]]);
  expect(cartReducer(s, { type: "remove", lineId: "b" })).toEqual([s[0]]);
  expect(cartReducer(s, { type: "clear" })).toEqual([]);
  expect(cartReducer(s, { type: "replace", items: [] })).toEqual([]);
  expect(totalCount(s)).toBe(6);
});
