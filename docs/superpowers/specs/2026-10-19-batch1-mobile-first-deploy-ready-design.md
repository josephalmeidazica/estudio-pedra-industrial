# Batch 1 — Mobile-first conversion basics + deploy readiness — Design

**Date:** 2026-10-19
**Project:** Estúdio Pedra Industrial
**Status:** Builder-checked; awaiting owner approval

## 1. Intent and why

The site exists to show the studio's finished furniture and to start WhatsApp
conversations, which are the studio's only sales channel. Almost every visitor
arrives on a phone from the Instagram bio link. Today the site is not deployed,
has no mobile navigation, serves unoptimised images, and asks visitors to use a
cart before they can reach WhatsApp.

Batch 1 fixes the things that must be true before the link goes into the bio:
the site works on a phone, images load fast, every page has a one-tap path to
WhatsApp, and the repository can be deployed in one sitting once the owner has
bought a domain and a VPS. It deliberately stops short of new pages, SEO, or
admin redesign (those are Batches 2–4).

## 2. Goals, non-goals, anti-goals

### Goals
1. A visitor on a phone can reach every page from a menu, and can open a
   WhatsApp chat with the studio from any public page in one tap.
2. A visitor can request a quote for a specific product in one tap, with the
   product name already in the message. The cart remains for multi-item quotes.
3. Product photos uploaded by the owner are resized and converted on the server
   so the catalog stays fast even with 8 MB phone photos.
4. The repository is "deploy-ready": following the updated guide on a fresh
   Ubuntu VPS with a domain produces a live HTTPS site with nightly off-box
   backups, without further code changes.
5. Header and footer live in one place and the dead anchor links are gone.

### Non-goals (later batches)
- Product detail pages, category filters, featured grid, social proof (Batch 2).
- Per-page meta tags, Open Graph previews, sitemap, JSON-LD (Batch 3).
- Admin redesign, cookie-based login, HEIC support (Batch 4).
- Actually performing the deployment. The owner has no domain or VPS yet.
- Prices, payments, accounts, analytics (analytics is Batch 2).

### Anti-goals
- Changing the brand look. Beige (`#d2b389`) and black palette, Montserrat,
  spacious minimal layout stay exactly as they are. New UI (menu, floating
  button, quote button) uses the existing design tokens and shadcn components.
- Introducing a second data store or a required paid service. SQLite + files
  on the VPS disk remain the system of record.
- Breaking the existing admin flow. The owner must still be able to upload,
  reorder, set cover and delete images with the current admin UI.

## 3. Constraints

- Stack is fixed: React 19, Vite 7, Tailwind v4, shadcn/ui, wouter, tRPC 11,
  Express 4, Drizzle + better-sqlite3, vitest. Node 22 LTS in production.
- Single Node process, single VPS instance (SQLite and local uploads do not
  share across instances). pm2 + Caddy as already documented.
- All visitor-facing copy is Brazilian Portuguese.
- Paths are anchored to `process.cwd()` (see `server/db/client.ts`); keep that
  convention for anything new that touches disk.
- Existing tests (33) must keep passing; new logic gets tests at the same
  level as the current code (pure functions and repos under vitest).

## 4. Decisions

Items marked **(owner)** were decided in conversation. Items marked **(my
call)** are defaults chosen by the author of this document; they can be
changed but were not agreed with the owner.

### 4.1 Shared layout **(my call)**

- Create `client/src/components/layout/SiteHeader.tsx`, `SiteFooter.tsx`
  and a `Layout.tsx` that wraps them around page content. Home, Catálogo and
  Contato use it; Admin and NotFound do not (Admin keeps its own minimal
  chrome).
- Header: logo + wordmark on the left (links to `/`), desktop nav links
  (Início, Serviços, Sobre, Portfólio, Contato) and the WhatsApp button on
  the right. Catálogo and Contato already look like this; Home's header has
  no logo today and gains one. That is the only visible header change.
- Below the `md` breakpoint the nav links collapse into a hamburger button
  that opens a shadcn `Sheet` from the right listing the same links plus the
  WhatsApp button. The sheet closes on link click.
- Section anchors (`/#servicos`, `/#sobre`) keep working from other pages.
  The footer's "Contato" link goes to `/contato` (the `#contato` anchor does
  not exist anywhere and is removed).
- Catalog's header currently differs (no Portfólio link, has a Back link and
  the cart icon in the page body). After this change the catalog uses the
  shared header; the cart icon moves into the header and is rendered only on
  the catalog route. The "Voltar" link in the catalog page body stays.
- `CartProvider` currently wraps only the Catalog page. Because the cart icon
  moves into the shared header, the provider (or an equivalent slot) must sit
  above `Layout`; the cart state itself is unchanged.

### 4.2 Floating WhatsApp button **(owner wants it; details my call)**

- Fixed to bottom-right on every public page, above the fold on mobile and
  desktop, 56 px round, black background with the beige icon (or the inverse
  if contrast with the beige page background is poor — builder checks both
  and picks the one with the higher contrast ratio).
- Opens `https://wa.me/<number>?text=<message>` in a new tab.
- Default message: `Olá! Vim pelo site do Estúdio Pedra Industrial e gostaria
  de um orçamento.`
- Not rendered on `/admin`.
- Keeps clear of the cart `Sheet` on the catalog (the sheet overlays it; no
  special handling needed) and of iOS safe areas (`env(safe-area-inset-*)`).

### 4.3 One-tap quote per product **(owner wants it; details my call)**

- Each catalog card gets a primary button `Pedir orçamento` (WhatsApp icon)
  that opens WhatsApp with:

  ```
  Olá! Tenho interesse no produto *<Nome do produto>* do catálogo do Estúdio
  Pedra Industrial e gostaria de um orçamento.

  <absolute URL of the catalog page>
  ```

  The URL is `window.location.origin + "/catalogo"` for now; Batch 2 will
  switch it to the product's own URL once detail pages exist.
- The existing `Adicionar ao carrinho` button becomes the secondary (outline)
  action beneath it. The cart drawer and its checkout message are unchanged.
- Message builders live next to the existing ones in
  `client/src/components/cart/whatsapp.ts` (or a sibling module) with unit
  tests like the current ones.
- The WhatsApp number is read from the single `WHATSAPP_NUMBER` constant in
  `client/src/config.ts`. The hard-coded occurrences in Home and Contact are
  replaced by the constant as part of the shared layout work.

### 4.4 Image pipeline **(my call)**

Problem: uploads are stored as sent (JPEG at 60% from a 1200 px canvas
resize), served untouched, and cards render them with no intrinsic size, so
the grid jumps while loading.

- Add `sharp` as a server dependency. On `images.add`, the server decodes the
  data URL, reads the intrinsic size, and writes WebP variants to the uploads
  dir at target widths 480, 960 and 1600, never upscaling. A source narrower
  than a target produces fewer variants, the largest being the source width
  (so a 1500 px wide portrait photo yields 480, 960 and 1500). Quality 80.
  The original file is not kept. Consumers always pick "the largest
  available variant", never a hard-coded 1600.
- File naming: `<uuid>-480.webp`, `<uuid>-960.webp`, `<uuid>-1600.webp`.
- `product_images` gains three columns via a new Drizzle migration:
  `width` and `height` (intrinsic size of the largest variant) and
  `variants` (JSON text: `{ "480": "/uploads/x-480.webp", ... }`). `url`
  keeps pointing at the largest variant so all existing callers still work.
  Existing rows get `width = height = 0` and `variants = '{}'` and are
  treated as "legacy single URL" by the client.
- The client renders `<img>` with `srcset`/`sizes` built from `variants`
  when present, and sets `width`/`height` attributes. Catalog cards keep
  their fixed `h-64` + `object-cover` box (card heights must not vary with
  photo orientation) and use `sizes` of roughly one column on mobile, one
  third on desktop. The lightbox, which is the only place that jumps today,
  reserves the intrinsic aspect ratio and loads the largest available
  variant. Legacy rows fall back to the single `url` as today.
- `images.delete` and `products.delete` remove all variant files.
- Supported input types: JPEG, PNG, WebP, GIF (first frame). sharp's
  prebuilt binaries do not decode HEIC/HEIF.
  - On iPhone Safari the browser decodes HEIC natively, so the existing
    canvas step already turns it into JPEG and the upload simply works. That
    path must keep working; nothing may block on file name or declared type
    before the canvas attempt.
  - On browsers that cannot decode HEIC (Chrome, Android, desktop) the canvas
    load fails and the raw file reaches the server. The server detects HEIC by
    MIME and by magic bytes (`ftyp` box with `heic`/`heix`/`mif1`/`msf1`
    brands, since the declared MIME may be empty or octet-stream) and returns
    a `BAD_REQUEST` whose message is the Portuguese guidance: send the photo as
    JPEG (iPhone: Ajustes → Câmera → Formatos → "Mais compatível"). The admin
    shows that message instead of the generic "Erro ao enviar imagem".
  - Full client-side HEIC conversion is Batch 4.
- The admin's client-side `compressImage` step is kept but relaxed: resize so
  the longest side is at most 2400 px at JPEG quality 0.85. Portrait phone
  photos (3:4) then arrive about 1800 px wide, enough for the 1600 variant;
  the server does the real work.
- Request body limit stays at 50 MB (data URL overhead on a ~10 MB JPEG is
  fine). A size cap of 20 MB decoded is enforced server-side with a clear
  error.
- The nine bundled default images under `client/public/products/` are run
  through the same pipeline at boot by `ensureProductImages`: when a product
  has no images, the default JPEG is read from disk, processed into
  `.data/uploads`, and inserted with variants. This keeps one code path for
  rendering. Idempotency rule is unchanged (acts only when a product has zero
  images).
- A one-off maintenance command `npm run images:reprocess` walks
  `product_images` rows with `variants = '{}'`, re-reads their file from
  `.data/uploads` (or `client/public/products` for `/products/...` URLs),
  generates variants, and updates the row. Safe to run repeatedly. The script
  is bundled by `npm run build` into `dist/` (like the server) so it runs on
  the VPS with production dependencies only; `tsx` must not be required there.
- Two existing tests encode the old single-file behaviour and are rewritten
  rather than kept: the seed test asserting a `/products/*.jpg` URL and the
  router test uploading a 1-byte fake PNG. Both move to tiny real image
  fixtures.

### 4.5 Deploy readiness **(owner: VPS plan stays; no deploy now)**

Code-side:
- `GET /healthz` returns `200 {"ok":true}` and touches the database with a
  trivial query, for pm2/Caddy/uptime checks.
- `engines.node` `>=22` in `package.json` and an `.nvmrc` with `22`.
- Server refuses to start in production when `ADMIN_PASSWORD` is unset
  (today it only warns). Development keeps the warning.
- Express `trust proxy` set to `1` so logs and any future rate limiting see
  the real client IP. For that to hold behind Cloudflare the Caddyfile must
  also declare Cloudflare's ranges as `trusted_proxies` (or forward
  `CF-Connecting-IP` as the client IP); the Caddy section of the guide does
  this.
- Caddy config adds long `Cache-Control` for `/uploads/*` and `/assets/*`
  (hashed, immutable) and security headers (`X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`). Caddy, not Express, so the app
  stays simple. Express still sets `Cache-Control: public, max-age=31536000,
  immutable` on `/uploads` for correctness when served directly.

Backups:
- `deploy/backup.sh` keeps creating a local tarball of `.data/`, and gains
  a second step: if an `rclone` remote named `eps-backup` exists, copy the
  archive there and prune remote archives older than 30 days. Local archives
  are pruned to the last 7.
- The guide documents setting up the rclone remote against Google Drive (my
  default suggestion; Backblaze B2 as the alternative) and a cron entry at
  03:00 daily. The owner's account is needed for this step.
- `deploy/restore.sh <archive>` is added: stops pm2 if pm2 is installed,
  moves the current `.data/` aside with a timestamp, extracts the archive,
  restarts pm2 if present. It must also run on a dev machine (Git Bash on
  Windows, no pm2) so the acceptance check can be exercised locally. The guide
  includes a "test your restore once" step.

Domain and Cloudflare (documentation only):
- `DEPLOY.md` and `VPS-SETUP.md` gain a "Step 0: buy a domain" section.
  Recommendation: Cloudflare Registrar for a `.com`; for `.com.br`, register
  at Registro.br and delegate DNS to Cloudflare. Then proxy on, SSL mode
  "Full (strict)", and a cache rule for `/uploads/*`.
- Caddy still obtains its own certificate (so Full strict works). The
  Caddyfile is parameterised by a `DOMAIN` placeholder the guide `sed`s in.

Guides:
- `DEPLOY.md` is re-ordered into: 0 domain, 1 VPS, 2 server setup, 3 code,
  4 `.env`, 5 pm2, 6 Cloudflare + Caddy, 7 backups (with rclone), 8 restore
  test, 9 updating. Each step ends with a one-line check (curl `/healthz`,
  etc.).
- `VPS-SETUP.md` gets the same structure in long form. `README.md` mentions
  the image pipeline, the healthcheck, and the new scripts.

### 4.6 Out of scope but noted
- Rate limiting on the admin login and cookie sessions (Batch 4).
- Moving uploads to object storage (not needed at this traffic; revisit if
  the owner wants multi-device or the VPS disk becomes the bottleneck).

## 5. Acceptance (what "done" looks like)

1. On a 375 px wide viewport every public page shows a hamburger; opening it
   lists Início, Serviços, Sobre, Portfólio, Contato and a WhatsApp button;
   tapping a link navigates and closes the menu.
2. The floating WhatsApp button is visible on `/`, `/catalogo`, `/contato`,
   absent on `/admin`, and opens `wa.me` with the default message.
3. Each catalog card has `Pedir orçamento` as its primary action; tapping it
   opens `wa.me` with the product name and catalog URL in the message.
   `Adicionar ao carrinho` still works and the cart checkout is unchanged.
4. Uploading an 8 MB landscape JPEG through `/admin` produces three WebP
   files (480, 960, 1600); a portrait phone photo produces 480, 960 and its
   own width. The catalog card loads the 480 or 960 variant on a phone, and
   the lightbox loads the largest available variant. Deleting the image
   removes every variant file.
5. On a browser that cannot decode HEIC (Chrome desktop is the test
   environment), uploading a HEIC file shows the Portuguese guidance error and
   stores nothing. On iPhone Safari the same file uploads successfully as
   JPEG.
6. `npm run images:reprocess` converts the nine seed images into variants
   (one to three files each, depending on source width) and is a no-op on a
   second run. It runs from `dist/` without dev dependencies.
7. `curl localhost:3000/healthz` returns `200` with `{"ok":true}`.
8. `npm start` with no `ADMIN_PASSWORD` in production exits with a clear
   error.
9. `bash deploy/backup.sh /tmp/x` without an rclone remote still produces the
   tarball and says the remote step was skipped; `bash deploy/restore.sh` on
   that tarball restores `.data/`.
10. `npm run check` and `npm test` pass; new pure logic (message builders,
    variant naming/sizing, srcset building, HEIC detection) has unit tests.
    The two rewritten tests from 4.4 count as passing once they assert the
    new behaviour.
11. Nothing about colours, fonts, spacing or copy outside the new elements
    changes.

## 6. Left to the builder

- Exact component structure for the layout and sheet, how the catalog route
  tells the header to render the cart icon, and where `CartProvider` ends up
  above `Layout`.
- Whether `srcset` building is a small client helper or returned by the API.
- How to make `sharp` available in tests (real sharp on a tiny fixture is
  fine; the repo already runs real SQLite in tests).
- Migration filename and the Drizzle snapshot update.
- The exact contrast choice for the floating button (see 4.2).
