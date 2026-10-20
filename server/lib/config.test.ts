import { expect, test } from "vitest";
import { assertProductionConfig } from "./config";

test("production without ADMIN_PASSWORD throws a clear error", () => {
  expect(() => assertProductionConfig({ NODE_ENV: "production" })).toThrow(/ADMIN_PASSWORD is not set/);
  expect(() => assertProductionConfig({ NODE_ENV: "production", ADMIN_PASSWORD: "" })).toThrow();
});

test("development and configured production pass", () => {
  expect(() => assertProductionConfig({ NODE_ENV: "development" })).not.toThrow();
  expect(() => assertProductionConfig({ NODE_ENV: "production", ADMIN_PASSWORD: "x" })).not.toThrow();
});
