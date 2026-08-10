# Catalog Images + Cart Polish Implementation Plan (Feature 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 9 seeded products default images (5 from the studio's `assets/`, 4 royalty-free), show product thumbnails in the cart, and polish the cart UI with clearer iconography.

**Architecture:** Images are committed static files under `client/public/products/<slug>.jpg`, attached to products by an idempotent boot backfill in the seed layer. The cart joins line items (by name) to `products.list` cover images at render time — storage stays `{name, quantity}`. UI uses existing shadcn/ui + lucide + Tailwind tokens only.

**Tech Stack:** React 19 + TS (ESM, strict), Vite, Tailwind v4, shadcn/ui, lucide-react, Drizzle/SQLite, Vitest.

## Global Constraints

- ESM, strict TS, extensionless local imports. Windows-safe. No git remote/push.
- **No change to cart storage** — still `{ name, quantity }` in `localStorage["eps_cart"]`.
- **No new colors** — reuse existing Tailwind tokens (`text-muted-foreground`, `bg-muted`, borders, radii) + shadcn components + lucide icons.
- **Leave the catalog "Editar" mode untouched** (it's removed in Feature 2).
- Product images are committed to the repo (work offline on every host). Every image file must be a real JPEG (verify with `file`).
- Path alias `@/` → `client/src/`. Commit after every task.

---

### Task 1: Product image files + CREDITS

**Files:**
- Create: `client/public/products/{mesa-urb,estrutura-gaia,estante-divisio,luminaria-lua,projetos-personalizados,luminaria-sol,mesa-cabeceira-loft,mesa-office-l,penteadeira-glam}.jpg`
- Create: `CREDITS.md`

**Interfaces:**
- Produces: 9 files at `/products/<slug>.jpg` (web paths) that later tasks reference.

- [ ] **Step 1: Copy the 5 studio assets to slug-named files**

```bash
cd "C:/Users/josephz/estudio-pedra-industrial"
mkdir -p client/public/products
cp assets/PckYccPW3NGa.jpg client/public/products/mesa-urb.jpg
cp assets/9qpkq1yzquXC.jpg client/public/products/estrutura-gaia.jpg
cp assets/m24KsfmQihY0.jpg client/public/products/estante-divisio.jpg
cp assets/SznrM7F3Mh5c.jpg client/public/products/luminaria-lua.jpg
cp assets/NYmUqhCqbqRa.jpg client/public/products/projetos-personalizados.jpg
```

- [ ] **Step 2: Download 4 royalty-free furniture photos**

Find license-safe (Unsplash/Pexels, free-to-use) realistic photos for these 4 slugs and save each to `client/public/products/<slug>.jpg`:
- `luminaria-sol.jpg` — a warm/gold pendant or table lamp
- `mesa-cabeceira-loft.jpg` — an industrial nightstand / bedside table
- `mesa-office-l.jpg` — an L-shaped or industrial office desk
- `penteadeira-glam.jpg` — a vanity / dressing table with mirror

Use WebSearch to find a specific photo page, get its **direct image URL**, and download with curl. Unsplash direct-image URLs look like `https://images.unsplash.com/photo-XXXXXXXX?w=1600&q=70&fm=jpg&fit=max`; Pexels like `https://images.pexels.com/photos/NNNN/pexels-photo-NNNN.jpeg?auto=compress&w=1600`. Example shape:
```bash
curl -sL "https://images.unsplash.com/photo-<id>?w=1600&q=70&fm=jpg&fit=max" -o client/public/products/luminaria-sol.jpg
```
Repeat for each. If a download yields HTML/an error page or a poor match, pick another photo. Record the source URL + license for each in `CREDITS.md` (Step 4).

- [ ] **Step 3: Verify all 9 are real JPEGs**

```bash
cd "C:/Users/josephz/estudio-pedra-industrial"
for s in mesa-urb estrutura-gaia estante-divisio luminaria-lua projetos-personalizados luminaria-sol mesa-cabeceira-loft mesa-office-l penteadeira-glam; do
  printf '%s: ' "$s"; file "client/public/products/$s.jpg"
done
```
Expected: every line reports `JPEG image data` (NOT `HTML document`). Fix any that aren't. Also sanity-check file sizes are reasonable (roughly 30 KB–800 KB each).

- [ ] **Step 4: Write `CREDITS.md`**

```markdown
# Image Credits

Product images under `client/public/products/`.

## Studio's own photos (from `assets/`)
- mesa-urb, estrutura-gaia, estante-divisio, luminaria-lua, projetos-personalizados

## Royalty-free (free-to-use license)
- luminaria-sol.jpg — <source URL> (Unsplash/Pexels license)
- mesa-cabeceira-loft.jpg — <source URL> (Unsplash/Pexels license)
- mesa-office-l.jpg — <source URL> (Unsplash/Pexels license)
- penteadeira-glam.jpg — <source URL> (Unsplash/Pexels license)
```
Fill in the actual source URLs you used.

- [ ] **Step 5: Commit**

```bash
git add client/public/products CREDITS.md
git commit -m "assets(catalog): default product images (studio + royalty-free) + credits"
```

---

### Task 2: Seed backfill — attach default images

**Files:**
- Modify: `server/db/seed.ts`
- Modify: `server/db/seed.test.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Consumes: `DB`, `products`, `productImages` (schema), `eq` (drizzle-orm).
- Produces: `DEFAULT_PRODUCT_IMAGES: Record<string,string>`, `ensureProductImages(db: DB): Promise<void>`.

- [ ] **Step 1: Add the failing idempotency test to `server/db/seed.test.ts`**

Append (it reuses the file's existing temp-DB helper `freshDb()`):
```ts
import * as repo from "./products.repo";
import { ensureProductImages } from "./seed";

test("ensureProductImages attaches one default image per product, idempotently", async () => {
  const db = freshDb();
  await seedIfEmpty(db);
  await ensureProductImages(db);

  const first = await repo.getBySlug(db, "mesa-urb");
  expect(first?.images).toHaveLength(1);
  expect(first!.images[0].url).toBe("/products/mesa-urb.jpg");

  // idempotent: running again adds no duplicates
  await ensureProductImages(db);
  const again = await repo.getBySlug(db, "mesa-urb");
  expect(again?.images).toHaveLength(1);

  // every seeded product got exactly one image
  const all = await repo.listAll(db);
  expect(all).toHaveLength(9);
  for (const p of all) expect(p.images).toHaveLength(1);
});

test("ensureProductImages does not touch a product that already has an image", async () => {
  const db = freshDb();
  await seedIfEmpty(db);
  const p = await repo.getBySlug(db, "mesa-urb");
  // pre-existing owner image
  await repo.listAll(db); // no-op to keep import used
  const { productImages } = await import("./schema");
  await db.insert(productImages).values({ productId: p!.id, url: "/uploads/owner.jpg", sortOrder: 0 });
  await ensureProductImages(db);
  const after = await repo.getBySlug(db, "mesa-urb");
  expect(after?.images).toHaveLength(1);
  expect(after!.images[0].url).toBe("/uploads/owner.jpg");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- seed`
Expected: FAIL (`ensureProductImages` is not exported).

- [ ] **Step 3: Implement in `server/db/seed.ts`**

Add these imports at the top (merge with existing imports):
```ts
import { eq } from "drizzle-orm";
import { products, productImages } from "./schema";
```
Add at the end of the file:
```ts
export const DEFAULT_PRODUCT_IMAGES: Record<string, string> = {
  "estrutura-gaia": "/products/estrutura-gaia.jpg",
  "estante-divisio": "/products/estante-divisio.jpg",
  "luminaria-lua": "/products/luminaria-lua.jpg",
  "luminaria-sol": "/products/luminaria-sol.jpg",
  "mesa-cabeceira-loft": "/products/mesa-cabeceira-loft.jpg",
  "mesa-office-l": "/products/mesa-office-l.jpg",
  "mesa-urb": "/products/mesa-urb.jpg",
  "penteadeira-glam": "/products/penteadeira-glam.jpg",
  "projetos-personalizados": "/products/projetos-personalizados.jpg",
};

/**
 * Attach a default image to any known product that currently has none.
 * Idempotent: only acts when a product has zero images, so it never
 * duplicates and never overrides owner-added photos.
 */
export async function ensureProductImages(db: DB): Promise<void> {
  for (const [slug, url] of Object.entries(DEFAULT_PRODUCT_IMAGES)) {
    const rows = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    const product = rows[0];
    if (!product) continue;

    const existing = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(productImages).values({
      productId: product.id,
      url,
      alt: product.name,
      sortOrder: 0,
    });
  }
}
```
(If `server/db/seed.ts` already imports `DB` as a type, keep that import; only add what's missing.)

- [ ] **Step 4: Wire it into boot — `server/index.ts`**

After the existing `await seedIfEmpty(db);` line, add:
```ts
import { ensureProductImages } from "./db/seed"; // add to the existing seed import if convenient
// ...
await ensureProductImages(db);
```
(Combine with the existing `import { seedIfEmpty } from "./db/seed";` into one import if you like.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- seed`
Expected: PASS (both new tests + existing seed test).

- [ ] **Step 6: Commit**

```bash
git add server/db/seed.ts server/db/seed.test.ts server/index.ts
git commit -m "feat(catalog): idempotent default-image backfill on boot"
```

---

### Task 3: Cart thumbnails + full polish (`CartWidget`)

**Files:**
- Modify (replace): `client/src/components/cart/CartWidget.tsx`

**Interfaces:**
- Consumes: `useCart` (`{ items, totalCount, setQuantity, removeItem, clear }`), `buildWhatsAppUrl`, `trpc.products.list`, shadcn `Sheet*`/`Button`/`Input`/`Separator`/`Badge`, lucide icons.

- [ ] **Step 1: Replace `client/src/components/cart/CartWidget.tsx` with:**

```tsx
import { useState } from "react";
import { ImageOff, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { useCart } from "./CartContext";
import { buildWhatsAppUrl } from "./whatsapp";

export function CartWidget() {
  const { items, totalCount, setQuantity, removeItem, clear } = useCart();
  const { data: products = [] } = trpc.products.list.useQuery();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const canCheckout = items.length > 0 && name.trim().length > 0;

  // Join cart lines (by name) to product cover image + category for display only.
  const infoByName = new Map(
    products.map((p) => [p.name, { url: p.images[0]?.url, category: p.category }])
  );

  const checkout = () => {
    if (!canCheckout) return;
    window.open(buildWhatsAppUrl(name, items), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Abrir carrinho"
        onClick={() => setOpen(true)}
      >
        <ShoppingBag className="h-5 w-5" />
        {totalCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
            {totalCount}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Seu carrinho</SheetTitle>
            <SheetDescription className="sr-only">
              Revise os itens do seu carrinho e finalize o pedido pelo WhatsApp.
            </SheetDescription>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ShoppingBag className="h-10 w-10 opacity-40" />
              <p className="font-medium">Seu carrinho está vazio</p>
              <p className="text-sm">Adicione produtos do catálogo.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {items.map((item) => {
                const info = infoByName.get(item.name);
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {info?.url ? (
                        <img src={info.url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {info?.category ? (
                        <p className="truncate text-xs text-muted-foreground">{info.category}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center rounded-md border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Diminuir quantidade"
                        onClick={() => setQuantity(item.name, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Aumentar quantidade"
                        onClick={() => setQuantity(item.name, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      aria-label="Remover item"
                      onClick={() => removeItem(item.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />
          <SheetFooter className="flex-col gap-3 sm:flex-col sm:space-x-0">
            {items.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingBag className="h-4 w-4" />
                <span>
                  {totalCount} {totalCount === 1 ? "item" : "itens"}
                </span>
              </div>
            )}
            <label htmlFor="cart-customer-name" className="sr-only">
              Seu nome
            </label>
            <Input
              id="cart-customer-name"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button className="w-full" disabled={!canCheckout} onClick={checkout}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Finalizar pedido no WhatsApp
            </Button>
            {items.length > 0 && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={clear}
              >
                Limpar carrinho
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors. (Browser behavior is verified in Task 4.)

- [ ] **Step 3: Commit**

```bash
git add client/src/components/cart/CartWidget.tsx
git commit -m "feat(cart): product thumbnails, summary row, WhatsApp icon, empty state"
```

---

### Task 4: Catalog card category chip + full verification

**Files:**
- Modify: `client/src/pages/Catalog.tsx`

**Interfaces:**
- Consumes: `Tag` (lucide), existing `product.category`.

- [ ] **Step 1: Read `client/src/pages/Catalog.tsx`**

Find each product card's text area (product name + description). You'll add a small category chip there. Do NOT touch the existing "Editar" controls or the `AddToCartButton`.

- [ ] **Step 2: Add the `Tag` import and the category chip**

Add to the lucide import in the file: `Tag`. Inside the product card, near the name/description, render the chip only when a category exists:
```tsx
{product.category ? (
  <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
    <Tag className="h-3 w-3" />
    {product.category}
  </span>
) : null}
```
Match the card's existing spacing/typography (adjust the `mt-*` to fit). Keep it subtle — this is a minimalist site.

- [ ] **Step 3: Type-check, test, build**

```bash
npm run check   # 0 errors
npm test        # all pass
npm run build   # succeeds
```

- [ ] **Step 4: Browser verification**

Start `PORT=3100 npm run dev` (log to a file; stop it after). At `http://localhost:3100`:
1. `/catalogo` — every product shows its image (cover from `/products/<slug>.jpg`) and a small category chip. No "Sem fotos".
2. Confirm a couple of images load: open `http://localhost:3100/products/mesa-urb.jpg` → a real image (200, image/jpeg).
3. Add 2–3 products → header badge counts up.
4. Open the cart drawer: each line shows a **thumbnail** + name + category; the `– qty +` pill and remove work; the "N itens" summary row shows; the checkout button has the chat icon; empty state (after "Limpar carrinho") shows the icon + text.
5. Enter a name → "Finalizar pedido no WhatsApp" opens the correct `wa.me/5531971803551?text=...` (decode and spot-check the PT-BR message).
6. Reload → cart persists.
7. Home (`/`) and Contact (`/contato`) still render fine; layout matches the site on desktop + a mobile width.
Stop the dev server (kill the PID on port 3100) afterward.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Catalog.tsx
git commit -m "feat(catalog): category chip on product cards"
```

---

## Self-review notes

- **Spec coverage:** default images for all 9 products (T1) + committed + credited; idempotent boot backfill so images show on existing & fresh DBs (T2); cart thumbnails via name→cover join with placeholder fallback, storage unchanged (T3); full cart polish — summary row, WhatsApp icon, empty state, stepper pill, dividers (T3); catalog category chip (T4); browser + unit verification (T2/T4). All covered.
- **Placeholder scan:** none — code and commands are concrete. (The royalty-free image URLs are intentionally chosen at implementation time from live search + verified; the `<source URL>` slots in CREDITS.md are filled with the actual URLs used.)
- **Type consistency:** `ensureProductImages(db)` signature matches its call in `server/index.ts`; `DEFAULT_PRODUCT_IMAGES` keys are the exact 9 seed slugs; `CartWidget` consumes the same `useCart` shape and `trpc.products.list` output (`images[0]?.url`, `category`) already defined by the backend.
- **Not-in-scope:** "Editar" mode, `/admin`, token rename — deferred to Feature 2 (spec Appendix).
