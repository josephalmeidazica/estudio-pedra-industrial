# Batch 2 — The quote flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "catalog → cart → name + bairro → WhatsApp" the backbone of the site: featured pieces on the home page, a custom-piece request, product detail pages, category chips, and an owner-managed gallery of installed pieces.

**Architecture:** Server gains one column (`products.isCustom`, exclusive) and one table (`gallery_images`) with a repo + tRPC router, plus a published-only slug lookup. The client cart is rebuilt around id-keyed lines (`lineId`, `productId`, optional `note`) resolved against `products.list` at render time; the message builder takes resolved lines. Shared `ProductCard` and `ImageLightbox` components feed the catalog, the new detail page, the home "Destaques" grid and the "Ambientes" strip.

**Tech Stack:** React 19, Vite 7, Tailwind v4, shadcn/ui (Dialog, Tabs, Select, Textarea, Switch), wouter 3 (`useParams`, `useSearch`, `useLocation`), tRPC 11, Express 4, Drizzle + better-sqlite3, sharp pipeline from Batch 1, vitest.

**Spec:** `docs/superpowers/specs/2026-10-20-batch2-quote-flow-design.md`

## Global Constraints

- Branch `feat/batch2-quote-flow`, stacked on `feat/batch1-mobile-first` (PR #6). Commits follow `feat(scope): …` / `fix(scope): …` / `docs: …` / `chore: …`.
- Visitor-facing copy in Brazilian Portuguese; brand tokens and existing classes only (`heading-secondary`, `heading-display`, `bg-foreground`, `text-background`, `border-border`, …).
- Images only through `processUpload` / `processImage`; deletion through `deleteImageByUrl`.
- Cart storage key `eps_cart_v2`; old `eps_cart` removed on first load. Customer storage key `eps_customer`.
- Message format is exactly the one in spec 4.1 (reproduced in Task 4).
- Custom product: at most one (`isCustom` exclusive server-side); boot never creates one; the one-time conversion only touches slug `projetos-personalizados`.
- Public `products.getBySlug` returns `null` for unpublished products.
- Existing 63 tests keep passing except the cart reducer and cart message tests, which are rewritten for the new shapes.
- Run `npm run check` at the end of every task (vitest does not type-check).

## Review Focus

1. **Old or malformed cart storage** (`eps_cart` from Batch 1, or a hand-edited `eps_cart_v2` with a missing `lineId`): the page must load with an empty or sanitised cart, never crash. Test in Task 4.
2. **A carted piece is renamed, unpublished or deleted** before checkout: the live name is used; unavailable lines are greyed, excluded from badge and message. Test in Task 4 (resolver) and Task 5 (manual).
3. **Name/bairro with surrounding whitespace, or empty**: trimmed in the message; checkout disabled while either is blank. Test in Task 4 (builder) and Task 5 (manual).
4. **Category labels with accents and spaces** (`Luminárias`, `Mesas de Jantar`) and an unknown `?categoria=` value: slug round-trips; unknown value behaves as "Todos". Test in Task 8.
5. **Direct visit to an unpublished product's URL** (shared before the owner hid it): NotFound, no data leak. Test in Task 1 (repo), Task 7 (manual).

---

## Part A — Data model and server

### Task 1: `isCustom` column, exclusive switch, published-only slug lookup

**Files:**
- Modify: `server/db/schema.ts`, `server/db/products.repo.ts`, `server/routers/products.ts`
- Create (generated): `drizzle/0002_*.sql` + meta
- Modify: `server/db/products.repo.test.ts`, `server/routers/routers.test.ts`

**Interfaces:**
- Produces: `products.isCustom: boolean` (default `false`) on `Product`/`ProductWithImages`.
- `CreateProductInput` gains `isCustom?: boolean`. `createProduct` and `updateProduct`: when `isCustom === true`, first clear it on every other product, then set it.
- `getPublishedBySlug(db, slug): Promise<ProductWithImages | null>` — `null` when missing **or** `published = false`. `getBySlug` stays (admin/internal use).
- Router: `products.getBySlug` (public) calls `getPublishedBySlug`; `createInput` gains `isCustom: z.boolean().optional()`.

- [ ] **Step 1: Write the failing tests**

Append to `server/db/products.repo.test.ts`:
```ts
test("isCustom is exclusive: setting it on one product clears it on the others", async () => {
  const db = freshDb();
  const a = await repo.createProduct(db, { name: "A", isCustom: true });
  const b = await repo.createProduct(db, { name: "B" });
  expect((await repo.getBySlug(db, "a"))!.isCustom).toBe(true);
  await repo.updateProduct(db, b.id, { isCustom: true });
  expect((await repo.getBySlug(db, "a"))!.isCustom).toBe(false);
  expect((await repo.getBySlug(db, "b"))!.isCustom).toBe(true);
  await repo.updateProduct(db, b.id, { isCustom: false });
  expect((await repo.listAll(db)).filter((p) => p.isCustom)).toHaveLength(0);
});

test("getPublishedBySlug hides unpublished products; getBySlug still returns them", async () => {
  const db = freshDb();
  await repo.createProduct(db, { name: "Hidden", published: false });
  expect(await repo.getPublishedBySlug(db, "hidden")).toBeNull();
  expect((await repo.getBySlug(db, "hidden"))?.name).toBe("Hidden");
  expect(await repo.getPublishedBySlug(db, "nope")).toBeNull();
});
```
Append to `server/routers/routers.test.ts`:
```ts
test("public getBySlug returns null for unpublished products", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const anon = appRouter.createCaller(ctxFor(db));
  await admin.products.create({ name: "Draft", published: false, isCustom: true });
  expect(await anon.products.getBySlug({ slug: "draft" })).toBeNull();
  expect((await admin.products.listAll())[0].isCustom).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/db/products.repo.test.ts server/routers`
Expected: FAIL (`isCustom` unknown, `getPublishedBySlug` not a function).

- [ ] **Step 3: Implement** the column (`integer("isCustom", { mode: "boolean" }).notNull().default(false)`), run `npm run db:generate`, check `drizzle/0002_*.sql` contains `ALTER TABLE \`products\` ADD \`isCustom\` integer DEFAULT false NOT NULL`, then the repo and router changes per the interface.

- [ ] **Step 4: Run tests and type-check**

Run: `npx vitest run server && npm run check`
Expected: PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add server/db/schema.ts server/db/products.repo.ts server/db/products.repo.test.ts server/routers/products.ts server/routers/routers.test.ts drizzle
git commit -m "feat(products): exclusive isCustom flag and published-only slug lookup"
```

---

### Task 2: Gallery table, repo and router

**Files:**
- Modify: `server/db/schema.ts`
- Create: `server/db/gallery.repo.ts`, `server/db/gallery.repo.test.ts`
- Create: `server/routers/gallery.ts`; Modify: `server/routers/index.ts`
- Create (generated): `drizzle/0003_*.sql` + meta
- Modify: `server/routers/routers.test.ts`

**Interfaces:**
- Table `gallery_images`: `id` (pk autoinc), `url` text notNull, `caption` text notNull default `""`, `productId` integer nullable `references(products.id, { onDelete: "set null" })`, `sortOrder` integer default 0, `width`/`height` integer default 0, `variants` text json default `'{}'`, `createdAt`. Type `GalleryImage`.
- `gallery.repo.ts`: `listGallery(db): Promise<GalleryImage[]>` (by `sortOrder`), `addGalleryImage(db, { caption?, productId?, url, width, height, variants }): Promise<GalleryImage>` (next sortOrder), `updateGalleryImage(db, id, { caption?: string; productId?: number | null }): Promise<GalleryImage | undefined>`, `deleteGalleryImage(db, id): Promise<string | null>` (returns url), `reorderGallery(db, orderedIds: number[]): Promise<void>`.
- Router `gallery`: `list` public; `add` admin `{ dataUrl, caption?, productId? }` → `processUpload` then `addGalleryImage` (same error mapping as `images.add`, via `isUploadRejection`); `update` admin `{ id, caption?, productId?: number | null }` (NOT_FOUND when missing); `delete` admin `{ id }` → `deleteImageByUrl(url)`; `reorder` admin `{ orderedIds }`. Registered as `gallery` in `appRouter`.

- [ ] **Step 1: Write the failing tests** — `server/db/gallery.repo.test.ts` (same `freshDb` boilerplate):

```ts
test("gallery images order, update and delete; deleting the related product nulls productId", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "Mesa" });
  const a = await repo.addGalleryImage(db, { url: "/uploads/a-480.webp", width: 480, height: 600, variants: { "480": "/uploads/a-480.webp" } });
  const b = await repo.addGalleryImage(db, { url: "/uploads/b-480.webp", width: 480, height: 600, variants: {}, caption: "Sala", productId: p.id });
  expect([a.sortOrder, b.sortOrder]).toEqual([0, 1]);
  await repo.reorderGallery(db, [b.id, a.id]);
  expect((await repo.listGallery(db)).map((g) => g.id)).toEqual([b.id, a.id]);
  const up = await repo.updateGalleryImage(db, a.id, { caption: "Quarto", productId: p.id });
  expect([up!.caption, up!.productId]).toEqual(["Quarto", p.id]);
  await prods.deleteProduct(db, p.id);
  expect((await repo.listGallery(db)).every((g) => g.productId === null)).toBe(true);
  expect(await repo.deleteGalleryImage(db, a.id)).toBe("/uploads/a-480.webp");
  expect(await repo.deleteGalleryImage(db, 9999)).toBeNull();
  expect(await repo.listGallery(db)).toHaveLength(1);
});
```
Append to `routers.test.ts`:
```ts
test("gallery router: public list, admin add/update/delete with variant cleanup", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const anon = appRouter.createCaller(ctxFor(db));
  await expect(anon.gallery.add({ dataUrl: await pngDataUrl(600, 750) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  const g = await admin.gallery.add({ dataUrl: await pngDataUrl(600, 750), caption: "Sala" });
  expect(Object.keys(g.variants)).toEqual(["480", "600"]);
  expect((await anon.gallery.list())[0].caption).toBe("Sala");
  await admin.gallery.update({ id: g.id, caption: "Cozinha", productId: null });
  expect((await anon.gallery.list())[0].caption).toBe("Cozinha");
  await expect(admin.gallery.update({ id: 9999, caption: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await admin.gallery.delete({ id: g.id });
  expect(uploads()).toEqual([]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/db/gallery.repo.test.ts server/routers`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** schema (consider a shared `imageColumns()` helper for `url/width/height/variants` used by both tables — builder's call), `npm run db:generate` (check the new SQL creates `gallery_images` with `ON DELETE set null`), repo, router, registration.

- [ ] **Step 4: Run and type-check**

Run: `npx vitest run server && npm run check`
Expected: PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add server/db/schema.ts server/db/gallery.repo.ts server/db/gallery.repo.test.ts server/routers/gallery.ts server/routers/index.ts server/routers/routers.test.ts drizzle
git commit -m "feat(gallery): gallery_images table, repo and router"
```

---

### Task 3: Seed: "Móvel personalizado" and the one-time conversion

**Files:**
- Modify: `server/db/seed.ts`, `server/db/seed.test.ts`, `server/index.ts`
- Rename: `client/public/products/projetos-personalizados.jpg` → `movel-personalizado.jpg` (`git mv`); Modify: `CREDITS.md`

**Interfaces:**
- `SEED` entry 9 becomes `{ slug: "movel-personalizado", name: "Móvel personalizado", description: "Não achou o que procura? Descreva o móvel dos seus sonhos e fazemos sob medida.", category: "Personalizados", isCustom: true }`; `seedIfEmpty` writes `isCustom: p.isCustom ?? false`.
- `DEFAULT_PRODUCT_IMAGE_FILES` derives from `SEED` slugs (so `movel-personalizado.jpg`).
- `ensureCustomProduct(db): Promise<void>` — if no product has `isCustom` and a product with slug `projetos-personalizados` exists, update it to the new slug, name, description and `isCustom = true`; otherwise no-op. Never inserts.
- `server/index.ts` boot order: `seedIfEmpty` → `ensureCustomProduct` → `ensureProductImages`.

- [ ] **Step 1: Write the failing tests** (in `seed.test.ts`; adjust the existing `first[0].slug` test only if ordering changed — it did not):

```ts
test("seed includes the custom piece", async () => {
  const db = freshDb();
  await seedIfEmpty(db);
  const custom = (await repo.listPublished(db)).filter((p) => p.isCustom);
  expect(custom.map((p) => p.slug)).toEqual(["movel-personalizado"]);
  await ensureProductImages(db);
  expect((await repo.getBySlug(db, "movel-personalizado"))!.images[0].url).toMatch(/-780\.webp$/); // 780x500 file
});

test("ensureCustomProduct converts a legacy 'projetos-personalizados' row once and never inserts", async () => {
  const db = freshDb();
  await repo.createProduct(db, { name: "Projetos Personalizados", slug: "projetos-personalizados" });
  await ensureCustomProduct(db);
  const after = await repo.getBySlug(db, "movel-personalizado");
  expect([after!.name, after!.isCustom]).toEqual(["Móvel personalizado", true]);
  expect(await repo.getBySlug(db, "projetos-personalizados")).toBeNull();
  await repo.updateProduct(db, after!.id, { isCustom: false });
  await ensureCustomProduct(db);
  expect((await repo.listAll(db)).filter((p) => p.isCustom)).toHaveLength(0);
  expect(await repo.listAll(db)).toHaveLength(1);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/db/seed.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implement**, `git mv` the image, update `CREDITS.md` (`projetos-personalizados` → `movel-personalizado`), wire the boot step.

- [ ] **Step 4: Run and type-check**

Run: `npx vitest run server && npm run check` → Expected: PASS; clean.

- [ ] **Step 5: Commit**

```bash
git add server/db/seed.ts server/db/seed.test.ts server/index.ts client/public/products CREDITS.md
git commit -m "feat(seed): Móvel personalizado replaces Projetos Personalizados"
```

---

## Part B — Cart

### Task 4: Cart lines v2, resolver, message builder

**Files:**
- Rewrite: `client/src/components/cart/cartReducer.ts`, `cartReducer.test.ts`
- Rewrite: `client/src/components/cart/whatsapp.ts`, `whatsapp.test.ts`
- Create: `client/src/components/cart/resolve.ts`, `resolve.test.ts`
- Create: `client/src/components/cart/storage.ts`, `storage.test.ts`
- Rewrite: `client/src/components/cart/CartContext.tsx`
- Modify: `client/src/lib/types.ts` (export `GalleryItem = RouterOutputs["gallery"]["list"][number]`)

**Interfaces:**
- `CartItem = { lineId: string; productId: number; name: string; quantity: number; note?: string }`.
- `CartAction =`
  `| { type: "add"; lineId: string; productId: number; name: string }` (merge into existing line with same `productId` and no `note`, else append with the given `lineId`, quantity 1)
  `| { type: "addCustom"; lineId: string; productId: number; name: string; note: string }` (always append, quantity 1)
  `| { type: "setQuantity"; lineId: string; quantity: number }` (≤ 0 removes)
  `| { type: "setNote"; lineId: string; note: string }`
  `| { type: "remove"; lineId: string }`
  `| { type: "clear" }`
  `| { type: "replace"; items: CartItem[] }`.
  `totalCount(items)` unchanged.
- `storage.ts`: `CART_KEY = "eps_cart_v2"`, `LEGACY_CART_KEY = "eps_cart"`, `CUSTOMER_KEY = "eps_customer"`; `parseStoredCart(raw: string | null): CartItem[]` (keeps only well-formed lines: string `lineId`, integer `productId`, string `name`, quantity > 0, optional string `note`); `Customer = { name: string; bairro: string }`; `parseStoredCustomer(raw: string | null): Customer` (defaults to empty strings).
- `resolve.ts`: `ResolvedLine = CartItem & { slug: string; liveName: string; category: string; thumb?: string }`; `resolveCartLines(items: CartItem[], products: PublicProduct[]): { available: ResolvedLine[]; unavailable: CartItem[] }`; `MessageLine = { name: string; quantity: number; url?: string; note?: string }`; `toMessageLines(available: ResolvedLine[], origin: string): MessageLine[]` — `url = origin + "/catalogo/" + slug` for lines without a note; lines with a note get `note` and no url.
- `whatsapp.ts`: `buildWhatsAppMessage(customer: Customer, lines: MessageLine[]): string`, `buildWhatsAppUrl(customer, lines): string` (via `whatsappUrl`). Exact text:

  ```
  Olá! Meu nome é <name> e moro no bairro <bairro>. Gostaria de um orçamento dos seguintes produtos do catálogo:

  • <name> — Qtd: <n>
    <url>
  • <name> — Qtd: <n>
    Descrição: <note>

  Total de itens: <sum of quantities>

  Fico no aguardo. Obrigado(a)!
  ```
  (two spaces before `<url>` / `Descrição:`; name and bairro trimmed.)
- `CartContext` value: `items`, `addItem({ productId, name })`, `addCustomItem({ productId, name, note })`, `setQuantity(lineId, q)`, `setNote(lineId, note)`, `removeItem(lineId)`, `clear()`, `customer: Customer`, `setCustomer(patch: Partial<Customer>)`. `lineId` from `crypto.randomUUID()`. On mount: `localStorage.removeItem(LEGACY_CART_KEY)`. Persists cart under `CART_KEY`, customer under `CUSTOMER_KEY`.

- [ ] **Step 1: Write the failing tests**

`cartReducer.test.ts`:
```ts
const L = (n: number) => `line-${n}`;
test("add merges by productId and keeps the first lineId; addCustom always appends", () => {
  let s: CartItem[] = [];
  s = cartReducer(s, { type: "add", lineId: L(1), productId: 7, name: "Mesa Urb" });
  s = cartReducer(s, { type: "add", lineId: L(2), productId: 7, name: "Mesa Urb" });
  s = cartReducer(s, { type: "addCustom", lineId: L(3), productId: 9, name: "Móvel personalizado", note: "mesa 2 m" });
  s = cartReducer(s, { type: "addCustom", lineId: L(4), productId: 9, name: "Móvel personalizado", note: "mesa 2 m" });
  expect(s).toEqual([
    { lineId: L(1), productId: 7, name: "Mesa Urb", quantity: 2 },
    { lineId: L(3), productId: 9, name: "Móvel personalizado", quantity: 1, note: "mesa 2 m" },
    { lineId: L(4), productId: 9, name: "Móvel personalizado", quantity: 1, note: "mesa 2 m" },
  ]);
});
test("setQuantity, setNote, remove, clear, replace key on lineId", () => {
  let s: CartItem[] = [{ lineId: "a", productId: 1, name: "A", quantity: 1 }, { lineId: "b", productId: 2, name: "B", quantity: 1, note: "x" }];
  s = cartReducer(s, { type: "setQuantity", lineId: "a", quantity: 5 });
  s = cartReducer(s, { type: "setNote", lineId: "b", note: "y" });
  expect(s).toEqual([{ lineId: "a", productId: 1, name: "A", quantity: 5 }, { lineId: "b", productId: 2, name: "B", quantity: 1, note: "y" }]);
  expect(cartReducer(s, { type: "setQuantity", lineId: "a", quantity: 0 })).toEqual([s[1]]);
  expect(cartReducer(s, { type: "remove", lineId: "b" })).toEqual([s[0]]);
  expect(cartReducer(s, { type: "clear" })).toEqual([]);
  expect(cartReducer(s, { type: "replace", items: [] })).toEqual([]);
  expect(totalCount(s)).toBe(6);
});
```
`storage.test.ts`:
```ts
test("parseStoredCart drops malformed lines and legacy shapes", () => {
  expect(parseStoredCart(null)).toEqual([]);
  expect(parseStoredCart("not json")).toEqual([]);
  expect(parseStoredCart(JSON.stringify([{ name: "Mesa Urb", quantity: 2 }]))).toEqual([]); // Batch 1 shape
  const good = { lineId: "a", productId: 1, name: "A", quantity: 2 };
  const withNote = { lineId: "b", productId: 2, name: "B", quantity: 1, note: "n" };
  expect(parseStoredCart(JSON.stringify([good, withNote, { lineId: "c", productId: 3, name: "C", quantity: 0 }, { productId: 4, name: "D", quantity: 1 }]))).toEqual([good, withNote]);
});
test("parseStoredCustomer defaults to empty strings", () => {
  expect(parseStoredCustomer(null)).toEqual({ name: "", bairro: "" });
  expect(parseStoredCustomer(JSON.stringify({ name: "Maria", bairro: 3 }))).toEqual({ name: "Maria", bairro: "" });
});
```
`resolve.test.ts` (build two fake `PublicProduct`s with `id`, `slug`, `name`, `category`, `isCustom`, `images`):
```ts
test("resolveCartLines uses live names and separates unavailable lines; toMessageLines links or describes", () => {
  const products = [prod(1, "mesa-urb", "Mesa Urb (nova)", "Mesas"), prod(9, "movel-personalizado", "Móvel personalizado", "Personalizados", true)];
  const items: CartItem[] = [
    { lineId: "a", productId: 1, name: "Mesa Urb", quantity: 2 },
    { lineId: "b", productId: 9, name: "Móvel personalizado", quantity: 1, note: "mesa 2 m" },
    { lineId: "c", productId: 5, name: "Apagada", quantity: 1 },
  ];
  const { available, unavailable } = resolveCartLines(items, products);
  expect(available.map((l) => l.liveName)).toEqual(["Mesa Urb (nova)", "Móvel personalizado"]);
  expect(unavailable.map((l) => l.lineId)).toEqual(["c"]);
  expect(toMessageLines(available, "https://x.y")).toEqual([
    { name: "Mesa Urb (nova)", quantity: 2, url: "https://x.y/catalogo/mesa-urb" },
    { name: "Móvel personalizado", quantity: 1, note: "mesa 2 m" },
  ]);
});
```
`whatsapp.test.ts`:
```ts
const EXPECTED = `Olá! Meu nome é Maria e moro no bairro Savassi. Gostaria de um orçamento dos seguintes produtos do catálogo:

• Mesa Urb — Qtd: 2
  https://x.y/catalogo/mesa-urb
• Móvel personalizado — Qtd: 1
  Descrição: mesa de jantar 2 m

Total de itens: 3

Fico no aguardo. Obrigado(a)!`;
const lines: MessageLine[] = [
  { name: "Mesa Urb", quantity: 2, url: "https://x.y/catalogo/mesa-urb" },
  { name: "Móvel personalizado", quantity: 1, note: "mesa de jantar 2 m" },
];
test("message matches the PT-BR format exactly and trims the customer fields", () => {
  expect(buildWhatsAppMessage({ name: "  Maria ", bairro: " Savassi " }, lines)).toBe(EXPECTED);
});
test("url targets the studio number with encoded text", () => {
  const url = buildWhatsAppUrl({ name: "Maria", bairro: "Savassi" }, lines);
  expect(url.startsWith("https://wa.me/5531971803551?text=")).toBe(true);
  expect(decodeURIComponent(url.split("text=")[1])).toBe(EXPECTED);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run client/src/components/cart`
Expected: FAIL (new modules missing; reducer action shapes mismatch).

- [ ] **Step 3: Implement** the four modules and rewrite `CartContext.tsx` per the interface. `CartWidget`/`AddToCartButton` will not compile until Task 5; that is expected (`npm run check` is run at the end of Task 5 instead).

- [ ] **Step 4: Run the cart tests**

Run: `npx vitest run client/src/components/cart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/cart client/src/lib/types.ts
git commit -m "feat(cart): id-keyed lines with notes, resolver, name+bairro message"
```

---

### Task 5: Custom-piece dialog, buttons, cart sheet

**Files:**
- Create: `client/src/components/cart/CustomPieceDialog.tsx`
- Rewrite: `client/src/components/cart/AddToCartButton.tsx`, `client/src/components/catalog/QuoteButton.tsx`, `client/src/components/cart/CartWidget.tsx`
- Modify: `client/src/pages/Catalog.tsx` (pass `product` to both buttons)

**Interfaces:**
- `CustomPieceDialog({ open, onOpenChange, mode: "cart" | "quote", initialNote?: string, onConfirm(result: { note: string; customer?: Customer }) })`. Title **"Descreva o móvel que você quer"**; `Textarea` required, `maxLength={500}`, placeholder `Ex.: mesa de jantar 2 m, tampo em MDF amadeirado, pés em aço preto`; in `quote` mode also **Seu nome** and **Seu bairro** inputs prefilled from `useCart().customer`; confirm button label **"Adicionar ao carrinho"** (cart) / **"Enviar no WhatsApp"** (quote); disabled until required fields are non-blank.
- `AddToCartButton({ product: Pick<PublicProduct, "id" | "name" | "isCustom"> })`: normal → `addItem`; custom → dialog (cart mode) → `addCustomItem`.
- `QuoteButton({ product: Pick<PublicProduct, "id" | "name" | "slug" | "isCustom"> })`: normal → label **"Pedir orçamento"**, `openWhatsApp(whatsappUrl(productQuoteMessage(name, origin + "/catalogo/" + slug)))`; custom → label **"Descrever meu móvel"**, dialog (quote mode) → `setCustomer`, then `openWhatsApp(buildWhatsAppUrl(customer, [{ name, quantity: 1, note }]))`.
- `CartWidget`: inputs `#cart-customer-name` ("Seu nome") and `#cart-customer-bairro` ("Seu bairro", placeholder `Ex.: Savassi, Belo Horizonte`) bound to `customer`; lines from `resolveCartLines(items, products)`; available lines render live name + thumb (`thumbUrl`), custom lines show the note under the name, a `Pencil` icon button `aria-label="Editar descrição"` opening the dialog with `initialNote`, and no quantity stepper; unavailable lines render greyed with **"Produto indisponível"** and only the remove button; badge = `totalCount(available)`; checkout enabled when `available.length > 0 && customer.name.trim() && customer.bairro.trim()`; checkout opens `buildWhatsAppUrl(customer, toMessageLines(available, window.location.origin))`.

- [ ] **Step 1: Implement** the four components and update `Catalog.tsx` to pass `product={product}`.

- [ ] **Step 2: Type-check and tests**

Run: `npm run check && npx vitest run client/src`
Expected: tsc clean; PASS.

- [ ] **Step 3: Browser check** (dev server, 375 px): add Mesa Urb twice and Luminária Lua; add "Móvel personalizado" → dialog → description → line appears with note and pencil; open the cart: name/bairro empty → checkout disabled; fill "Maria"/"Savassi" → checkout opens `wa.me` whose decoded text matches the Task 4 format with `http://localhost:3000/catalogo/mesa-urb` under Mesa Urb and the description under the custom line; reload → name and bairro prefilled; unpublish Mesa Urb in the admin → line shows "Produto indisponível", badge drops, message omits it; `localStorage.eps_cart` is gone.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/cart client/src/components/catalog/QuoteButton.tsx client/src/pages/Catalog.tsx
git commit -m "feat(cart): custom piece dialog, name+bairro checkout, unavailable lines"
```

---

## Part C — Pages

### Task 6: Shared `ProductCard` and `ImageLightbox`

**Files:**
- Create: `client/src/components/catalog/ProductCard.tsx`, `client/src/components/ImageLightbox.tsx`
- Modify: `client/src/pages/Catalog.tsx` (use `ProductCard`; remove lightbox state)
- Create: `shared/slug.ts`; Modify: `server/lib/slug.ts` (re-export `slugify` from shared), `client/src/lib/types.ts`

**Interfaces:**
- `ProductCard({ product: PublicProduct })`: image area and name are `Link`s to `/catalogo/${product.slug}`; keeps the fixed `h-64` box, `ResponsiveImage` with `CARD_SIZES`, the photo-count badge, hover overlay text **"Ver detalhes"**, description, category, then `QuoteButton` + `AddToCartButton`. "Sem fotos" placeholder unchanged.
- `ImageLightbox({ images: ImageLike[]; index: number; onIndexChange(i: number): void; onClose(): void; altBase: string; footer?: ReactNode })`: today's modal markup with: close button `aria-label="Fechar"`; arrows inside the image bounds (`left-2`/`right-2`, `rounded-full bg-black/50 p-2`), `aria-label="Imagem anterior"` / `"Próxima imagem"`; counter text `Imagem i de n`; thumbnails via `thumbUrl`; `footer` rendered under the thumbnails; `Escape` closes.
- `shared/slug.ts`: `slugify(input: string): string` (moved verbatim from `server/lib/slug.ts`, which re-exports it); the client imports it from `@shared/slug`.

- [ ] **Step 1: Move `slugify`** to `shared/slug.ts`, re-export from the server module. Run: `npx vitest run server/lib/slug.test.ts` → PASS.

- [ ] **Step 2: Build the two components** and rewrite the catalog grid to `products.map((p) => <ProductCard key={p.id} product={p} />)`, deleting the lightbox state and markup from `Catalog.tsx` (it returns in Task 7 on the detail page).

- [ ] **Step 3: Check**

Run: `npm run check && npx vitest run`
Expected: clean; all PASS. Browser: catalog cards look as before; tapping a photo navigates to `/catalogo/<slug>` (404 until Task 7 — expected).

- [ ] **Step 4: Commit**

```bash
git add shared/slug.ts server/lib/slug.ts client/src/components/catalog/ProductCard.tsx client/src/components/ImageLightbox.tsx client/src/pages/Catalog.tsx client/src/lib/types.ts
git commit -m "refactor(catalog): extract ProductCard and ImageLightbox; share slugify"
```

---

### Task 7: Product detail page and Portuguese NotFound

**Files:**
- Create: `client/src/pages/Product.tsx`, `client/src/lib/related.ts`, `client/src/lib/related.test.ts`
- Modify: `client/src/App.tsx` (route `/catalogo/:slug`), `client/src/pages/NotFound.tsx`

**Interfaces:**
- `relatedProducts(all: PublicProduct[], current: PublicProduct, n = 3): PublicProduct[]` — others in the same category (catalog order), then others in catalog order, never the custom product unless nothing else exists, never `current`, at most `n`.
- `Product` page: `useParams<{ slug: string }>()`; `trpc.products.getBySlug.useQuery({ slug })`; while loading render the `Layout` with a muted "Carregando…" line; `null` → `<NotFound />`. Layout: `<Layout showCart>`; `lg:grid-cols-2`; gallery column (main `ResponsiveImage` `sizes="(min-width: 1024px) 50vw, 100vw"` with `aspectRatio` from dimensions, thumbnails row, tap opens `ImageLightbox`); info column: `h1` name (`heading-display text-4xl sm:text-5xl`), category chip, description, `<dl>` with **Materiais** / **Dimensões** when non-empty, `QuoteButton`, `AddToCartButton`, link **"← Voltar ao portfólio"**; section **"Veja também"** with `ProductCard`s from `relatedProducts(products.list, product)`. `useEffect` sets `document.title = \`${name} — Estúdio Pedra Industrial\`` and restores the previous title on unmount.
- `NotFound`: inside `<Layout>`, brand tokens, copy: `h1` **"Página não encontrada"**, text **"O endereço que você acessou não existe ou foi movido."**, button **"Voltar ao início"** → `/`.

- [ ] **Step 1: Write the failing test** `client/src/lib/related.test.ts`:
```ts
test("relatedProducts prefers the same category, then catalog order, skips current and custom", () => {
  const all = [p(1, "Mesas"), p(2, "Luminárias"), p(3, "Mesas"), p(4, "Mesas"), p(5, "Estantes"), p(9, "Personalizados", true)];
  expect(relatedProducts(all, all[0]).map((x) => x.id)).toEqual([3, 4, 2]);
  expect(relatedProducts(all, all[1]).map((x) => x.id)).toEqual([1, 3, 4]);
  expect(relatedProducts([all[0], all[5]], all[0]).map((x) => x.id)).toEqual([9]);
  expect(relatedProducts(all, all[0], 1).map((x) => x.id)).toEqual([3]);
});
```
Run: `npx vitest run client/src/lib/related.test.ts` → FAIL.

- [ ] **Step 2: Implement** `related.ts`, the page, the route (`<Route path="/catalogo/:slug" component={Product} />` next to `/catalogo`), NotFound.

- [ ] **Step 3: Check**

Run: `npm run check && npx vitest run client/src` → clean; PASS.
Browser (375 px and 1280 px): `/catalogo/mesa-urb` shows gallery, name, category, description, details, both buttons, "Veja também" with up to 3 cards; lightbox arrows are visible on the phone width; the per-card one-tap message on the catalog ends with `/catalogo/mesa-urb`; `/catalogo/nao-existe` and the slug of a product unpublished in the admin both show the Portuguese NotFound inside the layout; tab title changes on the detail page.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Product.tsx client/src/pages/NotFound.tsx client/src/lib/related.ts client/src/lib/related.test.ts client/src/App.tsx
git commit -m "feat(catalog): product detail pages and Portuguese NotFound"
```

---

### Task 8: Category chips with `?categoria=`

**Files:**
- Create: `client/src/lib/catalogFilter.ts`, `client/src/lib/catalogFilter.test.ts`, `client/src/components/catalog/CategoryChips.tsx`
- Modify: `client/src/pages/Catalog.tsx`

**Interfaces:**
- `categorySlug(label: string): string` = `slugify(label)`.
- `extractCategories(products: PublicProduct[]): { label: string; slug: string }[]` — distinct non-empty categories of the given (published) products in first-appearance order.
- `filterByCategory(products: PublicProduct[], slug: string | null): PublicProduct[]` — `null` or a slug matching no category → all; else those whose `categorySlug(category) === slug`; in every case custom products are removed from their position and appended last.
- `CategoryChips({ categories, active, onChange(slug: string | null) })`: horizontal `overflow-x-auto` row; **"Todos"** first; active chip `bg-foreground text-background`, others `variant="outline"`; `aria-pressed`.
- `Catalog.tsx`: reads `categoria` from `useSearch()`; writes with `setLocation(slug ? \`/catalogo?categoria=${slug}\` : "/catalogo", { replace: true })`.

- [ ] **Step 1: Write the failing tests** `catalogFilter.test.ts`:
```ts
const all = [p(1, "Mesas"), p(2, "Luminárias"), p(3, "Mesas de Jantar"), p(4, ""), p(9, "Personalizados", true), p(5, "Luminárias")];
test("categorySlug handles accents and spaces", () => {
  expect(categorySlug("Luminárias")).toBe("luminarias");
  expect(categorySlug("Mesas de Jantar")).toBe("mesas-de-jantar");
});
test("extractCategories is distinct, ordered, skips empty", () => {
  expect(extractCategories(all).map((c) => c.slug)).toEqual(["mesas", "luminarias", "mesas-de-jantar", "personalizados"]);
});
test("filterByCategory pins the custom piece last and treats unknown slugs as Todos", () => {
  expect(filterByCategory(all, null).map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 9]);
  expect(filterByCategory(all, "luminarias").map((x) => x.id)).toEqual([2, 5, 9]);
  expect(filterByCategory(all, "nao-existe").map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 9]);
});
```
Run: `npx vitest run client/src/lib/catalogFilter.test.ts` → FAIL.

- [ ] **Step 2: Implement** helpers, chips, catalog wiring.

- [ ] **Step 3: Check**

Run: `npm run check && npx vitest run client/src` → clean; PASS.
Browser: chips row scrolls at 375 px; tapping "Mesas" filters and the URL becomes `/catalogo?categoria=mesas`; reload keeps the filter; "Móvel personalizado" is the last card under every chip; `?categoria=xyz` shows everything with "Todos" active.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/catalogFilter.ts client/src/lib/catalogFilter.test.ts client/src/components/catalog/CategoryChips.tsx client/src/pages/Catalog.tsx
git commit -m "feat(catalog): category chips mirrored in ?categoria="
```

---

### Task 9: Home: featured grid, strip position, hero padding

**Files:**
- Create: `client/src/lib/featured.ts`, `client/src/lib/featured.test.ts`
- Modify: `client/src/pages/Home.tsx`

**Interfaces:**
- `selectFeatured(products: PublicProduct[], max = 6, min = 3): PublicProduct[]` — published-list order; featured first; if fewer than `min` featured, append non-featured in order until `max`; otherwise return the featured ones capped at `max`.
- Home: `<Layout showCart>`; hero `py-16 md:py-24`; new section **"Destaques"** (`h2` with the existing `heading-display` sizes, a `text-accent-mono` label `DESTAQUES`) with a `ProductCard` grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12`) from `selectFeatured(trpc.products.list)`, then a centred outline link **"Ver portfólio completo"** → `/catalogo`; the four-item strip moves below this section; Ambientes placeholder position is where Task 11 inserts its strip (right after the four-item strip).

- [ ] **Step 1: Write the failing test** `featured.test.ts`:
```ts
const P = (id: number, featured: boolean) => ({ id, featured }) as PublicProduct;
test("selectFeatured pads to six when fewer than three are featured, else caps at six", () => {
  const all = [P(1, false), P(2, true), P(3, false), P(4, false), P(5, true), P(6, false), P(7, false), P(8, false)];
  expect(selectFeatured(all).map((x) => x.id)).toEqual([2, 5, 1, 3, 4, 6]);
  const many = [1, 2, 3, 4, 5, 6, 7].map((i) => P(i, true));
  expect(selectFeatured(many).map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(selectFeatured([P(1, true), P(2, true), P(3, true), P(4, false)]).map((x) => x.id)).toEqual([1, 2, 3]);
  expect(selectFeatured([])).toEqual([]);
});
```
Run: `npx vitest run client/src/lib/featured.test.ts` → FAIL.

- [ ] **Step 2: Implement** and rewire `Home.tsx`.

- [ ] **Step 3: Check**

Run: `npm run check && npx vitest run client/src` → clean; PASS.
Browser at 375 px: after the hero the "Destaques" heading is within the first ~1.5 screens and the first card is reachable with one scroll; mark two products "Destaque" in admin → they lead the grid; cart icon shows in the header on `/`; "Ver portfólio completo" goes to `/catalogo`; the four-item strip sits under the grid; `scrollWidth === clientWidth`.

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/featured.ts client/src/lib/featured.test.ts client/src/pages/Home.tsx
git commit -m "feat(home): featured pieces grid first, compact hero"
```

---

## Part D — Ambientes and admin

### Task 10: Admin tabs, generalised `ImageManager`, Ambientes tab, "Personalizado" switch

**Files:**
- Rewrite: `client/src/components/admin/ImageManager.tsx`
- Create: `client/src/components/admin/AmbientesTab.tsx`
- Modify: `client/src/pages/Admin.tsx`, `client/src/components/admin/ProductDialog.tsx`

**Interfaces:**
- `ManagedImage = ImageLike & { id: number }`.
- `ImageManager({ images: ManagedImage[]; title?: string; actions: { add(dataUrl: string): Promise<unknown>; remove(id: number): Promise<unknown>; reorder(orderedIds: number[]): Promise<unknown>; setCover?(id: number): Promise<unknown> }; onChanged(): Promise<unknown>; renderExtra?(img: ManagedImage): ReactNode })`. The "Capa" badge and star button render only when `setCover` is provided. Upload flow (compress, `TRPCClientError` alert) unchanged.
- `ProductDialog` passes product-bound actions (`images.add/delete/reorder/setCover` with `productId`) and `onChanged = utils.products.listAll.invalidate`; gains a **"Personalizado"** `Switch` bound to `isCustom`, sent in `base`.
- `AmbientesTab()`: `gallery.list` query; `ImageManager` with `gallery.add/delete/reorder`, no `setCover`, `title="Ambientes"`, `renderExtra` = caption `Input` (placeholder "Legenda (opcional)", saves on blur via `gallery.update`) + `Select` **"Peça relacionada"** listing published products from `products.listAll` plus "Nenhuma" (`productId: null`).
- `Admin.tsx`: shadcn `Tabs` with **"Produtos"** (current content) and **"Ambientes"** (`AmbientesTab`), header buttons unchanged.

- [ ] **Step 1: Implement** the four files.

- [ ] **Step 2: Check**

Run: `npm run check && npx vitest run` → clean; PASS.
Browser (`/admin`, test server with a session-created password as in Batch 1): product dialog still uploads/reorders/sets cover/deletes; toggle "Personalizado" on Mesa Urb → "Móvel personalizado" loses it (reload shows one switch on); Ambientes tab: upload a photo, set caption, pick a related piece, reorder with arrows, delete (uploads dir loses the variants).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/admin client/src/pages/Admin.tsx
git commit -m "feat(admin): Ambientes tab, reusable ImageManager, Personalizado switch"
```

---

### Task 11: Home "Na casa dos nossos clientes" strip

**Files:**
- Create: `client/src/components/home/AmbientesStrip.tsx`
- Modify: `client/src/pages/Home.tsx`

**Interfaces:**
- `AmbientesStrip()`: `gallery.list` + `products.list` queries; returns `null` when the gallery is empty; section with label `AMBIENTES`, `h2` **"Na casa dos nossos clientes"**; `flex gap-4 overflow-x-auto snap-x pb-4`; tiles `w-64 shrink-0 snap-start`, image box `aspect-[4/5] overflow-hidden rounded-lg`, `ResponsiveImage` `sizes="256px"`, caption `text-sm text-muted-foreground` below; tap opens `ImageLightbox` over the gallery images with `footer` = `Link` **"Ver a peça"** → `/catalogo/<slug>` when the current image's `productId` resolves in `products.list`.
- Rendered in `Home.tsx` right after the four-item strip.

- [ ] **Step 1: Implement.**

- [ ] **Step 2: Check**

Run: `npm run check` → clean.
Browser at 375 px: strip hidden with an empty gallery; after Task 10 uploads it shows tiles in admin order with captions; tapping opens the lightbox; "Ver a peça" appears only for related photos and navigates to the detail page; `scrollWidth === clientWidth` on `/`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/home/AmbientesStrip.tsx client/src/pages/Home.tsx
git commit -m "feat(home): Ambientes strip with lightbox and related-piece link"
```

---

### Task 12: Docs and final acceptance

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README**: pages list adds `/catalogo/<slug>`; "How it works" describes the cart form (name + bairro), the custom piece, chips, featured grid, Ambientes; API section adds the `gallery` router and `products.getBySlug` returning `null` for unpublished; mention `docs/discovery/analytics.md`.

- [ ] **Step 2: Full verification**

Run: `npm run check && npm test && npm run build`
Expected: clean; all files pass; build succeeds.

- [ ] **Step 3: Walk spec section 5** (acceptance 1–9) on the production build (`npm start`) at 375 px and desktop. Item 7 is covered by the seed test plus one manual boot against a database created before this branch (checkout Batch 1, run dev once, switch back, run dev: the product is converted).

- [ ] **Step 4: Commit and update memory**

```bash
git add README.md
git commit -m "docs: README for the quote flow, detail pages and Ambientes"
```

---

## Self-review notes

- **Spec coverage:** 4.1 → Tasks 4, 5; 4.2 → Tasks 1, 3, 5, 10 (switch); 4.3 → Task 9; 4.4 → Tasks 1 (published-only), 6, 7; 4.5 → Task 8; 4.6 → Tasks 2, 10, 11; 4.7 → Task 6 (+ QuoteButton in Task 5); 4.8 → already committed with the design; acceptance → Task 12.
- **Builder's open points (spec §6):** dialog is one component with two modes; customer lives in `CartContext`; `ImageManager` adapter shape fixed in Task 10; related fallback fixed in Task 7; `?categoria=` via `useSearch` + `setLocation(..., { replace: true })`; `lineId` via `crypto.randomUUID()`.
- **Type consistency:** `CartItem` (Task 4) consumed by Task 5; `ResolvedLine`/`MessageLine` produced and consumed in Task 4/5; `ManagedImage` (Task 10) matches `ImageLike & { id }`; `PublicProduct` gains `isCustom` through the router output type automatically after Task 1.
- **Review Focus:** 1 → storage tests (Task 4); 2 → resolve test (Task 4) + browser (Task 5); 3 → whatsapp test trims (Task 4) + disabled checkout (Task 5); 4 → catalogFilter tests (Task 8); 5 → repo/router tests (Task 1) + browser (Task 7).
