# Backend-owned product catalog — Design

**Date:** 2026-08-10
**Project:** Estúdio Pedra Industrial (local site)
**Status:** Approved design, pending implementation plan

## 1. Overview

Move the product catalog from a hardcoded array in `client/src/pages/Catalog.tsx`
into the backend as the source of truth. Products get a richer data model, images
become real files on disk (linked by a stable product id instead of by name), and the
API exposes full CRUD. Read endpoints are public; write endpoints are protected by a
static bearer token stored in `.env`.

### Goals

- Backend owns products and their images (create / read / update / delete / reorder).
- Rich product fields (category, materials, dimensions, optional price, featured, etc.).
- Images stored as files on disk, served over HTTP, linked by `productId`.
- Simple, static bearer-token auth for all write endpoints.
- Seed the existing 9 products on first run.
- Catalog page reads live data from the API.

### Non-goals (YAGNI, this pass)

- No user accounts / OAuth / roles (just the single static token).
- No purchase / cart / checkout logic.
- No full admin UI. Products are managed via the API; the catalog gets a minimal
  token-gated "edit mode" only for image upload/delete (see §7). A proper admin page
  is a possible follow-up.

## 2. Storage engine — SQLite + Drizzle ORM

Single local file at `.data/app.db`, no external service. Drizzle provides a
type-safe schema and migrations. Driver: `better-sqlite3`; if the native build is a
problem on Windows/Node 24, fall back to `@libsql/client` (`drizzle-orm/libsql`,
`file:.data/app.db`) — the schema and query code are identical.

## 3. Data model

### `products`
| column       | type                    | notes                                             |
|--------------|-------------------------|---------------------------------------------------|
| `id`         | integer PK autoincrement|                                                   |
| `slug`       | text, not null, unique  | URL-safe; auto-generated from `name` if omitted   |
| `name`       | text, not null          |                                                   |
| `description`| text, not null, `''`    |                                                   |
| `category`   | text, not null, `''`    | e.g. "Estruturas", "Luminárias", "Mesas"          |
| `materials`  | text, not null, `''`    | free text, e.g. "Aço carbono, MDF"                |
| `dimensions` | text, not null, `''`    | free text, e.g. "120 × 60 × 75 cm"                |
| `price`      | real, nullable          | `null` → rendered as "sob consulta"               |
| `featured`   | integer (bool), `0`     |                                                   |
| `sortOrder`  | integer, not null, `0`  | ascending display order                           |
| `published`  | integer (bool), `1`     | unpublished are hidden from the public site       |
| `createdAt`  | integer timestamp       | default now                                       |
| `updatedAt`  | integer timestamp       | set now on every update                           |

### `product_images`
| column      | type                     | notes                                        |
|-------------|--------------------------|----------------------------------------------|
| `id`        | integer PK autoincrement |                                              |
| `productId` | integer, not null, FK    | → `products.id`, `ON DELETE CASCADE`         |
| `url`       | text, not null           | e.g. `/uploads/<uuid>.jpg`                   |
| `alt`       | text, not null, `''`     | alt text                                     |
| `sortOrder` | integer, not null, `0`   | lowest = cover image                         |
| `createdAt` | integer timestamp        | default now                                  |

The **cover image** is the image with the lowest `sortOrder`. "Set as cover" moves an
image to `sortOrder` 0 and shifts the rest. Deleting a product cascades to its image
rows and deletes the corresponding files on disk.

Types flow to the client automatically through tRPC output inference — the client does
not import the Drizzle schema.

## 4. Images — files on disk

- Client keeps its current compression (canvas resize ≤ 1200px, JPEG). This is a UX
  nicety, not a security control.
- Flow: client compresses → sends a base64 data-URL to `images.add` → server validates
  it's an image, decodes it, writes `.data/uploads/<uuid>.jpg`, inserts a row with
  `sortOrder = max(existing)+1`, returns the row.
- Express serves the uploads directory statically at `/uploads/*`, mounted **before**
  the Vite dev middleware / static catch-all, in both dev and prod.
- `.data/` (db + uploads) is git-ignored.

## 5. API (tRPC)

Two procedure kinds:
- `publicProcedure` — no auth.
- `adminProcedure` — `publicProcedure` + `requireAdmin` middleware (see §6).

### `products` router
| endpoint     | kind   | input                                                        | output            |
|--------------|--------|--------------------------------------------------------------|-------------------|
| `list`       | public | —                                                            | published products (ordered), each with images ordered |
| `getBySlug`  | public | `{ slug: string }`                                           | product + images, or `null` |
| `listAll`    | admin  | —                                                            | all products (incl. unpublished) with images |
| `create`     | admin  | `{ name, slug?, description?, category?, materials?, dimensions?, price?, featured?, published? }` | created product |
| `update`     | admin  | `{ id, ...partial of create fields }`                        | updated product   |
| `delete`     | admin  | `{ id }`                                                     | `{ success: true }` (also deletes image files) |
| `reorder`    | admin  | `{ orderedIds: number[] }`                                   | `{ success: true }` (sets `sortOrder` by index) |

`create`/`update` auto-generate a unique slug from `name` when `slug` is missing
(append `-2`, `-3`, … on collision).

### `images` router
| endpoint    | kind  | input                                      | output          |
|-------------|-------|--------------------------------------------|-----------------|
| `add`       | admin | `{ productId: number, dataUrl: string, alt? }` | created image row |
| `delete`    | admin | `{ imageId: number }`                      | `{ success: true }` (removes file + row) |
| `reorder`   | admin | `{ productId: number, orderedIds: number[] }` | `{ success: true }` |
| `setCover`  | admin | `{ imageId: number }`                      | `{ success: true }` |

## 6. Auth — static bearer token

- `.env` holds `ADMIN_API_TOKEN`. A committed `.env.example` documents it; `.env` is
  git-ignored. On setup, generate a random token into `.env` if absent so writes work
  out of the box locally.
- `requireAdmin` middleware reads `Authorization: Bearer <token>` from the request and
  compares it to `process.env.ADMIN_API_TOKEN` using a constant-time comparison.
- **Fail closed:** if `ADMIN_API_TOKEN` is empty/unset, all admin endpoints return
  `UNAUTHORIZED`. Mismatch or missing header → `UNAUTHORIZED`.
- Adding real roles later is a one-line swap of this middleware; no endpoint signatures
  change.

## 7. Frontend changes

- **tRPC client** (`main.tsx`): the `fetch` wrapper attaches
  `Authorization: Bearer <token>` when `localStorage["eps_admin_token"]` is set.
- **Catalog** (`Catalog.tsx`): drop the hardcoded array; query `products.list` and
  render from server data (cover image, category, price/"sob consulta", etc.).
  - Image upload/delete rewire to the new `productId`-based `images.add` / `images.delete`.
  - A minimal **edit mode**: an "Editar" control prompts once for the token, stores it
    in `localStorage`, and reveals the existing upload/remove controls. With no token
    stored, the page is read-only (public view). This is the only UI added — not a full
    admin page.
- Home / Contact / NotFound are unchanged.

## 8. File / directory layout

```
server/
  index.ts        # + serve /uploads static, mount routers
  trpc.ts         # + adminProcedure / requireAdmin
  db/
    client.ts     # drizzle + better-sqlite3 instance, runs migrations on boot
    schema.ts     # products, product_images
    seed.ts       # seed 9 products if empty
  routers/
    products.ts
    images.ts
    index.ts      # appRouter
  lib/
    slug.ts       # slugify + uniqueness
    images.ts     # data-URL decode + file write/delete
drizzle/          # generated migrations
.data/            # app.db + uploads/  (git-ignored)
.env.example      # ADMIN_API_TOKEN=...
```

`server/routers.ts` and `server/db.ts` from the current build are replaced by the
`routers/` and `db/` folders above.

## 9. Error handling

- Invalid/oversized image data-URL → `BAD_REQUEST` with a clear message; client keeps
  its extra-compression retry.
- Unknown `id`/`slug` on read → `null` (list) or handled 404 in the page; on
  write → `NOT_FOUND`.
- Missing DB file/dir → created automatically on boot; migrations applied idempotently.
- File-delete failures during product/image delete are logged and do not abort the DB
  operation (row removal is the source of truth).

## 10. Testing

- Re-introduce **vitest** for server logic: slug generation/uniqueness, the
  `requireAdmin` middleware (valid/invalid/missing token, empty env), image data-URL
  decode/validation, and products/images repository CRUD against a temp SQLite file.
- Frontend verified by running the app and exercising list render + token-gated
  upload/delete in the browser (as in the initial delivery).

## 11. Migration / seed notes

- First boot with an empty DB seeds the current 9 products (slug = current id, name and
  description as-is, `category` assigned per product, `materials = "Aço carbono, MDF"`,
  `published = true`, `sortOrder` by original array order). No images seeded.
- The orphaned `assets/*.jpg` at the repo root are still not wired in; they can be
  uploaded per-product via edit mode.
