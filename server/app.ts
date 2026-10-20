import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { sql } from "drizzle-orm";
import type { DB } from "./db/client";
import { UPLOADS_DIR } from "./lib/images";
import { appRouter } from "./routers";
import type { TrpcContext } from "./trpc";

/**
 * The Express app without the client (Vite in dev, dist/public in prod),
 * which index.ts mounts last because it is a catch-all.
 */
export function createApp(db: DB): Express {
  const app = express();

  // One reverse proxy (Caddy) in front; it forwards the real client IP.
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Uploaded product images: content-addressed by uuid, so cache forever.
  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "1y", immutable: true }));

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
