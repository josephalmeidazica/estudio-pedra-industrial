import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import * as gallery from "./gallery.repo";
import * as images from "./images.repo";
import * as prods from "./products.repo";
import * as trash from "./trash.repo";
import { processImage } from "../lib/imagePipeline";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-trash-"));
  dirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
beforeEach(() => {
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-trashup-"));
});
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

test("soft delete hides from every read; restore brings it back; images follow their product", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Mesa Urb" });
  const img = await images.addImage(db, { productId: p.id, url: "/uploads/x-480.webp", width: 480, height: 300, variants: {} });
  expect(await trash.softDelete(db, "product", p.id)).toBe(true);
  expect(await trash.softDelete(db, "product", p.id)).toBe(false);
  expect(await prods.listPublished(db)).toEqual([]);
  expect(await prods.listAll(db)).toEqual([]);
  expect(await prods.getPublishedBySlug(db, "mesa-urb")).toBeNull();
  const t = await trash.listTrash(db);
  expect(t.products.map((x) => x.id)).toEqual([p.id]);
  expect(t.products[0].images.map((i) => i.id)).toEqual([img.id]);
  expect(t.images).toEqual([]); // travels with its product
  expect(await trash.restore(db, "product", p.id)).toBe(true);
  expect((await prods.getBySlug(db, "mesa-urb"))!.images).toHaveLength(1);
});

test("image soft delete: cover rule, trash listing with product name, restore of an image restores a deleted product", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Mesa" });
  const a = await images.addImage(db, { productId: p.id, url: "/uploads/a-480.webp", width: 480, height: 300, variants: {} });
  const b = await images.addImage(db, { productId: p.id, url: "/uploads/b-480.webp", width: 480, height: 300, variants: {} });
  await trash.softDelete(db, "image", a.id);
  expect((await prods.getBySlug(db, "mesa"))!.images.map((i) => i.id)).toEqual([b.id]);
  expect((await trash.listTrash(db)).images.map((i) => [i.id, i.productName])).toEqual([[a.id, "Mesa"]]);
  await trash.softDelete(db, "product", p.id);
  expect(await trash.restore(db, "image", a.id)).toBe(true);
  expect((await prods.getBySlug(db, "mesa"))!.images.map((i) => i.id)).toEqual([a.id, b.id]);
});

test("purge and purgeExpired remove rows and report every file url; a fresh deletion survives", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Velha" });
  const processed = await processImage(
    await sharp({ create: { width: 600, height: 400, channels: 3, background: "#000" } }).png().toBuffer()
  );
  await images.addImage(db, { productId: p.id, ...processed });
  const g = await gallery.addGalleryImage(db, { url: "/uploads/g-480.webp", width: 480, height: 600, variants: {} });
  const old = new Date("2026-01-01T00:00:00Z");
  await trash.softDelete(db, "product", p.id, old);
  await trash.softDelete(db, "gallery", g.id, new Date("2026-02-20T00:00:00Z"));
  const urls = await trash.purgeExpired(db, new Date("2026-02-15T00:00:00Z"));
  expect(urls).toEqual([processed.url]);
  expect(await prods.getBySlug(db, "velha")).toBeNull();
  expect((await trash.listTrash(db)).gallery.map((x) => x.id)).toEqual([g.id]);
  expect(await trash.purge(db, "gallery", g.id)).toEqual(["/uploads/g-480.webp"]);
  expect(await trash.listTrash(db)).toEqual({ products: [], images: [], gallery: [] });
});
