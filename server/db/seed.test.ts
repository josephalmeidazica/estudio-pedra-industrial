import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import * as repo from "./products.repo";
import { ensureProductImages, seedIfEmpty } from "./seed";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-seed-"));
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

test("seeds 9 products once and is idempotent", async () => {
  const db = freshDb();
  await seedIfEmpty(db);
  const first = await repo.listPublished(db);
  expect(first).toHaveLength(9);
  expect(first[0].slug).toBe("estrutura-gaia");
  expect(first[0].materials).toBe("Aço carbono, MDF");
  await seedIfEmpty(db);
  expect(await repo.listPublished(db)).toHaveLength(9);
});

test("ensureProductImages attaches one default image per product, idempotently", async () => {
  const db = freshDb();
  await seedIfEmpty(db);
  await ensureProductImages(db);

  const first = await repo.getBySlug(db, "mesa-urb");
  expect(first?.images).toHaveLength(1);
  expect(first!.images[0].url).toBe("/products/mesa-urb.jpg");

  // idempotent: running again adds no duplicates
  await ensureProductImages(db);
  const again = await repo.getBySlug(db, "mesa-urb");
  expect(again?.images).toHaveLength(1);

  // every seeded product got exactly one image
  const all = await repo.listAll(db);
  expect(all).toHaveLength(9);
  for (const p of all) expect(p.images).toHaveLength(1);
});

test("ensureProductImages does not touch a product that already has an image", async () => {
  const db = freshDb();
  await seedIfEmpty(db);
  const p = await repo.getBySlug(db, "mesa-urb");
  // pre-existing owner image
  await repo.listAll(db); // no-op to keep import used
  const { productImages } = await import("./schema");
  await db.insert(productImages).values({ productId: p!.id, url: "/uploads/owner.jpg", sortOrder: 0 });
  await ensureProductImages(db);
  const after = await repo.getBySlug(db, "mesa-urb");
  expect(after?.images).toHaveLength(1);
  expect(after!.images[0].url).toBe("/uploads/owner.jpg");
});
