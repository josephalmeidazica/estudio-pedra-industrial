import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type DB } from "../db/client";
import * as repo from "../db/images.repo";
import * as prods from "../db/products.repo";
import { uploadsDir } from "./images";
import { reprocessLegacyImages } from "./reprocess";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-reproc-"));
  dirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
beforeEach(() => {
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-reprocup-"));
});
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

test("reprocess converts legacy rows once, skips missing files, and is a no-op afterwards", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "P" });
  const legacyDefault = await repo.addImage(db, { productId: p.id, url: "/products/mesa-urb.jpg" });
  const missing = await repo.addImage(db, { productId: p.id, url: "/uploads/does-not-exist.jpg" });
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const legacyUpload = await repo.addImage(db, { productId: p.id, url: "/uploads/old.jpg" });
  fs.writeFileSync(
    path.join(dir, "old.jpg"),
    await sharp({ create: { width: 600, height: 400, channels: 3, background: "#000" } }).jpeg().toBuffer()
  );

  const corrupt = await repo.addImage(db, { productId: p.id, url: "/uploads/corrupt.jpg" });
  const whole = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#000" } }).jpeg().toBuffer();
  fs.writeFileSync(path.join(dir, "corrupt.jpg"), whole.subarray(0, Math.floor(whole.length * 0.5)));

  const lines: string[] = [];
  const first = await reprocessLegacyImages(db, (l) => lines.push(l));
  expect(first).toEqual({ processed: 2, skipped: 2 });
  expect(lines.some((l) => l.startsWith(`skip #${corrupt.id}`))).toBe(true);
  const rows = await repo.listForProduct(db, p.id);
  const byId = new Map(rows.map((r) => [r.id, r]));
  expect(byId.get(legacyDefault.id)!.url).toMatch(/-1080\.webp$/);
  expect(Object.keys(byId.get(legacyUpload.id)!.variants)).toEqual(["480", "600"]);
  expect(byId.get(missing.id)!.width).toBe(0);
  expect(byId.get(corrupt.id)!.width).toBe(0);
  expect(fs.existsSync(path.join(dir, "corrupt.jpg"))).toBe(true); // untouched, for the owner to inspect
  expect(fs.existsSync(path.join(dir, "old.jpg"))).toBe(false);
  expect(fs.existsSync(path.join(process.cwd(), "client", "public", "products", "mesa-urb.jpg"))).toBe(true);

  expect(await reprocessLegacyImages(db, () => {})).toEqual({ processed: 0, skipped: 2 });
});
