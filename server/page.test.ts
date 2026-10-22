import fs from "node:fs";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type DB } from "./db/client";
import * as images from "./db/images.repo";
import * as prods from "./db/products.repo";
import { processImage } from "./lib/imagePipeline";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-page-"));
  dirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
beforeEach(() => {
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-pageup-"));
  delete process.env.SITE_URL;
});
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
  delete process.env.SITE_URL;
});

const TEMPLATE =
  '<!doctype html><html><head><title>Old</title><!--app-head--></head><body><div id="root"></div></body></html>';

async function serve(db: DB) {
  const { createApp } = await import("./app");
  const { createPageHandler } = await import("./page");
  const app = createApp(db);
  app.use("*", createPageHandler(db, { template: async () => TEMPLATE }));
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const get = (p: string, headers: Record<string, string> = {}) =>
    fetch(`http://127.0.0.1:${port}${p}`, { headers, redirect: "manual" });
  return { server, port, get };
}

test("product page head, 404s, og image, sitemap and robots", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Mesa Urb", description: "Mesa urbana em aço.", category: "Mesas" });
  // a real cover through the pipeline so /og/<uuid>.jpg has a WebP to derive from
  const processed = await processImage(
    await sharp({ create: { width: 1000, height: 700, channels: 3, background: "#333" } }).png().toBuffer()
  );
  await images.addImage(db, { productId: p.id, ...processed });
  await prods.createProduct(db, { name: "Rascunho", published: false });
  const { server, get } = await serve(db);
  try {
    const page = await get("/catalogo/mesa-urb");
    expect(page.status).toBe(200);
    expect(page.headers.get("cache-control")).toBe("no-cache");
    const html = await page.text();
    expect(html).toContain("<title>Mesa Urb — Estúdio Pedra Industrial</title>");
    expect(html).toMatch(/<meta property="og:image" content="http:\/\/127\.0\.0\.1:\d+\/og\/[0-9a-f-]{36}\.jpg">/);
    expect(html).toContain('<meta property="og:image:width" content="1000">');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).not.toContain("<title>Old</title>");

    const ogUrl = html.match(/og:image" content="([^"]+)"/)![1];
    const og = await fetch(ogUrl);
    expect(og.status).toBe(200);
    expect(og.headers.get("content-type")).toContain("image/jpeg");
    expect(og.headers.get("cache-control")).toBe("public, max-age=86400");
    const meta = await sharp(Buffer.from(await og.arrayBuffer())).metadata();
    expect([meta.format, meta.width]).toEqual(["jpeg", 1000]);
    expect(fs.existsSync(path.join(process.env.UPLOADS_DIR!, "og"))).toBe(true);
    expect((await get("/og/00000000-0000-0000-0000-000000000000.jpg")).status).toBe(404);
    expect((await get("/og/../../etc/passwd")).status).toBe(404);

    expect((await get("/catalogo/rascunho")).status).toBe(404);
    const missing = await get("/nao-existe");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('content="noindex, nofollow"');
    expect((await get("/admin")).status).toBe(200);
    expect((await get("/index.html")).status).toBe(301);

    const sm = await get("/sitemap.xml");
    expect(sm.headers.get("content-type")).toContain("application/xml");
    expect(sm.headers.get("cache-control")).toBe("public, max-age=3600");
    const xml = await sm.text();
    expect(xml).toContain("/catalogo/mesa-urb</loc>");
    expect(xml).not.toContain("rascunho");
    for (const p of ["/processo", "/duvidas", "/sobre"]) expect(xml).toContain(`${p}</loc>`);
    expect(xml).not.toContain("/para-profissionais");
    expect((await get("/para-profissionais")).status).toBe(404);
    expect(await (await get("/sobre")).text()).toContain("<title>Sobre nós — Estúdio Pedra Industrial</title>");
    expect(await (await get("/robots.txt")).text()).toContain("Disallow: /admin");

    // behind the proxy, the fallback site URL honours X-Forwarded-Proto
    const proxied = await (await get("/", { "X-Forwarded-Proto": "https" })).text();
    expect(proxied).toContain('<link rel="canonical" href="https://127.0.0.1:');

    process.env.SITE_URL = "https://example.com.br/";
    expect(await (await get("/contato")).text()).toContain('<link rel="canonical" href="https://example.com.br/contato">');

    // category label comes from the live catalog
    expect(await (await get("/catalogo?categoria=mesas")).text()).toContain(
      "<title>Mesas — Portfólio | Estúdio Pedra Industrial</title>"
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
