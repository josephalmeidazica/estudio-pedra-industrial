# Batch 3 — Link previews and search: server-rendered meta, sitemap, structured data — Design

**Date:** 2026-10-20
**Project:** Estúdio Pedra Industrial
**Status:** Builder-checked (corrections folded in as the implementer's rulings; see ledger/PR); approved by the owner
**Builds on:** Batch 1 (PR #6) and Batch 2 (PR #7, branch `feat/batch2-quote-flow`).

## 1. Intent and why

Two moments the owner cares about. A customer pastes a piece's link into a
WhatsApp group or an Instagram DM and a friend sees the preview card before
tapping. Someone in Belo Horizonte types "mesa de aço carbono sob medida"
into Google. Today every page ships the same generic title, no description
and no image, so the preview is a blank box with the site name and Google
has nothing specific to rank. Batch 2 gave every piece its own URL; Batch 3
makes those URLs worth sharing and findable.

Nothing here changes what a visitor sees inside the site.

## 2. Goals, non-goals, anti-goals

### Goals
1. Every public URL returns HTML whose `<head>` describes that page: title,
   description, canonical, Open Graph and Twitter card tags, with the
   piece's cover photo for product pages and a branded default image
   elsewhere. Rendered on the server, so WhatsApp, Instagram and Google see
   it without running JavaScript.
2. `GET /sitemap.xml` lists the home, catalog, contact and every published
   piece, generated from the database on request. `GET /robots.txt` allows
   everything except `/admin` and points at the sitemap.
3. Structured data: `LocalBusiness` on the home page, `Product` (no price)
   plus `BreadcrumbList` on each piece.
4. Unknown routes and unpublished/missing pieces answer with HTTP 404 and
   `noindex`; `/admin` is `noindex`.
5. Titles stay correct during in-app navigation (the SPA sets
   `document.title` on every route change).
6. Deploy guides explain the one new setting, `SITE_URL`, and how to check
   a preview after going live.

### Non-goals
- Analytics (deferred, see `docs/discovery/analytics.md`).
- Full server-side rendering of page bodies. Only the `<head>` is rendered
  per URL; the React app still renders the body in the browser.
- Admin changes, image pipeline changes, new pages.
- Google Search Console / Business Profile setup (documented as owner
  steps, not built).

### Anti-goals
- Any visible change to the pages. Head tags, two text endpoints and a
  default share image only.
- A second HTML template or a second rendering path. Dev (Vite middleware)
  and production (`dist/public`) go through the same head renderer.
- Prices in structured data. `Product` is emitted without `offers`; the
  description says "sob consulta".

## 3. Constraints

- Stack unchanged; Node 22; `process.cwd()`-anchored paths.
- The server already owns the HTML response for every non-API route
  (`server/vite.ts`: `setupVite` transforms `client/index.html`,
  `serveStatic` sends `dist/public/index.html`). Head rendering hooks into
  those two places only.
- The site's public address is not known yet (no domain). Absolute URLs
  come from `SITE_URL` in `.env`; when it is unset the server falls back to
  the request's `protocol://host` so local and LAN testing produce working
  previews.
- Visitor-facing text in Brazilian Portuguese; `og:locale` `pt_BR`.
- Existing tests keep passing; new logic is pure and unit-tested; the
  integration is tested through `createApp()` with a real listening socket
  like `/healthz` is.

## 4. Decisions

**(owner)** agreed in conversation; **(my call)** chosen by the author.

### 4.1 Head rendering **(owner: server-side; details my call)**

- `client/index.html` keeps a default `<title>` and gains the marker
  `<!--app-head-->` right before `</head>`. The server replaces the
  `<title>…</title>` element and the marker with the rendered tags. If the
  marker is missing (stale build) the tags are inserted before `</head>`.
- New pure module `server/lib/seo.ts`:
  - `resolveRoute(pathname: string): Route` with `Route =
    { kind: "home" } | { kind: "catalog" } | { kind: "product"; slug } |
    { kind: "contact" } | { kind: "admin" } | { kind: "unknown" }`.
  - `buildHead(input): HeadData` where `input` carries the route, the
    site URL, the request path + query, and the data the route needs
    (product row for `product`, category label for a filtered catalog),
    and `HeadData = { title, description, canonical, robots, image:
    { url, width, height, alt }, ogType, jsonLd: object[] , status: 200 | 404 }`.
  - `renderHeadHtml(head: HeadData): string` — the tags as HTML, escaped.
  - `injectHead(template: string, headHtml: string): string`.
  - `renderSitemap(entries: { loc, lastmod? }[]): string`,
    `renderRobots(siteUrl): string`.
  - `siteUrlFor(req): string` — `SITE_URL` (trailing slash stripped) or
    `${req.protocol}://${req.get("host")}`.
- Express integration: `createApp(db)` gains `GET /sitemap.xml`,
  `GET /robots.txt` and `GET /og/:uuid.jpg`. A separate page handler
  (`createPageHandler(db, { template, transform })`) is mounted last by
  `index.ts`; `setupVite` only mounts Vite's middlewares and hands back its
  HTML transform, `serveStatic` mounts `express.static(dist, { index:
  false })` (today's default `index.html` would otherwise answer `GET /`
  un-injected) and `/index.html` redirects to `/`. The production template
  is read once at boot. Responses carry `Cache-Control: no-cache` for HTML
  (previews must reflect edits), `public, max-age=3600` for the sitemap and
  robots, `public, max-age=86400` for `/og/*.jpg`.
- Database lookups per request: product by slug (`getPublishedBySlug`),
  categories for `?categoria=` (from `listPublished`). SQLite in-process;
  no caching layer.

### 4.2 Per-route content **(my call, copy below is the spec)**

Site name `Estúdio Pedra Industrial`. Default description:
`Móveis industriais sob medida em aço carbono e MDF, feitos em Belo Horizonte. Peça um orçamento pelo WhatsApp.`

| Route | Title | Description | Canonical | Image | robots | status |
|---|---|---|---|---|---|---|
| `/` | `Estúdio Pedra Industrial — Móveis industriais sob medida em Belo Horizonte` | default | `/` | default | index | 200 |
| `/catalogo` | `Portfólio — Estúdio Pedra Industrial` | `Mesas, estantes, luminárias e peças sob medida em aço carbono e MDF. Veja o portfólio e peça um orçamento pelo WhatsApp.` | `/catalogo` | default | index | 200 |
| `/catalogo?categoria=<slug>` (known) | `<Categoria> — Portfólio \| Estúdio Pedra Industrial` | `Peças da categoria <Categoria> em aço carbono e MDF, sob medida. Peça um orçamento pelo WhatsApp.` | `/catalogo` (filters are not separate pages) | default | index | 200 |
| `/catalogo/<slug>` published | `<Nome> — Estúdio Pedra Industrial` | first sentence of the product description, then ` Materiais: <materiais>.` when set, then ` Sob medida em Belo Horizonte. Peça um orçamento pelo WhatsApp.`; trimmed to 160 chars at a word boundary with `…` | `/catalogo/<slug>` | cover photo as a **JPEG** served at `/og/<uuid>.jpg` (derived on demand from the largest WebP variant, ≤ 1200 px wide, cached under `.data/uploads/og/`), dimensions scaled from the row's intrinsic size; legacy rows (no variants) use their `url` as-is without dimensions; default image when no photo | index | 200 |
| `/catalogo/<slug>` unpublished or missing | `Página não encontrada — Estúdio Pedra Industrial` | default | none | default | noindex, nofollow | 404 |
| `/contato` | `Contato — Estúdio Pedra Industrial` | `Fale com o Estúdio Pedra Industrial pelo WhatsApp ou Instagram. Atendimento em Belo Horizonte.` | `/contato` | default | index | 200 |
| `/admin` | `Administração` | none | none | none | noindex, nofollow | 200 |
| anything else | `Página não encontrada — Estúdio Pedra Industrial` | default | none | default | noindex, nofollow | 404 |

Tags emitted for every indexable page: `<title>`, `meta description`,
`link canonical`, `meta robots`, `og:type` (`website`, or `product` on a
piece), `og:site_name`, `og:locale` `pt_BR`, `og:title`, `og:description`,
`og:url`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`,
`twitter:card` `summary_large_image`, `twitter:title`,
`twitter:description`, `twitter:image`. No `theme-color` (it would tint
phone browser chrome, a visible change). All URLs absolute (site URL +
path). Text is HTML-escaped.

**Why JPEG for the cover (my call, after the builder check):** WhatsApp's
preview scraper is unreliable with WebP and with images over roughly
300 KB, and the preview card is this batch's first goal. The image
pipeline itself is unchanged; a small `GET /og/:uuid.jpg` route converts
the largest variant once and caches it. The "Móvel personalizado" entry is
treated like any other piece (own page, sitemap entry).

### 4.3 Default share image **(my call)**

- `client/public/og-default.jpg`, 1200×630: beige `#d2b389` background,
  the logo (`client/public/logo.png`) centred at about 60 % of the height,
  JPEG quality 90. Generated once by a small script
  (`scripts/make-og-image.ts`, run with `tsx`, uses sharp) and committed,
  so production does not generate images at boot. The script is kept so
  the owner can regenerate it after a logo change.
- `og:image:alt` for the default: `Estúdio Pedra Industrial — móveis
  industriais sob medida`.

### 4.4 Structured data **(my call)**

- Home: `LocalBusiness` with `@type: ["LocalBusiness", "HomeAndConstructionBusiness"]`,
  `name`, `url`, `image` (default image), `telephone` `+55 31 97180-3551`,
  `address` `{ addressLocality: "Belo Horizonte", addressRegion: "MG",
  addressCountry: "BR" }`, `areaServed` `Belo Horizonte e região`,
  `sameAs` `["https://instagram.com/estudio.pedraindustrial"]`,
  `openingHoursSpecification` from the footer (Mon–Fri 08:00–18:00, Sat
  09:00–12:00), `description` default.
- Product page: `BreadcrumbList` only (Início → Portfólio → `<Nome>`).
  **My call after the builder check:** Google requires `offers`, `review`
  or `aggregateRating` on `Product` markup; without a price every piece
  would show as an error in Search Console, which the owner will be asked
  to open. `og:type` stays `product` for the preview card.
- Catalog and contact: no JSON-LD beyond what the head carries.
- Emitted as `<script type="application/ld+json">` with `</` escaped.

### 4.5 Sitemap and robots **(owner wants them; details my call)**

- `/sitemap.xml`: `/`, `/catalogo`, `/contato`, then each published
  product `/catalogo/<slug>` with `lastmod` = `updatedAt` (ISO date).
  Category filter URLs are not listed (canonical points at `/catalogo`).
  `Content-Type: application/xml`.
- `/robots.txt`:
  ```
  User-agent: *
  Disallow: /admin
  Allow: /
  Sitemap: <SITE_URL>/sitemap.xml
  ```

### 4.6 Client-side titles **(my call)**

- A tiny `usePageTitle(title)` hook sets `document.title` on mount/change
  and is used by Home, Catalog (including the category variant), Contact,
  Product (replacing its inline effect), NotFound and Admin, with the same
  strings as 4.2 so server and client agree. This keeps the tab title right
  after in-app navigation; it does not affect previews.

### 4.7 Configuration and docs **(my call)**

- `.env.example` gains `SITE_URL=https://seudominio.com.br` (commented
  guidance: no trailing slash; required in production for correct previews;
  falls back to the request host).
- `assertProductionConfig` warns (does not refuse) when `SITE_URL` is unset
  in production.
- `DEPLOY.md` step 4 adds `SITE_URL`; a new short step after going live:
  "Check a preview" (paste a piece's URL into WhatsApp to yourself; use
  Facebook's Sharing Debugger / opengraph.xyz to force a refresh), and
  "Tell Google" (Search Console: add property, submit `/sitemap.xml`;
  Business Profile is optional). `VPS-SETUP.md` mirrors it; `README.md`
  documents the two endpoints and `SITE_URL`.
- Caddyfile: no change (HTML already proxied; headers set by Express).

### 4.8 Out of scope but noted
- Pre-rendering page bodies for crawlers; hreflang; per-category landing
  pages with their own canonical (would need real copy per category).
- An `apple-touch-icon` / web manifest (small, could ride along in a later
  polish batch).

## 5. Acceptance

1. `curl -s <host>/catalogo/mesa-urb | head -40` shows the product title,
   description, canonical, `og:image` pointing at `/og/<uuid>.jpg` with
   its width/height, `og:type` `product`, and a `BreadcrumbList` JSON-LD
   block; `curl -sI <host>/og/<uuid>.jpg` returns `image/jpeg`. With
   `SITE_URL` set, every absolute URL uses it; without it, they use the
   request host.
2. `curl -s -o /dev/null -w "%{http_code}" <host>/catalogo/nao-existe`
   prints `404`, and the body contains `noindex`. Same for an unpublished
   product's slug and for `/qualquer-coisa`. `/admin` returns 200 with
   `noindex`.
3. `/` carries the `LocalBusiness` JSON-LD and the default image;
   `/catalogo?categoria=mesas` has the title `Mesas — Portfólio | Estúdio
   Pedra Industrial` and canonical `/catalogo`.
4. `/sitemap.xml` is valid XML listing 3 static URLs plus one per published
   product with `lastmod`; unpublishing a product removes it on the next
   request. `/robots.txt` matches 4.5.
5. In the browser, navigating Home → Catálogo → a piece → back updates
   the tab title at each step; the visible pages are unchanged.
6. The production build (`npm run build && npm start`) serves injected
   heads (not the static `index.html` title), and the dev server does too.
7. `client/public/og-default.jpg` exists at 1200×630 and is what `/` and
   `/catalogo` reference.
8. `npm run check` and `npm test` pass; `resolveRoute`, `buildHead`
   (every row of the 4.2 table, the 160-char trim, escaping, legacy rows),
   `injectHead` (marker present / missing), `renderSitemap`,
   `renderRobots`, the OG-image path/dimension helpers and the Express
   integration (`GET` a product page, a 404, the sitemap, robots, an
   `/og/*.jpg` through `createApp()` + the page handler) have tests.
9. `.env.example`, `DEPLOY.md`, `VPS-SETUP.md`, `README.md` updated.

## 6. Left to the builder

- Exact shape of the `renderPage` helper shared by `setupVite` and
  `serveStatic`, and how the template is cached in production.
- First-sentence extraction rule (split on `. `, `! `, `? ` or newline).
- Where `usePageTitle` lives and whether Catalog derives the category label
  from the same helper the server uses (a shared `shared/seo-text.ts` for
  title strings is welcome so the two never drift).
- The `make-og-image.ts` script's exact compositing numbers.
