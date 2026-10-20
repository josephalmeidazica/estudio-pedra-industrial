# Batch 2 — The quote flow: cart form, custom piece, featured home, detail pages, Ambientes — Design

**Date:** 2026-10-20
**Project:** Estúdio Pedra Industrial
**Status:** Builder-checked; awaiting owner approval
**Builds on:** Batch 1 (`docs/superpowers/specs/2026-10-19-batch1-mobile-first-deploy-ready-design.md`), merged via PR #6.

## 1. Intent and why

The owner described the ideal visit: a customer arrives from Instagram or
Google, browses the catalog, adds the pieces they like to the cart, gives a
little information, and lands in WhatsApp with a message the owner can act
on immediately. Batch 2 makes that path the backbone of the site.

Today the pieces are two taps from the landing page, the cart asks only for
a name, there is no way to ask for a piece that is not in the catalog
except free text in WhatsApp, pieces have no page of their own (nothing for
Google to rank, nothing precise to link to), and the site shows no evidence
of delivered work.

## 2. Goals, non-goals, anti-goals

### Goals
1. The first screen on a phone shows furniture: the home page opens with a
   short hero and a grid of featured pieces.
2. The cart checkout asks for **name** and **neighbourhood** (bairro) and
   writes both into the WhatsApp message together with the chosen pieces.
3. A catalog entry **"Móvel personalizado"** lets a customer ask for a
   piece that does not exist yet; adding it asks for a short description
   that travels into the message.
4. Every piece has its own page at `/catalogo/<slug>`: gallery, details,
   quote and cart actions, related pieces. The one-tap quote message links
   to that page instead of the catalog.
5. The catalog grid can be filtered by category with chips.
6. The owner can publish photos of pieces installed in clients' homes
   (**Ambientes**) from the admin, and the home page shows them.
7. Cart lines are keyed by product id, so renaming a product in the admin
   never strands a customer's cart.

### Non-goals (later batches or decided out)
- Analytics. Decided out for now; a discovery note is kept at
  `docs/discovery/analytics.md` (section 4.8).
- Per-page meta tags, Open Graph previews, sitemap, JSON-LD (Batch 3). The
  detail pages created here are what Batch 3 will decorate.
- Admin redesign, drag-and-drop, multi-upload UX, cookie login (Batch 4).
  The Ambientes tab reuses the existing admin components as they are.
- Prices, payments, accounts, delivery addresses.

### Anti-goals
- Changing the brand look: beige `#d2b389` + black, Montserrat, spacious
  minimal layout, existing tokens and shadcn components. New screens
  (detail page, chips, Ambientes strip, cart form) are composed from what
  the catalog already uses.
- Asking the customer for more than name + bairro (+ the custom-piece
  description). The owner wants the first reply to be theirs.
- Making the cart mandatory. The Batch 1 one-tap button stays on every card
  and on the detail page.

## 3. Constraints

- Stack unchanged: React 19, Vite 7, Tailwind v4, shadcn/ui, wouter, tRPC
  11, Express 4, Drizzle + better-sqlite3, vitest, sharp pipeline from
  Batch 1. Node 22.
- Visitor-facing copy in Brazilian Portuguese.
- Paths from `process.cwd()`; images through `processImage` /
  `processUpload`; `deleteImageByUrl` removes variants.
- The 63 existing tests keep passing; new pure logic (message builder, cart
  reducer, filters, slug routing helpers, repos) gets unit tests at the same
  level. UI is verified in the browser at 375 px and desktop.
- The site is not deployed yet, so no data migration for a production
  database is needed; dev databases are handled by idempotent "ensure"
  steps at boot, like the existing seed.

## 4. Decisions

**(owner)** = decided in conversation. **(my call)** = default chosen by
the author; can be changed, not agreed with the owner.

### 4.1 Cart: id-keyed lines, name + bairro, message **(owner: fields; rest my call)**

- Cart line shape becomes
  `{ lineId: string; productId: number; name: string; quantity: number; note?: string }`.
  `lineId` is a random id generated when the line is created and is the
  key for `setQuantity`, `remove` and the note edit. `add` for a normal
  product merges into the existing line with the same `productId`
  (incrementing quantity); `add` for the custom piece always creates a new
  line, so two different requests are two lines even with identical text.
  `name` is a display snapshot; `note` is only used by the custom piece (4.2).
- At render and at checkout, lines are joined to `products.list` by
  `productId` for the live name, slug and thumbnail. A line whose product is
  missing from that list (deleted, or unpublished since it was carted) is
  shown in the sheet greyed out as **"Produto indisponível"** with only a
  remove action; it is not counted in the badge and not written into the
  message. **(my call)**
- `localStorage` key changes to `eps_cart_v2`. The old `eps_cart` value is
  ignored and removed on first load (the site is not public yet; no one has
  a cart to lose).
- Checkout form fields, in order: **Seu nome** (required), **Seu bairro**
  (required, placeholder "Ex.: Savassi, Belo Horizonte"). Both persist in
  `localStorage` (`eps_customer`) so a returning visitor does not retype.
- Message format (exact):

  ```
  Olá! Meu nome é <Nome> e moro no bairro <Bairro>. Gostaria de um orçamento dos seguintes produtos do catálogo:

  • <Nome do produto> — Qtd: <n>
    <origin>/catalogo/<slug>
  • Móvel personalizado — Qtd: 1
    Descrição: <texto do cliente>

  Total de itens: <soma>

  Fico no aguardo. Obrigado(a)!
  ```

  Each catalog item gets its detail-page URL on the line below it; the
  custom piece gets its description instead. The current message builder
  and its tests are rewritten for this format.
- The cart sheet shows the custom piece's description under its name, and
  a pencil action to edit it (reuses the same prompt as 4.2).

### 4.2 "Móvel personalizado" **(owner)**

- A product with a new boolean column `isCustom` (default false). The admin
  shows a **"Personalizado"** switch on the product dialog; it is exclusive:
  turning it on for one product turns it off for any other (server-side, in
  the update/create repo call), so at most one custom product exists. The
  owner may turn it off or delete the product; the site then simply has no
  custom piece, and boot never re-creates one. **(my call)**
- Seed: the entry `projetos-personalizados` is replaced by
  `slug: "movel-personalizado"`, `name: "Móvel personalizado"`,
  `category: "Personalizados"`, `description: "Não achou o que procura? Descreva o móvel dos seus sonhos e fazemos sob medida."`,
  `isCustom: true`. Its default photo stays `projetos-personalizados.jpg`
  (renamed to `movel-personalizado.jpg` in `client/public/products`,
  `CREDITS.md` updated).
- Boot step `ensureCustomProduct(db)`, idempotent, only for databases
  seeded before this change: if no product has `isCustom` **and** a product
  with slug `projetos-personalizados` exists, update that row to the new
  slug, name and description and set `isCustom`. In every other case it
  does nothing (it never inserts, so an owner who removed the custom piece
  is respected and no slug collision can occur). **(my call)**
- Behaviour: on a custom product, the card's and detail page's primary
  action reads **"Descrever meu móvel"**; the cart action opens a small
  dialog (shadcn `Dialog`) with a textarea, label **"Descreva o móvel que
  você quer"**, placeholder "Ex.: mesa de jantar 2 m, tampo em MDF
  amadeirado, pés em aço preto", required, max 500 characters, button
  **"Adicionar ao carrinho"**. Confirming adds one line with `note`.
  Quantity for the custom line is fixed at 1 (the stepper is hidden; a
  second distinct request is a second line with a different note).
- The one-tap button on a custom product opens the same dialog and then
  goes straight to WhatsApp with a message of the 4.1 format containing only
  that line (name and bairro are asked in the same dialog in that case).

### 4.3 Home page: featured grid **(owner)**

- Section order: compact hero (headline and the two existing buttons; the
  logo stays to the right of the headline on desktop and hidden on mobile,
  exactly as today) → **"Destaques"** grid → the existing four-item strip
  (Artesanal / Sustentável / Entrega / Garantia, unchanged, moved from
  under the hero to under the grid) → Ambientes strip (4.6) → Serviços →
  Sobre → Missão/Visão/Valores → CTA → footer. Hero vertical padding
  shrinks from `py-32 md:py-48` to `py-16 md:py-24` so the grid starts
  within the first screen on a phone. **(my call on the strip's position)**
- Grid content: published products with `featured = true`, in catalog
  order, at most 6. If fewer than 3 are featured, pad with the first
  published non-featured products until 6. Cards are the same component as
  the catalog cards (extracted to `ProductCard`), so the quote and cart
  actions are identical.
- A "Ver portfólio completo" link under the grid goes to `/catalogo`.

### 4.4 Product detail pages **(owner wants pages; layout my call)**

- Route `/catalogo/:slug`. Data from `products.getBySlug`, which today
  returns unpublished products to anyone; the public procedure is changed
  to return `null` for unpublished ones (server-side, so drafts stop
  leaking), and the page shows NotFound on `null`.
- The catalog grid card's image area and name link to the detail page; the
  catalog no longer opens a lightbox (the detail page's gallery takes that
  role). The buttons on the card keep working in place. **(my call)**
- Layout (mobile first, single column; two columns from `lg`): gallery on
  top/left (main image as `ResponsiveImage` with `sizes="(min-width:
  1024px) 50vw, 100vw"`, thumbnails below, tap opens the existing lightbox),
  then name (`h1`), category chip, description, a details list showing
  **Materiais** and **Dimensões** when non-empty, the primary quote button,
  the cart button, a "← Voltar ao portfólio" link, and **"Veja também"**:
  up to 3 other published products in the same category (fallback: next
  products in catalog order).
- Document title is set client-side to `<Nome> — Estúdio Pedra Industrial`
  on the detail page (Batch 3 does the server-side meta work).
- The one-tap quote message (Batch 1, `productQuoteMessage`) now receives
  `origin + "/catalogo/" + slug`.
- NotFound page: copy becomes Portuguese ("Página não encontrada") and it
  uses the shared `Layout`, since detail pages make 404s reachable from
  Google. Styling follows the brand tokens instead of the current
  blue/slate scaffold.

### 4.5 Category chips **(my call)**

- Above the catalog grid: a horizontal, scrollable row of chips: **Todos**
  plus each distinct non-empty category among published products, in order
  of first appearance. Selecting filters client-side; the selection is
  mirrored in the URL as `?categoria=<slug of the category>` so a filtered
  view can be shared and survives reload. Chips use the existing
  outline/filled button styles; the active chip is filled black.
- The custom product (4.2) is always shown regardless of filter, pinned as
  the last card, so the "ask for something else" path never disappears.

### 4.6 Ambientes (installed-piece photos) **(owner)**

- New table `gallery_images`: `id`, `url`, `width`, `height`, `variants`,
  `caption` (text, default ""), `productId` (nullable FK, `onDelete: set
  null`), `sortOrder`, `createdAt`. New Drizzle migration.
- tRPC router `gallery`: `list` (public, ordered), `add` (admin, data URL
  through `processUpload`, optional `caption`, optional `productId`),
  `update` (admin: caption, productId), `delete` (admin, removes variants),
  `reorder` (admin).
- Admin: a second tab **"Ambientes"** next to **"Produtos"** (shadcn
  `Tabs`). It reuses `ImageManager` generalised to take a small adapter
  (`list/add/delete/reorder` mutations) instead of a `productId`, plus an
  inline caption field and a product select ("Peça relacionada", optional)
  under each tile. No cover concept.
- Home strip **"Na casa dos nossos clientes"**: horizontally scrollable
  row of 4:5 tiles (`thumbUrl`/`srcset` from the variants), caption below
  when present; tap opens the lightbox (the same component as the catalog,
  extracted to `ImageLightbox`); when a tile has a `productId`, the lightbox
  shows a "Ver a peça" link to its detail page. Hidden entirely when there
  are no photos.

### 4.7 Shared pieces extracted **(my call)**

- `ProductCard` (image area, badge, name, description, category, actions)
  used by the catalog grid and the home featured grid.
- `ImageLightbox` (today's catalog modal, extracted) used by the detail
  page and Ambientes; it gets `aria-label`s on its buttons and the arrows
  move inside the image bounds on phones (today they are translated
  off-screen at 375 px; the reviewer of Batch 1 flagged it).
- `QuoteButton` gains the custom-piece behaviour (4.2) and the detail URL.

### 4.8 Analytics discovery (documentation only) **(owner: no analytics now)**

`docs/discovery/analytics.md` (already written, to be committed with this
batch) records: the goal (visits and WhatsApp clicks by source), the
candidates evaluated (Umami Cloud free tier, Plausible, self-hosted Umami,
Cloudflare Web Analytics, GA4), the recommendation (Umami Cloud,
`data-umami-event` attributes on the three WhatsApp actions, script tag
guarded by an env key so the site works without it), what the owner has to
do, and the decision to defer. Nothing is wired in code.

### 4.9 Out of scope but noted
- Per-image "installed" flag on product photos (chosen the gallery instead).
- Quantity on the custom line, delivery address, deadline (owner declined).
- Search box; pagination (nine to a few dozen pieces do not need them).

## 5. Acceptance

1. Home at 375 px: within the first screen after the hero the "Destaques"
   grid starts; it shows the featured pieces (padded to 6 when fewer than 3
   are featured) with working quote and cart buttons; a link leads to
   `/catalogo`.
2. Adding two different pieces and then the custom piece (with a
   description) to the cart, filling name "Maria" and bairro "Savassi" and
   tapping checkout opens `wa.me` with the exact 4.1 message, including the
   two detail-page URLs and the description line. Name and bairro are
   prefilled on the next visit. Checkout is disabled until both fields are
   filled.
3. Renaming a product in the admin while it sits in a cart keeps the line
   (same id) and the message shows the new name after reload. Unpublishing
   it shows the line as "Produto indisponível" and leaves it out of the
   message and the badge.
4. `/catalogo/mesa-urb` shows gallery, name, category, description,
   materials/dimensions when present, quote and cart buttons, and up to 3
   related pieces; an unknown slug and an unpublished product's slug both
   show the Portuguese NotFound inside the shared layout. Tapping a catalog
   card's image opens the detail page. The per-card one-tap message ends
   with `<origin>/catalogo/mesa-urb`.
5. Chips filter the grid; `?categoria=mesas` reloads filtered; the custom
   piece stays visible as the last card under every filter.
6. Admin "Ambientes" tab: upload a photo, set a caption and a related
   product, reorder, delete (variants removed). The home strip shows the
   photos in that order with captions; tapping opens the lightbox with a
   "Ver a peça" link when related.
7. On a database seeded before this batch, boot converts "Projetos
   Personalizados" into "Móvel personalizado" with `isCustom` set, once.
   Turning the "Personalizado" switch on for another product turns it off
   on the first; turning it off everywhere and rebooting creates nothing.
8. `npm run check` and `npm test` pass; new pure logic (message builder,
   reducer with ids and notes, featured selection, chip extraction and
   filtering, category slug, related-pieces selection, gallery repo) has
   unit tests.
9. Colours, fonts and spacing outside the new elements are unchanged except
   the hero padding and the four-item strip's position (4.3).

## 6. Left to the builder

- Component structure for the custom-piece dialog and how the one-tap path
  reuses it; where customer name/bairro live (a small `CustomerContext` or
  the cart context); how `lineId` is generated (`crypto.randomUUID()` is
  available in all target browsers).
- Exact `ImageManager` adapter shape for the gallery.
- Related-pieces fallback details when a category has fewer than 3 others.
- Migration filename; whether `gallery_images` reuses a shared "image
  columns" helper with `product_images` in `schema.ts`.
- How `?categoria=` is read/written with wouter (`useSearch`/`useLocation`).
