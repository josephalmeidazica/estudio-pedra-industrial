import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type DB } from "../db/client";
import { HEIC_MESSAGE, UNSUPPORTED_IMAGE_MESSAGE } from "../lib/imagePipeline";
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
beforeEach(() => {
  process.env.ADMIN_PASSWORD = "test-token";
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-rtup-"));
});
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

async function pngDataUrl(w: number, h: number) {
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: "#000" } })
    .png()
    .toBuffer();
  return "data:image/png;base64," + buf.toString("base64");
}
const uploads = () => (fs.existsSync(process.env.UPLOADS_DIR!) ? fs.readdirSync(process.env.UPLOADS_DIR!) : []);

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

test("images.add processes uploads into webp variants", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  await expect(admin.images.add({ productId: p.id, dataUrl: "nope" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  const img = await admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(1000, 500) });
  expect(img.url).toMatch(/^\/uploads\/[0-9a-f-]{36}-1000\.webp$/);
  expect([img.width, img.height]).toEqual([1000, 500]);
  expect(Object.keys(img.variants)).toEqual(["480", "960", "1000"]);
  expect(uploads()).toHaveLength(3);
});

test("images.add rejects HEIC with the Portuguese guidance and stores nothing", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(12)]);
  await expect(
    admin.images.add({ productId: p.id, dataUrl: "data:image/heic;base64," + heic.toString("base64") })
  ).rejects.toMatchObject({ code: "BAD_REQUEST", message: HEIC_MESSAGE });
  expect(uploads()).toEqual([]);
  expect((await admin.products.listAll())[0].images).toEqual([]);
});

test("images.add maps a corrupt file to BAD_REQUEST in Portuguese, and a server fault to INTERNAL_SERVER_ERROR", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  const whole = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#000" } }).jpeg().toBuffer();
  const truncated = whole.subarray(0, Math.floor(whole.length * 0.5));
  await expect(
    admin.images.add({ productId: p.id, dataUrl: "data:image/jpeg;base64," + truncated.toString("base64") })
  ).rejects.toMatchObject({ code: "BAD_REQUEST", message: UNSUPPORTED_IMAGE_MESSAGE });
  expect(uploads()).toEqual([]);

  // Uploads dir is a regular file: mkdir fails. That is our fault, not the owner's.
  const blocker = path.join(os.tmpdir(), `eps-blocker-${Date.now()}`);
  fs.writeFileSync(blocker, "x");
  process.env.UPLOADS_DIR = blocker;
  await expect(admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(100, 100) })).rejects.toMatchObject({
    code: "INTERNAL_SERVER_ERROR",
  });
  fs.rmSync(blocker, { force: true });
});

test("images.delete and products.delete are soft: files stay until the product is purged from the trash", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  const a = await admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(1000, 500) });
  await admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(600, 600) });
  expect(uploads()).toHaveLength(5);
  await admin.images.delete({ imageId: a.id });
  expect(uploads()).toHaveLength(5);
  await admin.products.delete({ id: p.id });
  expect(uploads()).toHaveLength(5);
  await admin.trash.purge({ kind: "product", id: p.id });
  expect(uploads()).toHaveLength(0);
});

test("admin deletes are soft; trash lists, restores and purges; files go only on purge", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const anon = appRouter.createCaller(ctxFor(db));
  const p = await admin.products.create({ name: "P" });
  const img = await admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(600, 400) });
  await admin.images.delete({ imageId: img.id });
  expect(uploads()).toHaveLength(2); // files kept
  expect((await anon.products.list())[0].images).toEqual([]);
  expect((await admin.trash.list()).images.map((i) => i.id)).toEqual([img.id]);
  await admin.trash.restore({ kind: "image", id: img.id });
  expect((await anon.products.list())[0].images).toHaveLength(1);
  await admin.products.delete({ id: p.id });
  expect(await anon.products.list()).toEqual([]);
  expect(await anon.products.getBySlug({ slug: "p" })).toBeNull();
  await expect(admin.trash.restore({ kind: "product", id: 9999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await admin.trash.purge({ kind: "product", id: p.id });
  expect(uploads()).toEqual([]);
  expect(await admin.trash.list()).toEqual({ products: [], images: [], gallery: [] });
});

test("discardEmptyDraft is enforced server-side", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const draft = await admin.products.create({ name: "Nova peça", published: false });
  await admin.images.add({ productId: draft.id, dataUrl: await pngDataUrl(100, 100) });
  expect(await admin.products.discardEmptyDraft({ id: draft.id })).toEqual({ discarded: false });
  const empty = await admin.products.create({ name: "Nova peça", published: false });
  expect(await admin.products.discardEmptyDraft({ id: empty.id })).toEqual({ discarded: true });
  expect((await admin.products.listAll()).map((x) => x.id)).toEqual([draft.id]);
});

test("public getBySlug returns null for unpublished products", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const anon = appRouter.createCaller(ctxFor(db));
  await admin.products.create({ name: "Draft", published: false, isCustom: true });
  expect(await anon.products.getBySlug({ slug: "draft" })).toBeNull();
  expect((await admin.products.listAll())[0].isCustom).toBe(true);
});

test("gallery router: public list, admin add/update/delete with variant cleanup", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const anon = appRouter.createCaller(ctxFor(db));
  await expect(anon.gallery.add({ dataUrl: await pngDataUrl(600, 750) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  const g = await admin.gallery.add({ dataUrl: await pngDataUrl(600, 750), caption: "Sala" });
  expect(Object.keys(g.variants)).toEqual(["480", "600"]);
  expect((await anon.gallery.list())[0].caption).toBe("Sala");
  await admin.gallery.update({ id: g.id, caption: "Cozinha", productId: null });
  expect((await anon.gallery.list())[0].caption).toBe("Cozinha");
  await expect(admin.gallery.update({ id: 9999, caption: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await admin.gallery.delete({ id: g.id });
  expect(await anon.gallery.list()).toEqual([]);
  expect(uploads()).toHaveLength(2); // soft delete keeps the files
  expect((await admin.trash.list()).gallery.map((x) => x.id)).toEqual([g.id]);
  await admin.trash.purge({ kind: "gallery", id: g.id });
  expect(uploads()).toEqual([]);
});

test("products.create accepts finishes and details", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const ok = await admin.products.create({ name: "Y", finishes: "Preto", details: "d" });
  expect([ok.finishes, ok.details]).toEqual(["Preto", "d"]);
});
