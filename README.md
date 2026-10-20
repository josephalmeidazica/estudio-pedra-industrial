# Estúdio Pedra Industrial

Portfolio site for a bespoke furniture studio (carbon steel + MDF). Visitors browse
finished pieces and request quotes over WhatsApp; the owner manages the catalog at
`/admin`. Self-contained: one Node process, SQLite, files on disk.

## Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 + wouter (routing) + shadcn/ui
- **Backend:** Express + tRPC (`products` and `images` routers), `GET /healthz`
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
`restore.sh`.

## How it works

- Pages: Home (`/`), Catálogo (`/catalogo`), Contato (`/contato`), Admin (`/admin`).
  The public pages share one header (with a mobile menu), footer and a floating
  WhatsApp button; every catalog card has a one-tap "Pedir orçamento" WhatsApp link
  and an "Adicionar ao carrinho" option for multi-item quotes.
- The catalog page loads its products live from the API. Product data is seeded once
  on first boot (9 products) and then lives in SQLite.
- The WhatsApp number lives in `client/src/config.ts`; the logo in `client/public/logo.png`.

## Backend / catalog

### Storage

- Product data lives in a SQLite database at `.data/app.db` (managed with Drizzle;
  migrations in `drizzle/` run automatically on boot).
- Product images are processed on upload by `sharp` into WebP variants at widths
  480, 960 and 1600 (never upscaled; a narrower photo stops at its own width), stored
  under `.data/uploads/<uuid>-<width>.webp` and served at `/uploads/...` with a
  one-year immutable cache header. Each `product_images` row records `width`,
  `height` and a `variants` map; the client renders `srcset`/`sizes` from it.
- The nine bundled default photos (`client/public/products/`) go through the same
  pipeline on first boot. Databases created before the pipeline existed can be
  converted once with `npm run images:reprocess` (run `npm run build` first).
- HEIC uploads: iPhone Safari converts them to JPEG in the browser automatically. On
  browsers that cannot decode HEIC the server rejects the file with guidance to send
  JPEG instead.
- `.data/` is git-ignored — it is local, per-machine state. **It is the whole
  database plus every photo: back it up** (`deploy/backup.sh`).

### Auth token

Only two endpoints are public: `products.list` and `products.getBySlug` (used by the
catalog page). Everything else — all mutations (create/update/delete/reorder for
products and images) plus the admin read `products.listAll` — requires a bearer token.

1. Copy `.env.example` to `.env` (if you haven't already).
2. Generate a token and set it as `ADMIN_PASSWORD` in `.env`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
3. Every request other than `products.list` / `products.getBySlug` must send
   `Authorization: Bearer <token>`. Requests without a valid token are rejected
   (fail-closed). In production the server refuses to start if the token is unset.

`.env` is git-ignored; never commit a real token value.

### Admin panel (/admin)

The site has a password-protected admin panel at **`/admin`**. Log in with your
`ADMIN_PASSWORD` (from `.env`) to manage the full catalog — create/edit/delete/reorder
products (name, slug, category, materials, dimensions, price, description, featured,
published) and upload/remove/reorder their images (set a cover). Public visitors just
browse the catalog and use the WhatsApp buttons; no admin controls are shown there.

### API (tRPC)

The server exposes two tRPC routers, consumed by the client via `client/src/lib/trpc.ts`:

- **`products`**
  - `list` — public; published products for the catalog.
  - `getBySlug` — public; a single product by slug.
  - `listAll` — admin; all products (including drafts), for management.
  - `create` / `update` / `delete` — admin.
  - `reorder` — admin; persists catalog display order.
- **`images`**
  - `add` — admin; attach an image (from a data URL) to a product. Runs the variant
    pipeline; rejects HEIC, files over 20 MB and undecodable data with a Portuguese message.
  - `delete` — admin; remove an image and all its variant files.
  - `reorder` — admin; persists image display order for a product.
  - `setCover` — admin; mark an image as the product's cover photo.

Plain HTTP: `GET /healthz` returns `200 {"ok":true}` after a trivial database query
(used by pm2/Caddy/uptime checks); `GET /uploads/<file>` serves photos.

## Notes

- `assets/*.jpg` at the repo root are the original source photos; they are not wired
  into the app. You can use them as product images via the admin upload button.
- Image credits for the bundled default photos: [`CREDITS.md`](./CREDITS.md).
