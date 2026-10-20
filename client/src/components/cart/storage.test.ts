import { expect, test } from "vitest";
import { parseStoredCart, parseStoredCustomer } from "./storage";

test("parseStoredCart drops malformed lines and legacy shapes", () => {
  expect(parseStoredCart(null)).toEqual([]);
  expect(parseStoredCart("not json")).toEqual([]);
  expect(parseStoredCart(JSON.stringify([{ name: "Mesa Urb", quantity: 2 }]))).toEqual([]); // Batch 1 shape
  const good = { lineId: "a", productId: 1, name: "A", quantity: 2 };
  const withNote = { lineId: "b", productId: 2, name: "B", quantity: 1, note: "n" };
  expect(
    parseStoredCart(
      JSON.stringify([good, withNote, { lineId: "c", productId: 3, name: "C", quantity: 0 }, { productId: 4, name: "D", quantity: 1 }])
    )
  ).toEqual([good, withNote]);
});

test("parseStoredCustomer defaults to empty strings", () => {
  expect(parseStoredCustomer(null)).toEqual({ name: "", bairro: "" });
  expect(parseStoredCustomer(JSON.stringify({ name: "Maria", bairro: 3 }))).toEqual({ name: "Maria", bairro: "" });
});
