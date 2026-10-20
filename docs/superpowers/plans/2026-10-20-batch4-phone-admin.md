# Batch 4 — The owner's phone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A phone-usable admin: 30-day cookie login with throttled attempts, a photos-first "Nova peça" editor, a Lixeira with restore and 30-day purge, and HEIC uploads from any browser.

**Architecture:** Auth adds a pure session module (HMAC-signed cookie, HKDF key, in-memory login limiter) and an `auth` router; `adminProcedure` accepts the cookie or the existing bearer token. Soft delete adds a `deletedAt` column to the three content tables, filters in every public/admin read, a `trash` repo/router and a purge job. The admin UI reshapes `ProductDialog` into a photos-first editor (draft created on open, empty draft discarded server-side), adds a Lixeira tab, visible touch controls, toasts, and a lazy HEIC decoder.

**Tech Stack:** Node `crypto` (HMAC, HKDF), Express 4, tRPC 11, Drizzle + better-sqlite3, React 19, shadcn/ui (Dialog, Collapsible, Tabs, sonner), `heic2any` (new client dependency, lazy chunk), vitest.

**Spec:** `docs/superpowers/specs/2026-10-20-batch4-phone-admin-design.md`

## Global Constraints

- Branch `feat/batch4-phone-admin`, stacked on `feat/batch3-seo-previews` (PR #8). Commits `feat(admin|auth|trash): …` / `docs: …`.
- No public-site changes. Admin and server only, plus docs.
- Cookie: name `eps_session`, value `<expiresAtMs>.<base64url hmac>`, `HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`, `Secure` when the login request was HTTPS (`req.secure`). Key: `SESSION_SECRET` or HKDF-SHA256 of `ADMIN_PASSWORD` (info `eps-session`). No sessions when `ADMIN_PASSWORD` is empty.
- Limiter: 5 failures / 15 minutes / IP; message `Muitas tentativas. Aguarde 15 minutos e tente de novo.`; success clears the counter.
- Bearer auth keeps working unchanged (existing router tests must pass as they are).
- Soft delete everywhere the admin deletes; hard delete only via `trash.purge`, `purgeExpired` (30 days) and the empty-draft discard.
- Draft name `Nova peça`; slug follows the name while `published = false` and no explicit slug is sent.
- Owner-facing copy in Brazilian Portuguese; toasts via sonner, no `alert()` left in the admin.
- Run `npm run check` at the end of every task.

## Review Focus

1. **Tampered, expired or foreign cookie** (edited expiry, wrong key, garbage, cookie from a server whose password changed): rejected as `UNAUTHORIZED`, never a crash. Tests in Task 1 (pure) and Task 2 (HTTP).
2. **Limiter behind the proxy**: keyed by the client IP that `trust proxy` derives from `X-Forwarded-For`, so one abusive IP cannot lock everyone out and Caddy's IP is never the key. Test in Task 2.
3. **Deleting a piece that is in a visitor's cart or is the custom piece**: it vanishes from the catalog, sitemap and detail URL; the cart shows it as unavailable (Batch 2 resolver) and restoring brings everything back. Tests in Task 4 (repo) and Task 5 (router).
4. **Purge removes files, not just rows**: every variant and the og JPEG of purged images and of purged products' images are gone; a restore before 30 days keeps them. Test in Task 4 with real files.
5. **Empty-draft discard is enforced server-side**: a draft with a photo, a description or a real name is never hard-deleted by the discard call. Test in Task 5.

---

## Part A — Login

### Task 1: Session cookie and login limiter (pure)

**Files:**
- Create: `server/lib/session.ts`, `server/lib/session.test.ts`

**Interfaces:**
- `SESSION_COOKIE = "eps_session"`, `SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000`.
- `sessionKey(env: { SESSION_SECRET?: string; ADMIN_PASSWORD?: string }): Buffer | null` — `SESSION_SECRET` bytes when set, else `crypto.hkdfSync("sha256", ADMIN_PASSWORD, "", "eps-session", 32)`; `null` when both are empty.
- `signSession(expiresAt: number, key: Buffer): string` → `${expiresAt}.${base64url(hmacSHA256(key, String(expiresAt)))}`.
- `verifySession(value: string | undefined, key: Buffer | null, now: number): boolean` — false on missing/malformed/expired/bad signature (timing-safe compare).
- `parseCookies(header: string | undefined): Record<string, string>`.
- `serializeSessionCookie(value: string, opts: { secure: boolean; maxAgeSec: number }): string` → `eps_session=<value>; Path=/; HttpOnly; SameSite=Lax; Max-Age=<n>[; Secure]`; `clearSessionCookie(): string` → same with empty value and `Max-Age=0`.
- `createLoginLimiter(opts?: { max?: number; windowMs?: number; now?: () => number }): { allowed(ip: string): boolean; fail(ip: string): void; succeed(ip: string): void }` — defaults 5 / 15 min; failures older than the window are forgotten.
- `LOGIN_THROTTLED_MESSAGE = "Muitas tentativas. Aguarde 15 minutos e tente de novo."`

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";
import { clearSessionCookie, createLoginLimiter, parseCookies, serializeSessionCookie, sessionKey, signSession, verifySession } from "./session";

const key = sessionKey({ ADMIN_PASSWORD: "correct horse battery staple" })!;

test("sessionKey: SESSION_SECRET wins, HKDF otherwise, null when nothing is set", () => {
  expect(sessionKey({})).toBeNull();
  expect(sessionKey({ ADMIN_PASSWORD: "" })).toBeNull();
  expect(key.length).toBe(32);
  expect(sessionKey({ SESSION_SECRET: "s", ADMIN_PASSWORD: "p" })!.toString()).toBe("s");
  expect(sessionKey({ ADMIN_PASSWORD: "other" })!.equals(key)).toBe(false);
});

test("sign/verify: valid until expiry; tampered, foreign-key and malformed values fail", () => {
  const now = 1_700_000_000_000;
  const v = signSession(now + 1000, key);
  expect(verifySession(v, key, now)).toBe(true);
  expect(verifySession(v, key, now + 1001)).toBe(false);
  expect(verifySession(v.replace(/^\d+/, String(now + 999_999)), key, now)).toBe(false);
  expect(verifySession(v, sessionKey({ ADMIN_PASSWORD: "changed" }), now)).toBe(false);
  expect(verifySession(v, null, now)).toBe(false);
  for (const bad of [undefined, "", "abc", "123.", ".sig", "notanumber.sig", v + "x"]) expect(verifySession(bad, key, now)).toBe(false);
});

test("cookie helpers", () => {
  expect(parseCookies("a=1; eps_session=x.y; b=%20z")).toEqual({ a: "1", eps_session: "x.y", b: " z" });
  expect(parseCookies(undefined)).toEqual({});
  expect(serializeSessionCookie("x.y", { secure: true, maxAgeSec: 60 })).toBe("eps_session=x.y; Path=/; HttpOnly; SameSite=Lax; Max-Age=60; Secure");
  expect(serializeSessionCookie("x.y", { secure: false, maxAgeSec: 60 })).not.toContain("Secure");
  expect(clearSessionCookie()).toBe("eps_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
});

test("login limiter: 5 failures lock an ip for the window; success clears; other ips unaffected", () => {
  let t = 0;
  const l = createLoginLimiter({ now: () => t });
  for (let i = 0; i < 5; i++) { expect(l.allowed("1.1.1.1")).toBe(true); l.fail("1.1.1.1"); }
  expect(l.allowed("1.1.1.1")).toBe(false);
  expect(l.allowed("2.2.2.2")).toBe(true);
  t = 15 * 60 * 1000 + 1;
  expect(l.allowed("1.1.1.1")).toBe(true);
  l.fail("1.1.1.1"); l.succeed("1.1.1.1");
  for (let i = 0; i < 5; i++) expect(l.allowed("1.1.1.1")).toBe(true), l.fail("1.1.1.1");
  expect(l.allowed("1.1.1.1")).toBe(false);
});
```

- [ ] **Step 2: Run** `npx vitest run server/lib/session.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `server/lib/session.ts`.
- [ ] **Step 4: Run** `npx vitest run server/lib/session.test.ts && npm run check` → PASS; clean.
- [ ] **Step 5: Commit** `feat(auth): signed session cookie helpers and login limiter`.

---

### Task 2: `auth` router, cookie-or-bearer admin guard

**Files:**
- Create: `server/routers/auth.ts`, `server/auth.test.ts`
- Modify: `server/trpc.ts`, `server/routers/index.ts`, `server/lib/auth.ts`

**Interfaces:**
- `server/lib/auth.ts` gains `isValidAdminRequest(req: { headers: IncomingHttpHeaders }, now = Date.now()): boolean` — bearer header valid **or** `verifySession(parseCookies(req.headers.cookie)[SESSION_COOKIE], sessionKey(process.env), now)`. `isValidAdminToken` stays.
- `requireAdmin` uses `isValidAdminRequest(ctx.req)`.
- Router `auth` (registered as `auth`):
  - `login({ password })` public: `ip = ctx.req.ip`; if `!limiter.allowed(ip)` → `TRPCError TOO_MANY_REQUESTS` with `LOGIN_THROTTLED_MESSAGE`; if `isValidAdminToken("Bearer " + password)` → `limiter.succeed(ip)`, set header `Set-Cookie: serializeSessionCookie(signSession(Date.now() + SESSION_TTL_MS, key), { secure: ctx.req.secure, maxAgeSec: SESSION_TTL_MS / 1000 })`, return `{ ok: true }`; else `limiter.fail(ip)` and `UNAUTHORIZED` `Senha incorreta.`.
  - `logout()` public: `Set-Cookie: clearSessionCookie()`, `{ ok: true }`.
  - `me()` public: `{ authenticated: isValidAdminRequest(ctx.req) }`.
  - One module-level limiter instance (exported for tests as `loginLimiter`).

- [ ] **Step 1: Write the failing HTTP test** `server/auth.test.ts` (serve `createApp(db)` on port 0 like `page.test.ts`; `process.env.ADMIN_PASSWORD = "correct horse battery staple"`; helper `call(path, body, headers)` POSTing `{ json: body }` to `/api/trpc/<proc>` and GET for queries with `?input=`):

```ts
test("login sets a session cookie that authorises admin calls; logout clears it; bearer still works", async () => {
  const bad = await call("auth.login", { password: "nope" });
  expect(bad.status).toBe(401);
  const ok = await call("auth.login", { password: "correct horse battery staple" });
  expect(ok.status).toBe(200);
  const setCookie = ok.headers.get("set-cookie")!;
  expect(setCookie).toMatch(/^eps_session=\d+\.[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/); // http request: no Secure
  const cookie = setCookie.split(";")[0];
  expect((await get("products.listAll", { cookie })).status).toBe(200);
  expect((await get("auth.me", { cookie })).json.result.data.json).toEqual({ authenticated: true });
  expect((await get("products.listAll", { cookie: "eps_session=123.bad" })).status).toBe(401);
  expect((await get("products.listAll", { authorization: "Bearer correct horse battery staple" })).status).toBe(200);
  const out = await call("auth.logout", undefined, { cookie });
  expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
});

test("login over a forwarded https request sets Secure; five failures throttle that ip only", async () => {
  const ok = await call("auth.login", { password: "correct horse battery staple" }, { "x-forwarded-proto": "https" });
  expect(ok.headers.get("set-cookie")).toContain("; Secure");
  for (let i = 0; i < 5; i++) await call("auth.login", { password: "nope" }, { "x-forwarded-for": "9.9.9.9" });
  const throttled = await call("auth.login", { password: "correct horse battery staple" }, { "x-forwarded-for": "9.9.9.9" });
  expect(throttled.status).toBe(429);
  expect(JSON.stringify(throttled.json)).toContain("Muitas tentativas");
  expect((await call("auth.login", { password: "correct horse battery staple" }, { "x-forwarded-for": "8.8.8.8" })).status).toBe(200);
});
```

- [ ] **Step 2: Run** `npx vitest run server/auth.test.ts` → FAIL (`auth` procedures missing).
- [ ] **Step 3: Implement** the router, the guard change, registration.
- [ ] **Step 4: Run** `npx vitest run server && npm run check` → PASS (existing bearer-based router tests untouched); clean.
- [ ] **Step 5: Commit** `feat(auth): cookie sessions with throttled login; bearer kept`.

---

### Task 3: Admin login screen uses the session

**Files:**
- Modify: `client/src/main.tsx` (drop the `Authorization` header and `localStorage` read), `client/src/pages/Admin.tsx`

**Interfaces:**
- Admin: `const me = trpc.auth.me.useQuery(undefined, { retry: false })`; login screen while `me.data?.authenticated !== true`; `login` → `auth.login.mutate({ password })`, then `utils.auth.me.invalidate()` and `utils.products.listAll.invalidate()`; error message from the server (`Senha incorreta.` or the throttle text) shown under the field; `logout` → `auth.logout`, then invalidate `auth.me`; when any admin query fails with `UNAUTHORIZED`, show the login screen with `Sua sessão expirou. Entre de novo.`; remove the old `eps_admin_token` key on mount.

- [ ] **Step 1: Implement.** `npm run check` → clean.
- [ ] **Step 2: Browser check** (dev server with a session-created `ADMIN_PASSWORD`): wrong password shows `Senha incorreta.`; right password shows the admin; reload stays logged in; `localStorage.eps_admin_token` is absent; "Sair" returns to the login; six wrong attempts show the throttle message.
- [ ] **Step 3: Commit** `feat(admin): session-based login screen`.

---

## Part B — Lixeira

### Task 4: `deletedAt`, soft-delete filters, trash repo, purge

**Files:**
- Modify: `server/db/schema.ts`, `server/db/products.repo.ts`, `server/db/images.repo.ts`, `server/db/gallery.repo.ts`
- Create: `server/db/trash.repo.ts`, `server/db/trash.repo.test.ts`
- Create (generated): `drizzle/0004_*.sql` + meta
- Modify: `server/db/products.repo.test.ts`, `server/db/images.repo.test.ts` (filters)

**Interfaces:**
- Column `deletedAt: integer("deletedAt", { mode: "timestamp" })` (nullable) on `products`, `product_images`, `gallery_images`.
- Filters: `listPublished`, `listAll`, `getBySlug`, `getPublishedBySlug` add `isNull(products.deletedAt)`; `attachImages` and `listForProduct` add `isNull(productImages.deletedAt)`; `listGallery` adds `isNull(galleryImages.deletedAt)`; `setCover`/`reorderImages` operate on non-deleted images.
- `trash.repo.ts`:
  - `type TrashKind = "product" | "image" | "gallery"`
  - `softDelete(db, kind, id, now = new Date()): Promise<boolean>` (false when missing or already deleted).
  - `listTrash(db): Promise<{ products: (Product & { images: ProductImage[]; deletedAt: Date })[]; images: (ProductImage & { productName: string; deletedAt: Date })[]; gallery: (GalleryImage & { deletedAt: Date })[] }>` — images group lists only images whose **product is not deleted** (a deleted product's images travel with it); each group ordered by `deletedAt` desc.
  - `restore(db, kind, id): Promise<boolean>` — clears `deletedAt`; for `image`, also restores its product if deleted.
  - `purge(db, kind, id): Promise<string[]>` — hard delete, returns image URLs to remove from disk (for a product: all its images' URLs).
  - `purgeExpired(db, now = new Date(), maxAgeMs = 30 days): Promise<string[]>` — purges every row of the three kinds with `deletedAt <= now - maxAgeMs`, returns all URLs.
- `products.repo.updateProduct`: when `patch.slug === undefined`, `patch.name !== undefined` and the **current** row is unpublished, re-derive `slug = makeUniqueSlug(slugify(patch.name), allSlugs minus own)`.
- `products.repo.discardEmptyDraft(db, id): Promise<boolean>` — hard-deletes the product only when `name === "Nova peça" && description === "" && published === false` and it has no (non-deleted) images; else false. Exported `DRAFT_NAME = "Nova peça"`.

- [ ] **Step 1: Write the failing tests** `server/db/trash.repo.test.ts` (freshDb boilerplate, `UPLOADS_DIR` temp; `processImage` for real files):

```ts
test("soft delete hides from every read; restore brings it back; images follow their product", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Mesa Urb" });
  const img = await images.addImage(db, { productId: p.id, url: "/uploads/x-480.webp", width: 480, height: 300, variants: {} });
  expect(await trash.softDelete(db, "product", p.id)).toBe(true);
  expect(await trash.softDelete(db, "product", p.id)).toBe(false);
  expect(await prods.listPublished(db)).toEqual([]);
  expect(await prods.listAll(db)).toEqual([]);
  expect(await prods.getPublishedBySlug(db, "mesa-urb")).toBeNull();
  const t = await trash.listTrash(db);
  expect(t.products.map((x) => x.id)).toEqual([p.id]);
  expect(t.products[0].images.map((i) => i.id)).toEqual([img.id]);
  expect(t.images).toEqual([]); // travels with its product
  expect(await trash.restore(db, "product", p.id)).toBe(true);
  expect((await prods.getBySlug(db, "mesa-urb"))!.images).toHaveLength(1);
});

test("image soft delete: cover rule, trash listing with product name, restore of an image restores a deleted product", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Mesa" });
  const a = await images.addImage(db, { productId: p.id, url: "/uploads/a-480.webp", width: 480, height: 300, variants: {} });
  const b = await images.addImage(db, { productId: p.id, url: "/uploads/b-480.webp", width: 480, height: 300, variants: {} });
  await trash.softDelete(db, "image", a.id);
  expect((await prods.getBySlug(db, "mesa"))!.images.map((i) => i.id)).toEqual([b.id]);
  expect((await trash.listTrash(db)).images.map((i) => [i.id, i.productName])).toEqual([[a.id, "Mesa"]]);
  await trash.softDelete(db, "product", p.id);
  expect(await trash.restore(db, "image", a.id)).toBe(true);
  expect((await prods.getBySlug(db, "mesa"))!.images.map((i) => i.id)).toEqual([a.id, b.id]);
});

test("purge and purgeExpired remove rows and report every file url; a fresh deletion survives", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Velha" });
  const processed = await processImage(await sharp({ create: { width: 600, height: 400, channels: 3, background: "#000" } }).png().toBuffer());
  await images.addImage(db, { productId: p.id, ...processed });
  const g = await gallery.addGalleryImage(db, { url: "/uploads/g-480.webp", width: 480, height: 600, variants: {} });
  const old = new Date("2026-01-01T00:00:00Z");
  await trash.softDelete(db, "product", p.id, old);
  await trash.softDelete(db, "gallery", g.id, new Date("2026-02-20T00:00:00Z"));
  const urls = await trash.purgeExpired(db, new Date("2026-02-15T00:00:00Z"));
  expect(urls).toEqual([processed.url]);
  expect(await prods.getBySlug(db, "velha")).toBeNull();
  expect((await trash.listTrash(db)).gallery.map((x) => x.id)).toEqual([g.id]);
  expect(await trash.purge(db, "gallery", g.id)).toEqual(["/uploads/g-480.webp"]);
  expect(await trash.listTrash(db)).toEqual({ products: [], images: [], gallery: [] });
});
```
Append to `products.repo.test.ts`:
```ts
test("slug follows the name while unpublished, freezes once published; discardEmptyDraft only removes untouched drafts", async () => {
  const db = freshDb();
  const d = await repo.createProduct(db, { name: "Nova peça", published: false });
  expect(d.slug).toBe("nova-peca");
  const renamed = await repo.updateProduct(db, d.id, { name: "Mesa Urb" });
  expect(renamed!.slug).toBe("mesa-urb");
  const published = await repo.updateProduct(db, d.id, { name: "Mesa Urb", published: true });
  expect(published!.slug).toBe("mesa-urb");
  const renamedLive = await repo.updateProduct(db, d.id, { name: "Mesa Urbana" });
  expect(renamedLive!.slug).toBe("mesa-urb"); // frozen
  expect((await repo.updateProduct(db, d.id, { slug: "mesa-urbana" }))!.slug).toBe("mesa-urbana"); // explicit wins

  const empty = await repo.createProduct(db, { name: "Nova peça", published: false });
  const withPhoto = await repo.createProduct(db, { name: "Nova peça", published: false });
  await db.insert(productImages).values({ productId: withPhoto.id, url: "/uploads/p-480.webp" });
  const withText = await repo.createProduct(db, { name: "Nova peça", description: "algo", published: false });
  expect(await repo.discardEmptyDraft(db, empty.id)).toBe(true);
  expect(await repo.discardEmptyDraft(db, withPhoto.id)).toBe(false);
  expect(await repo.discardEmptyDraft(db, withText.id)).toBe(false);
  expect(await repo.discardEmptyDraft(db, d.id)).toBe(false);
  expect(await repo.listAll(db)).toHaveLength(3);
});
```

- [ ] **Step 2: Run** `npx vitest run server/db` → FAIL.
- [ ] **Step 3: Implement** schema + `npm run db:generate` (three `ALTER TABLE … ADD deletedAt integer`), filters, trash repo, slug rule, discard.
- [ ] **Step 4: Run** `npx vitest run server && npm run check` → PASS; clean.
- [ ] **Step 5: Commit** `feat(trash): deletedAt soft delete, restore, purge; draft slug rule`.

---

### Task 5: Routers: soft deletes, `trash`, draft discard, purge job

**Files:**
- Modify: `server/routers/products.ts`, `server/routers/images.ts`, `server/routers/gallery.ts`, `server/routers/index.ts`, `server/index.ts`
- Create: `server/routers/trash.ts`; Modify: `server/routers/routers.test.ts`

**Interfaces:**
- `products.delete` → `softDelete(db, "product", id)` (NOT_FOUND when false), no file removal. `products.discardEmptyDraft({ id })` → `{ discarded: boolean }` (hard delete when the predicate holds). `images.delete` → `softDelete(db, "image", imageId)`. `gallery.delete` → `softDelete(db, "gallery", id)`.
- Router `trash` (admin): `list()` → `listTrash`; `restore({ kind, id })` → `{ ok }` (NOT_FOUND when false); `purge({ kind, id })` → purge + `deleteImageByUrl` for each URL.
- `server/index.ts`: after boot `const urls = await purgeExpired(db); urls.forEach(deleteImageByUrl); console.log(\`[trash] purged ${n} expired item(s)\`)` when `n > 0`, then `setInterval(...).unref()` every 24 h. Keep the job in `server/lib/trashJob.ts`: `runPurge(db): Promise<number>`.

- [ ] **Step 1: Write the failing tests** (append to `routers.test.ts`):

```ts
test("admin deletes are soft; trash lists, restores and purges; files go only on purge", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const anon = appRouter.createCaller(ctxFor(db));
  const p = await admin.products.create({ name: "P" });
  const img = await admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(600, 400) });
  await admin.images.delete({ imageId: img.id });
  expect(uploads()).toHaveLength(2); // files kept
  expect((await anon.products.list())[0].images).toEqual([]);
  expect((await admin.trash.list()).images.map((i) => i.id)).toEqual([img.id]);
  await admin.trash.restore({ kind: "image", id: img.id });
  expect((await anon.products.list())[0].images).toHaveLength(1);
  await admin.products.delete({ id: p.id });
  expect(await anon.products.list()).toEqual([]);
  expect(await anon.products.getBySlug({ slug: "p" })).toBeNull();
  await admin.trash.purge({ kind: "product", id: p.id });
  expect(uploads()).toEqual([]);
  expect(await admin.trash.list()).toEqual({ products: [], images: [], gallery: [] });
});

test("discardEmptyDraft is enforced server-side", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const draft = await admin.products.create({ name: "Nova peça", published: false });
  await admin.images.add({ productId: draft.id, dataUrl: await pngDataUrl(100, 100) });
  expect(await admin.products.discardEmptyDraft({ id: draft.id })).toEqual({ discarded: false });
  const empty = await admin.products.create({ name: "Nova peça", published: false });
  expect(await admin.products.discardEmptyDraft({ id: empty.id })).toEqual({ discarded: true });
  expect((await admin.products.listAll()).map((x) => x.id)).toEqual([draft.id]);
});
```
Also adjust the existing `images.delete and products.delete remove every variant file` test: deletes are soft now, so it becomes "files remain until purge" (assert 5 files after both deletes, 0 after `trash.purge` of the product).

- [ ] **Step 2: Run** `npx vitest run server/routers` → FAIL.
- [ ] **Step 3: Implement** routers, registration, the purge job and boot wiring.
- [ ] **Step 4: Run** `npx vitest run server && npm run check` → PASS; clean.
- [ ] **Step 5: Commit** `feat(trash): soft-delete routers, trash router, 30-day purge job`.

---

## Part C — Admin UI

### Task 6: Photos-first editor, drafts, toasts

**Files:**
- Rewrite: `client/src/components/admin/ProductDialog.tsx` → `client/src/components/admin/ProductEditor.tsx` (delete the old file)
- Modify: `client/src/pages/Admin.tsx` (open/edit/delete flows, list layout, tabs incl. Lixeira placeholder), `client/src/components/admin/ImageManager.tsx` (visible controls, progress, toasts)

**Interfaces:**
- `ProductEditor({ open, onOpenChange, productId: number | null })` — `null` means "Nova peça": on open, `products.create({ name: "Nova peça", published: false })`, then edit that id. On close: if the editor was opened as "Nova peça" and the form is untouched (name still `Nova peça`, empty description, no photos) → `products.discardEmptyDraft({ id })`; otherwise leave the draft.
- Layout: `DialogContent` with `className="max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:left-0 max-sm:top-0 overflow-y-auto sm:max-h-[90vh] sm:max-w-lg"`. Sections in order: Fotos (`ImageManager`), Nome, Categoria, Descrição, Materiais/Dimensões, `Collapsible` "Mais opções" (Slug, Preço, Destaque, Personalizado).
- Footer: `Excluir` (soft delete + toast `Movido para a Lixeira` with `Desfazer` → `trash.restore`) on the left; right: `Salvar`, and `Publicar` (draft) or `Despublicar` (live); `Ver no site` link when live. `Salvar`/`Publicar` disabled while the name is empty or still `Nova peça`.
- Toasts (`toast` from `sonner`) replace every `alert()` in the admin; upload progress `Enviando i de n…` on the upload button while busy.
- `ImageManager`: control bar always visible (`opacity-100`, dark translucent bar), buttons `h-9 w-9`; `remove` shows toast with `Desfazer` (needs `onUndo?: (id) => Promise<unknown>` in `actions`).
- `Admin.tsx`: rows `flex-wrap`, actions on a second line below `sm`; delete from the list → soft delete + undo toast (the AlertDialog stays); tabs **Peças**, **Ambientes**, **Lixeira** (Task 7 fills the last).

- [ ] **Step 1: Implement.** `npm run check && npx vitest run client/src` → clean; PASS.
- [ ] **Step 2: Browser check** (375 px, logged in): "Nova peça" opens full-screen; closing it untouched leaves no row; reopening, adding two photos from the picker shows `Enviando 1 de 2…`, then tiles with visible controls; typing a name and `Publicar` → the piece appears on `/catalogo` and `Ver no site` opens `/catalogo/<slug>` with the slug derived from the name; deleting a photo shows the toast and `Desfazer` restores it as cover again; deleting the piece from the list moves it to the Lixeira (count appears in Task 7). Desktop: dialog looks as before, fields reordered.
- [ ] **Step 3: Commit** `feat(admin): photos-first editor with drafts, visible touch controls, toasts`.

---

### Task 7: Lixeira tab

**Files:**
- Create: `client/src/components/admin/LixeiraTab.tsx`; Modify: `client/src/pages/Admin.tsx`

**Interfaces:**
- `LixeiraTab()`: `trash.list` query; three groups with headings **Peças**, **Fotos**, **Ambientes** (hidden when empty); each item: thumbnail (`thumbUrl` of the cover / the image), name (product name, `Foto de <produto>`, caption or `Ambiente`), `Excluído há N dias` (0 → `hoje`), buttons **Restaurar** and **Excluir definitivamente** (AlertDialog confirm: `Isso apaga os arquivos para sempre.`); for pieces a note `o endereço continua reservado`. Empty state `A lixeira está vazia.`; footer `Itens são apagados automaticamente após 30 dias.` After restore/purge, invalidate `trash.list`, `products.listAll`, `products.list`, `gallery.list`.

- [ ] **Step 1: Implement.** `npm run check` → clean.
- [ ] **Step 2: Browser check**: deleted photo/piece/Ambientes photo appear in their groups with correct labels and days; Restaurar puts each back where it was; Excluir definitivamente removes the row and its files (`ls .data/uploads`); empty state after.
- [ ] **Step 3: Commit** `feat(admin): Lixeira tab with restore and permanent delete`.

---

### Task 8: HEIC fallback in the browser

**Files:**
- Modify: `package.json` (`heic2any`), `client/src/lib/imageCompress.ts`, `client/src/components/admin/ImageManager.tsx`
- Create: `client/src/lib/heic.ts`, `client/src/lib/heic.test.ts`

**Interfaces:**
- `isHeicFile(file: { name: string; type: string }, head: Uint8Array): boolean` — type `image/heic|heif`, extension `.heic|.heif`, or `ftyp` + brand in `heic|heix|mif1|msf1|hevc|hevx|heim|heis`.
- `compressImage(dataUrl, quality?, maxSide?): Promise<{ dataUrl: string; decoded: boolean }>` — `decoded: false` when the browser could not load the image (returns the original).
- `convertHeicToJpeg(file: File): Promise<Blob>` — `const { default: heic2any } = await import("heic2any")`; `heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })`.
- `ImageManager.onFiles`: read as data URL → `compressImage`; if `!decoded && isHeicFile(file, head)` → `convertHeicToJpeg` → data URL → `compressImage` again → upload. Toast `Convertendo foto do iPhone…` while converting.

- [ ] **Step 1: Write the failing test** `client/src/lib/heic.test.ts`:
```ts
const ftyp = (brand: string) => new Uint8Array([0, 0, 0, 24, ...Buffer.from("ftyp" + brand), ...new Array(12).fill(0)]);
test("isHeicFile by type, extension or brand", () => {
  expect(isHeicFile({ name: "IMG_1.HEIC", type: "" }, new Uint8Array(0))).toBe(true);
  expect(isHeicFile({ name: "x", type: "image/heif" }, new Uint8Array(0))).toBe(true);
  expect(isHeicFile({ name: "x.bin", type: "application/octet-stream" }, ftyp("heic"))).toBe(true);
  expect(isHeicFile({ name: "x.bin", type: "application/octet-stream" }, ftyp("hevc"))).toBe(true);
  expect(isHeicFile({ name: "a.jpg", type: "image/jpeg" }, new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
  expect(isHeicFile({ name: "v.mp4", type: "video/mp4" }, ftyp("isom"))).toBe(false);
});
```
- [ ] **Step 2: Run** `npx vitest run client/src/lib/heic.test.ts` → FAIL.
- [ ] **Step 3: Implement**; `npm install heic2any`; wire `ImageManager`.
- [ ] **Step 4: Check** `npm run check && npx vitest run client/src && npm run build` → clean; PASS; the build emits a separate `heic2any` chunk and `dist/public/assets/index-*.js` does not contain `heic2any` code. Browser (Chrome desktop): a `.heic` file uploads as a normal photo; Network shows the chunk loaded only then; the public pages never request it.
- [ ] **Step 5: Commit** `feat(admin): lazy HEIC conversion in the browser`.

---

### Task 9: Docs and acceptance

**Files:**
- Modify: `.env.example`, `DEPLOY.md`, `VPS-SETUP.md`, `README.md`

- [ ] **Step 1: Docs**: step 4 in both guides: choose a passphrase (≥ 12 characters, e.g. three words) instead of the random token; the printf uses it; optional `SESSION_SECRET` documented; "stays logged in for 30 days on each device; changing the password logs every device out". README: auth section (cookie or bearer), Lixeira (30-day purge, slug reservation), photos-first editor, HEIC note, `trash` and `auth` routers; backup note that the Lixeira lives in `.data/`.
- [ ] **Step 2: Full verification** `npm run check && npm test && npm run build`; then `npm start` and walk spec §5 (items 1–6, 8) at 375 px and desktop; stop the server.
- [ ] **Step 3: Commit** `docs: passphrase login, Lixeira and HEIC notes`.

---

## Self-review notes

- **Spec coverage:** 4.1 → Tasks 1–3 (+ docs 9); 4.2 → Tasks 4 (slug rule, discard), 5 (discard route), 6; 4.3 → Tasks 4, 5, 7; 4.4 → Task 6 (toasts/undo); 4.5 → Task 8; acceptance → Task 9.
- **Builder's open points (spec §6):** cookie parsing in `session.ts`, guard in `isValidAdminRequest`; 401 via query error; responsive classes fixed in Task 6; discard on `onOpenChange(false)` only; `listTrash` joins by `productId`; purge job in `server/lib/trashJob.ts`, interval in `index.ts`.
- **Type consistency:** `TrashKind` (Task 4) used by Task 5 router and Task 7 UI; `softDelete` returns boolean used for NOT_FOUND; `compressImage` new return shape (Task 8) is consumed only by `ImageManager`.
- **Review Focus:** 1 → Task 1/2 tests; 2 → Task 2 forwarded-for test; 3 → Task 4/5 tests (list, getBySlug null, restore); 4 → Task 4 purge test with real files + Task 5 router purge; 5 → Task 4/5 discard tests.
