import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import { productImages } from "./schema";
import * as repo from "./products.repo";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-repo-"));
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

test("create generates a unique slug and defaults", async () => {
  const db = freshDb();
  const a = await repo.createProduct(db, { name: "Mesa Urb" });
  const b = await repo.createProduct(db, { name: "Mesa Urb" });
  expect(a.slug).toBe("mesa-urb");
  expect(b.slug).toBe("mesa-urb-2");
  expect(a.published).toBe(true);
});

test("listPublished hides unpublished and orders by sortOrder", async () => {
  const db = freshDb();
  await repo.createProduct(db, { name: "Second", sortOrder: 1 });
  await repo.createProduct(db, { name: "First", sortOrder: 0 });
  await repo.createProduct(db, { name: "Hidden", published: false });
  const list = await repo.listPublished(db);
  expect(list.map((p) => p.name)).toEqual(["First", "Second"]);
  expect(list[0].images).toEqual([]);
});

test("getBySlug returns product with images, null when missing", async () => {
  const db = freshDb();
  const p = await repo.createProduct(db, { name: "Lamp" });
  await db.insert(productImages).values({ productId: p.id, url: "/uploads/a.jpg", sortOrder: 0 });
  const got = await repo.getBySlug(db, "lamp");
  expect(got?.images[0].url).toBe("/uploads/a.jpg");
  expect(await repo.getBySlug(db, "nope")).toBeNull();
});

test("update changes fields and re-slugs on demand", async () => {
  const db = freshDb();
  const p = await repo.createProduct(db, { name: "Old" });
  const up = await repo.updateProduct(db, p.id, { name: "New Name", slug: "New Name", price: 100 });
  expect(up.name).toBe("New Name");
  expect(up.slug).toBe("new-name");
  expect(up.price).toBe(100);
});

test("delete returns image urls and cascades", async () => {
  const db = freshDb();
  const p = await repo.createProduct(db, { name: "Has Images" });
  await db.insert(productImages).values({ productId: p.id, url: "/uploads/x.jpg" });
  const urls = await repo.deleteProduct(db, p.id);
  expect(urls).toEqual(["/uploads/x.jpg"]);
  expect(await repo.getBySlug(db, "has-images")).toBeNull();
});

test("update and delete on a bogus id return undefined instead of throwing", async () => {
  const db = freshDb();
  expect(await repo.updateProduct(db, 9999, { name: "Ghost" })).toBeUndefined();
  expect(await repo.deleteProduct(db, 9999)).toBeUndefined();
});

test("reorder sets sortOrder by index", async () => {
  const db = freshDb();
  const a = await repo.createProduct(db, { name: "A" });
  const b = await repo.createProduct(db, { name: "B" });
  await repo.reorderProducts(db, [b.id, a.id]);
  const list = await repo.listPublished(db);
  expect(list.map((p) => p.name)).toEqual(["B", "A"]);
});
