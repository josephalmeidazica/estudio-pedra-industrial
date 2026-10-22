import { expect, test } from "vitest";
import { deadlineLabel, parseStoredCart, parseStoredCustomer } from "./storage";

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

test("parseStoredCustomer keeps the optional fields and drops malformed ones", () => {
  expect(parseStoredCustomer(JSON.stringify({ name: "M", bairro: "S" }))).toEqual({ name: "M", bairro: "S" });
  expect(parseStoredCustomer(JSON.stringify({ name: "M", bairro: "S", measurements: "1 m", deadline: { kind: "data", when: "Natal" } })))
    .toEqual({ name: "M", bairro: "S", measurements: "1 m", deadline: { kind: "data", when: "Natal" } });
  expect(parseStoredCustomer(JSON.stringify({ name: "M", bairro: "S", deadline: { kind: "amanha" } }))).toEqual({ name: "M", bairro: "S" });
  expect(parseStoredCustomer(JSON.stringify({ name: "M", bairro: "S", measurements: 5, deadline: { kind: "data" } }))).toEqual({ name: "M", bairro: "S" });
  expect(deadlineLabel({ kind: "ate-1-mes" })).toBe("Em até 1 mês");
  expect(deadlineLabel({ kind: "data", when: "  " })).toBeNull();
});
