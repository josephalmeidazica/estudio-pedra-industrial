import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import * as prods from "./products.repo";
import * as repo from "./images.repo";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-img-"));
  dirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

test("addImage assigns increasing sortOrder", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "P" });
  const a = await repo.addImage(db, { productId: p.id, url: "/uploads/a.jpg" });
  const b = await repo.addImage(db, { productId: p.id, url: "/uploads/b.jpg" });
  expect(a.sortOrder).toBe(0);
  expect(b.sortOrder).toBe(1);
});

test("deleteImage returns the url and removes the row", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "P" });
  const a = await repo.addImage(db, { productId: p.id, url: "/uploads/a.jpg" });
  expect(await repo.deleteImage(db, a.id)).toBe("/uploads/a.jpg");
  expect(await repo.deleteImage(db, 9999)).toBeNull();
  expect(await repo.listForProduct(db, p.id)).toHaveLength(0);
});

test("setCover moves the chosen image to the front", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "P" });
  const a = await repo.addImage(db, { productId: p.id, url: "/uploads/a.jpg" });
  const b = await repo.addImage(db, { productId: p.id, url: "/uploads/b.jpg" });
  await repo.setCover(db, b.id);
  const list = await repo.listForProduct(db, p.id);
  expect(list.map((i) => i.id)).toEqual([b.id, a.id]);
});
