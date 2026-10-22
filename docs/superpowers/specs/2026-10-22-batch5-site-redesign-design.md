# Batch 5 — Novo site: redesign pela identidade visual + pedidos do cliente — Design

**Date:** 2026-10-22
**Project:** Estúdio Pedra Industrial
**Status:** Builder-checked; revised 2026-10-22 from the client's 22 Figma comments; awaiting owner approval of the revision
**Builds on:** Batches 1–4 (all merged to `main`, last merge `6e90e46`).
**Design reference:** Figma file https://www.figma.com/design/CGH4o9ErKxTlo4oU75rCdW
(14 frames, node ids in §9) and the Claude Design canvas
https://claude.ai/artifact/Gdmjzpk39LFEjkjumyyaeb. Brand manual:
`Manual_de_Marca_Estudio_Pedra_v4.pdf` (Lívia Rios, 2026).

## 1. Intent and why

The studio received a brand manual in 2026 (Bege Mineral, Preto, Areia
Clara, Gilroy Light, a symbol, ten product icons, a pattern) and looked at
how comparable furniture studios present themselves online (benchmark
artifact `9jnDhENUXNfZghyxdqWzqT`, Instagram report
`29jMMHhRdf7wbnXspBXQP6`). The current site predates both: it uses a saturated
`#d2b389` page background, Montserrat, rounded cards and a home page that is
mostly text. The owner wants the public site to look like the brand and to
work like the better competitors, **without changing what it does**: a
visitor still browses pieces, adds them to a cart or taps one button, and
lands in WhatsApp with a ready quote request; the owner still manages
everything at `/admin`.

On top of the visual remake, the owner listed eleven additions on
2026-10-21 (a "Processo" page, an experience-and-guarantee block, a
portfolio browsable by room, a quote button everywhere, a PDF catalog,
Google reviews, FAQ, a technical sheet when a photo opens, two more fields
in the WhatsApp form plus a "we reply within one business day" badge, an
Instagram feed, and "we serve BH and the metropolitan region"). They were
designed first, on the canvas and in Figma, and this document turns the
approved design into a build.

On 2026-10-22 the client reviewed the Figma file and left 22 comments.
The design and this document were revised accordingly: the home opens with
an illustration instead of a photo and a row of small icons, Serviços moves
to the top and links into the portfolio, the PDF band and the installed
pieces strip leave the home for the portfolio page, reviews go last,
"Nossa história" and the Pilares become a **Sobre nós** page, the
ambiente filter is dropped in favour of the existing type filter, the
Processo page uses icons instead of photos, the workshop address appears
on Contato and in footers, and a **Para profissionais** page is planned
for text the client will send.

## 2. Goals, non-goals, anti-goals

### Goals

1. Every public page (`/`, `/catalogo`, `/catalogo/<slug>`, `/contato`,
   404) is rebuilt to match the Figma frames at 1440 and 390 px: Areia
   Clara background, Bege Mineral blocks and 1 px borders, black buttons,
   square corners, no shadows, Outfit (standing in for Gilroy) with
   light-weight headings and tracked uppercase labels, the manual's logo,
   symbol, pattern and product icons.
2. The quote flow keeps working exactly as today (one-tap button on every
   card and page, cart with name + bairro, "Móvel personalizado" with a
   description), and gains the two optional fields "Medidas aproximadas"
   and "Para quando precisa?" plus the badge "Respondemos em até 1 dia
   útil".
3. New pages **Processo** (`/processo`), **Dúvidas frequentes**
   (`/duvidas`) and **Sobre nós** (`/sobre`), with server-rendered `<head>`,
   sitemap entries and, for the FAQ, `FAQPage` JSON-LD. A fourth page,
   **Para profissionais** (`/para-profissionais`), is built but stays
   hidden (no nav item, 404) until the client's text arrives.
4. The portfolio keeps the **type filter** the owner already manages
   (categories as chips, now with the manual's product icons) and gains,
   after the grid, the "Na casa dos nossos clientes" strip and the
   Catálogo em PDF band. (The ambiente filter from the first design was
   dropped on the client's comments #15 and #16.)
5. Opening a product photo shows the photo with its **ficha técnica**
   (medidas, materiais, acabamentos, detalhes, prazo, garantia) beside it
   on desktop and as a sheet under it on phones.
6. The home page, in the client's approved order: hero with illustration,
   a row of four icon "diferenciais", Serviços (linking into the
   portfolio), Destaques, Como funciona, Experiência e garantia,
   Instagram, Avaliações do Google (hidden until the profile exists),
   final call to action. "BH e região metropolitana" and the workshop
   address appear in the hero, footer, contact and product pages.
7. Nothing the owner can do in `/admin` today is lost; the editor gains the
   two fields the ficha técnica needs (acabamentos, detalhes).
8. All 109 existing tests keep passing except where behaviour intentionally
   changes (listed in §3); new pure logic gets unit tests at the same level.

### Non-goals

- Redesigning the admin. It inherits the new tokens (same shadcn
  components) and is checked for legibility; its layout and flows stay.
- Producing the PDF catalog, the Google Business profile, the hero
  illustration, the "Para profissionais" text or the real numbers (years in
  business, pieces delivered, payment terms, lead times). The client
  supplies them; §8 lists what is missing.
- Generating PDFs on the server ("Baixar ficha (PDF)" on the desktop
  ficha frame is dropped; the catalog PDF is a file the owner provides).
- Integrating the Instagram Graph API or Google Places API (both need app
  registration, tokens and review). Instagram uses the official per-post
  embed; Google reviews are typed by the owner.
- Dark theme. The site commits to the brand's single light look; the
  unused `.dark` palette is removed.
- Prices, payments, accounts, delivery addresses, analytics (still deferred,
  see `docs/discovery/analytics.md`).
- Changing public URLs. `/catalogo` and `/catalogo/<slug>` stay (they are
  in WhatsApp messages, the sitemap and the server routes); only the nav
  label says "Portfólio".

### Anti-goals

- Shipping placeholder text. Everything in `[brackets]` on the canvas is
  illustrative. The built site never shows brackets: a fact the client has
  not confirmed is either written around (e.g. "o prazo exato vai no
  orçamento") or its block is hidden behind a content flag (§4.12).
- Making the cart mandatory or asking for more than the owner wants before
  the first reply: the one-tap "Pedir orçamento" stays everywhere, and the
  two new form fields are optional.
- Breaking link previews or search: the server-rendered head, canonical
  URLs, `og:image` from the cover photo, `LocalBusiness` JSON-LD and the
  sitemap keep working and are extended, not replaced.
- Using Cobre Queimado (`#B37640`) or Cinza Concreto (`#828282`) for small
  text on Areia Clara: both fail 4.5:1. Cobre is for icons, hovers and the
  cart badge; Cinza for dividers and for text on black.
- Adding a database server, a queue, a CMS or a paid widget service.

## 3. Constraints

- Stack unchanged: React 19, Vite 7, Tailwind v4, shadcn/ui (Accordion,
  Dialog, Sheet, Drawer, Tabs, Switch, Checkbox already installed), wouter,
  tRPC 11, Express 4, Drizzle + better-sqlite3, sharp, vitest, Node 22.
  No new runtime dependency is needed; `react-icons` or similar is **not**
  added for the WhatsApp and Instagram glyphs (inline SVG, §4.3).
- Fonts only from Google Fonts (Outfit 300/400/500) with `preconnect`, or
  self-hosted `woff2` if the client licenses Gilroy (§4.1). No other
  external stylesheet.
- Visitor- and owner-facing copy in Brazilian Portuguese. Copy for the
  new sections is taken from the Figma frames; where a frame has
  bracketed text, §4.12 says what ships instead.
- Paths from `process.cwd()`; images through the existing pipeline;
  `.data/` stays the only mutable state.
- Schema changes go through `npm run db:generate` migrations plus the
  idempotent boot steps the project already uses (the site is not
  deployed, but dev databases exist).
- Intentional behaviour changes to existing tests: the WhatsApp cart
  message gains two optional lines (`buildWhatsAppMessage`),
  `resolveRoute` learns `/processo`, `/duvidas`, `/sobre` and
  `/para-profissionais`, descriptions say "região metropolitana",
  `GENERIC_QUOTE_MESSAGE` is unchanged.
- Layout verified in a real browser (devtools plugin) at 390 and 1440 px
  against the Figma frames; the acceptance bar is "same structure, order,
  copy, colours and spacing rhythm", not pixel identity. 44 px minimum
  touch targets on phones.

## 4. Decisions

**(owner)** = decided with the client/owner in conversation or in the
approved design. **(my call)** = chosen by the author; can be changed
without re-opening the design.

### 4.1 Tokens, type and shape **(owner: palette/type from the manual; mapping my call)**

`client/src/index.css` keeps the shadcn token names (so every existing
component re-themes itself) and gets brand values:

| Token | Value | Use |
|---|---|---|
| `--background` | `#EAE0CE` Areia Clara | page |
| `--foreground`, `--primary`, `--ring` | `#000000` Preto | text, buttons, focus |
| `--primary-foreground` | `#EAE0CE` | text on black buttons |
| `--card`, `--secondary`, `--muted`, `--border`, `--input` | `#D2B389` Bege Mineral | blocks, chips, borders, inputs |
| `--card-foreground`, `--secondary-foreground` | `#000000` | |
| `--muted-foreground` | `#3A3A3A` Grafite | body text, secondary labels (9.3:1 on Areia) |
| `--accent` | `#B37640` Cobre Queimado | icons, link hover, cart badge only |
| `--accent-foreground` | `#EAE0CE` | |
| `--destructive` | unchanged `#dc2626` | admin only |
| new `--brand-green` | `#1F3A30` Verde Pedra | WhatsApp FAB |
| new `--brand-concrete` | `#828282` Cinza Concreto | dividers, text on black |
| `--radius` | `0` | square corners everywhere |
| new `--font-sans` | `'Outfit', system-ui, sans-serif` | the single family |

- No `box-shadow` anywhere on public pages (manual: "não aplicar sombras ou
  efeitos"); Tailwind `shadow-*` classes are removed from public
  components. Overlays (cart sheet, dialogs, viewer) separate from the page
  with a 1 px Bege border and a 50 % black scrim, not a shadow.
- The `.dark` block, `@custom-variant dark` and the `switchable` comment go;
  `ThemeProvider` stays as is (default light, not switchable) so no
  component changes.
- Type scale (from the Guia de estilo frame): H1 72 / H2 52 / H3 26–28 /
  body 17 / support 15 / label 12 / badge 11 on desktop; H1 40 / H2 32 /
  body 16 on phones. Headings weight 300, body 400, buttons 500. Body
  line-height 1.6, measure ≈ 65 characters (`max-width: 65ch` on running
  text).
- Utility classes replace the Montserrat ones: `.heading-display` →
  weight 300, tracking `-0.01em`; `.heading-secondary` → weight 500, 12 px,
  tracking `0.12em`, uppercase (buttons); `.text-accent-mono` → **`.lbl`**
  semantics: 12 px, tracking `0.24em`, uppercase, weight 400 (section
  labels). **(my call)** Keep the three class names and change their
  definitions, so the admin and any component not rewritten still render
  sensibly.
- Gilroy: the manual asks for Gilroy Light, which is not on Google Fonts.
  Outfit 300/400/500 ships. If the client provides licensed Gilroy
  `woff2` files, they go in `client/public/fonts/` with an `@font-face`
  block and only `--font-sans` changes.

### 4.2 Brand assets **(owner: from the manual; packaging my call)**

Extracted from the manual as transparent PNGs (already done once with
PyMuPDF; copies in the session scratchpad `manual/final/`, re-extractable
from the PDF: logos are embedded raster images with soft masks, not vector
paths). They ship under `client/public/brand/`:

- `simbolo-preto.png`, `simbolo-bege.png` (the "EP" symbol) — header on
  phones, favicon (replaces `logo.png` as `<link rel="icon">`; a 512 px
  PNG is enough), the final CTA.
- `tipografico-preto.png` — wordmark beside the symbol in the header
  (combined height 40 px, as the Guia de estilo shows; the manual's 95 px
  minimum applies only to the stacked lockup).
- `assinatura-bege.png` (logo + tagline in Bege) — footer on black.
- `pattern.png` — texture at 14–16 % opacity behind the Experiência block
  and the final CTA only.
- `icons/<slug>.png` — the ten product icons in black: `luminaria-lua`,
  `luminaria-sol`, `mesa-loft`, `mesa-urb`, `mesa-office-l`,
  `penteadeira`, `estante-divisio`, `estrutura-gaia`, `floreira`,
  `reforma-sofa`. Rendered through a CSS mask
  (`mask-image: url(...)`, `background: currentColor`) so one file serves
  black and Cobre.
- `client/src/lib/categoryIcons.ts` maps a **category slug** to an icon
  file: `estantes → estante-divisio`, `estruturas → estrutura-gaia`,
  `luminarias → luminaria-lua`, `mesas → mesa-urb`,
  `penteadeiras → penteadeira`, `floreiras → floreira`,
  `reformas → reforma-sofa`, `personalizados → simbolo` (the EP symbol).
  Unknown categories get no icon (chips render text only). Pure, unit
  tested.
- `npm run og:image` is updated to compose the default share image from
  `assinatura-bege.png` on black instead of the old logo, and
  `client/public/og-default.jpg` is regenerated.
- `client/public/logo.png` is deleted once nothing references it.

### 4.3 Shared chrome: header, footer, floating button **(owner: nav items; rest my call)**

- **Header** (`SiteHeader`): sticky, Areia background, 1 px Bege bottom
  border. Left: symbol + wordmark, link to `/`. Centre (≥ 1024 px): the
  nav links `Início /`, `Portfólio /catalogo`, `Processo /processo`,
  `Sobre nós /sobre`, `Dúvidas /duvidas`, `Para profissionais
  /para-profissionais` (only while `SITE.professionals` is set, §4.9c),
  `Contato /contato`, 12 px tracked uppercase with a 28 px gap (Figma
  47:2). Right: cart ghost button with a Cobre count badge, then the
  black "Pedir orçamento" button (WhatsApp glyph + label; opens
  `whatsappUrl(GENERIC_QUOTE_MESSAGE)`). Below 1024 px the header is logo,
  cart and hamburger only, as the mobile frames show; the links and the
  "Pedir orçamento" button move into the existing right `Sheet` (the FAB
  already gives one-tap WhatsApp on phones). On `/catalogo/<slug>` below
  640 px the header takes a `backHref="/catalogo"` prop and shows a back
  arrow + symbol instead of symbol + wordmark (Figma 20:2); no other
  per-page variant. **(my call)** `NAV_LINKS` remains the single source
  for header and footer.
- **Footer** (`SiteFooter`): black background, Areia text. Row 1: the
  assinatura in Bege. Row 2, three columns: Navegação (the nav links; the
  portfolio page's footer also links "Catálogo em PDF" to `#catalogo` when
  a PDF exists, §4.12), Contato (`@estudio.pedraindustrial` linked,
  `(31) 97180-3551` linked to WhatsApp, then the workshop address from
  `SITE.address` on two lines: "Rua João Gualberto dos Santos, 714 · Céu
  Azul" / "Belo Horizonte — MG"), Horário (Seg a sex 8h–18h · Sáb 9h–12h ·
  Dom fechado). Row 3: `© 2026 Estúdio Pedra Industrial. Todos os direitos
  reservados.` Cinza Concreto for secondary text on black.
- **Floating WhatsApp button** (`WhatsAppFab`): 56 px circle in Verde Pedra
  with the WhatsApp glyph in Areia, same placement and safe-area logic as
  today. **(my call)** The WhatsApp and Instagram glyphs are two inline
  SVG components in `client/src/components/icons/` (paths taken from the
  canvas), replacing lucide's generic `MessageCircle` on public pages.
- **Mobile product action bar**: on `/catalogo/<slug>` below 640 px, when
  the in-flow "Pedir orçamento desta peça" / "+ Adicionar ao carrinho"
  buttons scroll out of view, a fixed bottom bar with the same two actions
  appears (IntersectionObserver on the in-flow group). The FAB hides while
  the bar is visible so the two do not overlap.

### 4.4 Routes, navigation and SEO **(owner: pages; mechanics my call)**

| Path | Page | Head |
|---|---|---|
| `/` | Home | unchanged title; description updated to "…feitos em Belo Horizonte para BH e região metropolitana…" |
| `/catalogo` | Portfólio | unchanged: `Portfólio — …`, `?categoria=` title; canonical `/catalogo` |
| `/catalogo/<slug>` | Peça | unchanged (`product` type, cover `og:image`, breadcrumbs) |
| `/processo` | Processo | `Processo — …`, description from the page intro |
| `/duvidas` | Dúvidas frequentes | `Dúvidas frequentes — …`, `FAQPage` JSON-LD from the same content file |
| `/sobre` | Sobre nós | `Sobre nós — …`, description from the page intro |
| `/para-profissionais` | Para profissionais | `Para profissionais — …`; answers **404 `noindex`** while `SITE.professionals` is null |
| `/contato` | Contato | description gains "BH e região metropolitana" |
| `/admin`, 404 | unchanged | |

- `server/lib/seo.ts`: `Route` gains `{ kind: "process" }`, `{ kind: "faq" }`,
  `{ kind: "about" }` and `{ kind: "professionals" }`; `buildHead` renders
  the new titles (and the not-found head for `professionals` while the
  content is null); the sitemap adds `/processo`, `/duvidas`, `/sobre`
  and, when enabled, `/para-profissionais`. `LocalBusiness` gains the
  `streetAddress`/`postalCode`-less `address` from `SITE.address` and
  `areaServed` "Belo Horizonte e região metropolitana"; `description`
  texts in `shared/seo-text.ts` are updated in one place.
- Titles and descriptions for the new pages live in `shared/seo-text.ts`
  like the others, and the pages call `usePageTitle`.
- The FAQ content lives in `shared/content/faq.ts` so the server can build
  the JSON-LD and the client the accordion from one list (§4.10).
- The home no longer has a `#sobre` anchor; "Sobre nós" is a page (§4.9b).

### 4.5 Home **(owner: section list and order from the client-reviewed frames Figma 47:2 / 48:2)**

Sections, top to bottom, each a component under `client/src/components/home/`:

1. **Hero** — label "Móveis industriais planejados · BH e região
   metropolitana", H1 "Móveis industriais sob medida, em ferro e madeira.",
   the paragraph from the frame, buttons "Pedir orçamento no WhatsApp"
   (black) and "Ver portfólio" (outline). Right (desktop) / between title
   and text (phone): an **illustration, not a photo** (client comment #1).
   Until the client provides one, the site renders the frame's
   composition: Bege panel, the pattern at ~18 % opacity, three product
   icons (Luminária Lua, Mesa Urb, Estante Divisio) in black on a
   baseline, a small Cobre square. The panel is one component
   (`HeroIllustration`) so a final artwork (`client/public/brand/hero.svg`
   or `.png`) replaces it in one place.
2. **Diferenciais** — the old site's idea, restyled (client comment #2):
   a four-cell row with 1 px Bege separators, each cell a 48 px outlined
   icon + 11 px label + one-line Grafite text: Fabricação própria ("Corte,
   solda e pintura no nosso estúdio"), Peças sob medida ("Projeto aprovado
   antes de qualquer corte"), Garantia de 3 meses ("Contra defeitos de
   fabricação"), BH e região metropolitana ("Entrega e instalação
   agendadas"). Icons are inline SVG (hammer, ruler, shield-check,
   map-pin) in `components/icons/`. Two columns on phones.
3. **Serviços** — moved up (client comment #3). Three cards, each a
   **link into the portfolio**: "Estilo industrial" → `/catalogo` ("Ver
   peças no portfólio →"), "Reforma de móveis" → `/catalogo?categoria=reformas`
   when that category exists, else `/catalogo` ("Ver reformas no portfólio
   →"), "Projetos personalizados" → `/catalogo#sob-medida` (the custom
   piece's card carries that id; "Ver peças sob medida →"). Cards keep the
   product icon, title and text; hover fills Bege.
4. **Destaques** — existing `selectFeatured` grid with the new
   `ProductCard` (§4.6) on a Bege band; header "Portfólio / Destaques",
   link "Ver portfólio completo →".
5. **Como funciona** — four steps (Conversa, Projeto, Fabricação, Entrega)
   with the texts from the frame and "Ver o processo completo →" to
   `/processo`. Static content in `shared/content/processo.ts`: the same
   file feeds `/processo`; the home shows the steps flagged `inHome`
   (Processo steps 1, 3, 4, 5; "Medidas" is omitted on the home) using
   their `homeTitle` ("Projeto" for "Projeto e orçamento") and `summary`.
6. **Experiência e garantia** — black block with the pattern texture at
   ~12 %, H2 "Quem faz, responde pela peça.", paragraph, outline button
   "Conhecer o processo", and a 2 × 2 grid of **stats** with 1 px Grafite
   separators. Ships with the two confirmed stats ("3 meses de garantia
   contra defeitos de fabricação", "100 % das peças com projeto aprovado
   antes de produzir"); "anos de oficina" and "peças entregues" are added
   when the client confirms the numbers (§4.12).
7. **Instagram** — label "Instagram", handle, button "Seguir no
   Instagram" (`https://instagram.com/estudio.pedraindustrial`), and a grid
   of up to six **official post embeds** (`https://www.instagram.com/p/<code>/embed`
   in a lazy iframe, 1:1 tiles, mounted only when the section enters the
   viewport). The list of post URLs comes from content/settings (§4.12);
   with an empty list the grid is omitted and the section is just the
   handle and the button. Client comment #9: keep, with a live feed.
8. **Avaliações** — last content section (client comment #5); hidden
   until enabled (§4.12). When enabled: Bege band, label "Avaliações", H2
   "O que dizem os clientes", rating + stars + "N avaliações no Google ·
   ver todas →" (link to the profile), three quote cards (text, name,
   piece · bairro).
9. **Chamada final** — Areia block with the symbol: "Transforme seu
   espaço.", "Conte o que você imagina e receba um orçamento sob medida
   pelo WhatsApp.", buttons "Solicitar orçamento" (black, generic
   WhatsApp) and "Ver portfólio" (outline).

Moved off the home on the client's comments: the installed-pieces strip
(#11, now on the portfolio page, §4.6), the Catálogo em PDF band (#4,
portfolio page only), "Nossa história" and the Pilares (#8 and #10, now
the Sobre nós page, §4.9b). Removed from today's home: the "Artesanal /
Sustentável / Entrega para todo o Brasil / Garantia" row ("todo o Brasil"
contradicts the service area) and the services' WhatsApp/dialog actions
(`REFORMA_MESSAGE` and the custom dialog on the home are no longer needed;
the card links go to the portfolio).

### 4.6 Portfólio (`/catalogo`) **(owner: type filter kept, client comments #15/#16; strip and band from #11/#4)**

- Header: "← Voltar ao início", H1 "Portfólio de peças", intro from the
  frame ("…descreva o móvel que você imagina."), then a 1 px Bege rule.
- **Tipo de peça chips** (the only filter): the existing `CategoryChips`
  with the product icon from `categoryIcons` in front of the label and
  "Todos · N" first. On phones the chip bar sticks under the header while
  the grid scrolls. `filterByCategory`, `extractCategories` and the
  `?categoria=` URL are unchanged.
- **Grid**: the new `ProductCard`; the custom piece last, its card with
  `id="sob-medida"` (the home's Serviços link target).
- **Na casa dos nossos clientes** (after the grid, Bege band): the
  existing gallery strip (`AmbientesStrip`, `gallery.list`) restyled: 4:5
  tiles 288 px wide, caption "Quarto · Mesa de Cabeceira Loft" style.
  **(my call)** The caption shown is the admin caption as typed; the
  "· piece name" suffix is appended only when the photo is linked to a
  product and the caption does not already contain the name. The lightbox
  for this strip stays the plain `ImageLightbox` with its "Ver a peça"
  footer. The admin tab keeps its name "Ambientes".
- **Catálogo em PDF** (`id="catalogo"`, black band, last before the
  footer): "Prefere folhear? Baixe o catálogo em PDF.", buttons "Baixar
  catálogo (PDF)" (only when a PDF exists) and "Receber pelo WhatsApp"
  (always; message `CATALOG_MESSAGE`: "Olá! Gostaria de receber o catálogo
  em PDF do Estúdio Pedra Industrial."), size/date line when known
  (§4.12).
- **No ambiente data**: the `products.ambientes` column, the fixed room
  list and the admin checkboxes from the first draft are **not built**.
- **ProductCard** (new look, same props): 4:5 photo with the "N fotos"
  badge (Bege on black), category label in `.lbl`, name (26 px weight
  300), description (15 px Grafite, 2 lines), then "Pedir orçamento"
  (black) and "+ Adicionar ao carrinho" (ghost). Square, 1 px Bege border,
  no hover zoom. The custom piece's card never shows a photo: when
  `isCustom` the card renders the symbol on Bege with the label "Sob
  medida" even if the product has images (the seed still attaches its stock
  photo, and the owner may upload a reference collage). **(my call)** This
  is a render rule only: the product page, the viewer and the `og:image`
  keep using the piece's images as for any other product, and the seed and
  its tests are untouched.

### 4.7 Peça (`/catalogo/<slug>`) and the ficha técnica **(owner: sheet when a photo opens; fields my call)**

- Breadcrumb "Portfólio / <Categoria> / <Nome>" (category links to
  `/catalogo?categoria=<slug>`). The category label under the gallery and
  in the viewer header shows only the category (no ambiente list).
- Gallery: main photo with the caption "1 / N · ampliar e ver a ficha
  técnica", thumbnails under it; a "Ficha técnica — Medidas · materiais ·
  detalhes" button under the gallery opens the viewer too.
- Info column: category label, H1, description, a definition list of the
  **ficha rows** (below), then "Pedir orçamento desta peça" and "+ Adicionar
  ao carrinho", the line "A mensagem já vai com o nome e o link da peça.
  Respondemos de segunda a sexta, 8h às 18h.", and two facts: "Fabricação
  — Própria, em BH", "Entrega — BH e região metropolitana".
- "Compartilhar": `navigator.share({ title, url })` when available,
  otherwise copies the URL and shows a toast "Link copiado". **(my call)**
- **Veja também**: existing `relatedProducts`, with the "Outras <categoria>
  →" link to the filtered catalog.
- **Product viewer** (`components/product/ProductViewer.tsx`) replaces
  `ImageLightbox` on the product page (the gallery strip keeps
  `ImageLightbox`). Desktop ≥ 1024 px: photo on the left (black
  background), ficha panel 400 px on the right (Areia), header "<Nome> ·
  foto i de N", arrows and `Esc`, footer with "Pedir orçamento desta peça",
  "+ Carrinho". Phone: photo full width on black, the ficha as a sheet
  that can be dragged up (shadcn `Drawer`/vaul, already installed, with
  snap points at ~45 % and 100 %), footer with cart icon button + "Pedir
  orçamento".
- **Ficha rows**, shown only when non-empty, in this order:

  | Row | Source |
  |---|---|
  | Medidas | `product.dimensions` (existing), suffixed " · feita na medida do seu espaço" when `isCustom` is false and the field is non-empty |
  | Materiais | `product.materials` (existing) |
  | Acabamentos | `product.finishes` **(new column, `TEXT` default `''`)** |
  | Detalhes | `product.details` **(new column, `TEXT` default `''`)**; one detail per line, rendered as a `·`-separated line |
  | Prazo | site-wide `shared/content/site.ts` `leadTime`; omitted while unconfirmed (§4.12) |
  | Garantia | site-wide "3 meses contra defeitos de fabricação" |

  **(my call)** Two generic columns instead of furniture-specific ones
  ("tampo", "estrutura"): a lamp has no top, and the owner already writes
  materials as prose. Admin editor: "Acabamentos" (input) and "Detalhes"
  (textarea, "um detalhe por linha") after Materiais/Dimensões.
- Keyboard and a11y as today: `role="dialog"`, focus trapped, `Esc`
  closes, arrows navigate, alt texts "<Nome> i".

### 4.8 Cart and custom piece: two optional fields and the badge **(owner)**

- `Customer` (`components/cart/storage.ts`) becomes
  `{ name: string; bairro: string; measurements?: string; deadline?: Deadline }`
  with

  ```ts
  export type Deadline =
    | { kind: "sem-pressa" }
    | { kind: "ate-1-mes" }
    | { kind: "ate-2-meses" }
    | { kind: "data"; when: string }; // free text, e.g. "antes do Natal"
  ```

  Persisted in `localStorage` with the existing customer record; old
  records without the fields load unchanged.
- **Cart sheet** footer, in order: Seu nome, Seu bairro, Medidas
  aproximadas (input, placeholder "Ex.: 120 × 60 cm, altura 75"), "Para
  quando precisa?" as four toggle chips (Sem pressa / Em até 1 mês / Em até
  2 meses / Tenho uma data; choosing the last reveals an input "Qual
  data?"), the badge "Respondemos em até 1 dia útil" (Bege chip with a
  clock glyph), "Finalizar pedido no WhatsApp", the helper "Preencha o
  bairro para enviar. Medidas e prazo são opcionais.", "Limpar". Enabling
  rule unchanged: name + bairro + at least one available line.
- **CustomPieceDialog** (`quote` mode) gets the same two fields and the
  badge after Seu bairro; the description helper reads "Medidas
  aproximadas ajudam muito." In `cart` mode (editing a line's note) nothing
  changes.
- **Message** (`buildWhatsAppMessage`): after the item list and before
  "Total de itens", when present:

  ```
  Medidas aproximadas: <measurements>
  Para quando: <Sem pressa | Em até 1 mês | Em até 2 meses | <when>>
  ```

  Blank measurements and no deadline produce exactly today's message, so
  the existing test stays valid and new tests cover the four deadline kinds.
- The one-tap `QuoteButton` for a regular product is unchanged (no form).

### 4.9 Processo (`/processo`) **(owner: page kept, photos → icons per client comment #20; Figma 52:2)**

Static page from `shared/content/processo.ts`: intro ("Como uma ideia vira
uma peça do Estúdio Pedra.", the paragraph, the badge "Respondemos em até
1 dia útil"), a five-step summary strip (Conversa, Medidas, Projeto e
orçamento, Fabricação, Entrega), then one block per step. Each block pairs
the text with an **icon panel** instead of a photo: a Bege square (420 px
tall on desktop, 300 on phones) with the pattern at ~16 %, one 140 px
line icon in black (WhatsApp glyph, ruler, pencil-ruler, wrench, truck;
inline SVG in `components/icons/`) and a small uppercase tag ("Conversa
pelo WhatsApp", "Medidas no local ou pelo guia", "Desenho e orçamento para
aprovar", "Corte, solda, pintura e acabamento", "Entrega e instalação
agendadas"); panels alternate left/right. Each step has its paragraph
and three bullets as written in the frame **minus bracketed claims**
(content type `{ n, title, homeTitle?, inHome, lead, summary, bullets }`)
(ship: "Primeira estimativa de valor e de prazo", "Visita técnica em BH e
região", "Orçamento fechado em PDF, com prazo e forma de pagamento",
"Prazo informado no orçamento, conforme a peça"). Step 1 has a "Começar a
conversa" WhatsApp button; step 5 links "Dúvidas sobre prazo, pagamento e
garantia →" to `/duvidas`. Final CTA "Comece pela conversa." with WhatsApp
and portfolio buttons. The home "Como funciona" reads the steps with
`inHome: true` (§4.5 item 4).

### 4.9b Sobre nós (`/sobre`) **(owner: client comments #8 and #10; Figma 55:2)**

Static page from `shared/content/sobre.ts`, sections in order:

1. **Abertura** — label "Sobre nós", H1 "Entre o aço e a madeira, nasce a
   forma.", lead "Um estúdio criativo em Belo Horizonte, dedicado a móveis
   industriais sob medida. Cada peça é pensada para ir além da função e se
   tornar parte da história de quem a escolhe."
2. **Nossa história** — two columns: left, a photo (the cover of the first
   featured piece, as the hero used to; pattern block behind it at ~16 %;
   black tag "Oficina própria · Céu Azul, BH"); right, label, H2
   "Matéria-prima, técnica e um olhar sensível para o design.", the three
   existing paragraphs, buttons "Conhecer o processo" (`/processo`) and
   "Ver portfólio".
3. **Pilares** — black block: Missão, Visão, Valores in three columns with
   the existing texts, then the 01 / 02 / 03 list Personalidade · Cuidado ·
   Criatividade.
4. **A oficina** — H2 "Onde as peças nascem", three cards: "Nossa oficina"
   (address from `SITE.address`, link "Abrir no mapa →" to a Google Maps
   search of the address), "Horário" (`HOURS`), "Onde atendemos"
   ("Fabricação própria. Atendemos, entregamos e instalamos em BH e região
   metropolitana. Outras cidades sob consulta.").
5. **Chamada** — Bege: symbol, "Vamos desenhar a sua peça?", "Mande uma
   foto ou uma ideia. Em até 1 dia útil você tem uma primeira resposta.",
   WhatsApp and portfolio buttons.

### 4.9c Para profissionais (`/para-profissionais`) **(owner: client comment #13; content pending; Figma 56:2)**

The client will send the text. The page component, route, nav item and
sitemap entry are built now but **enabled only when `SITE.professionals`
is non-null** (a `{ lead, offers: {title, text}[3], steps: {title,
text}[3], ctaTitle, ctaText }` object). While null: no nav/footer link, the
route answers 404 `noindex`, the sitemap omits it. Structure, from the
frame: abertura (label, H1 "Arquitetos, designers e lojistas: vamos fazer
juntos.", lead + "Respondemos em até 1 dia útil"), Bege band "O que
oferecemos a quem especifica" with three cards (product icons in Cobre),
"Do briefing à entrega na obra" three numbered steps, black CTA with the
pattern, symbol in Bege, "Tem um projeto na mesa?", buttons "Falar com o
estúdio" (Bege, WhatsApp) and "Receber o catálogo" (outline Areia, to
`/catalogo#catalogo`). The frame's copy is illustrative and must not ship
(the no-brackets rule); the builder types the client's text into
`SITE.professionals` when it arrives.

### 4.10 Dúvidas frequentes (`/duvidas`) **(owner: page; content from Figma 54:2)**

- `shared/content/faq.ts`: `{ theme: string; items: { q: string; a: string }[] }[]`
  with the five themes (Prazo e pedido, Pagamento, Entrega e instalação,
  Materiais e cuidados, Garantia) and the questions from the frame.
  Answers that depend on unconfirmed facts are written around them
  (e.g. "Como funciona o pagamento?" → "Combinamos um sinal para iniciar a
  produção e o restante na entrega. As formas de pagamento vão no
  orçamento."); the exact wording is the builder's, within this rule.
- Page: intro, a "Temas" chip row that scrolls to each theme section
  (`id` per theme), themes with a shadcn `Accordion` (first item of the
  first theme open by default, as in the frame), and the closing block
  "Não achou a sua dúvida? Chame no WhatsApp. Respondemos em até 1 dia
  útil." with a WhatsApp button.
- Server: `buildHead` for `faq` adds a `FAQPage` JSON-LD built by a pure
  `faqJsonLd(faq)` in `server/lib/seo.ts` (one `Question`/`Answer` per
  item, plain text), unit tested.

### 4.11 Contato (`/contato`) **(owner: address per client comment #19; layout from Figma 51:2)**

Two columns on desktop: left, label "Contato", H1 "Fale com a gente. O
orçamento começa por uma conversa.", paragraph, badge "Respondemos em até
1 dia útil"; right, four cards in a 2 × 2 grid — WhatsApp (number, "Abrir
conversa →") and Instagram (handle, "Ver as peças em casa →") on Areia,
then on Bege "Horário de atendimento" (`HOURS`) and **"Nossa oficina"**:
"Rua João Gualberto dos Santos, 714 · Céu Azul", "Belo Horizonte — MG",
and the line "Fabricação própria. Atendemos, entregamos e instalamos em
BH e região metropolitana. Outras cidades sob consulta." The pattern
strip under the cards stays (client comment #18 only notes it is
decorative). The page shows the cart button (today it hides it) for
consistency. **(my call)**

### 4.12 Content that the client still has to supply, and where it lives

Everything that is copy lives in `shared/content/*.ts` (so the server can
reuse it) and is changed by the developer. Facts the client has not
confirmed are represented as **optional values that hide their block when
absent**, in `shared/content/site.ts`:

```ts
export const SITE = {
  responseTime: "Respondemos em até 1 dia útil",
  warranty: "3 meses contra defeitos de fabricação",
  serviceArea: "Belo Horizonte e região metropolitana",
  address: { street: "Rua João Gualberto dos Santos, 714", district: "Céu Azul", city: "Belo Horizonte — MG" },
  professionals: null as null | ProfessionalsContent,   // §4.9c; page hidden while null
  leadTime: null as string | null,          // e.g. "3 a 5 semanas após a aprovação"
  stats: [                                   // Experiência e garantia; order kept
    { value: "3 meses", label: "de garantia contra defeitos de fabricação" },
    { value: "100%", label: "das peças com projeto aprovado antes de produzir" },
  ] as { value: string; label: string }[],   // + anos, peças when confirmed
  catalogPdf: null as null | { url: string; sizeLabel?: string; updatedLabel?: string },
  reviews: null as null | {
    rating: string; count: number; url: string;
    quotes: { text: string; author: string; context: string }[];
  },
  instagramPosts: [] as string[],            // up to 6 post URLs
};
```

Rules: `null`/empty hides the dependent UI (download button, reviews
section, Instagram grid, Prazo row, the Para profissionais page and nav
item); no bracket ever reaches the DOM (a unit test greps the content
modules for `[` followed by a letter).

**Phase 2 (optional, separate plan):** move `catalogPdf`, `reviews`,
`instagramPosts` and the two numeric stats into a `site_settings` table
(`key TEXT PRIMARY KEY, value TEXT JSON, updatedAt`) with `settings.get`
(public) / `settings.update` (admin) and a fourth admin tab **Site** (PDF
upload stored under `.data/uploads/`, served at `/uploads/`). The client
code reads one `useSiteSettings()` hook that falls back to the `SITE`
constants, so Phase 1 ships complete and Phase 2 only changes the source.
**(my call)** Phase 1 keeps these in code because none of this content
exists yet; the owner edits pieces and photos often, these rarely.

### 4.13 Admin **(owner: not redesigned)**

- Inherits the tokens. The builder opens the three tabs at 375 px and on
  desktop and fixes only token-level problems (e.g. a Bege `--card` behind
  a Bege `--input` would need `--input` to be `#C9A878` or a border token
  tweak; decided at build time, documented in the commit).
- Product editor additions, in order: Nome, Categoria, Descrição,
  Materiais / Dimensões, **Acabamentos**, **Detalhes** (textarea), then
  "Mais opções" unchanged.
- `products.create/update` accept `finishes`, `details`;
  `listPublished`/`getPublishedBySlug` return them (they select `*`). The
  seed is untouched.

### 4.14 Data model and API changes (summary)

| Change | Where |
|---|---|
| `products.finishes TEXT NOT NULL DEFAULT ''` | `server/db/schema.ts`, migration |
| `products.details TEXT NOT NULL DEFAULT ''` | same |
| `createInput` gains the two fields | `server/routers/products.ts` |
| `shared/content/{site,home,processo,faq,sobre}.ts` | new |
| `Route` kinds `process`, `faq`, `about`, `professionals` | `server/lib/seo.ts`, `server/page.ts` |
| `faqJsonLd`, `LocalBusiness.address`, sitemap entries | `server/lib/seo.ts`, sitemap route |
| `Customer.measurements`, `Customer.deadline` | `client/src/components/cart/storage.ts`, `whatsapp.ts` |

No change to images, gallery, trash, auth or deployment.

### 4.15 Verification

- Unit (vitest): `categoryIcons`, `buildWhatsAppMessage` with/without the
  new fields, `resolveRoute` and `buildHead` for the new routes (including
  the 404 for `/para-profissionais` while disabled), `faqJsonLd`,
  `localBusiness` address, the no-brackets content test, repo tests for
  the two new columns.
- Browser (devtools plugin, 390 × 844 and 1440 × 900): each public page
  compared with its Figma frame; the viewer on desktop and as a sheet on
  phone; the mobile action bar; cart and custom dialog with the new fields
  producing the expected message (open the generated `wa.me` URL and read
  the decoded text); header/footer on every page; admin tabs legible.
- `npm run check`, `npm test`, `npm run build`; `GET /sitemap.xml` lists
  the new pages; `curl /duvidas | grep FAQPage`.

## 5. Phasing

One plan, one branch from `main` (`feat/batch5-redesign`), tasks roughly in
this order so each step leaves a working site. The **first task copies the
brand PNGs into `client/public/brand/` and the frames' copy into
`shared/content/*.ts`**, so later sessions do not depend on the scratchpad
or on Figma. Then: tokens + fonts → chrome (header, footer, FAB, icons) →
schema + admin fields (acabamentos, detalhes) → ProductCard + Portfólio
(chips, strip, PDF band) → Peça + viewer → cart fields + message → Home
sections → Processo → Dúvidas (+ SEO) → Sobre nós + Para profissionais
(flagged) → Contato + 404 → content/no-brackets pass → og image + docs
(README, DEPLOY if anything changed). Phase 2 (§4.12 settings tab) is a separate
plan after the client has the PDF, the Google profile or the numbers.

## 6. Left to the builder

- Exact Tailwind classes, spacing values and breakpoints, as long as the
  scale in §4.1 and the frames' order and proportions are respected.
- Component file layout under `client/src/components/{home,catalog,
  product,layout,icons}`; splitting `Home.tsx` into one component per
  section is expected.
- The vaul snap points and drag behaviour of the phone ficha sheet; the
  IntersectionObserver thresholds for the action bar and the Instagram
  grid.
- Wording of FAQ/Processo lines that had to be rewritten without the
  bracketed facts (within §4.12's rule).
- How the admin's Bege-on-Bege contrast is resolved (§4.13).
- Whether to keep `ImageLightbox` and `ProductViewer` as two components or
  one with a `panel` slot; two is the default.

## 7. Risks and open points

- **Fonts**: Outfit is a visual stand-in; if the client insists on Gilroy
  they must license it. Decided: ship Outfit, swap by token later.
- **Instagram embeds** load Meta scripts inside iframes and are heavy;
  they are lazy and only when the list is non-empty. If the client later
  wants a real feed (covers without iframes), that is the Graph API and a
  new project.
- **Hero illustration**: the shipped composition (icons + pattern) is a
  stand-in; a bespoke drawing from the brand's designer is the intended
  end state and swaps in through one component.
- **Para profissionais** ships dark until the text arrives; if the client
  never sends it, the flag simply stays null.
- **Deleted `logo.png`**: anything external linking to it (none known)
  would break; the og image is regenerated.

## 8. Facts the client must still provide

Years of workshop experience and pieces delivered (Experiência stats); lead
time range (Prazo row and FAQ); payment terms (FAQ "Como funciona o
pagamento?"); whether the technical visit is free; the paint colour chart;
the catalog PDF (and its size/date); the Google Business profile URL,
rating, review count and three quotes; up to six Instagram post URLs; the
**hero illustration**; the **"Para profissionais" text**; real photos to
replace the stock ones; licensed Gilroy files if desired.

## 9. Design references

Figma https://www.figma.com/design/CGH4o9ErKxTlo4oU75rCdW (revised
2026-10-22) — desktop row: `19:2` Guia de estilo, `47:2` Home, `49:2`
Portfólio, `53:2` Peça, `55:2` Sobre nós, `56:2` Para profissionais,
`51:2` Contato, `52:2` Processo, `54:2` Dúvidas frequentes, `26:2` Ficha
técnica; mobile row: `48:2` Home, `50:2` Portfólio, `20:2` Peça, `22:2`
Carrinho, `23:2` Móvel personalizado, `25:2` Ficha técnica. The client's
22 comments are on the same page (pins sit at the old frames' positions).
The Claude Design canvas https://claude.ai/artifact/Gdmjzpk39LFEjkjumyyaeb
has the same boards as editable HTML (`*.dc.html`), useful for copying
copy and SVG paths verbatim.
