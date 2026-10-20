# Estúdio Pedra Industrial

Portfolio site for a bespoke furniture studio (carbon steel + MDF). Visitors browse
finished pieces, add the ones they like to a cart and land in WhatsApp with a ready
quote request; the owner manages the catalog and the photo gallery at `/admin`.
Self-contained: one Node process, SQLite, files on disk.

## Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 + wouter (routing) + shadcn/ui
- **Backend:** Express + tRPC (`products`, `images` and `gallery` routers), `GET /healthz`
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
```

Deployment: [`DEPLOY.md`](./DEPLOY.md) (cheat-sheet) and [`VPS-SETUP.md`](./VPS-SETUP.md)
(full guide), with helper scripts in [`deploy/`](./deploy) including `backup.sh` and
`restore.sh`. Product discovery notes live under [`docs/discovery/`](./docs/discovery)
(e.g. the deferred analytics evaluation).

## How it works

- **Pages:** Home (`/`), Catálogo (`/catalogo`, filterable with `?categoria=<slug>`),
  product detail (`/catalogo/<slug>`), Contato (`/contato`), Admin (`/admin`). Public
  pages share one header (with a mobile menu), footer and a floating WhatsApp button.
- **The quote flow:** every card and detail page has a one-tap "Pedir orçamento"
  WhatsApp button and an "Adicionar ao carrinho" option. The cart asks for the
  customer's name and bairro and opens WhatsApp with a message listing the chosen
  pieces (each with a link to its page) and the totals.
- **"Móvel personalizado":** the catalog entry flagged *Personalizado* in the admin.
  Adding it asks for a short description of the piece the customer wants; the text
  travels into the message. At most one product carries the flag.
- **Home page:** opens with the pieces marked *Destaque* (padded to six when fewer than
  three are marked), then the "Na casa dos nossos clientes" strip of installed-piece
  photos managed in the admin's **Ambientes** tab.
- The catalog loads live from the API. Product data is seeded once on first boot
  (9 products) and then lives in SQLite.
- The WhatsApp number lives in `client/src/config.ts`; the logo in `client/public/logo.png`.

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
- HEIC uploads: iPhone Safari converts them to JPEG in the browser automatically. On
  browsers that cannot decode HEIC the server rejects the file with guidance to send
  JPEG instead. Corrupt or oversized (> 20 MB) files are rejected with a Portuguese
  message too.
- `.data/` is git-ignored — it is local, per-machine state. **It is the whole
  database plus every photo: back it up** (`deploy/backup.sh`).

### Auth token

Public endpoints: `products.list`, `products.getBySlug` and `gallery.list`. Everything
else — all mutations plus the admin read `products.listAll` — requires a bearer token.

1. Copy `.env.example` to `.env` (if you haven't already).
2. Generate a token and set it as `ADMIN_PASSWORD` in `.env`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
3. Every non-public request must send `Authorization: Bearer <token>`. Requests without
   a valid token are rejected (fail-closed). In production the server refuses to start
   if the token is unset.

`.env` is git-ignored; never commit a real token value.

### Admin panel (/admin)

Password-protected panel with two tabs. **Produtos:** create/edit/delete/reorder products
(name, slug, category, materials, dimensions, price, description, *Destaque*,
*Publicado*, *Personalizado*) and upload/remove/reorder their images (set a cover).
**Ambientes:** upload, caption, reorder and delete photos of installed pieces, each
optionally linked to a product. Public visitors just browse the catalog and use the
WhatsApp buttons; no admin controls are shown there.

### API (tRPC)

The server exposes three tRPC routers, consumed by the client via `client/src/lib/trpc.ts`:

- **`products`**
  - `list` — public; published products for the catalog.
  - `getBySlug` — public; a single published product by slug, `null` when missing or
    unpublished (drafts never leak).
  - `listAll` — admin; all products (including drafts), for management.
  - `create` / `update` / `delete` — admin. Setting `isCustom` on one product clears it on
    the others.
  - `reorder` — admin; persists catalog display order.
- **`images`**
  - `add` — admin; attach an image (from a data URL) to a product. Runs the variant
    pipeline; rejects HEIC, files over 20 MB and undecodable data with a Portuguese message.
  - `delete` — admin; remove an image and all its variant files.
  - `reorder` — admin; persists image display order for a product.
  - `setCover` — admin; mark an image as the product's cover photo.
- **`gallery`** (Ambientes)
  - `list` — public; installed-piece photos in display order.
  - `add` / `update` (caption, related product) / `delete` / `reorder` — admin.

Plain HTTP: `GET /healthz` returns `200 {"ok":true}` after a trivial database query
(used by pm2/Caddy/uptime checks); `GET /uploads/<file>` serves photos.

## Notes

- `assets/*.jpg` at the repo root are the original source photos; they are not wired
  into the app. You can use them as product images via the admin upload button.
- Image credits for the bundled default photos: [`CREDITS.md`](./CREDITS.md).
