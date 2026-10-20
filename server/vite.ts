import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { type Server } from "http";
import { createServer as createViteServer } from "vite";

// Anchored to process.cwd() — see server/db/client.ts for why this must not
// be derived from __dirname (breaks once the server is bundled to dist/).
// Shared convention across client.ts, lib/images.ts, and this module.
const ROOT = process.cwd();

export type HtmlTransform = (url: string, html: string) => Promise<string>;

/**
 * Development: mount Vite as middleware so the client is served with HMR.
 * The HTML itself is answered by the page handler (server/page.ts), which
 * runs the returned transform so Vite can inject its client scripts.
 */
export async function setupVite(app: Express, server: Server): Promise<{ transform: HtmlTransform }> {
  const vite = await createViteServer({
    configFile: path.resolve(ROOT, "vite.config.ts"),
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });
  app.use(vite.middlewares);
  return {
    transform: async (url, html) => {
      try {
        return await vite.transformIndexHtml(url, html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        throw e;
      }
    },
  };
}

export function devTemplate(): Promise<string> {
  return fs.promises.readFile(path.resolve(ROOT, "client", "index.html"), "utf-8");
}

/**
 * Production: serve the built assets from dist/public. `index: false` keeps
 * express.static from answering `GET /` with the raw index.html; the page
 * handler renders it with the per-URL head instead.
 */
export function serveStatic(app: Express): void {
  const distPath = path.resolve(ROOT, "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(`Build directory not found: ${distPath}. Run "npm run build" first.`);
  }
  app.use(express.static(distPath, { index: false }));
}

/** The built template, read once at boot. */
export async function prodTemplate(): Promise<() => Promise<string>> {
  const html = await fs.promises.readFile(path.resolve(ROOT, "dist", "public", "index.html"), "utf-8");
  return async () => html;
}
