# Estúdio Pedra Industrial

Local, self-contained version of the furniture-studio site. Originally scaffolded on
Manus; all Manus runtime, OAuth, external SDK, CDN, and MySQL dependencies have been
removed so it runs entirely on your machine.

## Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 + wouter (routing) + shadcn/ui
- **Backend:** Express + tRPC (`products` and `images` routers)
- **Data:** SQLite (via Drizzle) for product data, plain files on disk for images —
  no external database or service to install

## Run

```bash
npm install     # first time only
npm run dev     # http://localhost:3000
```

Other scripts:

```bash
npm run build   # production build -> dist/
npm start       # serve the production build
npm run check   # TypeScript type-check
npm test        # run the test suite
```

## How it works

- Pages: Home (`/`), Catálogo (`/catalogo`), Contato (`/contato`).
- The catalog page loads its products live from the API. Product data is seeded once
  on first boot (9 products) and then lives in SQLite.
- The logo lives at `client/public/logo.png` (previously loaded from a Manus CDN).

## Notes

- `assets/*.jpg` at the repo root are the original source photos; they are not wired
  into the app. You can use them as product images via the catalog's upload button.

## Backend / catalog

### Storage

- Product data lives in a SQLite database at `.data/app.db` (managed with Drizzle).
- Product images are stored as plain files on disk under `.data/uploads/` and served
  statically at `/uploads/...`.
- Both `.data/app.db` and `.data/uploads/` are git-ignored — they're local, per-machine
  state and are never committed.
- On first boot, if the database is empty, the server seeds it with 9 starter products.

### Auth token

Only two endpoints are public: `products.list` and `products.getBySlug` (used by the
catalog page). Everything else — all mutations (create/update/delete/reorder for
products and images) plus the admin read `products.listAll` — requires a bearer token.

1. Copy `.env.example` to `.env` (if you haven't already).
2. Generate a token and set it as `ADMIN_API_TOKEN` in `.env`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
3. Every request other than `products.list` / `products.getBySlug` must send
   `Authorization: Bearer <token>`. Requests without a valid token are rejected
   (fail-closed).

`.env` is git-ignored; never commit a real token value.

### Edit mode in the catalog

The catalog page has an "Editar" button. Click it and paste your `ADMIN_API_TOKEN` to
unlock image upload/remove for products directly from the UI. Without a valid token,
the catalog remains a read-only public view.

### API (tRPC)

The server exposes two tRPC routers, consumed by the client via `client/src/lib/trpc.ts`:

- **`products`**
  - `list` — public; active products for the catalog.
  - `getBySlug` — public; a single product by slug.
  - `listAll` — admin; all products (including inactive), for management.
  - `create` / `update` / `delete` — admin.
  - `reorder` — admin; persists catalog display order.
- **`images`**
  - `add` — admin; attach an image (from a data URL) to a product.
  - `delete` — admin; remove an image.
  - `reorder` — admin; persists image display order for a product.
  - `setCover` — admin; mark an image as the product's cover photo.

Full CRUD for product fields (name, description, price, etc.) is already available
through the `products` router via the API; a dedicated admin UI for editing those
fields is a future addition — today the UI only exposes image management.
