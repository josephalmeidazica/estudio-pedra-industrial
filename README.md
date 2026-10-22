# Estúdio Pedra Industrial

Portfolio site for a bespoke furniture studio (carbon steel + MDF). Visitors browse
finished pieces, add the ones they like to a cart and land in WhatsApp with a ready
quote request; the owner manages the catalog and the photo gallery at `/admin`.
Self-contained: one Node process, SQLite, files on disk.

## Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 + wouter (routing) + shadcn/ui
- **Backend:** Express + tRPC (`auth`, `products`, `images`, `gallery` and `trash`
  routers), `GET /healthz`
- **Data:** SQLite (via Drizzle) for product data; product photos as WebP variants on
  disk (generated with sharp) — no external database or service to install

## Run

```bash
npm install     # first time only
npm run dev     # http://localhost:3000
```

Other scripts:

```bash
npm run build            # production build -> dist/ (server, client, maintenance scripts)
npm start                # serve the production build
npm run check            # TypeScript type-check
npm test                 # run the test suite
npm run db:generate      # generate a Drizzle migration after editing server/db/schema.ts
npm run images:reprocess # convert pre-pipeline image rows into WebP variants (after build)
npm run og:image         # regenerate client/public/og-default.jpg from the brand signature
```

Deployment: [`DEPLOY.md`](./DEPLOY.md) (cheat-sheet) and [`VPS-SETUP.md`](./VPS-SETUP.md)
(full guide), with helper scripts in [`deploy/`](./deploy) including `backup.sh` and
`restore.sh`. Product discovery notes live under [`docs/discovery/`](./docs/discovery)
(e.g. the deferred analytics evaluation).

## How it works

- **Pages:** Home (`/`), Catálogo (`/catalogo`, filterable with `?categoria=<slug>`),
  product detail (`/catalogo/<slug>`, with a *Ficha técnica*), Processo (`/processo`),
  Dúvidas frequentes (`/duvidas`, with `FAQPage` JSON-LD), Sobre nós (`/sobre`),
  Contato (`/contato`, with the workshop address), Para profissionais
  (`/para-profissionais`, **off by default**, see below), Admin (`/admin`) and a 404.
  Public pages share one header (with a mobile menu), footer and a floating WhatsApp
  button. The look follows the brand manual: Areia background, Bege panels, black
  text, Cobre accents, square corners (`--radius: 0`), Outfit type.
- **Para profissionais** answers the 404 page until `SITE.professionals` in
  `shared/content/site.ts` is filled in (`lead`, `offers`, `steps`, `ctaTitle`,
  `ctaText`). Once it is, the page, its header link and its sitemap entry appear.
- **The quote flow:** every card and detail page has a one-tap "Pedir orçamento"
  WhatsApp button and an "Adicionar ao carrinho" option. The cart asks for the
  customer's name and bairro and opens WhatsApp with a message listing the chosen
  pieces (each with a link to its page) and the totals.
- **"Móvel personalizado":** the catalog entry flagged *Personalizado* in the admin.
  Adding it asks for a short description of the piece the customer wants; the text
  travels into the message. At most one product carries the flag.
- **Home page:** hero (headline, WhatsApp/portfólio buttons, illustration), a strip of
  differentials, "O que fazemos", the pieces marked *Destaque* (padded to six when
  fewer than three are marked), "Da conversa à entrega" (four steps), the Experiência
  band with stats, the Instagram block (handle and follow button always show; the post
  grid only renders once `SITE.instagramPosts` has entries), the reviews section (only
  once `SITE.reviews` is filled) and a closing call to action.
- **Catálogo page extras:** below the grid, the "Na casa dos nossos clientes" strip of
  installed-piece photos (admin's **Ambientes** tab) and the catalog PDF band. The band
  always renders (its "Receber pelo WhatsApp" button); only the download button depends
  on `SITE.catalogPdf` (below).
- **Product fields:** name, slug, category, description, materials, dimensions,
  **acabamentos** (`finishes`, one line) and **detalhes** (`details`, one per line,
  joined with " · "), price, flags. The *Ficha técnica* shows Medidas, Materiais,
  Acabamentos, Detalhes, Prazo (once `SITE.leadTime` is set) and Garantia, skipping
  empty rows. The editor has Acabamentos/Detalhes inputs (migration `drizzle/0005_*`).
- **Content modules** live in `shared/content/`: `site.ts` (`SITE`: address, hours,
  warranty, stats, `professionals`, `leadTime`, `catalogPdf`, `reviews`,
  `instagramPosts`), `home.ts`, `processo.ts`, `faq.ts`, `sobre.ts`. **Rule: a null or
  empty field hides its section** (no placeholders ship). To publish a block, fill the
  field in `site.ts`; nothing else changes.
- **Brand assets** are under `client/public/brand/` (signature, symbol, pattern) and
  `client/public/brand/icons/` (per-piece line icons). Tokens are in
  `client/src/index.css`; the font is Outfit (300/400/500) via Google Fonts in
  `client/index.html`. `npm run og:image` builds the link-preview image from the
  beige signature.
- **Hero illustration:** the brand-pattern placeholder is
  `client/src/components/home/HeroIllustration.tsx`; replace that component's content
  with the final illustration.
- **Phase 2 (not built):** moving `catalogPdf`, `reviews`, `instagramPosts` and the
  numeric stats into an admin-editable `site_settings` table with a fourth admin tab
  is specified in §4.12 of
  `docs/superpowers/specs/2026-10-22-batch5-site-redesign-design.md`.
- The catalog loads live from the API. Product data is seeded once on first boot
  (9 products) and then lives in SQLite.
- The WhatsApp number lives in `client/src/config.ts`; the brand logos in
  `client/public/brand/`.

## Backend / catalog

### Storage

- Product data lives in a SQLite database at `.data/app.db` (managed with Drizzle;
  migrations in `drizzle/` run automatically on boot).
- Product and gallery images are processed on upload by `sharp` into WebP variants at
  widths 480, 960 and 1600 (never upscaled; a narrower photo stops at its own width),
  stored under `.data/uploads/<uuid>-<width>.webp` and served at `/uploads/...` with a
  one-year immutable cache header. Each image row records `width`, `height` and a
  `variants` map; the client renders `srcset`/`sizes` from it.
- The nine bundled default photos (`client/public/products/`) go through the same
  pipeline on first boot. Databases created before the pipeline existed can be
  converted once with `npm run images:reprocess` (run `npm run build` first).
- HEIC uploads (iPhone camera roll): Safari decodes them natively and the browser
  re-encodes to JPEG before upload. On browsers that cannot decode HEIC (Chrome,
  Android) the admin loads a converter (`heic2any`, a separate lazily-loaded chunk
  that public pages never download) and converts in the browser, showing
  "Convertendo foto do iPhone…". Corrupt or oversized (> 20 MB) files are rejected
  with a Portuguese message.
- **Lixeira (trash):** deleting a piece, a photo or an Ambientes photo only sets
  `deletedAt`; the item disappears from the site, the sitemap and its detail URL but
  stays restorable from the admin's Lixeira tab for 30 days, after which a daily job
  (also run at boot) purges the rows and every variant/og file. A deleted piece keeps
  its slug reserved while it is in the Lixeira (a new piece with the same name gets
  `-2`). "Excluir definitivamente" purges immediately.
- `.data/` is git-ignored — it is local, per-machine state. **It is the whole
  database plus every photo, Lixeira included: back it up** (`deploy/backup.sh`).

### Auth (passphrase, cookie or bearer)

Public endpoints: `products.list`, `products.getBySlug`, `gallery.list` and `auth.*`.
Everything else — all mutations, `products.listAll` and `trash.*` — requires admin
auth, which is either of:

- **Session cookie** (what the admin panel uses): `auth.login({ password })` checks the
  passphrase and sets `eps_session`, an HMAC-signed, `HttpOnly`, `SameSite=Lax` cookie
  valid for 30 days (`Secure` when the request came over HTTPS). `auth.logout` clears
  it; `auth.me` reports whether the caller is logged in. Five wrong passwords from one
  IP within 15 minutes answer `Muitas tentativas. Aguarde 15 minutos e tente de novo.`
- **Bearer token** (scripts, tests): `Authorization: Bearer <ADMIN_PASSWORD>`.

Setup: copy `.env.example` to `.env` and set `ADMIN_PASSWORD` to a passphrase (≥ 12
characters; three words with spaces are fine). The cookie key is derived from the
passphrase, so changing it logs every device out; set the optional `SESSION_SECRET`
to decouple the two. Requests without valid auth are rejected (fail-closed); in
production the server refuses to start if `ADMIN_PASSWORD` is unset. `.env` is
git-ignored; never commit a real passphrase.

### Admin panel (/admin)

Built for the owner's phone: log in once, stay logged in for 30 days. Three tabs.
**Peças:** the list of pieces (reorder, edit, move to the Lixeira). "Nova peça" opens a
photos-first editor (full-screen on phones): a hidden draft is created immediately, so
photos picked from the camera roll (several at once, with progress) attach to it
straight away; then name, category, description, materials/dimensions, acabamentos/detalhes and, under
"Mais opções", slug, price, *Destaque* and *Personalizado*. "Salvar" keeps it as a
draft ("Rascunho"), "Publicar" puts it on the site and shows a "Ver no site" link.
Closing an untouched "Nova peça" discards it. **Ambientes:** upload, caption, reorder
and delete photos of installed pieces, each optionally linked to a product.
**Lixeira:** everything deleted in the last 30 days, with "Restaurar" and "Excluir
definitivamente". Deletions show a toast with "Desfazer". Public visitors just browse
the catalog and use the WhatsApp buttons; no admin controls are shown there.

### API (tRPC)

The server exposes five tRPC routers, consumed by the client via `client/src/lib/trpc.ts`:

- **`auth`**
  - `login` / `logout` / `me` — public; session cookie management (see Auth above).
- **`products`**
  - `list` — public; published products for the catalog.
  - `getBySlug` — public; a single published product by slug, `null` when missing or
    unpublished (drafts never leak).
  - `listAll` — admin; all products (including drafts), for management.
  - `create` / `update` — admin. Setting `isCustom` on one product clears it on the
    others. While a piece is unpublished its slug follows its name; once published the
    slug is frozen unless set explicitly.
  - `delete` — admin; moves the piece (and its photos) to the Lixeira.
  - `discardEmptyDraft` — admin; hard-deletes a piece only if it is still the untouched
    "Nova peça" draft (no name, no description, no photos, unpublished).
  - `reorder` — admin; persists catalog display order.
- **`images`**
  - `add` — admin; attach an image (from a data URL) to a product. Runs the variant
    pipeline; rejects undecodable data (including HEIC the browser did not convert) and
    files over 20 MB with a Portuguese message.
  - `delete` — admin; moves the image to the Lixeira (files stay until purged).
  - `reorder` — admin; persists image display order for a product.
  - `setCover` — admin; mark an image as the product's cover photo.
- **`gallery`** (Ambientes)
  - `list` — public; installed-piece photos in display order.
  - `add` / `update` (caption, related product) / `delete` (to the Lixeira) / `reorder` — admin.
- **`trash`** (Lixeira)
  - `list` — admin; deleted pieces, photos and Ambientes photos, newest first.
  - `restore` — admin; brings an item back (restoring a photo also restores its deleted
    parent piece).
  - `purge` — admin; deletes the rows and every variant/og file now. Items older than 30
    days are purged automatically (daily job, also at boot).

Plain HTTP: `GET /healthz` returns `200 {"ok":true}` after a trivial database query
(used by pm2/Caddy/uptime checks); `GET /uploads/<file>` serves photos;
`GET /og/<uuid>.jpg` serves a JPEG share-card version of an uploaded photo (derived
once from its largest WebP variant, because WhatsApp's preview scraper is unreliable
with WebP); `GET /sitemap.xml` and `GET /robots.txt` are generated from the catalog.

### Link previews and search (SEO)

Every public URL is answered with a server-rendered `<head>`: title, description,
canonical, Open Graph and Twitter tags (the piece's cover photo on product pages,
`client/public/og-default.jpg` elsewhere) and JSON-LD (`LocalBusiness` on the home
page, `BreadcrumbList` on pieces). Unknown routes and unpublished pieces answer
`404` with `noindex`; `/admin` is `noindex`. The strings live in `shared/seo-text.ts`
and the client reuses them for `document.title` after in-app navigation. Absolute
URLs come from `SITE_URL` in `.env` (falls back to the request host). Regenerate the
default share image after a logo change with `npm run og:image`.

## Notes

- `assets/*.jpg` at the repo root are the original source photos; they are not wired
  into the app. You can use them as product images via the admin upload button.
- Image credits for the bundled default photos: [`CREDITS.md`](./CREDITS.md).
