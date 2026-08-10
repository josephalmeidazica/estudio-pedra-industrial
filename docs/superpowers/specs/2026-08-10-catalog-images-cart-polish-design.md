# Catalog product images + cart polish — Design (Feature 1 of 2)

**Date:** 2026-08-10
**Project:** Estúdio Pedra Industrial (local site)
**Status:** Approved design, pending spec review

This is **Feature 1** of a two-part improvement. **Feature 2 (an `/admin` panel
+ `ADMIN_API_TOKEN`→`ADMIN_PASSWORD` rename + removing the catalog "Editar"
button)** is captured in the Appendix and will get its own spec/plan next. This
feature leaves the existing "Editar" mode untouched.

## 1. Overview

Make the catalog look populated and polish the "raw" cart: (a) attach default
illustrative images to the 9 seeded products, (b) show each product's image in
the cart drawer, and (c) refine the cart UI with clearer iconography. Frontend +
a small seed/backfill change only; no API or storage-model changes.

### Goals
- Every seeded product shows a realistic image on the catalog and in the cart.
- The cart drawer shows a thumbnail per line item.
- The cart looks finished: thumbnails, clearer controls, a summary row, a proper
  empty state, and a WhatsApp/chat icon on checkout.
- Images are committed to the repo so they work on every host with no upload.

### Non-goals (this feature)
- No change to cart storage (still `{ name, quantity }` in `localStorage`).
- No admin panel, no `/admin`, no token rename, no removal of "Editar" (Feature 2).
- No Home/Contact redesign (the leftover ambiance asset is noted for later).

## 2. Product images

### Mapping (9 products)
| Slug | Source |
|---|---|
| `mesa-urb` | asset `PckYccPW3NGa.jpg` (steel X-frame table) |
| `estrutura-gaia` | asset `9qpkq1yzquXC.jpg` (steel+wood console) |
| `estante-divisio` | asset `m24KsfmQihY0.jpg` (copper/steel sideboard) |
| `luminaria-lua` | asset `SznrM7F3Mh5c.jpg` (glass pendants) |
| `projetos-personalizados` | asset `NYmUqhCqbqRa.jpg` (loft kitchen ambiance) |
| `luminaria-sol` | royalty-free (warm pendant/lamp) |
| `mesa-cabeceira-loft` | royalty-free (industrial nightstand) |
| `mesa-office-l` | royalty-free (L-shaped/industrial desk) |
| `penteadeira-glam` | royalty-free (vanity / dressing table) |

Dropped: `ZSWTVfKJLKps.jpg` (corrupt — it's an HTML error page, not an image).
Unused: `ib5rlsPtseSm.jpeg` (kept in `assets/` for a possible Home hero later).

### Files on disk
All chosen images live in **`client/public/products/<slug>.jpg`** (Vite serves
`client/public` at the web root, so the URL is `/products/<slug>.jpg`). Committed
→ identical behavior on local/VPS/Render/Vercel, no runtime upload needed.
- The 5 assets are **copied** from `assets/` to `client/public/products/<slug>.jpg`.
- The 4 royalty-free images are **downloaded** into the same folder.

### Royalty-free sourcing (license-safe)
- Source from **Unsplash/Pexels** (free-to-use licenses). Pick realistic photos
  matching each product.
- **Verify every downloaded file is a real image** (`file <path>` must report a
  JPEG, not `HTML document`) — the broken asset is a cautionary example.
- Compress to a reasonable web size (≤ ~300 KB, ~1600px max) for fast loads.
- Record each image's source URL + license in a new **`CREDITS.md`**.

### Wiring — idempotent boot backfill
`server/db/seed.ts` gains:
- `DEFAULT_PRODUCT_IMAGES: Record<string, string>` mapping each of the 9 slugs to
  `/products/<slug>.jpg`.
- `ensureProductImages(db)`: for each slug, look up the product; if it currently
  has **zero** images, insert one `productImages` row (`url` = the mapped path,
  `sortOrder: 0`, `alt` = product name). Idempotent — only acts when a product
  has no images, so it never duplicates and never overrides owner-added photos.

`server/index.ts` calls `await ensureProductImages(db)` right after
`seedIfEmpty(db)` on boot. Effect: images appear on **fresh** deploys *and*
**already-seeded** local DBs, with no manual step.
- Known edge case (acceptable for a default): if the owner later deletes *all* of
  a product's images via "Editar", the default image reattaches on next boot.

## 3. Cart shows the product image

Cart storage is unchanged (`{ name, quantity }`). In `CartWidget`, add
`trpc.products.list.useQuery()` and build a `Map<name, { url, category }>` from
the products (cover = `product.images[0]?.url`). Each cart line renders that
thumbnail (rounded, ~48px) and the category subtitle; if no image is found, show
a muted placeholder icon (lucide `ImageOff` in a bordered box). No change to what
is persisted.

## 4. Cart polish (full)

`CartWidget` refinements (existing shadcn components + tokens + lucide only; no
new colors):
- **Line item:** `[thumbnail] name / muted category  ——  [– qty +] pill  [trash]`.
  Steppers grouped in a bordered pill; remove is a ghost `Trash2` button.
- **Summary row** above the footer: a `ShoppingBag` icon + "N iten(s)" (from
  `totalCount`).
- **Checkout button:** add a chat/WhatsApp icon (lucide `MessageCircle`) before
  "Finalizar pedido no WhatsApp".
- **Empty state:** centered muted `ShoppingBag` icon + "Seu carrinho está vazio" +
  a hint line ("Adicione produtos do catálogo.").
- **Structure:** `Separator`s between items, consistent padding, a scrollable
  item list (`overflow-y-auto`), footer pinned at the bottom.

## 5. Catalog card — modest iconography

On each product card, add a small **category chip** (lucide `Tag` icon + the
`category` text) in the site's muted token styling — a subtle touch so cards feel
less bare, without breaking the minimalist look. (Cover image already renders via
`product.images[0].url`; it now resolves to the seeded default.) The "Editar"
controls are unchanged in this feature.

## 6. Files

```
client/public/products/<slug>.jpg   # 9 images (5 copied from assets/, 4 royalty-free) — NEW
CREDITS.md                          # royalty-free image sources/licenses — NEW
server/db/seed.ts                   # + DEFAULT_PRODUCT_IMAGES + ensureProductImages() (modified)
server/db/seed.test.ts              # + ensureProductImages idempotency test (modified)
server/index.ts                     # call ensureProductImages after seedIfEmpty (modified)
client/src/components/cart/CartWidget.tsx  # thumbnails (products.list join) + full polish (modified)
client/src/pages/Catalog.tsx        # category chip on cards (modified)
```

## 7. Testing

- **Unit (vitest):** `ensureProductImages` against a temp DB — attaches the
  default when a product has no images; is a no-op on a second run (no
  duplicates); does not touch a product that already has an image. (Reuses the
  existing `seed.test.ts` temp-DB setup.)
- **Browser:** catalog shows an image on every product + the category chip; cart
  drawer shows thumbnails, the summary row, WhatsApp icon, empty state, and the
  polished controls; checkout still builds the correct `wa.me` URL; cart still
  persists on reload. Verify each `/products/*.jpg` returns a real image (200,
  image/jpeg).

## Appendix — Feature 2 decisions (captured, not built here)

**Feature 2: `/admin` management panel.**
- New client route **`/admin`** (wouter) — a password-gated panel for **full
  product + image CRUD** (list incl. unpublished via `products.listAll`; create;
  edit all fields: name/slug/description/category/materials/dimensions/price/
  featured/published/sortOrder; delete; reorder; per-product image add/remove/
  reorder/set-cover). Backend endpoints already exist (all `adminProcedure`).
- **Auth:** rename `ADMIN_API_TOKEN` → **`ADMIN_PASSWORD`** (one secret in `.env`,
  serving as both the `/admin` login password and the API bearer). Update
  `server/lib/auth.ts`, `.env.example`, `DEPLOY.md`, `VPS-SETUP.md`, and the
  client bearer wiring. Login = enter password → stored in `localStorage` → the
  client attaches it as the bearer → verified server-side per request (attempt
  `products.listAll` to confirm). Real enforcement stays server-side.
- **Remove** the catalog "Editar" toggle + in-card upload/remove controls (all
  management moves to `/admin`); the catalog becomes public browse + cart only.
- Own brainstorm → spec → plan → build after Feature 1 ships.
```
