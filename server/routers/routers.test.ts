import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type DB } from "../db/client";
import { appRouter } from "./index";
import type { TrpcContext } from "../trpc";

const dirs: string[] = [];
const openDbs: DB[] = [];
function ctxFor(db: DB, token?: string): TrpcContext {
  return {
    req: { headers: token ? { authorization: `Bearer ${token}` } : {} } as any,
    res: {} as any,
    db,
  };
}
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-rt-"));
  dirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
beforeEach(() => { process.env.ADMIN_API_TOKEN = "test-token"; process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-rtup-")); });
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

test("public list works without a token; admin create requires one", async () => {
  const db = freshDb();
  const anon = appRouter.createCaller(ctxFor(db));
  await expect(anon.products.create({ name: "X" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(await anon.products.list()).toEqual([]);

  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const created = await admin.products.create({ name: "Mesa Urb" });
  expect(created.slug).toBe("mesa-urb");
  expect(await anon.products.list()).toHaveLength(1);
});

test("products.update/delete on a bogus id rejects with NOT_FOUND", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  await expect(admin.products.update({ id: 9999, name: "Ghost" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(admin.products.delete({ id: 9999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("images.add rejects invalid data URLs", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  await expect(admin.images.add({ productId: p.id, dataUrl: "nope" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  const img = await admin.images.add({
    productId: p.id,
    dataUrl: "data:image/png;base64," + Buffer.from("x").toString("base64"),
  });
  expect(img.url).toMatch(/^\/uploads\/.+\.png$/);
});
