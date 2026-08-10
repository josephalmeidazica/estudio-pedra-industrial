import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { type Server } from "http";
import { createServer as createViteServer } from "vite";

// Anchored to process.cwd() — see server/db/client.ts for why this must not
// be derived from __dirname (breaks once the server is bundled to dist/).
// Shared convention across client.ts, lib/images.ts, and this module.
const ROOT = process.cwd();

/** Development: mount Vite as middleware so the client is served with HMR. */
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    configFile: path.resolve(ROOT, "vite.config.ts"),
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(
        path.resolve(ROOT, "client", "index.html"),
        "utf-8"
      );
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/** Production: serve the built client from dist/public. */
export function serveStatic(app: Express) {
  const distPath = path.resolve(ROOT, "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Build directory not found: ${distPath}. Run "npm run build" first.`
    );
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
