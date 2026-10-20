import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import * as repo from "./gallery.repo";
import * as prods from "./products.repo";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-gal-"));
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

test("gallery images order, update and delete; deleting the related product nulls productId", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Mesa" });
  const a = await repo.addGalleryImage(db, {
    url: "/uploads/a-480.webp",
    width: 480,
    height: 600,
    variants: { "480": "/uploads/a-480.webp" },
  });
  const b = await repo.addGalleryImage(db, {
    url: "/uploads/b-480.webp",
    width: 480,
    height: 600,
    variants: {},
    caption: "Sala",
    productId: p.id,
  });
  expect([a.sortOrder, b.sortOrder]).toEqual([0, 1]);
  await repo.reorderGallery(db, [b.id, a.id]);
  expect((await repo.listGallery(db)).map((g) => g.id)).toEqual([b.id, a.id]);
  const up = await repo.updateGalleryImage(db, a.id, { caption: "Quarto", productId: p.id });
  expect([up!.caption, up!.productId]).toEqual(["Quarto", p.id]);
  await prods.deleteProduct(db, p.id);
  expect((await repo.listGallery(db)).every((g) => g.productId === null)).toBe(true);
  expect(await repo.deleteGalleryImage(db, a.id)).toBe("/uploads/a-480.webp");
  expect(await repo.deleteGalleryImage(db, 9999)).toBeNull();
  expect(await repo.listGallery(db)).toHaveLength(1);
});
