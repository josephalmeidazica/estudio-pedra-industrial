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
});

test("deleting a product cascades to its images", async () => {
  const db = freshDb();
  const [p] = await db.insert(products).values({ slug: "b", name: "B" }).returning();
  await db.insert(productImages).values({ productId: p.id, url: "/uploads/y.jpg" });
  await db.delete(products).where(eq(products.id, p.id));
  const left = await db.select().from(productImages);
  expect(left).toHaveLength(0);
});
