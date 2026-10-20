# Batch 3 — Link previews and search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every public URL answers with a server-rendered `<head>` (title, description, canonical, Open Graph/Twitter tags, JSON-LD), plus `/sitemap.xml` and `/robots.txt`, so WhatsApp/Instagram previews and Google results describe the actual page.

**Architecture:** A pure SEO module (`server/lib/seo.ts`) turns a route + data into `HeadData` and HTML strings; a shared text module (`shared/seo-text.ts`) holds the title/description strings so server and client agree. One Express page handler (`server/page.ts`) resolves the route, loads what it needs from SQLite, injects the head into the HTML template (Vite-transformed in dev, `dist/public/index.html` in prod) and sets the status. `createApp` gains the sitemap and robots routes. The client only gains a `usePageTitle` hook.

**Tech Stack:** Express 4, Drizzle/better-sqlite3, sharp (one-off image script), React 19 + wouter, vitest.

**Spec:** `docs/superpowers/specs/2026-10-20-batch3-seo-previews-design.md`

## Global Constraints

- Branch `feat/batch3-seo-previews`, stacked on `feat/batch2-quote-flow` (PR #7). Commits `feat(seo): …` / `docs: …` / `chore: …`.
- No visible page changes. Head tags, two text endpoints, one default image.
- Copy is exactly the spec's §4.2 table and §4.4 lists (reproduced in Task 1/2 tests). `og:locale` `pt_BR`; `theme-color` `#d2b389`; site name `Estúdio Pedra Industrial`.
- Absolute URLs from `SITE_URL` (trailing slash stripped) or `${req.protocol}://${req.get("host")}`.
- 404 status + `noindex, nofollow` for unknown routes and unpublished/missing slugs; `/admin` 200 + `noindex, nofollow`.
- HTML responses `Cache-Control: no-cache`; sitemap/robots `public, max-age=3600`.
- Run `npm run check` at the end of every task.

## Review Focus

1. **Owner text with `<`, `&`, quotes or `</script>` in a product description**: escaped in meta attributes and inside JSON-LD (no tag break-out). Test in Task 2.
2. **Product without photos**: falls back to the default image with its dimensions and alt. Test in Task 2.
3. **`SITE_URL` with a trailing slash**, or unset behind the reverse proxy: trailing slash stripped; behind `trust proxy` the fallback honours `X-Forwarded-Proto` so URLs are `https`. Tests in Tasks 2 and 4.
4. **Paths with a trailing slash or percent-encoded slug** (`/catalogo/`, `/catalogo/m%C3%B3vel`): resolved like their clean forms; a decoded slug that matches nothing is a 404. Test in Task 2.
5. **Stale template without the marker** (old `dist/` after a partial deploy): head still injected before `</head>`, title still replaced. Test in Task 2.

---

### Task 1: Shared SEO text

**Files:**
- Create: `shared/seo-text.ts`, `shared/seo-text.test.ts`
- Modify: `vitest.config.ts` (`include` gains `"shared/**/*.test.ts"`)

**Interfaces:**
- `SITE_NAME = "Estúdio Pedra Industrial"`
- `DEFAULT_DESCRIPTION = "Móveis industriais sob medida em aço carbono e MDF, feitos em Belo Horizonte. Peça um orçamento pelo WhatsApp."`
- `titles = { home(): string; catalog(): string; category(label: string): string; product(name: string): string; contact(): string; notFound(): string; admin(): string }` returning exactly the §4.2 strings.
- `descriptions = { catalog(): string; category(label: string): string; contact(): string; product(description: string, materials: string): string }`.
- `firstSentence(text: string): string` — up to and including the first `.`, `!` or `?` followed by whitespace/end, or the first line; whole text when none.
- `truncateAtWord(text: string, max = 160): string` — unchanged when `≤ max`; else cut at the last space before `max - 1` and append `…`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";
import { DEFAULT_DESCRIPTION, descriptions, firstSentence, titles, truncateAtWord } from "./seo-text";

test("titles follow the spec table", () => {
  expect(titles.home()).toBe("Estúdio Pedra Industrial — Móveis industriais sob medida em Belo Horizonte");
  expect(titles.catalog()).toBe("Portfólio — Estúdio Pedra Industrial");
  expect(titles.category("Mesas")).toBe("Mesas — Portfólio | Estúdio Pedra Industrial");
  expect(titles.product("Mesa Urb")).toBe("Mesa Urb — Estúdio Pedra Industrial");
  expect(titles.contact()).toBe("Contato — Estúdio Pedra Industrial");
  expect(titles.notFound()).toBe("Página não encontrada — Estúdio Pedra Industrial");
  expect(titles.admin()).toBe("Administração");
});

test("firstSentence and truncateAtWord", () => {
  expect(firstSentence("Mesa urbana em aço. Design contemporâneo.")).toBe("Mesa urbana em aço.");
  expect(firstSentence("Sem ponto final")).toBe("Sem ponto final");
  expect(firstSentence("Linha um\nLinha dois")).toBe("Linha um");
  expect(truncateAtWord("curto", 160)).toBe("curto");
  const long = "palavra ".repeat(40).trim();
  const t = truncateAtWord(long, 50);
  expect(t.length).toBeLessThanOrEqual(50);
  expect(t.endsWith("…")).toBe(true);
  expect(t).not.toMatch(/ …$/);
});

test("product description = first sentence + materials + tail, capped at 160", () => {
  expect(descriptions.product("Mesa urbana em aço carbono com design contemporâneo", "Aço carbono, MDF")).toBe(
    "Mesa urbana em aço carbono com design contemporâneo. Materiais: Aço carbono, MDF. Sob medida em Belo Horizonte. Peça um orçamento pelo WhatsApp."
  );
  expect(descriptions.product("", "")).toBe(DEFAULT_DESCRIPTION);
  expect(descriptions.product("x".repeat(200), "").length).toBeLessThanOrEqual(160);
  expect(descriptions.category("Mesas")).toBe("Peças da categoria Mesas em aço carbono e MDF, sob medida. Peça um orçamento pelo WhatsApp.");
});
```
Note the first product case: the source sentence has no final period, so one is added before the materials.

- [ ] **Step 2: Run** `npx vitest run shared` → FAIL (module missing; include pattern added first).
- [ ] **Step 3: Implement** `shared/seo-text.ts`; add the vitest include.
- [ ] **Step 4: Run** `npx vitest run shared && npm run check` → PASS; clean.
- [ ] **Step 5: Commit** `feat(seo): shared page titles and descriptions`.

---

### Task 2: Pure head rendering, sitemap, robots

**Files:**
- Create: `server/lib/seo.ts`, `server/lib/seo.test.ts`

**Interfaces:**
- `type Route = { kind: "home" } | { kind: "catalog"; category: string | null } | { kind: "product"; slug: string } | { kind: "contact" } | { kind: "admin" } | { kind: "unknown" }`
- `resolveRoute(pathname: string, search: string): Route` — strips a trailing slash (except `/`), percent-decodes the slug, reads `categoria` from `search`.
- `type HeadImage = { url: string; width: number; height: number; alt: string }`
- `type HeadData = { title: string; description: string | null; canonical: string | null; robots: "index, follow" | "noindex, nofollow"; ogType: "website" | "product"; image: HeadImage | null; url: string; jsonLd: object[]; status: 200 | 404 }`
- `type ProductForHead = { name: string; slug: string; description: string; category: string; materials: string; images: { url: string; width: number; height: number }[] }`
- `buildHead(args: { route: Route; siteUrl: string; path: string; product?: ProductForHead | null; categoryLabel?: string | null }): HeadData` — `product` is the published row or `null` when missing; `categoryLabel` is the label for a known `categoria` slug, `null`/undefined for unknown (treated as plain catalog).
- `DEFAULT_IMAGE: Omit<HeadImage, "url"> & { path: "/og-default.jpg" }` with `1200×630` and alt `Estúdio Pedra Industrial — móveis industriais sob medida`.
- `renderHeadHtml(head: HeadData): string` — `<title>`, `meta description` (when not null), `link canonical` (when not null), `meta robots`, `meta theme-color`, OG + Twitter tags (image tags only when `image`), one `<script type="application/ld+json">` per `jsonLd` entry with `<` escaped as `\u003c`. All attribute text HTML-escaped.
- `injectHead(template: string, headHtml: string): string` — replaces `<title>…</title>` and `<!--app-head-->`; without the marker, inserts before `</head>`.
- `renderSitemap(siteUrl: string, entries: { path: string; lastmod?: Date }[]): string`; `renderRobots(siteUrl: string): string` (exact §4.5 text).
- `normalizeSiteUrl(raw: string): string` (strip trailing slashes).

- [ ] **Step 1: Write the failing tests** (`server/lib/seo.test.ts`), one `test` per group:

```ts
const site = "https://example.com.br";
const mesa: ProductForHead = { name: "Mesa Urb", slug: "mesa-urb", description: "Mesa urbana em aço carbono com design contemporâneo", category: "Mesas", materials: "Aço carbono, MDF",
  images: [{ url: "/uploads/a-1080.webp", width: 1080, height: 1301 }] };

test("resolveRoute", () => {
  expect(resolveRoute("/", "")).toEqual({ kind: "home" });
  expect(resolveRoute("/catalogo", "")).toEqual({ kind: "catalog", category: null });
  expect(resolveRoute("/catalogo/", "?categoria=mesas")).toEqual({ kind: "catalog", category: "mesas" });
  expect(resolveRoute("/catalogo/m%C3%B3vel-x/", "")).toEqual({ kind: "product", slug: "móvel-x" });
  expect(resolveRoute("/contato", "")).toEqual({ kind: "contact" });
  expect(resolveRoute("/admin", "")).toEqual({ kind: "admin" });
  expect(resolveRoute("/qualquer", "")).toEqual({ kind: "unknown" });
  expect(resolveRoute("/catalogo/a/b", "")).toEqual({ kind: "unknown" });
});

test("product head: title, description, canonical, cover image, product JSON-LD + breadcrumb", () => {
  const h = buildHead({ route: { kind: "product", slug: "mesa-urb" }, siteUrl: site, path: "/catalogo/mesa-urb", product: mesa });
  expect(h.status).toBe(200);
  expect(h.title).toBe("Mesa Urb — Estúdio Pedra Industrial");
  expect(h.canonical).toBe("https://example.com.br/catalogo/mesa-urb");
  expect(h.ogType).toBe("product");
  expect(h.image).toEqual({ url: "https://example.com.br/uploads/a-1080.webp", width: 1080, height: 1301, alt: "Mesa Urb" });
  const types = h.jsonLd.map((j: any) => j["@type"]);
  expect(types).toEqual(["Product", "BreadcrumbList"]);
  expect((h.jsonLd[0] as any).offers).toBeUndefined();
  expect((h.jsonLd[0] as any).image).toEqual(["https://example.com.br/uploads/a-1080.webp"]);
});

test("missing or unpublished product, unknown route and admin", () => {
  const nf = buildHead({ route: { kind: "product", slug: "x" }, siteUrl: site, path: "/catalogo/x", product: null });
  expect([nf.status, nf.robots, nf.canonical]).toEqual([404, "noindex, nofollow", null]);
  expect(nf.title).toBe("Página não encontrada — Estúdio Pedra Industrial");
  expect(buildHead({ route: { kind: "unknown" }, siteUrl: site, path: "/zzz" }).status).toBe(404);
  const admin = buildHead({ route: { kind: "admin" }, siteUrl: site, path: "/admin" });
  expect([admin.status, admin.robots, admin.description, admin.image]).toEqual([200, "noindex, nofollow", null, null]);
});

test("home, catalog and category heads", () => {
  const home = buildHead({ route: { kind: "home" }, siteUrl: site, path: "/" });
  expect(home.jsonLd.map((j: any) => j["@type"])).toEqual([["LocalBusiness", "HomeAndConstructionBusiness"]]);
  expect(home.image?.url).toBe("https://example.com.br/og-default.jpg");
  const cat = buildHead({ route: { kind: "catalog", category: "mesas" }, siteUrl: site, path: "/catalogo", categoryLabel: "Mesas" });
  expect(cat.title).toBe("Mesas — Portfólio | Estúdio Pedra Industrial");
  expect(cat.canonical).toBe("https://example.com.br/catalogo");
  const unknownCat = buildHead({ route: { kind: "catalog", category: "zzz" }, siteUrl: site, path: "/catalogo", categoryLabel: null });
  expect(unknownCat.title).toBe("Portfólio — Estúdio Pedra Industrial");
});

test("product without photos uses the default image", () => {
  const h = buildHead({ route: { kind: "product", slug: "s" }, siteUrl: site, path: "/catalogo/s", product: { ...mesa, images: [] } });
  expect(h.image).toEqual({ url: "https://example.com.br/og-default.jpg", width: 1200, height: 630, alt: "Estúdio Pedra Industrial — móveis industriais sob medida" });
});

test("renderHeadHtml escapes owner text in attributes and JSON-LD", () => {
  const evil = { ...mesa, name: `Mesa "Loft" <b>&</b>`, description: "x</script><script>alert(1)</script>" };
  const html = renderHeadHtml(buildHead({ route: { kind: "product", slug: "s" }, siteUrl: site, path: "/catalogo/s", product: evil }));
  expect(html).toContain('<title>Mesa &quot;Loft&quot; &lt;b&gt;&amp;&lt;/b&gt; — Estúdio Pedra Industrial</title>');
  expect(html).not.toContain("</script><script>alert");
  expect(html).toContain('\\u003c/script');
  expect(html).toContain('<meta property="og:locale" content="pt_BR">');
  expect(html).toContain('<meta name="theme-color" content="#d2b389">');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
});

test("injectHead with and without the marker", () => {
  const head = "<title>T</title><meta name=\"x\" content=\"y\">";
  const withMarker = "<html><head><title>Old</title><link rel=\"icon\"><!--app-head--></head><body></body></html>";
  const out = injectHead(withMarker, head);
  expect(out).not.toContain("<title>Old</title>");
  expect(out).toContain('<link rel="icon"><title>T</title>');
  expect(out).not.toContain("app-head");
  const stale = "<html><head><title>Old</title></head><body></body></html>";
  const out2 = injectHead(stale, head);
  expect(out2).toBe('<html><head><title>T</title><meta name="x" content="y"></head><body></body></html>');
});

test("sitemap, robots, normalizeSiteUrl", () => {
  const xml = renderSitemap(site, [{ path: "/" }, { path: "/catalogo/mesa-urb", lastmod: new Date("2026-10-20T12:00:00Z") }]);
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  expect(xml).toContain("<loc>https://example.com.br/catalogo/mesa-urb</loc>");
  expect(xml).toContain("<lastmod>2026-10-20</lastmod>");
  expect(renderRobots(site)).toBe("User-agent: *\nDisallow: /admin\nAllow: /\nSitemap: https://example.com.br/sitemap.xml\n");
  expect(normalizeSiteUrl("https://example.com.br//")).toBe("https://example.com.br");
});
```

- [ ] **Step 2: Run** `npx vitest run server/lib/seo.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `server/lib/seo.ts` using `shared/seo-text.ts`. JSON-LD per spec §4.4 (LocalBusiness fields: name, url, image, telephone `+55 31 97180-3551`, address, areaServed, sameAs Instagram, openingHoursSpecification Mon–Fri 08:00–18:00 and Sat 09:00–12:00, description).
- [ ] **Step 4: Run** `npx vitest run server/lib && npm run check` → PASS; clean.
- [ ] **Step 5: Commit** `feat(seo): pure head/sitemap/robots rendering`.

---

### Task 3: Default share image

**Files:**
- Create: `scripts/make-og-image.ts`, `client/public/og-default.jpg`
- Modify: `package.json` (`"og:image": "tsx scripts/make-og-image.ts"`)

- [ ] **Step 1: Write the script**: `sharp({ create: { width: 1200, height: 630, channels: 3, background: "#d2b389" } })`, composite `client/public/logo.png` resized to height 380 (`fit: "inside"`), `gravity: "centre"`, `.jpeg({ quality: 90 })` → `client/public/og-default.jpg`; prints the output path and size.
- [ ] **Step 2: Run** `npm run og:image` then verify: `node -e "const s=require('sharp');s('client/public/og-default.jpg').metadata().then(m=>console.log(m.width,m.height,m.format))"` → `1200 630 jpeg`.
- [ ] **Step 3: Commit** `chore(seo): default share image and generator script` (image + script + package.json).

---

### Task 4: Page handler, sitemap/robots routes, server wiring

**Files:**
- Create: `server/page.ts`, `server/page.test.ts`
- Modify: `server/app.ts` (routes), `server/vite.ts` (`setupVite` returns a transform; `serveStatic` no longer serves `index.html`), `server/index.ts`, `server/lib/config.ts` (+ warning), `client/index.html` (marker)

**Interfaces:**
- `client/index.html`: `<!--app-head-->` immediately before `</head>`.
- `siteUrlFor(req: Request): string` (in `server/page.ts`): `normalizeSiteUrl(process.env.SITE_URL)` when set, else `${req.protocol}://${req.get("host")}`.
- `createPageHandler(db: DB, opts: { template: () => Promise<string>; transform?: (url: string, html: string) => Promise<string> }): RequestHandler` — resolves the route from `req.path`/`req.originalUrl` query; loads `getPublishedBySlug` for products and `listPublished` → `extractCategories`-equivalent label lookup for `categoria` (server-side helper `categoryLabelFor(products, slug)` using `shared/slug`); builds head; `html = injectHead(await transform?.(url, template) ?? template, renderHeadHtml(head))`; responds `res.status(head.status).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).send(html)`.
- `createApp(db)`: `GET /sitemap.xml` (entries: `/`, `/catalogo`, `/contato`, then published products with `lastmod: updatedAt`; `Content-Type: application/xml; charset=utf-8`, `Cache-Control: public, max-age=3600`) and `GET /robots.txt` (`text/plain`, same cache header).
- `setupVite(app, server): Promise<{ transform(url, html): Promise<string> }>` — mounts `vite.middlewares`, returns `vite.transformIndexHtml` bound; no catch-all any more. `serveStatic(app): void` — mounts `express.static(distPath, { index: false })`; no catch-all.
- `server/index.ts`: after app creation and dev/prod static mounting, `app.use("*", createPageHandler(db, { template, transform }))` where `template` reads `client/index.html` per request in dev and `dist/public/index.html` once (cached) in prod.
- `assertProductionConfig`: additionally `console.warn` when `NODE_ENV === "production"` and `SITE_URL` is unset (message: `SITE_URL is not set; link previews will use the request host. Set it in .env.`).

- [ ] **Step 1: Write the failing integration test** `server/page.test.ts` (freshDb boilerplate; `UPLOADS_DIR` temp; `delete process.env.SITE_URL` in `beforeEach`):

```ts
const TEMPLATE = '<!doctype html><html><head><title>Old</title><!--app-head--></head><body><div id="root"></div></body></html>';
async function serve(db: DB) {
  const { createApp } = await import("./app");
  const { createPageHandler } = await import("./page");
  const app = createApp(db);
  app.use("*", createPageHandler(db, { template: async () => TEMPLATE }));
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  return { server, get: (p: string, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${port}${p}`, { headers }) };
}

test("product page head, 404s, sitemap and robots", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Mesa Urb", description: "Mesa urbana em aço.", category: "Mesas" });
  await images.addImage(db, { productId: p.id, url: "/uploads/a-1080.webp", width: 1080, height: 1301, variants: { "1080": "/uploads/a-1080.webp" } });
  await prods.createProduct(db, { name: "Rascunho", published: false });
  const { server, get } = await serve(db);
  try {
    const page = await get("/catalogo/mesa-urb");
    expect(page.status).toBe(200);
    expect(page.headers.get("cache-control")).toBe("no-cache");
    const html = await page.text();
    expect(html).toContain("<title>Mesa Urb — Estúdio Pedra Industrial</title>");
    expect(html).toContain('<meta property="og:image" content="http://127.0.0.1:');
    expect(html).toContain('"@type":"Product"');
    expect(html).not.toContain("<title>Old</title>");

    expect((await get("/catalogo/rascunho")).status).toBe(404);
    const missing = await get("/nao-existe");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('content="noindex, nofollow"');
    expect((await get("/admin")).status).toBe(200);

    const sm = await get("/sitemap.xml");
    expect(sm.headers.get("content-type")).toContain("application/xml");
    const xml = await sm.text();
    expect(xml).toContain("/catalogo/mesa-urb</loc>");
    expect(xml).not.toContain("rascunho");
    expect(await (await get("/robots.txt")).text()).toContain("Disallow: /admin");

    // behind the proxy, the fallback site URL honours X-Forwarded-Proto
    const proxied = await (await get("/", { "X-Forwarded-Proto": "https" })).text();
    expect(proxied).toContain('<link rel="canonical" href="https://127.0.0.1:');

    process.env.SITE_URL = "https://example.com.br/";
    expect(await (await get("/contato")).text()).toContain('<link rel="canonical" href="https://example.com.br/contato">');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
```

- [ ] **Step 2: Run** `npx vitest run server/page.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `server/page.ts`, the routes in `app.ts`, the `vite.ts` changes, `index.ts` wiring, the config warning, the marker in `client/index.html`.
- [ ] **Step 4: Run** `npx vitest run server && npm run check` → PASS; clean. Then `npm run dev`, `curl -s localhost:3000/catalogo/mesa-urb | grep -c "og:"` → ≥ 6, and `curl -s -o /dev/null -w "%{http_code}" localhost:3000/zzz` → `404`; the browser still renders the SPA normally (home, catalog, admin).
- [ ] **Step 5: Commit** `feat(seo): server-rendered head per URL, sitemap.xml and robots.txt`.

---

### Task 5: Client page titles

**Files:**
- Create: `client/src/lib/usePageTitle.ts`
- Modify: `client/src/pages/Home.tsx`, `Catalog.tsx`, `Contact.tsx`, `Product.tsx` (replace inline effect), `NotFound.tsx`, `Admin.tsx`

**Interfaces:**
- `usePageTitle(title: string | undefined): void` — sets `document.title` when `title` is defined; restores the previous title on unmount.
- Titles come from `shared/seo-text.ts` `titles.*` (Catalog: `titles.category(label)` when the active chip is known, else `titles.catalog()`).

- [ ] **Step 1: Implement** the hook and use it on the six pages.
- [ ] **Step 2: Check** `npm run check && npx vitest run client/src` → clean; PASS. Browser: Home → Catálogo → "Mesas" chip → a piece → back → `/contato`: tab title changes at each step and matches the server-rendered title on reload.
- [ ] **Step 3: Commit** `feat(seo): page titles follow in-app navigation`.

---

### Task 6: Configuration, docs, acceptance

**Files:**
- Modify: `.env.example`, `DEPLOY.md`, `VPS-SETUP.md`, `README.md`

- [ ] **Step 1: Docs**: `.env.example` adds `SITE_URL=https://seudominio.com.br` with the guidance from spec §4.7; `DEPLOY.md` step 4 adds `SITE_URL` to the `.env` printf, plus a new step **"7b. Check a preview and tell Google"** (paste a piece's URL into WhatsApp to yourself; refresh with Facebook Sharing Debugger / opengraph.xyz; Search Console → add property → submit `/sitemap.xml`; Business Profile optional) with a check line (`curl -s https://<domain>/catalogo/<slug> | grep og:image`); `VPS-SETUP.md` mirrors it in long form; `README.md` documents `/sitemap.xml`, `/robots.txt`, `SITE_URL`, the default image script.
- [ ] **Step 2: Full verification** `npm run check && npm test && npm run build` → clean; green; built. Then `npm start` and walk spec §5 items 1–7 with `curl` and the browser at 375px; stop the server.
- [ ] **Step 3: Commit** `docs: SITE_URL, preview check and Search Console steps`.

---

## Self-review notes

- **Spec coverage:** 4.1 → Tasks 2, 4; 4.2 → Tasks 1, 2; 4.3 → Task 3; 4.4 → Task 2; 4.5 → Tasks 2, 4; 4.6 → Task 5; 4.7 → Tasks 4 (warning), 6; acceptance → Task 6.
- **Builder's open points (spec §6):** `createPageHandler` + `template`/`transform` options settle the shared helper and caching; first-sentence rule fixed in Task 1; `usePageTitle` in `client/src/lib`, strings from `shared/seo-text.ts`; image script numbers in Task 3.
- **Type consistency:** `HeadData`/`ProductForHead` (Task 2) consumed by Task 4; `titles`/`descriptions` (Task 1) consumed by Tasks 2 and 5; `normalizeSiteUrl` (Task 2) used by `siteUrlFor` (Task 4).
- **Review Focus:** 1 → escaping test (Task 2); 2 → no-photo test (Task 2); 3 → `normalizeSiteUrl` test (Task 2) + `X-Forwarded-Proto` test (Task 4); 4 → `resolveRoute` tests (Task 2); 5 → `injectHead` stale-template test (Task 2).
