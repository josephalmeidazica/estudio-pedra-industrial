import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb } from "./client";
import { productImages, products } from "./schema";

const tmpDirs: string[] = [];
const openDbs: ReturnType<typeof createDb>[] = [];
function freshDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-db-"));
  tmpDirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

test("migrations create tables and CRUD works", async () => {
  const db = freshDb();
  const [p] = await db.insert(products).values({ slug: "a", name: "A" }).returning();
  expect(p.id).toBeGreaterThan(0);
  expect(p.published).toBe(true);
  const [img] = await db
    .insert(productImages)
    .values({ productId: p.id, url: "/uploads/x.jpg" })
    .returning();
  expect(img.productId).toBe(p.id);
  expect(img.width).toBe(0);
  expect(img.height).toBe(0);
  expect(img.variants).toEqual({});
});

test("deleting a product cascades to its images", async () => {
  const db = freshDb();
  const [p] = await db.insert(products).values({ slug: "b", name: "B" }).returning();
  await db.insert(productImages).values({ productId: p.id, url: "/uploads/y.jpg" });
  await db.delete(products).where(eq(products.id, p.id));
  const left = await db.select().from(productImages);
  expect(left).toHaveLength(0);
});

test("importing the module does not open the default database; getDb() does, once", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-lazy-"));
  tmpDirs.push(dir);
  const file = path.join(dir, "lazy.db");
  process.env.DATABASE_PATH = file;
  const mod = await import("./client?lazy=" + Date.now());
  expect(fs.existsSync(file)).toBe(false);
  const a = mod.getDb();
  openDbs.push(a);
  expect(fs.existsSync(file)).toBe(true);
  expect(mod.getDb()).toBe(a);
  delete process.env.DATABASE_PATH;
});
