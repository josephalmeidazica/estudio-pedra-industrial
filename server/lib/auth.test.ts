import { afterEach, beforeEach, expect, test } from "vitest";
import { isValidAdminToken } from "./auth";

const original = process.env.ADMIN_API_TOKEN;
beforeEach(() => { process.env.ADMIN_API_TOKEN = "s3cret-token"; });
afterEach(() => { process.env.ADMIN_API_TOKEN = original; });

test("accepts a matching bearer token", () => {
  expect(isValidAdminToken("Bearer s3cret-token")).toBe(true);
});
test("rejects wrong, malformed, or missing tokens", () => {
  expect(isValidAdminToken("Bearer nope")).toBe(false);
  expect(isValidAdminToken("s3cret-token")).toBe(false);
  expect(isValidAdminToken(undefined)).toBe(false);
});
test("fails closed when the env token is empty", () => {
  process.env.ADMIN_API_TOKEN = "";
  expect(isValidAdminToken("Bearer s3cret-token")).toBe(false);
});
