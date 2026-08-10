# Admin panel (/admin) — Design (Feature 2 of 2)

**Date:** 2026-08-10
**Project:** Estúdio Pedra Industrial (local site)
**Status:** Approved design, pending spec review

## 1. Overview

Add a password-gated **`/admin`** management panel for full product + image
CRUD, rename the admin secret `ADMIN_API_TOKEN` → `ADMIN_PASSWORD`, and remove
the catalog's inline "Editar" mode (all management moves to `/admin`). The
backend already exposes every needed endpoint (all `adminProcedure`); this is
primarily a frontend build plus a secret rename.

### Goals
- A `/admin` route with a password login (secret from `.env`) and logout.
- Manage all products: list (incl. unpublished), create, edit every field,
  delete, reorder (up/down).
- Manage each product's images: upload, remove, set cover, reorder.
- Rename the secret to `ADMIN_PASSWORD` across server + docs.
- Remove the catalog "Editar" button and in-card upload/remove controls.

### Non-goals
- No user accounts, roles, or audit log — single admin, single secret.
- No bulk import/export.
- No change to the public catalog behavior beyond removing "Editar".
- No change to cart/WhatsApp behavior.

## 2. Route & login

- New page `client/src/pages/Admin.tsx`, registered at wouter route `/admin` in
  `client/src/App.tsx`. **Unlisted** — no link on the public site.
- **Login gate:** the panel reads the stored password from
  `localStorage["eps_admin_token"]` (the same key the tRPC client already sends
  as the bearer). If absent, render a "Senha de administrador" form.
  On submit: store the value, then call `products.listAll`:
  - success → render the panel;
  - `UNAUTHORIZED` (wrong/blank) → show "Senha incorreta", clear the stored value.
- **Logout:** a "Sair" button clears `localStorage["eps_admin_token"]` and returns
  to the login form.
- No new client bearer wiring needed — `main.tsx`'s `httpBatchLink` fetch already
  attaches `Authorization: Bearer <localStorage eps_admin_token>` when present.

## 3. Secret rename: `ADMIN_API_TOKEN` → `ADMIN_PASSWORD`

- `server/lib/auth.ts`: read `process.env.ADMIN_PASSWORD` (was `ADMIN_API_TOKEN`);
  same fail-closed + constant-time comparison. Update `server/lib/auth.test.ts`.
- `server/index.ts`: boot warning references `ADMIN_PASSWORD`.
- `server/routers/routers.test.ts`: the test sets `process.env.ADMIN_PASSWORD`.
- `.env` (local): rename the key (keep the existing value so local keeps working).
- `.env.example`, `DEPLOY.md`, `VPS-SETUP.md`: rename `ADMIN_API_TOKEN` →
  `ADMIN_PASSWORD` in all references (generation command, env tables, prose).
- Client stores/sends the password under the existing `eps_admin_token`
  localStorage key (an internal client detail; no user-facing name change needed).

## 4. Panel UI — list + dialog

Uses existing shadcn/ui (`Table`/rows, `Dialog`, `AlertDialog`, `Button`,
`Input`, `Textarea`, `Switch`, `Badge`, `Select` if needed) + lucide + tokens.

### Product list
- Data: `trpc.products.listAll.useQuery()` (all products incl. unpublished,
  ordered by `sortOrder`).
- Each row: cover thumbnail (`images[0]?.url` or placeholder), name, category, a
  **Publicado/Rascunho** badge, and actions: **Editar**, **↑**, **↓**, **Excluir**.
- A **"Novo produto"** button opens the dialog in create mode.
- **↑/↓**: recompute the ordered id list and call `products.reorder({ orderedIds })`.
- **Excluir**: `AlertDialog` confirm → `products.delete({ id })`.

### Create/Edit dialog (`components/admin/ProductDialog.tsx`)
Form fields → `products.create` (new) or `products.update` (edit):
- `name` (required), `slug` (optional; auto from name if blank), `description`
  (Textarea), `category`, `materials`, `dimensions`, `price` (number input; blank
  → `null`, rendered publicly as "sob consulta"), `featured` (Switch),
  `published` (Switch).
- On save, invalidate `products.listAll` (and the public `products.list`).

### Image manager (`components/admin/ImageManager.tsx`, inside the dialog for an existing product)
- Lists the product's images (ordered) with per-image **Remover**, **Definir capa**
  (set cover), **↑/↓**.
  - Remover → `images.delete({ imageId })`
  - Definir capa → `images.setCover({ imageId })`
  - ↑/↓ → `images.reorder({ productId, orderedIds })`
- **Upload:** a file input → client-side compress (shared util, §5) → `images.add({
  productId, dataUrl })`. Supports multiple files.
- All image mutations invalidate `products.listAll`.
- (Image management requires an existing product id, so for a brand-new product
  the dialog shows images after the initial create/save.)

## 5. Extract shared image-compress util

Move the canvas-based compression (currently inline in `Catalog.tsx`) to
`client/src/lib/imageCompress.ts` exporting
`compressImage(dataUrl: string, quality?: number): Promise<string>` (resize to
≤1200px, JPEG). The admin ImageManager imports it. (Pure browser/DOM helper;
verified in the browser, not unit-tested.)

## 6. Remove "Editar" from the catalog

In `client/src/pages/Catalog.tsx`, remove:
- the `adminToken`/`editMode` state, `enableEditMode`/`exitEditMode`, and the
  "Editar"/"Sair do modo edição" toggle;
- the in-card "Adicionar Fotos" and per-image remove (X) controls;
- the `trpc.images.add`/`images.delete` usage, the upload/delete handlers, and the
  inline `compressImage` (now in the shared util).

Catalog keeps: `products.list`, product cards + cover + category chip,
`AddToCartButton`, the image gallery/lightbox (viewing), and `CartWidget`.

## 7. Security

`/admin` is a normal client route — anyone can load the login form — but:
- `products.listAll` and **every** mutation are `adminProcedure` (server verifies
  the password on each request), so unpublished data never leaks and nothing
  changes without the correct password.
- The password lives only in `.env` server-side; the client holds only what the
  admin types (localStorage). Client gating is UX; the server is the enforcement.

## 8. Files

```
client/src/pages/Admin.tsx                    # NEW route page: login gate + product list
client/src/components/admin/ProductDialog.tsx # NEW create/edit form (+ embeds ImageManager)
client/src/components/admin/ImageManager.tsx  # NEW per-product image CRUD
client/src/lib/imageCompress.ts               # NEW shared compress util (extracted)
client/src/App.tsx                            # + /admin route (modified)
client/src/pages/Catalog.tsx                  # remove Editar mode + inline upload/compress (modified)
server/lib/auth.ts                            # ADMIN_API_TOKEN -> ADMIN_PASSWORD (modified)
server/lib/auth.test.ts                       # env var rename (modified)
server/routers/routers.test.ts                # env var rename (modified)
server/index.ts                               # boot warning text (modified)
.env / .env.example                           # ADMIN_PASSWORD (modified)
DEPLOY.md / VPS-SETUP.md                       # ADMIN_PASSWORD references (modified)
```
(shadcn `table.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `switch.tsx`, `textarea.tsx`
already exist in `components/ui/`; verify during implementation.)

## 9. Testing

- **Unit (vitest):** update `auth.test.ts` + `routers.test.ts` to the
  `ADMIN_PASSWORD` env var (behavior identical). Full suite stays green.
- **Browser:** at `/admin` — wrong password rejected; correct password unlocks;
  create a product (appears on the public catalog); edit fields (incl.
  publish/unpublish → visibility on the catalog); reorder ↑/↓; upload an image →
  shows on the card + cart; set cover / remove / reorder images; delete a product
  (confirm); "Sair" locks it again. Confirm the catalog no longer shows "Editar"
  and public browsing/cart still work. Verify a wrong password can't read
  unpublished data (server rejects `listAll`).

## 10. Notes

- After the rename, any already-stored `eps_admin_token` in a browser keeps
  working only if it equals the new `ADMIN_PASSWORD` value (same value, just a
  renamed env key — so it does).
- Deploy docs already updated in Feature 1 will be adjusted here for the new var
  name; the boot backfill and images from Feature 1 are unaffected.
```
