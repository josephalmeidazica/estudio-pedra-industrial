import { TRPCClientError } from "@trpc/client";
import { expect, test } from "vitest";
import { isUnauthorizedError } from "./sessionErrors";

const trpcError = (code: string) =>
  new TRPCClientError("x", { result: { error: { message: "x", code: -32001, data: { code, httpStatus: 401, path: "p" } } } });

test("isUnauthorizedError recognises only a tRPC UNAUTHORIZED error", () => {
  expect(isUnauthorizedError(trpcError("UNAUTHORIZED"))).toBe(true);
  expect(isUnauthorizedError(trpcError("NOT_FOUND"))).toBe(false);
  expect(isUnauthorizedError(new Error("Invalid or missing admin token"))).toBe(false);
  expect(isUnauthorizedError(null)).toBe(false);
});
