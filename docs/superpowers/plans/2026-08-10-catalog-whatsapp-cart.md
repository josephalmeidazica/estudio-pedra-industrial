# Catalog WhatsApp-Checkout Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frontend-only shopping cart to the catalog page that stores `{name, quantity}` in `localStorage` and checks out by opening a pre-filled Brazilian-Portuguese WhatsApp message to the studio.

**Architecture:** Pure, unit-tested core (`cartReducer` + `whatsapp` URL/message builders) wrapped by a React `CartProvider` (localStorage-backed, cross-tab synced). Presentational components (`CartWidget` = header button + `Sheet` drawer, `AddToCartButton` on each card) consume `useCart()`. Catalog page is wrapped in the provider and gets the widget + per-card add buttons. No server involvement.

**Tech Stack:** React 19 + TypeScript (ESM, strict), Vite, Tailwind v4, shadcn/ui (`Sheet`, `Button`, `Input`, `Badge`, `Separator`), lucide-react, Vitest.

## Global Constraints

- ESM, strict TypeScript, extensionless local imports. Windows-safe npm scripts. No git remote/push.
- Cart is **frontend-only**; the only persistence is `localStorage["eps_cart"]` holding `{ name: string, quantity: number }[]` — name + amount only.
- WhatsApp number is **`5531971803551`** (reused from the Contact page), centralized in `client/src/config.ts` as `WHATSAPP_NUMBER`.
- The checkout message is Brazilian Portuguese and must match the exact format in the spec (§4). Sign-off is the gender-neutral `Obrigado(a)!`.
- Reuse existing shadcn/ui components and Tailwind design tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, existing radii) + Montserrat — introduce no new colors.
- Path aliases: `@/` → `client/src/`.
- Commit after every task.

---

### Task 1: Pure cart reducer + enable client tests

**Files:**
- Modify: `vitest.config.ts` (add `client/src/**/*.test.ts` to `include`)
- Create: `client/src/components/cart/cartReducer.ts`
- Test: `client/src/components/cart/cartReducer.test.ts`

**Interfaces:**
- Produces: type `CartItem = { name: string; quantity: number }`; type `CartAction`; `cartReducer(items, action): CartItem[]`; `totalCount(items): number`.

- [ ] **Step 1: Extend `vitest.config.ts` include**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "client/src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write the failing test `client/src/components/cart/cartReducer.test.ts`**

```ts
import { expect, test } from "vitest";
import { cartReducer, totalCount, type CartItem } from "./cartReducer";

test("add inserts a new item then increments an existing one", () => {
  let s: CartItem[] = [];
  s = cartReducer(s, { type: "add", name: "Mesa Urb" });
  s = cartReducer(s, { type: "add", name: "Mesa Urb" });
  s = cartReducer(s, { type: "add", name: "Luminária Lua" });
  expect(s).toEqual([
    { name: "Mesa Urb", quantity: 2 },
    { name: "Luminária Lua", quantity: 1 },
  ]);
});

test("setQuantity updates; quantity <= 0 removes the line", () => {
  let s: CartItem[] = [{ name: "A", quantity: 1 }];
  s = cartReducer(s, { type: "setQuantity", name: "A", quantity: 5 });
  expect(s).toEqual([{ name: "A", quantity: 5 }]);
  s = cartReducer(s, { type: "setQuantity", name: "A", quantity: 0 });
  expect(s).toEqual([]);
});

test("remove, clear, and replace", () => {
  const s: CartItem[] = [{ name: "A", quantity: 1 }, { name: "B", quantity: 2 }];
  expect(cartReducer(s, { type: "remove", name: "A" })).toEqual([{ name: "B", quantity: 2 }]);
  expect(cartReducer(s, { type: "clear" })).toEqual([]);
  expect(cartReducer(s, { type: "replace", items: [{ name: "C", quantity: 9 }] })).toEqual([
    { name: "C", quantity: 9 },
  ]);
});

test("totalCount sums quantities", () => {
  expect(totalCount([{ name: "A", quantity: 2 }, { name: "B", quantity: 3 }])).toBe(5);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- cartReducer`
Expected: FAIL ("Cannot find module './cartReducer'"). (If it reports "No test files found", the Step 1 include change is missing.)

- [ ] **Step 4: Write `client/src/components/cart/cartReducer.ts`**

```ts
export type CartItem = { name: string; quantity: number };

export type CartAction =
  | { type: "add"; name: string }
  | { type: "setQuantity"; name: string; quantity: number }
  | { type: "remove"; name: string }
  | { type: "clear" }
  | { type: "replace"; items: CartItem[] };

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const exists = items.some((i) => i.name === action.name);
      if (exists) {
        return items.map((i) =>
          i.name === action.name ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { name: action.name, quantity: 1 }];
    }
    case "setQuantity": {
      if (action.quantity <= 0) return items.filter((i) => i.name !== action.name);
      return items.map((i) =>
        i.name === action.name ? { ...i, quantity: action.quantity } : i
      );
    }
    case "remove":
      return items.filter((i) => i.name !== action.name);
    case "clear":
      return [];
    case "replace":
      return action.items;
    default:
      return items;
  }
}

export function totalCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- cartReducer`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts client/src/components/cart/cartReducer.ts client/src/components/cart/cartReducer.test.ts
git commit -m "feat(cart): pure cart reducer + enable client-side vitest"
```

---

### Task 2: WhatsApp message + URL builders

**Files:**
- Create: `client/src/config.ts`
- Create: `client/src/components/cart/whatsapp.ts`
- Test: `client/src/components/cart/whatsapp.test.ts`

**Interfaces:**
- Consumes: `CartItem`, `totalCount` from `./cartReducer`.
- Produces: `WHATSAPP_NUMBER` (from `@/config`); `buildWhatsAppMessage(name, items): string`; `buildWhatsAppUrl(name, items): string`.

- [ ] **Step 1: Write `client/src/config.ts`**

```ts
/** Studio WhatsApp number: country + area + number, digits only. Reused from the Contact page. */
export const WHATSAPP_NUMBER = "5531971803551";
```

- [ ] **Step 2: Write the failing test `client/src/components/cart/whatsapp.test.ts`**

```ts
import { expect, test } from "vitest";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "./whatsapp";
import type { CartItem } from "./cartReducer";

const items: CartItem[] = [
  { name: "Mesa Urb", quantity: 2 },
  { name: "Luminária Lua", quantity: 1 },
];

const EXPECTED = `Olá! Meu nome é Maria e gostaria de solicitar um orçamento dos seguintes produtos do catálogo:

• Mesa Urb — Qtd: 2
• Luminária Lua — Qtd: 1

Total de itens: 3

Fico no aguardo. Obrigado(a)!`;

test("message matches the PT-BR format exactly", () => {
  expect(buildWhatsAppMessage("Maria", items)).toBe(EXPECTED);
});

test("customer name is trimmed", () => {
  expect(buildWhatsAppMessage("  Ana  ", items)).toContain("Meu nome é Ana e gostaria");
});

test("url targets the studio number with encoded text", () => {
  const url = buildWhatsAppUrl("Maria", items);
  expect(url.startsWith("https://wa.me/5531971803551?text=")).toBe(true);
  expect(url).toContain("%0A"); // newlines are encoded
  expect(decodeURIComponent(url.split("text=")[1])).toBe(EXPECTED);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- whatsapp`
Expected: FAIL ("Cannot find module './whatsapp'").

- [ ] **Step 4: Write `client/src/components/cart/whatsapp.ts`**

```ts
import { WHATSAPP_NUMBER } from "@/config";
import { totalCount, type CartItem } from "./cartReducer";

export function buildWhatsAppMessage(customerName: string, items: CartItem[]): string {
  const name = customerName.trim();
  const lines = items.map((i) => `• ${i.name} — Qtd: ${i.quantity}`).join("\n");
  return (
    `Olá! Meu nome é ${name} e gostaria de solicitar um orçamento dos seguintes produtos do catálogo:\n\n` +
    `${lines}\n\n` +
    `Total de itens: ${totalCount(items)}\n\n` +
    `Fico no aguardo. Obrigado(a)!`
  );
}

export function buildWhatsAppUrl(customerName: string, items: CartItem[]): string {
  const text = encodeURIComponent(buildWhatsAppMessage(customerName, items));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
```

Note: the `•` (U+2022) and `—` (em dash, U+2014) in `whatsapp.ts` must be byte-identical to those in the test's `EXPECTED` string — copy both from this plan verbatim.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- whatsapp`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add client/src/config.ts client/src/components/cart/whatsapp.ts client/src/components/cart/whatsapp.test.ts
git commit -m "feat(cart): PT-BR WhatsApp message + wa.me URL builders"
```

---

### Task 3: Cart context (provider + useCart, localStorage)

**Files:**
- Create: `client/src/components/cart/CartContext.tsx`

**Interfaces:**
- Consumes: `cartReducer`, `totalCount`, `CartItem` from `./cartReducer`.
- Produces: `CartProvider` component; `useCart()` returning `{ items, totalCount, addItem(name), setQuantity(name, qty), removeItem(name), clear() }`.

- [ ] **Step 1: Write `client/src/components/cart/CartContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { cartReducer, totalCount, type CartItem } from "./cartReducer";

const STORAGE_KEY = "eps_cart";

function loadInitial(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (i) =>
          i &&
          typeof i.name === "string" &&
          typeof i.quantity === "number" &&
          i.quantity > 0
      );
    }
  } catch {
    /* corrupt value -> empty cart */
  }
  return [];
}

type CartContextValue = {
  items: CartItem[];
  totalCount: number;
  addItem: (name: string) => void;
  setQuantity: (name: string, quantity: number) => void;
  removeItem: (name: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadInitial);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [items]);

  // Sync when another tab changes the cart.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: "replace", items: loadInitial() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value: CartContextValue = {
    items,
    totalCount: totalCount(items),
    addItem: (name) => dispatch({ type: "add", name }),
    setQuantity: (name, quantity) => dispatch({ type: "setQuantity", name, quantity }),
    removeItem: (name) => dispatch({ type: "remove", name }),
    clear: () => dispatch({ type: "clear" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors. (No unit test — this is React/localStorage glue over the already-tested reducer; behavior is verified in the browser in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add client/src/components/cart/CartContext.tsx
git commit -m "feat(cart): CartProvider + useCart with localStorage persistence"
```

---

### Task 4: Cart UI — widget (button + drawer) and add-to-cart button

**Files:**
- Create: `client/src/components/cart/CartWidget.tsx`
- Create: `client/src/components/cart/AddToCartButton.tsx`

**Interfaces:**
- Consumes: `useCart` from `./CartContext`; `buildWhatsAppUrl` from `./whatsapp`; shadcn `Sheet`/`Button`/`Input`/`Badge`/`Separator`; lucide icons.
- Produces: `CartWidget` (self-contained header control: badge button + drawer + open state); `AddToCartButton({ name })`.

- [ ] **Step 1: Write `client/src/components/cart/CartWidget.tsx`**

```tsx
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "./CartContext";
import { buildWhatsAppUrl } from "./whatsapp";

export function CartWidget() {
  const { items, totalCount, setQuantity, removeItem, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const canCheckout = items.length > 0 && name.trim().length > 0;

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
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Seu carrinho está vazio.
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto py-4">
              {items.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <span className="flex-1 text-sm">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Diminuir quantidade"
                      onClick={() => setQuantity(item.name, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Aumentar quantidade"
                      onClick={() => setQuantity(item.name, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
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
                </div>
              ))}
            </div>
          )}

          <Separator />
          <SheetFooter className="flex-col gap-3 sm:flex-col sm:space-x-0">
            <Input
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button className="w-full" disabled={!canCheckout} onClick={checkout}>
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

- [ ] **Step 2: Write `client/src/components/cart/AddToCartButton.tsx`**

```tsx
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./CartContext";

export function AddToCartButton({ name }: { name: string }) {
  const { addItem } = useCart();
  return (
    <Button variant="outline" className="w-full" onClick={() => addItem(name)}>
      <Plus className="mr-2 h-4 w-4" />
      Adicionar ao carrinho
    </Button>
  );
}
```

- [ ] **Step 3: Verify component APIs + type-check**

Confirm the imports exist (read the files if unsure): `client/src/components/ui/sheet.tsx` exports `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetFooter`; `button.tsx` supports `variant="ghost|outline"` and `size="icon"`; `badge.tsx`, `input.tsx`, `separator.tsx` exist. Then:
Run: `npm run check`
Expected: 0 errors. If a shadcn export name differs (e.g. `SheetFooter` absent), adapt to the actual exports in `sheet.tsx` rather than inventing props.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/cart/CartWidget.tsx client/src/components/cart/AddToCartButton.tsx
git commit -m "feat(cart): cart widget (button + drawer) and add-to-cart button"
```

---

### Task 5: Integrate into the catalog page + verify in browser

**Files:**
- Modify: `client/src/pages/Catalog.tsx`

**Interfaces:**
- Consumes: `CartProvider` from `../components/cart/CartContext`; `CartWidget`, `AddToCartButton` from `../components/cart/*`.

- [ ] **Step 1: Read `client/src/pages/Catalog.tsx`**

Identify: (a) the top-level returned JSX element (to wrap in `CartProvider`); (b) the header area where the "Editar" toggle lives (to place `CartWidget` beside it); (c) each product card's action area (where "Adicionar Fotos"/description render) to add `AddToCartButton`.

- [ ] **Step 2: Wrap the page in `CartProvider` and add imports**

Add imports:
```tsx
import { CartProvider } from "@/components/cart/CartContext";
import { CartWidget } from "@/components/cart/CartWidget";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
```
Wrap the component's entire returned tree:
```tsx
return (
  <CartProvider>
    {/* ...existing catalog JSX... */}
  </CartProvider>
);
```
Do NOT call `useCart()` in `Catalog`'s own body — only the child components (`CartWidget`, `AddToCartButton`) call it, and they render inside the provider.

- [ ] **Step 3: Place the cart widget in the header**

Next to the existing "Editar" / "Sair do modo edição" control, render `<CartWidget />` so the cart icon+badge sits in the catalog header.

- [ ] **Step 4: Add the add-to-cart button to each product card**

Inside the product card, near the product name/description (and independent of `editMode` — customers must see it whether or not an admin token is present), render:
```tsx
<AddToCartButton name={product.name} />
```
Match the card's spacing/typography; it sits alongside the existing "Adicionar Fotos" (which remains edit-mode-only).

- [ ] **Step 5: Type-check + full suite + build**

```bash
npm run check   # 0 errors
npm test        # all pass (server + client cart tests)
npm run build   # succeeds
```

- [ ] **Step 6: Browser verification**

Start `PORT=3100 npm run dev` (log to a file; stop it after). At `http://localhost:3100/catalogo`:
1. Each product card shows "Adicionar ao carrinho" (also as a public visitor with no token).
2. Adding items increments the header badge; the badge hides at 0.
3. Open the drawer: items listed; `+`/`-` steppers change quantity; `-` to 0 removes; "Remover" removes; "Limpar carrinho" empties it.
4. Checkout is disabled until a name is entered and the cart is non-empty.
5. With name "Maria" and a couple of items, "Finalizar pedido no WhatsApp" opens `https://wa.me/5531971803551?text=...`; URL-decode the `text` param and confirm it matches the spec's PT-BR message.
6. Reload the page → cart persists (localStorage).
7. Layout matches the site (Sheet, buttons, type) on desktop and a mobile width; Home/Contact unaffected.
Stop the dev server (kill the PID on port 3100) afterward.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/Catalog.tsx
git commit -m "feat(cart): integrate cart into catalog (provider, widget, add-to-cart)"
```

---

## Self-review notes

- **Spec coverage:** localStorage `{name,quantity}` model (T1); WHATSAPP_NUMBER reuse + PT-BR message + wa.me URL with encoding, matching the worked example (T2); provider/persistence/cross-tab (T3); Sheet drawer with steppers/remove/clear + required-name checkout + header badge + add-to-cart (T4/T5); vitest client-test include (T1); browser verification incl. persistence + exact message (T5). All covered.
- **Placeholder scan:** none — every step has concrete code or concrete commands.
- **Type consistency:** `CartItem`/`cartReducer`/`totalCount` defined in T1 and consumed unchanged by `whatsapp.ts` (T2) and `CartContext` (T3); `useCart()`'s returned shape in T3 matches exactly what `CartWidget`/`AddToCartButton` consume in T4; `buildWhatsAppUrl(name, items)` signature consistent T2↔T4.
- **Message literals:** the `•` and `—` characters are identical between `whatsapp.ts` and `whatsapp.test.ts` (both copied from this plan), so the exact-match `toBe` holds.
- **Provider boundary:** `Catalog` must not call `useCart()` in its own body (only child components do) — called out explicitly in T5 Step 2 to avoid a "must be used within a CartProvider" runtime error.
