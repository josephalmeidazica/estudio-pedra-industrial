import type { Request, RequestHandler } from "express";
import { slugify } from "../shared/slug";
import type { DB } from "./db/client";
import { getPublishedBySlug, listPublished } from "./db/products.repo";
import { buildHead, injectHead, normalizeSiteUrl, renderHeadHtml, resolveRoute, type ProductForHead } from "./lib/seo";

/** `SITE_URL` from the environment, else the request's own origin (dev, LAN testing, first boot). */
export function siteUrlFor(req: Request): string {
  const env = process.env.SITE_URL;
  if (env && env.trim()) return normalizeSiteUrl(env);
  return `${req.protocol}://${req.get("host")}`;
}

/** Display label for a `?categoria=<slug>` value, or null when no published product has that category. */
export function categoryLabelFor(products: { category: string }[], slug: string): string | null {
  for (const p of products) if (p.category && slugify(p.category) === slug) return p.category;
  return null;
}

type Options = {
  /** The HTML template: `client/index.html` in dev, the built `dist/public/index.html` in prod. */
  template: () => Promise<string>;
  /** Vite's `transformIndexHtml` in dev; absent in prod. */
  transform?: (url: string, html: string) => Promise<string>;
};

/**
 * Catch-all for non-API routes: renders the per-URL <head> into the SPA
 * template and answers with the right status (404 for unknown routes and
 * unpublished/missing pieces). Mount it last.
 */
export function createPageHandler(db: DB, opts: Options): RequestHandler {
  return async (req, res, next) => {
    try {
      const url = new URL(req.originalUrl, "http://placeholder");
      const route = resolveRoute(url.pathname, url.search);
      let product: ProductForHead | null | undefined;
      let categoryLabel: string | null | undefined;
      if (route.kind === "product") product = await getPublishedBySlug(db, route.slug);
      if (route.kind === "catalog" && route.category) {
        categoryLabel = categoryLabelFor(await listPublished(db), route.category);
      }
      const head = buildHead({ route, siteUrl: siteUrlFor(req), path: url.pathname, product, categoryLabel });

      let template = await opts.template();
      if (opts.transform) template = await opts.transform(req.originalUrl, template);
      const html = injectHead(template, renderHeadHtml(head));
      res
        .status(head.status)
        .set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" })
        .send(html);
    } catch (e) {
      next(e);
    }
  };
}
