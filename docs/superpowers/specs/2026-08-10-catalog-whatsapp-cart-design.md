# Catalog WhatsApp-checkout cart — Design

**Date:** 2026-08-10
**Project:** Estúdio Pedra Industrial (local site)
**Status:** Approved design, pending spec review

## 1. Overview

Add a simple shopping cart to the catalog page. It is **frontend-only**: cart
state lives entirely in the browser's `localStorage`. Customers add products,
adjust quantities, enter their name, and "check out" — which opens a WhatsApp
chat to the studio pre-filled with a Brazilian-Portuguese message listing the
requested products and quantities. There is no payment, no order persistence,
and no server involvement.

### Goals
- Add products from the catalog to a cart (name + quantity only).
- Persist the cart in `localStorage` across reloads (per browser).
- A cart UI consistent with the site (shadcn/ui `Sheet`, existing tokens, Montserrat).
- Checkout collects the customer's name and opens a `wa.me` link with a
  formatted PT-BR message.

### Non-goals (YAGNI)
- No prices in the cart or message (products are bespoke / "sob consulta").
- No server, database, or order records.
- No cross-device/account cart (per-browser by design).
- No change to the existing product/image backend.

## 2. Cart data model

Stored under a single `localStorage` key. **Only name + amount**, as requested:

```jsonc
// localStorage key: "eps_cart"
[
  { "name": "Mesa Urb", "quantity": 2 },
  { "name": "Luminária Lua", "quantity": 1 }
]
```

- Items are keyed by product **name** (product names in the catalog are unique).
- "Adicionar" adds the product (quantity 1) or increments if already present.
- Quantity steppers adjust up/down; reaching 0 removes the line.
- Malformed/absent stored JSON → treated as an empty cart.

## 3. WhatsApp number (single source)

The number already used on the Contact and Home pages is `5531971803551`
(displayed as `(31) 97180-3551`, via `https://wa.me/5531971803551`).

Introduce `client/src/config.ts`:
```ts
/** Studio WhatsApp number (country code + area code + number, digits only). */
export const WHATSAPP_NUMBER = "5531971803551";
```
The cart's checkout link uses this constant. (The existing Home/Contact
hardcoded occurrences are left as-is for this change; DRYing them onto the
constant is an optional later cleanup, out of scope here.)

## 4. WhatsApp message format (Brazilian Portuguese)

Built by `buildWhatsAppMessage(customerName, items)`:

```
Olá! Meu nome é {nome} e gostaria de solicitar um orçamento dos seguintes produtos do catálogo:

• {Produto A} — Qtd: {n}
• {Produto B} — Qtd: {n}

Total de itens: {soma das quantidades}

Fico no aguardo. Obrigado(a)!
```

### Worked example
Customer **Maria**, cart = Mesa Urb ×2, Luminária Lua ×1 →

```
Olá! Meu nome é Maria e gostaria de solicitar um orçamento dos seguintes produtos do catálogo:

• Mesa Urb — Qtd: 2
• Luminária Lua — Qtd: 1

Total de itens: 3

Fico no aguardo. Obrigado(a)!
```

The final CTA is `https://wa.me/5531971803551?text=<encodeURIComponent(message)>`
(newlines become `%0A`, accents percent-encoded), e.g.:
`https://wa.me/5531971803551?text=Ol%C3%A1!%20Meu%20nome%20%C3%A9%20Maria%0A...`

Notes: `"Obrigado(a)!"` is used (gender-neutral, since the customer's gender
is unknown). The customer name is trimmed; the checkout button is disabled
when the name is blank or the cart is empty.

## 5. Components

New, under `client/src/components/cart/`:

- **`cartReducer.ts`** — pure, DOM-free: the `CartItem` type and a
  `cartReducer(items, action)` implementing add/increment, setQuantity
  (0 ⇒ removal), remove, clear, plus a `totalCount(items)` helper. Kept
  separate from the React file so it (and `whatsapp.ts`) can be unit-tested
  without a DOM.
- **`CartContext.tsx`** — a `CartProvider` + `useCart()` hook exposing:
  `items`, `totalCount`, `addItem(name)`, `setQuantity(name, qty)`,
  `removeItem(name)`, `clear()`. Wraps `cartReducer`, reads/writes
  `localStorage["eps_cart"]`, and syncs across tabs via the `storage` event.
- **`CartButton.tsx`** — a cart icon (lucide `ShoppingBag`) with an item-count
  `Badge`; placed in the catalog header next to the "Editar" toggle. Opens the
  drawer. Badge hidden when the cart is empty.
- **`CartSheet.tsx`** — right-side shadcn `Sheet`:
  - Empty state ("Seu carrinho está vazio").
  - Line items: product name + `-`/count/`+` steppers + remove.
  - A required name `Input` ("Seu nome").
  - Primary button **"Finalizar pedido no WhatsApp"** (disabled if empty cart
    or blank name) and a subtle **"Limpar carrinho"** action.
- **`whatsapp.ts`** — pure helpers:
  - `buildWhatsAppMessage(name: string, items: CartItem[]): string`
  - `buildWhatsAppUrl(name: string, items: CartItem[]): string`
    (`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`)

### Integration into `Catalog.tsx`
- Wrap the catalog page content in `<CartProvider>`.
- Render `<CartButton />` in the header (beside "Editar").
- Add an **"Adicionar ao carrinho"** button to each product card, calling
  `addItem(product.name)`. Styled to match existing card buttons; it coexists
  with the edit-mode "Adicionar Fotos" control (which only shows in edit mode).
- Render `<CartSheet />` once (open state controlled by `CartButton`).

## 6. Checkout flow

1. Customer adds products → badge updates.
2. Opens the drawer, adjusts quantities, types their name.
3. Taps "Finalizar pedido no WhatsApp" → `window.open(buildWhatsAppUrl(...), "_blank", "noopener,noreferrer")`.
4. The cart is **kept** (not auto-cleared) so nothing is lost if they return;
   "Limpar carrinho" clears it manually.

## 7. Design consistency

- Uses the site's existing shadcn/ui components (`Sheet`, `Button`, `Input`,
  `Badge`, `Separator`) and Tailwind design tokens (`bg-background`,
  `text-foreground`, `text-muted-foreground`, existing radii), Montserrat type.
- Button variants and card styling mirror the current catalog (same weights,
  rounded corners, hover states). No new colors introduced.

## 8. Edge cases & validation

- Empty cart: checkout + "Limpar" disabled/hidden appropriately; drawer shows
  empty state.
- Blank/whitespace name: checkout disabled.
- Quantity never below 1 via steppers; explicit remove deletes the line.
- Product names with accents/punctuation: safe via `encodeURIComponent`.
- Corrupt `localStorage` value: caught, treated as empty cart.
- Very long carts: the Sheet body scrolls (`overflow-y-auto`).

## 9. Testing

- **Unit (vitest, pure — no DOM):** `vitest.config.ts` currently includes only
  `server/**/*.test.ts`; extend `include` to also match `client/src/**/*.test.ts`
  so the cart test runs. Tests import only the pure modules (`cartReducer.ts`,
  `whatsapp.ts`) — no React/DOM.
  - `buildWhatsAppMessage` produces the exact PT-BR format for a sample cart
    (matches the worked example), and `buildWhatsAppUrl` targets
    `wa.me/5531971803551` with a correctly `encodeURIComponent`-encoded `text`.
  - `cartReducer`: add (new + increment existing), setQuantity (incl. 0 →
    removal), removeItem, clear, and `totalCount` summation.
- **Browser (manual, as in prior work):** add items from cards → badge count;
  open drawer → steppers/remove work; name required; checkout opens WhatsApp
  with the pre-filled message; reload preserves the cart; "Limpar" empties it;
  layout matches the site on desktop + mobile widths.

## 10. Files

```
client/src/config.ts                         # WHATSAPP_NUMBER (new)
client/src/components/cart/
  cartReducer.ts                             # pure: CartItem type, cartReducer, totalCount
  CartContext.tsx                            # provider + useCart (wraps cartReducer + localStorage)
  CartButton.tsx                             # header icon + badge
  CartSheet.tsx                              # drawer UI + checkout
  whatsapp.ts                                # buildWhatsAppMessage / buildWhatsAppUrl
  cart.test.ts                               # unit tests (cartReducer + whatsapp)
client/src/pages/Catalog.tsx                 # integrate provider, button, add-to-cart, sheet (modified)
vitest.config.ts                             # extend include to client/src/**/*.test.ts (modified)
```
