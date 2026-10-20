# Batch 1 — Mobile-first conversion basics + deploy readiness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site usable on a phone with one-tap WhatsApp paths, serve resized WebP product photos, and make the repo deployable in one sitting on an Ubuntu VPS.

**Architecture:** Three independent parts, in order. (A) Client: one shared `Layout` (header with hamburger Sheet, footer, floating WhatsApp button) wraps the three public pages; WhatsApp link builders live in one module. (B) Images: `images.add` runs uploads through a sharp pipeline that writes WebP variants, records width/height/variants on `product_images`, and the client renders `srcset`. (C) Deploy: the Express app is extracted to `createApp()` with `/healthz` and a production config guard; backup/restore scripts and guides are updated.

**Tech Stack:** React 19, Vite 7, Tailwind v4, shadcn/ui (Sheet, Button), wouter, tRPC 11, Express 4, Drizzle + better-sqlite3, sharp, vitest. Node 22.

**Spec:** `docs/superpowers/specs/2026-10-19-batch1-mobile-first-deploy-ready-design.md`

## Global Constraints

- Node `>=22` in production; `.nvmrc` says `22`.
- All visitor-facing copy is Brazilian Portuguese. Brand look is untouched: beige `#d2b389` + black, Montserrat, existing tokens/classes (`heading-secondary`, `bg-foreground`, `text-background`, …). New UI reuses them.
- Anything touching disk resolves paths from `process.cwd()`, never `__dirname` (server is bundled to `dist/index.js`).
- WhatsApp number comes only from `WHATSAPP_NUMBER` in `client/src/config.ts`. No other literal `5531971803551` in `client/src` after this plan.
- Variant widths are `480`, `960`, `1600`; files are `<uuid>-<width>.webp`, WebP quality `80`, never upscale; `url` points at the largest variant.
- Legacy image rows: `width = 0`, `height = 0`, `variants = {}`; clients fall back to `url`.
- Admin (`/admin`) and NotFound do not use the shared layout and get no floating button.
- Existing tests keep passing except the two the spec names (seed default-image URL, 1-byte PNG upload) and the `decodeDataUrl` return shape, which this plan rewrites.
- Commits follow the repo's style: `feat(scope): …`, `fix(scope): …`, `docs: …`, `chore: …`.

## Review Focus

1. **EXIF-rotated phone photos** (portrait JPEG stored landscape with orientation 6): variants must be upright and `width`/`height` must be the displayed size. Test in Task 7.
2. **HEIC arriving as `application/octet-stream`** (Chrome sometimes declares no image MIME): still rejected with the Portuguese HEIC guidance, nothing written. Test in Task 7.
3. **Source narrower than 480 px** (an old 300 px photo): one variant at 300, `url` points at it, `srcset` has one candidate, nothing upscaled. Tests in Tasks 5, 7, 11.
4. **Legacy `/products/<file>.jpg` rows on delete and reprocess**: deleting must never touch `client/public/products`; reprocessing a row whose file is missing on disk skips it and reports instead of crashing. Tests in Tasks 7 and 10.
5. **Upload over the 20 MB decoded cap**: rejected with the Portuguese size message before sharp runs, nothing written. Test in Task 7.

---

## Part A — Client conversion basics

### Task 1: WhatsApp link module

**Files:**
- Create: `client/src/lib/whatsapp.ts`
- Create: `client/src/lib/whatsapp.test.ts`
- Modify: `client/src/components/cart/whatsapp.ts` (use the shared URL builder; behaviour unchanged)

**Interfaces:**
- Produces:
  - `WHATSAPP_LINK: string` = `https://wa.me/${WHATSAPP_NUMBER}` (bare link, no text)
  - `whatsappUrl(text: string): string` → `https://wa.me/<number>?text=<encodeURIComponent(text)>`
  - `GENERIC_QUOTE_MESSAGE: string` = `Olá! Vim pelo site do Estúdio Pedra Industrial e gostaria de um orçamento.`
  - `productQuoteMessage(productName: string, catalogUrl: string): string` = `` `Olá! Tenho interesse no produto *${productName}* do catálogo do Estúdio Pedra Industrial e gostaria de um orçamento.\n\n${catalogUrl}` ``
  - `openWhatsApp(url: string): void` → `window.open(url, "_blank", "noopener,noreferrer")`

- [ ] **Step 1: Write the failing tests** in `client/src/lib/whatsapp.test.ts`

```ts
import { expect, test } from "vitest";
import { GENERIC_QUOTE_MESSAGE, WHATSAPP_LINK, productQuoteMessage, whatsappUrl } from "./whatsapp";

test("bare link and generic message target the studio number", () => {
  expect(WHATSAPP_LINK).toBe("https://wa.me/5531971803551");
  expect(whatsappUrl(GENERIC_QUOTE_MESSAGE)).toBe(
    "https://wa.me/5531971803551?text=" + encodeURIComponent(GENERIC_QUOTE_MESSAGE)
  );
  expect(GENERIC_QUOTE_MESSAGE).toBe("Olá! Vim pelo site do Estúdio Pedra Industrial e gostaria de um orçamento.");
});

test("product quote message names the product and links the catalog", () => {
  const msg = productQuoteMessage("Mesa Urb", "https://example.com/catalogo");
  expect(msg).toBe(
    "Olá! Tenho interesse no produto *Mesa Urb* do catálogo do Estúdio Pedra Industrial e gostaria de um orçamento.\n\nhttps://example.com/catalogo"
  );
});

test("special characters in product names survive the URL round-trip", () => {
  const msg = productQuoteMessage("Mesa & Banco Ñ #2", "https://x.y/catalogo");
  const url = whatsappUrl(msg);
  expect(url).toContain("%0A");
  expect(decodeURIComponent(url.split("text=")[1])).toBe(msg);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run client/src/lib/whatsapp.test.ts`
Expected: FAIL, cannot resolve `./whatsapp`.

- [ ] **Step 3: Implement `client/src/lib/whatsapp.ts`** with the five exports above, importing `WHATSAPP_NUMBER` from `@/config`.

- [ ] **Step 4: Point the cart builder at the shared helper**

In `client/src/components/cart/whatsapp.ts`, make `buildWhatsAppUrl` return `whatsappUrl(buildWhatsAppMessage(customerName, items))`. The existing `whatsapp.test.ts` for the cart must still pass unchanged.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run client/src/lib client/src/components/cart`
Expected: PASS (new tests + both cart test files).

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/whatsapp.ts client/src/lib/whatsapp.test.ts client/src/components/cart/whatsapp.ts
git commit -m "feat(whatsapp): shared link builders and product quote message"
```

---

### Task 2: Shared layout (header with mobile menu, footer)

**Files:**
- Create: `client/src/components/layout/SiteHeader.tsx`
- Create: `client/src/components/layout/SiteFooter.tsx`
- Create: `client/src/components/layout/Layout.tsx`
- Modify: `client/src/App.tsx` (wrap `<Router />` in `CartProvider`)
- Modify: `client/src/pages/Home.tsx`, `client/src/pages/Catalog.tsx`, `client/src/pages/Contact.tsx`

**Interfaces:**
- Consumes: `whatsappUrl`, `GENERIC_QUOTE_MESSAGE`, `WHATSAPP_LINK` from Task 1; `CartWidget`, `CartProvider` from `@/components/cart`.
- Produces:
  - `NAV_LINKS: { label: string; href: string }[]` in `SiteHeader.tsx`, exactly: Início `/`, Serviços `/#servicos`, Sobre `/#sobre`, Portfólio `/catalogo`, Contato `/contato`.
  - `SiteHeader({ rightSlot?: ReactNode })`
  - `SiteFooter()`
  - `Layout({ children, showCart?: boolean })` → renders `SiteHeader` (with `<CartWidget />` as `rightSlot` when `showCart`), `children`, `SiteFooter`. Task 3 adds the floating button here.

- [ ] **Step 1: Build `SiteHeader`**

Copy the Catalog header markup (logo + wordmark linking to `/`, sticky, `border-b`, `py-6`) as the base. Desktop (`hidden md:flex`): the five `NAV_LINKS` as plain `<a>` tags with the existing classes, then the black "Faça um Orçamento" `Button` (markup from Home's header) linking to `whatsappUrl(GENERIC_QUOTE_MESSAGE)` with `target="_blank" rel="noopener noreferrer"`, then `rightSlot`. Mobile (`md:hidden`): `rightSlot`, then a hamburger `Button variant="ghost" size="icon"` with `aria-label="Abrir menu"` (lucide `Menu`) that opens a shadcn `Sheet` (`side="right"`) containing an `sr-only` `SheetTitle` "Menu", the same links as a vertical list (`heading-secondary text-base`), and the same WhatsApp button full-width. Every link's `onClick` sets the sheet state closed.

- [ ] **Step 2: Build `SiteFooter`**

Base it on Home's footer (logo + blurb, Navegação, Contato, Horário, copyright line). Navegação links become: Serviços `/#servicos`, Sobre `/#sobre`, Portfólio `/catalogo`, Contato `/contato`. No `#contato` anchor anywhere.

- [ ] **Step 3: Build `Layout`** per the interface above, with the outer `<div className="min-h-screen bg-background">` the pages use today.

- [ ] **Step 4: Wire the pages**

- `App.tsx`: import `CartProvider` and render `<CartProvider><Router /></CartProvider>` inside `TooltipProvider`.
- `Home.tsx`: delete its `<header>` and `<footer>` and the outer div; return `<Layout>…sections…</Layout>`. Replace the three `https://wa.me/5531971803551` hrefs with `WHATSAPP_LINK`.
- `Contact.tsx`: same removal; `<Layout>`; the two `wa.me` hrefs become `WHATSAPP_LINK`.
- `Catalog.tsx`: remove the inline `CartProvider`, `<header>`, and the `<CartWidget />` in the page body (keep the "Voltar" link, drop the now-empty right-hand flex wrapper); return `<Layout showCart>…</Layout>`.

- [ ] **Step 5: Type-check and grep**

Run: `npm run check && grep -rn "5531971803551" client/src --include=*.tsx --include=*.ts`
Expected: tsc clean; grep prints only `client/src/config.ts`.

- [ ] **Step 6: Manual check in the browser**

Run `npm run dev`, open `http://localhost:3000` at a 375 px wide viewport: hamburger visible on `/`, `/catalogo`, `/contato`; menu lists Início, Serviços, Sobre, Portfólio, Contato and the WhatsApp button; tapping Portfólio navigates and closes the sheet; cart icon shows in the header only on `/catalogo`, and adding an item still badges it. At ≥768 px the header shows logo + links + button on all three pages. Footer Contato goes to `/contato`.

- [ ] **Step 7: Commit**

```bash
git add client/src/App.tsx client/src/components/layout client/src/pages/Home.tsx client/src/pages/Catalog.tsx client/src/pages/Contact.tsx
git commit -m "feat(layout): shared header with mobile menu, shared footer"
```

---

### Task 3: Floating WhatsApp button

**Files:**
- Create: `client/src/components/WhatsAppFab.tsx`
- Modify: `client/src/components/layout/Layout.tsx`
- Modify: `client/index.html` (viewport meta gains `viewport-fit=cover`)

**Interfaces:**
- Consumes: `whatsappUrl`, `GENERIC_QUOTE_MESSAGE` from Task 1.
- Produces: `WhatsAppFab()` — an `<a>` with `aria-label="Falar no WhatsApp"`, `target="_blank" rel="noopener noreferrer"`, href `whatsappUrl(GENERIC_QUOTE_MESSAGE)`.

- [ ] **Step 1: Implement `WhatsAppFab`**

Classes: `fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-secondary shadow-lg hover:bg-secondary hover:text-foreground transition-colors duration-300`, icon lucide `MessageCircle` at `h-7 w-7`. Inline style `right: max(1rem, env(safe-area-inset-right))`, `bottom: max(1rem, env(safe-area-inset-bottom))`. Contrast call: black circle with the beige icon (10.6:1 against the beige page, 21:1 against white `bg-card` sections); the inverse would vanish on the beige background.

- [ ] **Step 2: Render it in `Layout`** after `children`, before `SiteFooter`. Add `viewport-fit=cover` to the viewport `content` in `client/index.html`.

- [ ] **Step 3: Manual check**

Dev server: button visible bottom-right on `/`, `/catalogo`, `/contato` at 375 px and desktop; absent on `/admin`; opening the cart sheet overlays it; clicking opens `wa.me` with the generic message.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/WhatsAppFab.tsx client/src/components/layout/Layout.tsx client/index.html
git commit -m "feat(whatsapp): floating quote button on public pages"
```

---

### Task 4: One-tap quote per product

**Files:**
- Create: `client/src/components/catalog/QuoteButton.tsx`
- Modify: `client/src/pages/Catalog.tsx` (card actions)

**Interfaces:**
- Consumes: `productQuoteMessage`, `whatsappUrl`, `openWhatsApp` from Task 1; `AddToCartButton`.
- Produces: `QuoteButton({ productName: string })` — primary `Button className="w-full"` with `MessageCircle` icon and label `Pedir orçamento`; on click `openWhatsApp(whatsappUrl(productQuoteMessage(productName, window.location.origin + "/catalogo")))`.

- [ ] **Step 1: Implement `QuoteButton`** as specified.

- [ ] **Step 2: Update the card** in `Catalog.tsx`: replace the single `<AddToCartButton />` with a `flex flex-col gap-2` containing `<QuoteButton productName={product.name} />` then `<AddToCartButton name={product.name} />` (already `variant="outline"`).

- [ ] **Step 3: Manual check**

Dev server `/catalogo`: each card shows black "Pedir orçamento" above outlined "Adicionar ao carrinho"; clicking the first opens `wa.me` whose decoded text names the product and ends with `http://localhost:3000/catalogo`; the cart flow is unchanged.

- [ ] **Step 4: Run check and commit**

Run: `npm run check`
Expected: clean.

```bash
git add client/src/components/catalog/QuoteButton.tsx client/src/pages/Catalog.tsx
git commit -m "feat(catalog): one-tap WhatsApp quote per product"
```

---

## Part B — Image pipeline

### Task 5: Install sharp; pure pipeline helpers

**Files:**
- Modify: `package.json` (dependency `sharp`)
- Create: `server/lib/imagePipeline.ts`
- Create: `server/lib/imagePipeline.test.ts`

**Interfaces:**
- Produces (pure, no I/O):
  - `VARIANT_WIDTHS = [480, 960, 1600] as const`; `MAX_VARIANT_WIDTH = 1600`
  - `planVariantWidths(sourceWidth: number): number[]` — `cap = min(sourceWidth, 1600)`; result is every `VARIANT_WIDTHS` entry `< cap`, then `cap`.
  - `variantFileName(id: string, width: number): string` → `` `${id}-${width}.webp` ``
  - `isHeic(buffer: Buffer, mime?: string): boolean` — true when `mime` is `image/heic`/`image/heif`, or bytes 4–7 are `ftyp` and bytes 8–11 are one of `heic`, `heix`, `mif1`, `msf1`.
  - Message constants (exact copy):
    - `HEIC_MESSAGE = 'Fotos em HEIC não são aceitas por este navegador. Envie em JPEG — no iPhone: Ajustes → Câmera → Formatos → "Mais compatível".'`
    - `UPLOAD_TOO_LARGE_MESSAGE = "Imagem muito grande (máximo de 20 MB). Envie uma foto menor."`
    - `UNSUPPORTED_IMAGE_MESSAGE = "Formato de imagem não suportado. Envie JPEG, PNG, WebP ou GIF."`
    - `MAX_DECODED_BYTES = 20 * 1024 * 1024`

- [ ] **Step 1: Install sharp**

Run: `npm install sharp`
Expected: `sharp` in `dependencies`; `node -e "require('sharp')"` prints nothing.

- [ ] **Step 2: Write the failing tests** in `server/lib/imagePipeline.test.ts`

```ts
import { expect, test } from "vitest";
import { isHeic, planVariantWidths, variantFileName } from "./imagePipeline";

test.each([
  [2000, [480, 960, 1600]],
  [1600, [480, 960, 1600]],
  [1500, [480, 960, 1500]],
  [960, [480, 960]],
  [800, [480, 800]],
  [480, [480]],
  [300, [300]],
])("planVariantWidths(%i) -> %j", (w, expected) => {
  expect(planVariantWidths(w)).toEqual(expected);
});

test("variantFileName", () => {
  expect(variantFileName("abc", 480)).toBe("abc-480.webp");
});

function ftyp(brand: string) {
  return Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftyp" + brand), Buffer.alloc(12)]);
}
test("isHeic by mime or by ftyp brand", () => {
  expect(isHeic(Buffer.alloc(32), "image/heic")).toBe(true);
  expect(isHeic(Buffer.alloc(32), "image/heif")).toBe(true);
  for (const b of ["heic", "heix", "mif1", "msf1"]) expect(isHeic(ftyp(b), "application/octet-stream")).toBe(true);
  expect(isHeic(ftyp("isom"), "application/octet-stream")).toBe(false); // plain MP4
  expect(isHeic(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]), "image/jpeg")).toBe(false);
  expect(isHeic(Buffer.alloc(4))).toBe(false); // too short
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run server/lib/imagePipeline.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement the pure part of `server/lib/imagePipeline.ts`** (constants, `planVariantWidths`, `variantFileName`, `isHeic`). The sharp-backed functions arrive in Task 7.

- [ ] **Step 5: Run tests, commit**

Run: `npx vitest run server/lib/imagePipeline.test.ts`
Expected: PASS.

```bash
git add package.json package-lock.json server/lib/imagePipeline.ts server/lib/imagePipeline.test.ts
git commit -m "feat(images): add sharp and pure variant/HEIC helpers"
```

---

### Task 6: Schema columns and migration

**Files:**
- Modify: `server/db/schema.ts`
- Create (generated): `drizzle/0001_*.sql`, `drizzle/meta/0001_snapshot.json`, `drizzle/meta/_journal.json` entry
- Modify: `server/db/images.repo.ts` (`addImage` input)
- Modify: `server/db/client.test.ts` (defaults assertion)

**Interfaces:**
- Produces:
  - `productImages` gains `width: integer notNull default 0`, `height: integer notNull default 0`, `variants: text mode "json" $type<Record<string,string>> notNull default sql\`'{}'\``.
  - `ProductImage` type now has `width: number; height: number; variants: Record<string, string>` (flows to the client through tRPC + superjson unchanged).
  - `addImage(db, { productId, url, alt?, width?, height?, variants? })` — new fields default to `0`, `0`, `{}`.

- [ ] **Step 1: Add the failing assertion** to the first test in `server/db/client.test.ts`, after the image insert:

```ts
  expect(img.width).toBe(0);
  expect(img.height).toBe(0);
  expect(img.variants).toEqual({});
```

Run: `npx vitest run server/db/client.test.ts` → Expected: FAIL (tsc/vitest: property `width` does not exist, or undefined).

- [ ] **Step 2: Edit `schema.ts`** with the three columns as specified, then generate the migration:

Run: `npm run db:generate`
Expected: a new `drizzle/0001_<name>.sql` containing three `ALTER TABLE \`product_images\` ADD \`…\`` statements with `DEFAULT 0 NOT NULL` / `DEFAULT '{}' NOT NULL`, plus a new snapshot and journal entry. Inspect with `cat drizzle/0001_*.sql`.

- [ ] **Step 3: Extend `addImage`** in `images.repo.ts` to accept and persist `width`, `height`, `variants` (defaults `0`, `0`, `{}`).

- [ ] **Step 4: Run the DB tests**

Run: `npx vitest run server/db`
Expected: PASS (migration applies to fresh DBs; old assertions untouched).

- [ ] **Step 5: Commit**

```bash
git add server/db/schema.ts server/db/images.repo.ts server/db/client.test.ts drizzle
git commit -m "feat(db): width, height and variants columns on product_images"
```

---

### Task 7: sharp processing, upload decoding, variant deletion

**Files:**
- Modify: `server/lib/imagePipeline.ts` (add I/O functions)
- Modify: `server/lib/images.ts` (`decodeDataUrl` shape, `deleteImageByUrl` siblings, drop `saveImageBuffer`)
- Rewrite: `server/lib/images.test.ts`
- Modify: `server/lib/imagePipeline.test.ts` (add processing tests)

**Interfaces:**
- Consumes: Task 5 helpers; `uploadsDir()` from `images.ts` (export it).
- Produces:
  - `type ProcessedImage = { url: string; width: number; height: number; variants: Record<string, string> }`
  - `processImage(buffer: Buffer, dir?: string): Promise<ProcessedImage>` — `dir` defaults to `uploadsDir()`; creates the dir; `id = crypto.randomUUID()`; source width/height from `sharp(buffer).metadata()`, swapped when `orientation >= 5`; for each width in `planVariantWidths(sourceWidth)` writes `sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 })` to `variantFileName(id, width)`; `variants[String(width)] = "/uploads/" + file`; `url` is the largest; `width`/`height` are the largest output's `info.width`/`info.height`. Throws `Error(UNSUPPORTED_IMAGE_MESSAGE)` when sharp cannot decode.
  - `processUpload(dataUrl: string): Promise<ProcessedImage>` — `decodeDataUrl` → throw `UPLOAD_TOO_LARGE_MESSAGE` if `buffer.length > MAX_DECODED_BYTES` → throw `HEIC_MESSAGE` if `isHeic(buffer, mime)` → `processImage(buffer)`.
  - `decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string }` — accepts `image/*` and `application/octet-stream`; throws `Error("Invalid data URL")` on malformed input and `Error(UNSUPPORTED_IMAGE_MESSAGE)` for any other MIME.
  - `deleteImageByUrl(url: string): void` — unchanged guard; after removing the named file, if the name matches `/^([0-9a-f-]{36})-\d+\.webp$/` also removes every `<uuid>-*.webp` in the uploads dir. Non-`/uploads/` URLs are ignored as today.

- [ ] **Step 1: Rewrite `server/lib/images.test.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, expect, test } from "vitest";

beforeAll(() => {
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-up-"));
});

test("decodeDataUrl returns buffer and mime for image and octet-stream data", async () => {
  const { decodeDataUrl } = await import("./images");
  const jpeg = decodeDataUrl("data:image/jpeg;base64," + Buffer.from("hi").toString("base64"));
  expect(jpeg.mime).toBe("image/jpeg");
  expect(jpeg.buffer.toString()).toBe("hi");
  expect(decodeDataUrl("data:application/octet-stream;base64,aGk=").mime).toBe("application/octet-stream");
});

test("decodeDataUrl rejects non-image data and malformed input", async () => {
  const { decodeDataUrl } = await import("./images");
  expect(() => decodeDataUrl("data:text/plain;base64,aGk=")).toThrow(/Formato de imagem/);
  expect(() => decodeDataUrl("not-a-data-url")).toThrow(/Invalid data URL/);
});

test("deleteImageByUrl removes all variants sharing the uuid, and nothing else", async () => {
  const { deleteImageByUrl, uploadsDir } = await import("./images");
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const id = "11111111-2222-3333-4444-555555555555";
  for (const w of [480, 960, 1600]) fs.writeFileSync(path.join(dir, `${id}-${w}.webp`), "x");
  fs.writeFileSync(path.join(dir, "other-480.webp"), "x");
  fs.writeFileSync(path.join(dir, "legacy.jpg"), "x");
  deleteImageByUrl(`/uploads/${id}-1600.webp`);
  expect(fs.readdirSync(dir).sort()).toEqual(["legacy.jpg", "other-480.webp"]);
  deleteImageByUrl("/uploads/legacy.jpg");
  expect(fs.existsSync(path.join(dir, "legacy.jpg"))).toBe(false);
});

test("deleteImageByUrl ignores non-upload urls", async () => {
  const { deleteImageByUrl } = await import("./images");
  const target = path.join(process.cwd(), "client", "public", "products", "mesa-urb.jpg");
  deleteImageByUrl("/products/mesa-urb.jpg");
  expect(fs.existsSync(target)).toBe(true);
});
```

- [ ] **Step 2: Add processing tests** to `server/lib/imagePipeline.test.ts` (keep the pure tests). Helper `tmpDir()` makes a fresh `mkdtemp`.

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { HEIC_MESSAGE, UNSUPPORTED_IMAGE_MESSAGE, UPLOAD_TOO_LARGE_MESSAGE, processImage, processUpload } from "./imagePipeline";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "eps-pipe-"));
const solid = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#d2b389" } });

test("landscape 2000x1500 -> 480/960/1600 webp, url is the largest", async () => {
  const dir = tmpDir();
  const out = await processImage(await solid(2000, 1500).jpeg().toBuffer(), dir);
  expect(Object.keys(out.variants)).toEqual(["480", "960", "1600"]);
  expect(out.url).toBe(out.variants["1600"]);
  expect(out.url).toMatch(/^\/uploads\/[0-9a-f-]{36}-1600\.webp$/);
  expect([out.width, out.height]).toEqual([1600, 1200]);
  expect(fs.readdirSync(dir)).toHaveLength(3);
  const meta = await sharp(path.join(dir, path.basename(out.variants["480"]))).metadata();
  expect([meta.format, meta.width]).toEqual(["webp", 480]);
});

test("portrait 1500x2000 keeps its own width as the largest variant", async () => {
  const out = await processImage(await solid(1500, 2000).png().toBuffer(), tmpDir());
  expect(Object.keys(out.variants)).toEqual(["480", "960", "1500"]);
  expect([out.width, out.height]).toEqual([1500, 2000]);
});

test("tiny 300x200 source produces one variant, never upscaled", async () => {
  const out = await processImage(await solid(300, 200).jpeg().toBuffer(), tmpDir());
  expect(Object.keys(out.variants)).toEqual(["300"]);
  expect([out.width, out.height]).toEqual([300, 200]);
});

test("EXIF orientation 6 is applied: stored landscape 1200x800 comes out 800x1200", async () => {
  const buf = await solid(1200, 800).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const out = await processImage(buf, tmpDir());
  expect([out.width, out.height]).toEqual([800, 1200]);
  expect(Object.keys(out.variants)).toEqual(["480", "800"]);
});

test("processUpload rejects HEIC (declared or octet-stream), oversized, and garbage; writes nothing", async () => {
  process.env.UPLOADS_DIR = tmpDir();
  const b64 = (b: Buffer) => b.toString("base64");
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(12)]);
  await expect(processUpload("data:image/heic;base64," + b64(heic))).rejects.toThrow(HEIC_MESSAGE);
  await expect(processUpload("data:application/octet-stream;base64," + b64(heic))).rejects.toThrow(HEIC_MESSAGE);
  await expect(processUpload("data:image/jpeg;base64," + b64(Buffer.alloc(20 * 1024 * 1024 + 1)))).rejects.toThrow(UPLOAD_TOO_LARGE_MESSAGE);
  await expect(processUpload("data:image/jpeg;base64," + b64(Buffer.from("not an image")))).rejects.toThrow(UNSUPPORTED_IMAGE_MESSAGE);
  expect(fs.existsSync(process.env.UPLOADS_DIR!) ? fs.readdirSync(process.env.UPLOADS_DIR!) : []).toEqual([]);
});

test("processUpload accepts a real png data url", async () => {
  process.env.UPLOADS_DIR = tmpDir();
  const out = await processUpload("data:image/png;base64," + (await solid(100, 100).png().toBuffer()).toString("base64"));
  expect(Object.keys(out.variants)).toEqual(["100"]);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run server/lib`
Expected: FAIL (missing exports `processImage`, `processUpload`, `uploadsDir`; `decodeDataUrl` shape).

- [ ] **Step 4: Implement** `processImage`, `processUpload` in `imagePipeline.ts`; change `decodeDataUrl`, export `uploadsDir`, extend `deleteImageByUrl`, delete `saveImageBuffer` and `EXT_BY_MIME` in `images.ts`.

Note: `sharp(buffer).metadata()` must be awaited once before the loop; resolve `sourceWidth` from `orientation >= 5 ? height : width`. Wrap the metadata call in try/catch to map sharp's decode error to `UNSUPPORTED_IMAGE_MESSAGE`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run server/lib`
Expected: PASS. (`server/routers/routers.test.ts` and `server/db/seed.test.ts` will now fail to compile against the new shapes; Tasks 8 and 9 fix them.)

- [ ] **Step 6: Commit**

```bash
git add server/lib
git commit -m "feat(images): sharp WebP variant pipeline, HEIC and size guards"
```

---

### Task 8: `images.add` through the pipeline

**Files:**
- Modify: `server/routers/images.ts`
- Modify: `server/routers/routers.test.ts` (rewrite the image test, add two)

**Interfaces:**
- Consumes: `processUpload` (Task 7), `addImage` (Task 6), `deleteImageByUrl`.
- Produces: `images.add` returns the full `ProductImage` row (now with `width`, `height`, `variants`); `BAD_REQUEST` messages are the pipeline's Portuguese strings.

- [ ] **Step 1: Replace the `images.add rejects invalid data URLs` test** with:

```ts
import sharp from "sharp";
import { HEIC_MESSAGE } from "../lib/imagePipeline";

async function pngDataUrl(w: number, h: number) {
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: "#000" } }).png().toBuffer();
  return "data:image/png;base64," + buf.toString("base64");
}

test("images.add processes uploads into webp variants", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  await expect(admin.images.add({ productId: p.id, dataUrl: "nope" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  const img = await admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(1000, 500) });
  expect(img.url).toMatch(/^\/uploads\/[0-9a-f-]{36}-1000\.webp$/);
  expect([img.width, img.height]).toEqual([1000, 500]);
  expect(Object.keys(img.variants)).toEqual(["480", "960", "1000"]);
  expect(fs.readdirSync(process.env.UPLOADS_DIR!)).toHaveLength(3);
});

test("images.add rejects HEIC with the Portuguese guidance and stores nothing", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(12)]);
  await expect(admin.images.add({ productId: p.id, dataUrl: "data:image/heic;base64," + heic.toString("base64") }))
    .rejects.toMatchObject({ code: "BAD_REQUEST", message: HEIC_MESSAGE });
  expect(fs.existsSync(process.env.UPLOADS_DIR!) ? fs.readdirSync(process.env.UPLOADS_DIR!) : []).toEqual([]);
  expect((await admin.products.listAll())[0].images).toEqual([]);
});

test("images.delete and products.delete remove every variant file", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  const a = await admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(1000, 500) });
  await admin.images.add({ productId: p.id, dataUrl: await pngDataUrl(600, 600) });
  expect(fs.readdirSync(process.env.UPLOADS_DIR!)).toHaveLength(5);
  await admin.images.delete({ imageId: a.id });
  expect(fs.readdirSync(process.env.UPLOADS_DIR!)).toHaveLength(2);
  await admin.products.delete({ id: p.id });
  expect(fs.readdirSync(process.env.UPLOADS_DIR!)).toHaveLength(0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/routers`
Expected: FAIL (router still calls `saveImageBuffer`).

- [ ] **Step 3: Rewrite `add`** in `server/routers/images.ts` as an `async` mutation: `const processed = await processUpload(input.dataUrl)` inside try/catch mapping to `TRPCError({ code: "BAD_REQUEST", message })`, then `repo.addImage(ctx.db, { productId, alt, ...processed })`. `delete` is unchanged (sibling removal lives in `deleteImageByUrl`).

- [ ] **Step 4: Run tests, commit**

Run: `npx vitest run server/routers`
Expected: PASS.

```bash
git add server/routers/images.ts server/routers/routers.test.ts
git commit -m "feat(images): upload mutation writes webp variants"
```

---

### Task 9: Seed images through the pipeline

**Files:**
- Modify: `server/db/seed.ts`
- Modify: `server/db/seed.test.ts`

**Interfaces:**
- Consumes: `processImage` (Task 7).
- Produces:
  - `DEFAULT_PRODUCT_IMAGE_FILES: Record<string, string>` — slug → `` `${slug}.jpg` `` for the nine seeded slugs (replaces `DEFAULT_PRODUCT_IMAGES`).
  - `defaultImagePath(file: string): string` → `path.join(process.cwd(), "client", "public", "products", file)`.
  - `ensureProductImages(db)` — same idempotency; when a product has zero images it reads the default file, runs `processImage`, inserts `{ productId, alt: product.name, sortOrder: 0, ...processed }`. Missing default file: log a warning and skip.

- [ ] **Step 1: Update the tests** in `seed.test.ts`. Add `process.env.UPLOADS_DIR = fs.mkdtempSync(...)` in a `beforeEach`. Replace the assertion `expect(first!.images[0].url).toBe("/products/mesa-urb.jpg")` with:

```ts
  const img = first!.images[0];
  expect(img.url).toMatch(/^\/uploads\/[0-9a-f-]{36}-1080\.webp$/); // mesa-urb.jpg is 1080x1301
  expect([img.width, img.height]).toEqual([1080, 1301]);
  expect(Object.keys(img.variants)).toEqual(["480", "960", "1080"]);
```

and, at the end of that test, pin the width rule on two more seeds:

```ts
  const byKeys = (slug: string) => Object.keys(all.find((p) => p.slug === slug)!.images[0].variants);
  expect(byKeys("mesa-office-l")).toEqual(["480", "960", "1600"]);     // 1600x1600
  expect(byKeys("projetos-personalizados")).toEqual(["480", "780"]);   // 780x500
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/db/seed.test.ts`
Expected: FAIL (url still `/products/...`).

- [ ] **Step 3: Implement** the seed changes per the interface.

- [ ] **Step 4: Run tests, commit**

Run: `npx vitest run server/db`
Expected: PASS (seed test takes a few seconds: nine images through sharp).

```bash
git add server/db/seed.ts server/db/seed.test.ts
git commit -m "feat(seed): default product photos go through the variant pipeline"
```

---

### Task 10: `npm run images:reprocess`

**Files:**
- Create: `server/lib/reprocess.ts`
- Create: `server/lib/reprocess.test.ts`
- Create: `server/scripts/reprocess-images.ts`
- Modify: `package.json` (`build` entry points, `images:reprocess` script)
- Modify: `server/db/images.repo.ts` (`listLegacy`, `setProcessed`)

**Interfaces:**
- Consumes: `processImage`, `deleteImageByUrl`, `defaultImagePath`.
- Produces:
  - `listLegacy(db): Promise<ProductImage[]>` — rows with `width = 0`.
  - `setProcessed(db, imageId: number, p: ProcessedImage): Promise<void>` — updates `url`, `width`, `height`, `variants`.
  - `sourcePathFor(url: string): string | null` — `/uploads/<name>` → `path.join(uploadsDir(), name)`; `/products/<name>` → `defaultImagePath(name)`; anything else → `null`.
  - `reprocessLegacyImages(db, log = console.log): Promise<{ processed: number; skipped: number }>` — for each legacy row: resolve path; if `null` or file missing → `skipped++` and log; else `processImage` → `setProcessed` → if the old url was under `/uploads/` call `deleteImageByUrl(oldUrl)`; `processed++`.
  - `server/scripts/reprocess-images.ts`: imports `db` from `../db/client`, calls `reprocessLegacyImages(db)`, prints the counts, exits 0 (1 on throw). Must not import `server/index.ts`.
  - `package.json`: `"build": "vite build && esbuild server/index.ts server/scripts/reprocess-images.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"`, `"images:reprocess": "node dist/scripts/reprocess-images.js"`.

- [ ] **Step 1: Write the failing test** `server/lib/reprocess.test.ts` (same `freshDb`/`afterEach` boilerplate as `images.repo.test.ts`, plus `UPLOADS_DIR` temp dir in `beforeEach`):

```ts
test("reprocess converts legacy rows once, skips missing files, and is a no-op afterwards", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "P" });
  const legacyDefault = await repo.addImage(db, { productId: p.id, url: "/products/mesa-urb.jpg" });
  const missing = await repo.addImage(db, { productId: p.id, url: "/uploads/does-not-exist.jpg" });
  const dir = uploadsDir(); fs.mkdirSync(dir, { recursive: true });
  const legacyUpload = await repo.addImage(db, { productId: p.id, url: "/uploads/old.jpg" });
  fs.writeFileSync(path.join(dir, "old.jpg"), await sharp({ create: { width: 600, height: 400, channels: 3, background: "#000" } }).jpeg().toBuffer());

  const first = await reprocessLegacyImages(db, () => {});
  expect(first).toEqual({ processed: 2, skipped: 1 });
  const rows = await repo.listForProduct(db, p.id);
  const byId = new Map(rows.map((r) => [r.id, r]));
  expect(byId.get(legacyDefault.id)!.url).toMatch(/-1080\.webp$/);
  expect(Object.keys(byId.get(legacyUpload.id)!.variants)).toEqual(["480", "600"]);
  expect(byId.get(missing.id)!.width).toBe(0);
  expect(fs.existsSync(path.join(dir, "old.jpg"))).toBe(false);
  expect(fs.existsSync(path.join(process.cwd(), "client", "public", "products", "mesa-urb.jpg"))).toBe(true);

  expect(await reprocessLegacyImages(db, () => {})).toEqual({ processed: 0, skipped: 1 });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/lib/reprocess.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `listLegacy`, `setProcessed`, `sourcePathFor`, `reprocessLegacyImages`, the script, and the `package.json` changes.

- [ ] **Step 4: Run tests and the build**

Run: `npx vitest run server/lib && npm run build && ls dist dist/scripts`
Expected: tests PASS; `dist/index.js` and `dist/scripts/reprocess-images.js` exist.

- [ ] **Step 5: Run the command against the dev database**

Run: `npm run images:reprocess`
Expected: prints `processed: N, skipped: 0` (N = legacy rows in your local `.data/app.db`, 9 if it was seeded before this batch), and a second run prints `processed: 0`.

- [ ] **Step 6: Commit**

```bash
git add server/lib/reprocess.ts server/lib/reprocess.test.ts server/scripts server/db/images.repo.ts package.json
git commit -m "feat(images): images:reprocess command for legacy rows"
```

---

### Task 11: Responsive rendering on the client

**Files:**
- Create: `client/src/lib/imageSrcSet.ts`
- Create: `client/src/lib/imageSrcSet.test.ts`
- Create: `client/src/components/ResponsiveImage.tsx`
- Modify: `client/src/lib/types.ts` (export `PublicProduct`, `PublicImage`)
- Modify: `client/src/pages/Catalog.tsx` (card image, lightbox, thumbnails)
- Modify: `client/src/components/cart/CartWidget.tsx`, `client/src/components/admin/ImageManager.tsx`, `client/src/pages/Admin.tsx` (thumbnails)

**Interfaces:**
- Produces:
  - `type ImageLike = { url: string; width: number; height: number; variants: Record<string, string> }`
  - `buildSrcSet(img: ImageLike): string | undefined` — `"<url> <w>w"` entries sorted ascending by width; `undefined` when `variants` is empty.
  - `thumbUrl(img: ImageLike): string` — the smallest variant, else `url`.
  - `hasDimensions(img: ImageLike): boolean` — `width > 0 && height > 0`.
  - `ResponsiveImage({ image: ImageLike; sizes: string; alt: string; className?: string; loading?: "lazy" | "eager" })` — `<img src={image.url} srcSet={buildSrcSet(image)} sizes={...} width/height={when hasDimensions} … />`.
  - `CARD_SIZES = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"`.

- [ ] **Step 1: Write the failing tests** `client/src/lib/imageSrcSet.test.ts`

```ts
import { expect, test } from "vitest";
import { buildSrcSet, hasDimensions, thumbUrl } from "./imageSrcSet";

const full = { url: "/uploads/a-1600.webp", width: 1600, height: 1200,
  variants: { "960": "/uploads/a-960.webp", "1600": "/uploads/a-1600.webp", "480": "/uploads/a-480.webp" } };
const tiny = { url: "/uploads/b-300.webp", width: 300, height: 200, variants: { "300": "/uploads/b-300.webp" } };
const legacy = { url: "/products/mesa-urb.jpg", width: 0, height: 0, variants: {} };

test("buildSrcSet sorts by width and skips legacy rows", () => {
  expect(buildSrcSet(full)).toBe("/uploads/a-480.webp 480w, /uploads/a-960.webp 960w, /uploads/a-1600.webp 1600w");
  expect(buildSrcSet(tiny)).toBe("/uploads/b-300.webp 300w");
  expect(buildSrcSet(legacy)).toBeUndefined();
});

test("thumbUrl picks the smallest variant, falling back to url", () => {
  expect(thumbUrl(full)).toBe("/uploads/a-480.webp");
  expect(thumbUrl(legacy)).toBe("/products/mesa-urb.jpg");
});

test("hasDimensions is false for legacy rows", () => {
  expect(hasDimensions(full)).toBe(true);
  expect(hasDimensions(legacy)).toBe(false);
});
```

Run: `npx vitest run client/src/lib/imageSrcSet.test.ts` → Expected: FAIL, module not found.

- [ ] **Step 2: Implement** `imageSrcSet.ts`, `ResponsiveImage.tsx`, and the two type exports.

- [ ] **Step 3: Use them in the UI**

- Catalog card: `<ResponsiveImage image={product.images[0]} sizes={CARD_SIZES} alt={`${product.name} principal`} loading="lazy" className="w-full h-full object-cover group-hover/image-area:opacity-80 transition-opacity duration-300" />`. The wrapper keeps `relative h-64 … overflow-hidden`.
- Lightbox main image: wrap the `<img>` in a `div` that, when `hasDimensions(img)`, gets `style={{ aspectRatio: `${img.width} / ${img.height}` }}` and `className="mx-auto max-h-[70vh] w-full"`; the `<img>` becomes `src={img.url}` (largest), `width`/`height` attrs when known, `className="h-full w-full object-contain"`. Legacy rows keep today's `max-h-96 object-contain` behaviour.
- Lightbox thumbnails, `CartWidget` line thumbnails, `Admin.tsx` list thumbnails and `ImageManager` tiles use `thumbUrl(img)`.

- [ ] **Step 4: Check and verify in the browser**

Run: `npm run check && npx vitest run client/src`
Expected: both clean.

Dev server `/catalogo` at 375 px: DevTools Network shows cards requesting `-480.webp` or `-960.webp`; opening the lightbox requests the largest variant and the modal does not jump when the image arrives; card heights are identical across portrait and landscape photos.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/imageSrcSet.ts client/src/lib/imageSrcSet.test.ts client/src/lib/types.ts client/src/components/ResponsiveImage.tsx client/src/pages/Catalog.tsx client/src/components/cart/CartWidget.tsx client/src/components/admin/ImageManager.tsx client/src/pages/Admin.tsx
git commit -m "feat(catalog): srcset/sizes rendering and reserved lightbox aspect ratio"
```

---

### Task 12: Admin upload adjustments

**Files:**
- Modify: `client/src/lib/imageCompress.ts`
- Modify: `client/src/components/admin/ImageManager.tsx`

**Interfaces:**
- Produces: `compressImage(dataUrl: string, quality = 0.85, maxSide = 2400): Promise<string>` — same contract (resolves the original on any failure, which is what lets Safari-decoded HEIC and undecodable files reach the server).

- [ ] **Step 1: Relax `compressImage`** to the new defaults (`max` → `maxSide` parameter, default `2400`; default quality `0.85`). Update the doc comment.

- [ ] **Step 2: Simplify the upload loop** in `ImageManager.onFiles`: one attempt with `compressImage(dataUrl)`; on failure `alert(e instanceof TRPCClientError ? e.message : "Erro ao enviar imagem. Tente uma imagem menor.")` (`TRPCClientError` from `@trpc/client`). Remove the 0.3-quality retry. Keep `accept="image/*"` and `multiple`.

- [ ] **Step 3: Manual check**

Chrome desktop, `/admin`, edit a product: upload a large JPEG → tile appears, Network shows one `images.add`; upload a `.heic` file → alert shows the HEIC message containing "Mais compatível" and no tile appears; upload a 300 px PNG → works. (iPhone Safari check is part of the final acceptance, not blocking here.)

- [ ] **Step 4: Check and commit**

Run: `npm run check`
Expected: clean.

```bash
git add client/src/lib/imageCompress.ts client/src/components/admin/ImageManager.tsx
git commit -m "feat(admin): lighter client resize, surface server upload errors"
```

---

## Part C — Deploy readiness

### Task 13: `createApp`, health check, production guard

**Files:**
- Create: `server/app.ts`
- Create: `server/app.test.ts`
- Create: `server/lib/config.ts`
- Create: `server/lib/config.test.ts`
- Modify: `server/index.ts`
- Delete: `server/context.ts` (context is built inside `createApp`)
- Modify: `package.json` (`engines`), Create: `.nvmrc`

**Interfaces:**
- Produces:
  - `createApp(db: DB): Express` — `app.set("trust proxy", 1)`; `express.json({ limit: "50mb" })` + urlencoded; `app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "1y", immutable: true }))`; `GET /healthz` runs `db.$client.prepare("select 1").get()` and replies `200 {"ok":true}` (or `500 {"ok":false}` if it throws); `/api/trpc` with `createExpressMiddleware({ router: appRouter, createContext: ({ req, res }) => ({ req, res, db }) })`. Vite/static mounting stays in `index.ts` because it must come last.
  - `assertProductionConfig(env: NodeJS.ProcessEnv): void` — throws `Error("ADMIN_PASSWORD is not set. Refusing to start in production. Set it in .env (see .env.example).")` when `env.NODE_ENV === "production"` and `!env.ADMIN_PASSWORD`; otherwise returns. `index.ts` calls it first thing and keeps the existing dev warning; the top-level catch becomes `console.error(e); process.exit(1)`.
  - `package.json`: `"engines": { "node": ">=22" }`; `.nvmrc` contains `22`.

- [ ] **Step 1: Write the failing tests**

`server/lib/config.test.ts`:
```ts
import { expect, test } from "vitest";
import { assertProductionConfig } from "./config";

test("production without ADMIN_PASSWORD throws a clear error", () => {
  expect(() => assertProductionConfig({ NODE_ENV: "production" })).toThrow(/ADMIN_PASSWORD is not set/);
  expect(() => assertProductionConfig({ NODE_ENV: "production", ADMIN_PASSWORD: "" })).toThrow();
});
test("development and configured production pass", () => {
  expect(() => assertProductionConfig({ NODE_ENV: "development" })).not.toThrow();
  expect(() => assertProductionConfig({ NODE_ENV: "production", ADMIN_PASSWORD: "x" })).not.toThrow();
});
```

`server/app.test.ts` (reuse the `freshDb` + close boilerplate; set `process.env.UPLOADS_DIR` to a temp dir in `beforeAll` before the dynamic import):
```ts
test("healthz answers 200 ok and uploads are immutable-cached", async () => {
  const { createApp } = await import("./app");
  const db = freshDb();
  const server = createApp(db).listen(0);
  const port = (server.address() as AddressInfo).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    fs.mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    fs.writeFileSync(path.join(process.env.UPLOADS_DIR!, "x-480.webp"), "x");
    const up = await fetch(`http://127.0.0.1:${port}/uploads/x-480.webp`);
    expect(up.status).toBe(200);
    expect(up.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  } finally {
    await new Promise((r) => server.close(r));
  }
});
```

Run: `npx vitest run server/app.test.ts server/lib/config.test.ts` → Expected: FAIL, modules not found.

- [ ] **Step 2: Implement** `server/lib/config.ts`, `server/app.ts`; slim `server/index.ts` to: `assertProductionConfig(process.env)` → seed → `const app = createApp(db)` → `createServer(app)` → vite/static → dev warning → listen. Delete `server/context.ts`. Add `engines` and `.nvmrc`.

- [ ] **Step 3: Run everything**

Run: `npm run check && npm test`
Expected: all green.

- [ ] **Step 4: Verify the guard and health check by hand**

Run (Git Bash): `npm run build && (ADMIN_PASSWORD= NODE_ENV=production node dist/index.js; echo "exit=$?")`
Expected: prints the `ADMIN_PASSWORD is not set` error and `exit=1`. Note `dotenv` loads `.env` first, so temporarily rename `.env` if it sets the password locally.

Run: `npm start &` then `curl -s -i localhost:3000/healthz`
Expected: `HTTP/1.1 200` and body `{"ok":true}`. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add server/app.ts server/app.test.ts server/lib/config.ts server/lib/config.test.ts server/index.ts package.json .nvmrc
git rm server/context.ts
git commit -m "feat(server): createApp with /healthz, trust proxy, immutable uploads; refuse prod start without ADMIN_PASSWORD"
```

---

### Task 14: Backup, restore and Caddy assets

**Files:**
- Modify: `deploy/backup.sh`
- Create: `deploy/restore.sh`
- Modify: `deploy/Caddyfile`

**Interfaces:**
- `deploy/backup.sh [dest-dir]`: after writing the tarball, if `rclone` is installed and `rclone listremotes` contains `eps-backup:`, run `rclone copy "$out" eps-backup:eps-backups/` then `rclone delete --min-age 30d eps-backup:eps-backups/`; otherwise print `rclone remote 'eps-backup' not configured - skipping off-box copy.` Then prune local archives to the newest 7: `ls -1t "$dest"/eps-backup-*.tgz | tail -n +8 | xargs -r rm -f`.
- `deploy/restore.sh <archive>`: `set -euo pipefail`; resolve the archive with `readlink -f` before `cd "$(dirname "$0")/.."`; `has_pm2() { command -v pm2 >/dev/null 2>&1 && pm2 describe eps >/dev/null 2>&1; }`; stop `eps` if `has_pm2`; `mv .data ".data.before-restore-$(date +%F-%H%M%S)"` when `.data` exists; `tar xzf "$archive"`; start `eps` if `has_pm2`; print `Restored .data/ from <archive>. Previous data kept in .data.before-restore-<ts>/`.
- `deploy/Caddyfile`: site block `DOMAIN { … }` (literal placeholder `DOMAIN`), with:
  - global `{ servers { trusted_proxies static <Cloudflare IPv4 + IPv6 ranges> ; client_ip_headers CF-Connecting-IP X-Forwarded-For } }` — ranges copied from https://www.cloudflare.com/ips/ at implementation time, with that URL in a comment.
  - `encode zstd gzip`
  - `header { X-Content-Type-Options nosniff; Referrer-Policy strict-origin-when-cross-origin; Permissions-Policy "camera=(), microphone=(), geolocation=()" }`
  - `header /uploads/* Cache-Control "public, max-age=31536000, immutable"` and the same for `/assets/*`
  - `reverse_proxy localhost:3000 { header_up X-Forwarded-For {client_ip} }`
  - header comment: install steps now `sed -i "s/DOMAIN/seudominio.com.br/g" deploy/Caddyfile`.

- [ ] **Step 1: Write the three files** per the interface.

- [ ] **Step 2: Validate the Caddyfile syntax** (no Caddy locally; do a static check)

Run: `grep -c "DOMAIN" deploy/Caddyfile && grep -n "trusted_proxies\|client_ip_headers\|header_up" deploy/Caddyfile`
Expected: `DOMAIN` appears (site block + comment); the three directives are present. If `caddy` is available (`caddy version`), also run `sed "s/DOMAIN/example.com/g" deploy/Caddyfile | caddy validate --adapter caddyfile --config -`.

- [ ] **Step 3: Exercise backup and restore locally** (Git Bash, from the repo root, with a `.data/` present from the dev server)

```bash
bash deploy/backup.sh "$TMPDIR/eps-bk"            # prints "Backup written: ..." and the rclone skip line
ls "$TMPDIR/eps-bk"
bash deploy/restore.sh "$TMPDIR"/eps-bk/eps-backup-*.tgz
ls -d .data .data.before-restore-*                 # both exist; .data/app.db is back
rm -rf .data.before-restore-*
```
Expected: exactly the messages above; no pm2 errors on a machine without pm2.

- [ ] **Step 4: Commit**

```bash
git add deploy/backup.sh deploy/restore.sh deploy/Caddyfile
git commit -m "chore(deploy): rclone off-box backups, restore script, Cloudflare-aware Caddyfile"
```

---

### Task 15: Guides

**Files:**
- Rewrite: `DEPLOY.md`
- Rewrite: `VPS-SETUP.md`
- Modify: `README.md`, `.env.example`

**Content decisions** (the prose is the implementer's; these are the fixed points):

- `DEPLOY.md` sections, in order, each ending with a one-line check:
  0. **Buy a domain.** `.com` → Cloudflare Registrar (at-cost, DNS already there). `.com.br` → Registro.br, then change its nameservers to the two Cloudflare gives when adding the site (free plan). Check: `dig NS <domain>` shows Cloudflare.
  1. VPS (as today). Check: `ssh root@IP` works.
  2. Server setup (as today, plus `curl https://rclone.org/install.sh | bash`). Check: `node -v` → v22, `rclone version`.
  3. Code + build (as today). Check: `ls dist/index.js dist/scripts/reprocess-images.js`.
  4. `.env` (as today). Note the server refuses to start in production without `ADMIN_PASSWORD`.
  5. pm2 (as today). Check: `curl -s localhost:3000/healthz` → `{"ok":true}`.
  6. **Cloudflare + Caddy.** Add an A record `@` → VPS IP with the proxy **off** (grey cloud) first. Install Caddy (as today), `sed -i "s/DOMAIN/<domain>/g" deploy/Caddyfile`, copy, reload, `ufw allow 80,443`. Check: `curl -sI https://<domain>/healthz` → 200 (certificate issued). Then turn the proxy **on** (orange cloud), SSL/TLS → **Full (strict)**, enable **Always Use HTTPS**, add a **Cache Rule**: URI Path starts with `/uploads/` → Eligible for cache, Edge TTL 1 month. Check: `curl -sI https://<domain>/` shows a `cf-ray` header.
  7. **Backups.** `rclone config` → `n` → name `eps-backup` → storage `drive` → defaults; on a headless VPS answer `n` to auto-config and paste the token from `rclone authorize "drive"` run on your laptop. Then `rclone mkdir eps-backup:eps-backups`, run `bash deploy/backup.sh /var/backups/eps`, cron `0 3 * * * /bin/bash /opt/estudio-pedra-industrial/deploy/backup.sh /var/backups/eps >> /var/log/eps-backup.log 2>&1`. Backblaze B2 noted as the alternative storage type. Check: `rclone ls eps-backup:eps-backups` lists the archive.
  8. **Test your restore once.** `bash deploy/restore.sh /var/backups/eps/eps-backup-<ts>.tgz`, then the healthz check and a look at `/catalogo`.
  9. **Updating.** `bash deploy/deploy.sh`; if the database predates the image pipeline, run `npm run images:reprocess` once after the first deploy of this version.
  Notes section keeps single-instance, better-sqlite3, logs, git-ignored files.
- `VPS-SETUP.md`: same nine steps in the long explain-everything form, keeping the "mental model" diagram (add Cloudflare in front of Caddy and `rclone → Google Drive` next to `.data/`), the IP-only test as a sub-step of step 5, Troubleshooting (add: "healthz returns 500" → `pm2 logs eps`, disk full; "Caddy can't get a certificate" → proxy must be grey during first issuance), Security checklist, Quick reference (add restore and reprocess rows).
- `README.md`: under Stack/Backend mention sharp WebP variants (480/960/1600) stored in `.data/uploads`; add `GET /healthz`; add `npm run images:reprocess` and `deploy/restore.sh` to the scripts list; replace the stale "a dedicated admin UI … is a future addition" paragraph (the admin already edits all fields).
- `.env.example`: comment that production refuses to start without `ADMIN_PASSWORD`.

- [ ] **Step 1: Write the four files.**

- [ ] **Step 2: Check links and commands**

Run: `grep -n "example.com" deploy/Caddyfile DEPLOY.md VPS-SETUP.md`
Expected: no matches (placeholder is `DOMAIN`, guides use `<domain>`/`seudominio.com.br`). Also `grep -n "healthz\|images:reprocess\|restore.sh\|eps-backup" DEPLOY.md VPS-SETUP.md README.md` shows each guide covering all four.

- [ ] **Step 3: Commit**

```bash
git add DEPLOY.md VPS-SETUP.md README.md .env.example
git commit -m "docs: deploy guides from domain purchase to tested restore; README updates"
```

---

### Task 16: Final acceptance pass

- [ ] **Step 1: Full verification**

Run: `npm run check && npm test && npm run build`
Expected: tsc clean; all test files pass; `dist/index.js`, `dist/scripts/reprocess-images.js`, `dist/public/` exist.

- [ ] **Step 2: Walk the spec's acceptance list** (section 5) against the dev server at 375 px and desktop, plus `npm start` for the production build. Items 1–4, 6, 7, 9, 10, 11 are checkable locally. Item 5's Chrome half is checkable locally; item 5's iPhone Safari half and item 8 (`npm start` without `ADMIN_PASSWORD`, done in Task 13) are noted in the handoff.

- [ ] **Step 3: Update memory and hand off**

Record in the project memory that Batch 1 is implemented and what remains manual (iPhone Safari HEIC check, actual deployment).

---

## Self-review notes

- **Spec coverage:** 4.1 → Task 2; 4.2 → Task 3; 4.3 → Tasks 1, 4; 4.4 → Tasks 5–12 (sharp, columns, variants, deletion, HEIC, compressImage, seed, reprocess, srcset, lightbox, tests rewritten); 4.5 → Tasks 13–15 (healthz, engines/.nvmrc, prod guard, trust proxy, Cache-Control, Caddy headers, rclone backup, restore, domain + Cloudflare docs, guide re-ordering); acceptance list → Task 16.
- **Builder's open points (spec §6):** catalog tells the header via `Layout showCart`; `CartProvider` sits in `App.tsx`; `srcset` is a client helper; tests use real sharp on generated buffers; migration name is whatever `drizzle-kit` emits; floating button is black with a beige icon.
- **Type consistency:** `ProcessedImage` is produced in Task 7 and consumed by Tasks 8, 9, 10; `ImageLike` mirrors the four image columns; `addImage` accepts `...processed` directly because the field names match.
