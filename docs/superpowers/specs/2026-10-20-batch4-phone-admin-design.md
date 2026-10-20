# Batch 4 — The owner's phone: stay-logged-in admin, photos-first "Nova peça", Lixeira — Design

**Date:** 2026-10-20
**Project:** Estúdio Pedra Industrial
**Status:** Builder-checked; awaiting owner approval
**Builds on:** Batches 1–3 (PRs #6, #7, #8; branch `feat/batch3-seo-previews`).

## 1. Intent and why

The owner's admin session happens on the sofa, on a phone, right after a
delivery: get a few photos from the camera roll into the site, write the
piece's details, and see it live. Today the admin is a desktop dialog that
demands the piece be created and saved before any photo can be attached,
asks for a 48-character random token on every device, deletes photos and
pieces irreversibly, and rejects HEIC files outside Safari. Batch 4 makes
the admin a tool the owner can use one-handed without fear.

## 2. Goals, non-goals, anti-goals

### Goals
1. The owner types the password once per device and stays logged in for
   30 days; "Sair" ends the session. Wrong passwords are throttled.
2. "Nova peça" is photos-first on a phone: pick several photos from the
   camera roll, then fill in the details, then "Publicar"; a "Ver no site"
   link opens the live page. Editing an existing piece uses the same screen.
3. Deleting a photo, a piece or an Ambientes photo moves it to a
   **Lixeira** where it can be restored or deleted for good; items older
   than 30 days are purged automatically, files included. Nothing in the
   Lixeira is visible on the site, the sitemap or the share cards.
4. HEIC photos upload from any browser (iPhone browsers already convert
   natively; other browsers convert in the page before upload).
5. Everything above works at 375 px with touch: visible controls, no
   hover-only actions, big tap targets.

### Non-goals
- Multiple admin users or roles; password change from the UI (the
  password stays `ADMIN_PASSWORD` in `.env`).
- Drag-and-drop reordering (touch drag is unreliable; arrows stay).
- Image editing (crop/rotate), bulk edits, import/export.
- Changing the public site. Only `/admin` and the server change.

### Anti-goals
- Weakening security for convenience: the session cookie is `HttpOnly`,
  `Secure` in production, `SameSite=Lax`, signed with a server secret;
  the bearer token keeps working for scripts and tests; failed logins are
  rate-limited; nothing is logged about passwords.
- Data loss: no hard delete from the admin without passing through the
  Lixeira (the only hard deletes are "Excluir definitivamente" there and
  the 30-day purge).
- Adding a database server, a queue or a third-party service.

## 3. Constraints

- Stack unchanged (React 19, Vite 7, Tailwind v4, shadcn/ui incl. `Drawer`
  via vaul and `sonner` toasts already installed, wouter, tRPC 11, Express
  4, Drizzle + better-sqlite3, sharp, vitest). One new client dependency is
  allowed for HEIC decoding (4.5). No new server dependencies: cookie
  parsing/signing and rate limiting are small and hand-written with
  `node:crypto`.
- `process.cwd()`-anchored paths; images through the existing pipeline;
  `deleteImageByUrl` removes variants and the og JPEG.
- Visitor- and owner-facing copy in Brazilian Portuguese.
- Existing 90 tests keep passing except where behaviour intentionally
  changes (hard delete → soft delete in `products.delete`, `images.delete`,
  `gallery.delete`; bearer-only auth → bearer or cookie).

## 4. Decisions

**(owner)** agreed in conversation; **(my call)** chosen by the author.

### 4.1 Session login **(owner: 30 days; mechanics my call)**

- New tRPC router `auth`: `login({ password })` → sets the cookie and
  returns `{ ok: true }`; `logout()` → clears it; `me()` (public) →
  `{ authenticated: boolean }`.
- Cookie `eps_session`, value `<expiresAtMs>.<base64url HMAC-SHA256>`,
  `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 30 days, `Secure` when
  the login request itself arrived over HTTPS (`req.secure`, which honours
  `X-Forwarded-Proto` behind Caddy). **(my call)** Tying it to the request
  rather than to `NODE_ENV` keeps the documented LAN test of the production
  build over `http://<ip>:3000` working; in the real deployment every
  request is HTTPS, so the cookie is always `Secure` there. The HMAC key is
  `SESSION_SECRET` from `.env` when
  set, otherwise derived from `ADMIN_PASSWORD` with HKDF, so changing the
  password logs every device out. Verification is timing-safe and checks
  expiry. No server-side session table.
- `adminProcedure` accepts **either** a valid `Authorization: Bearer`
  header (unchanged, used by tests and scripts) **or** a valid cookie.
- Rate limit on `auth.login`: per client IP (`req.ip`, correct behind Caddy
  thanks to `trust proxy`), 5 failures per 15 minutes, then
  `TOO_MANY_REQUESTS` with the message `Muitas tentativas. Aguarde 15
  minutos e tente de novo.`; a successful login clears the counter. In
  memory (single process); pure `createLoginLimiter({ max, windowMs, now })`
  so it is unit-tested.
- Client: the login screen posts to `auth.login`; `auth.me` decides which
  screen to show; `localStorage` token handling and the `Authorization`
  header in `main.tsx` are removed (`credentials: "include"` stays). "Sair"
  calls `auth.logout`. A `401` from any admin call sends the UI back to the
  login screen with "Sua sessão expirou. Entre de novo."
- Guides: step 4 now tells the owner to **choose a passphrase** (at least 12
  characters, e.g. three words) instead of generating a random token, since
  a person types it; `.env.example` says the same and documents the
  optional `SESSION_SECRET`.

### 4.2 Phone-first admin and the photos-first "Nova peça" **(owner: flow; layout my call)**

- The product editor becomes a full-screen panel below `sm` (640 px) and the
  existing centred dialog above it (shadcn `Dialog` with responsive
  classes; no second component).
- Field order: **Fotos** (picker + tiles) → **Nome** → **Categoria** →
  **Descrição** → **Materiais** / **Dimensões** → advanced (Slug, Preço,
  Destaque, Personalizado) in a collapsed "Mais opções" section.
- "Nova peça" creates a hidden draft immediately (`name: "Nova peça"`,
  `published: false`) so photos can be attached at once. Closing the panel
  while the draft is still untouched (default name, no description, no
  photos) deletes that empty draft outright (it never reaches the Lixeira);
  the server applies the predicate, so a stale client cannot hard-delete a
  real piece. Any other close keeps it as a draft, listed with the existing
  "Rascunho" badge.
- **Slug of a draft (my call):** while a piece has never been published,
  the server re-derives its slug from the name on every save (the Slug
  field, now under "Mais opções", still wins when the owner fills it). Once
  the piece is published the slug is frozen unless the owner edits the Slug
  field, so shared links stay valid. Drafts are never in the sitemap, so an
  auto slug like `nova-peca-3` can never leak. The server needs no new
  column for this: "never published" is `published = false` at save time.
- Footer actions: **Salvar** (keeps the current published state) and
  **Publicar** (saves with `published: true`) when the piece is a draft,
  **Salvar** and **Despublicar** when it is live; a **Ver no site** link
  (`/catalogo/<slug>`, `target="_blank"`) when published; **Excluir** →
  Lixeira. Saving requires a name other than the default.
- Photo tiles: controls always visible (no hover reveal), 44 px targets,
  "Capa" badge, upload progress text `Enviando 2 de 5…`, per-file errors as
  sonner toasts instead of `alert()`. Multi-select from the camera roll is
  already supported by the file input and stays.
- Product list on phones: one row per piece with thumbnail, name, badges;
  the reorder arrows and edit/delete actions wrap under the name instead of
  overflowing. Tabs: **Peças**, **Ambientes**, **Lixeira**.

### 4.3 Lixeira (soft delete, restore, 30-day purge) **(owner)**

- New nullable timestamp column `deletedAt` on `products`, `product_images`
  and `gallery_images` (one migration).
- Public reads (`products.list`, `products.getBySlug`, `gallery.list`, the
  sitemap, the page head) and admin lists exclude rows with `deletedAt`
  set. The client's "Veja também" works on `products.list`, so it needs no
  change. A deleted product's images are not individually
  marked; they disappear with their product and come back with it.
- `products.delete`, `images.delete`, `gallery.delete` become soft deletes
  (set `deletedAt = now`). The cover rule is unaffected: the first
  non-deleted image is the cover.
- New router `trash`: `list()` → `{ products: [...with images], images:
  [...with productName], gallery: [...] }` ordered by `deletedAt` desc,
  each with `deletedAt`; `restore({ kind: "product" | "image" | "gallery",
  id })`; `purge({ kind, id })` → hard delete + files. Restoring an image
  whose product is itself in the Lixeira restores the product too (my
  call). **Slugs stay reserved while a piece is in the Lixeira (my
  call):** the `UNIQUE(slug)` index and the slug helper keep seeing the
  deleted row, so a new piece with the same name gets `-2` until the old one
  is restored or purged, and restoring never has to rename anything. The
  Lixeira tab says so next to a deleted piece ("o endereço continua
  reservado").
- `purgeExpired(db, now = new Date())`: hard-deletes everything with
  `deletedAt` older than 30 days and removes the files; runs at boot and
  every 24 h (`setInterval`, unref'd). Pure enough to test with injected
  `now`.
- Lixeira tab: three groups (Peças, Fotos, Ambientes), each item with a
  thumbnail, name, `Excluído há N dias`, **Restaurar** and **Excluir
  definitivamente** (the latter behind a confirm). Empty state: `A lixeira
  está vazia.` Footer note: `Itens são apagados automaticamente após 30
  dias.`
- Reprocess script and `ensureProductImages` treat deleted rows like any
  other (no special casing needed; `ensureProductImages` only looks at
  products that have zero images, deleted or not, which is fine).

### 4.4 Delete confirmations **(my call)**

Deleting a photo stays a single tap (today it already has no confirmation;
now it is reversible); deleting a piece keeps its one-tap confirm because it
hides a whole page from the site. Both show a toast `Movido para a Lixeira`
with a **Desfazer** action for 5 seconds that calls `trash.restore`.

### 4.5 HEIC in the browser **(my call)**

- Client-side only, lazy. `compressImage` today swallows decode failures
  (it resolves the original data URL on error); its contract changes to
  report whether the browser decoded the file. When it did not and the file
  looks like HEIC/HEIF (declared type `image/heic`/`image/heif`,
  `.heic`/`.heif` extension, or `ftyp` brand), the admin loads
  `heic2any` on demand (`import()` → separate chunk, ~1 MB, never loaded
  on public pages) and converts to JPEG at quality 0.85 before the normal
  resize step. On iPhone browsers the native path still wins, so the chunk
  is never fetched there.
- Server-side detection and the Portuguese message stay as the last line
  of defence (unchanged).

### 4.6 Out of scope but noted
- Drag reorder, password change UI, multiple admins, image crop/rotate.
- Email/push notification of new quotes (not an admin concern).

## 5. Acceptance

1. On a phone-sized viewport, `/admin` shows a login screen; typing the
   passphrase once logs in; reloading, closing and reopening the browser
   within 30 days stays logged in; "Sair" returns to the login screen; the
   old `localStorage` token is no longer read or written. Six wrong
   passwords in a row → the sixth answer is `Muitas tentativas…` even with
   the right password; after the window it works again.
2. `Authorization: Bearer <ADMIN_PASSWORD>` still authorises admin calls
   (the existing router tests pass unchanged).
3. "Nova peça" on a phone: the panel is full-screen; picking three photos
   from the camera roll uploads them with a progress text; the draft exists
   immediately (listed as "Rascunho" if the panel is closed); filling the
   name and tapping "Publicar" makes the piece appear on `/catalogo` and
   the "Ver no site" link opens it. Closing an untouched "Nova peça" leaves
   nothing behind (not in the list, not in the Lixeira).
4. Deleting a photo moves it to the Lixeira; the toast's "Desfazer" brings
   it back in place (cover rule intact). Deleting a piece removes it from
   `/catalogo`, `/sitemap.xml` and its detail URL (404); restoring brings
   all of them back; "Excluir definitivamente" removes the rows and every
   variant and og file. Items older than 30 days vanish on the next boot
   (tested with an injected clock).
5. Uploading a HEIC file from Chrome desktop produces a normal processed
   photo; the public pages never download the HEIC chunk.
6. All admin controls at 375 px are reachable without hover; the public
   site is unchanged.
7. `npm run check` and `npm test` pass; new pure logic (session sign/verify
   with expiry and tamper, limiter, soft-delete filters in repos, restore
   semantics, purge with injected `now`, HEIC file detection, empty-draft
   rule) has unit tests; cookie auth and the trash router are covered
   through `createApp()`/`createCaller` like the existing routers.
8. `.env.example`, `DEPLOY.md`, `VPS-SETUP.md`, `README.md` updated
   (passphrase guidance, `SESSION_SECRET`, Lixeira behaviour, 30-day purge,
   backup note: the Lixeira is inside `.data/`).

## 6. Left to the builder

- Exact cookie parsing helper and where `requireAdmin` reads it; how the
  client learns about a 401 (query error vs. a tRPC link).
- The responsive panel's exact classes; whether the advanced section is a
  shadcn `Collapsible`.
- The empty-draft rule's exact predicate and whether it runs on
  `onOpenChange(false)` only or also on page unload.
- How `trash.list` joins image rows to product names.
- Where the purge interval lives (`index.ts` after boot) and its log line.
