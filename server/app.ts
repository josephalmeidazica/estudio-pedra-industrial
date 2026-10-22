import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { sql } from "drizzle-orm";
import type { DB } from "./db/client";
import { listPublished } from "./db/products.repo";
import { UPLOADS_DIR } from "./lib/images";
import { ensureOgJpeg } from "./lib/ogImage";
import { SITE } from "../shared/content/site";
import { renderRobots, renderSitemap, sitemapEntries } from "./lib/seo";
import { siteUrlFor } from "./page";
import { appRouter } from "./routers";
import type { TrpcContext } from "./trpc";

const OG_FILE = /^([0-9a-f-]{36})\.jpg$/;

/**
 * The Express app without the client (Vite in dev, dist/public in prod) and
 * without the HTML catch-all (`createPageHandler`), which index.ts mounts last.
 */
export function createApp(db: DB): Express {
  const app = express();

  // One reverse proxy (Caddy) in front; it forwards the real client IP and protocol.
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Uploaded product images: content-addressed by uuid, so cache forever.
  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "1y", immutable: true }));

  // Share-card JPEG derived from a cover's largest WebP variant (see lib/ogImage.ts).
  app.get("/og/:file", async (req, res, next) => {
    const m = OG_FILE.exec(req.params.file);
    if (!m) return res.sendStatus(404);
    try {
      const file = await ensureOgJpeg(m[1]);
      if (!file) return res.sendStatus(404);
      res.set("Cache-Control", "public, max-age=86400").type("image/jpeg").sendFile(file);
    } catch (e) {
      next(e);
    }
  });

  // The built index.html must never be served raw: the page handler injects the head.
  app.get("/index.html", (_req, res) => res.redirect(301, "/"));

  app.get("/sitemap.xml", async (req, res, next) => {
    try {
      const site = siteUrlFor(req);
      const products = await listPublished(db);
      const entries = sitemapEntries(products, SITE.professionals !== null);
      res
        .set({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" })
        .send(renderSitemap(site, entries));
    } catch (e) {
      next(e);
    }
  });

  app.get("/robots.txt", (req, res) => {
    res
      .set({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" })
      .send(renderRobots(siteUrlFor(req)));
  });

  // Liveness + a trivial database round-trip, for pm2/Caddy/uptime checks.
  app.get("/healthz", (_req, res) => {
    try {
      db.get(sql`select 1`);
      res.json({ ok: true });
    } catch (e) {
      console.error("[healthz]", e);
      res.status(500).json({ ok: false });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }): TrpcContext => ({ req, res, db }),
    })
  );

  return app;
}
