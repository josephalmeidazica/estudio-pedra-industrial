import { expect, test } from "vitest";
import { cartReducer, totalCount, type CartItem } from "./cartReducer";

test("add inserts a new item then increments an existing one", () => {
  let s: CartItem[] = [];
  s = cartReducer(s, { type: "add", name: "Mesa Urb" });
  s = cartReducer(s, { type: "add", name: "Mesa Urb" });
  s = cartReducer(s, { type: "add", name: "Luminária Lua" });
  expect(s).toEqual([
    { name: "Mesa Urb", quantity: 2 },
    { name: "Luminária Lua", quantity: 1 },
  ]);
});

test("setQuantity updates; quantity <= 0 removes the line", () => {
  let s: CartItem[] = [{ name: "A", quantity: 1 }];
  s = cartReducer(s, { type: "setQuantity", name: "A", quantity: 5 });
  expect(s).toEqual([{ name: "A", quantity: 5 }]);
  s = cartReducer(s, { type: "setQuantity", name: "A", quantity: 0 });
  expect(s).toEqual([]);
});

test("remove, clear, and replace", () => {
  const s: CartItem[] = [{ name: "A", quantity: 1 }, { name: "B", quantity: 2 }];
  expect(cartReducer(s, { type: "remove", name: "A" })).toEqual([{ name: "B", quantity: 2 }]);
  expect(cartReducer(s, { type: "clear" })).toEqual([]);
  expect(cartReducer(s, { type: "replace", items: [{ name: "C", quantity: 9 }] })).toEqual([
    { name: "C", quantity: 9 },
  ]);
});

test("totalCount sums quantities", () => {
  expect(totalCount([{ name: "A", quantity: 2 }, { name: "B", quantity: 3 }])).toBe(5);
});
