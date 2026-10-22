# Batch 5 — Novo site (redesign + pedidos do cliente) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public site on the brand manual (Areia/Bege/Preto, Outfit, square, no shadows) following the client-reviewed Figma frames, keep the WhatsApp quote flow intact, and add the client's requests: Processo, Dúvidas, Sobre nós and (flagged) Para profissionais pages, ficha técnica viewer, two optional quote fields + "1 dia útil" badge, the home's Diferenciais/Serviços/Experiência/Instagram/Avaliações sections, the portfolio's installed-pieces strip and PDF band, and the workshop address everywhere.

**Architecture:** Tokens change in `client/src/index.css` (same shadcn names, brand values, radius 0) so every component re-themes; public components are rewritten per page under `client/src/components/{layout,icons,home,catalog,product,cart}`. Two product columns (`finishes`, `details`) flow from Drizzle through the existing `products` router into the editor and the viewer. Static copy lives in `shared/content/*.ts` so the server renders FAQ JSON-LD and titles from the same source; unconfirmed facts are `null` and hide their UI (including the whole Para profissionais page). Cart `Customer` gains two optional fields that extend the message only when filled.

**Tech Stack:** React 19, Vite 7, Tailwind v4, shadcn/ui (Accordion, Drawer/vaul, Sheet, Dialog, Tabs), wouter, tRPC 11, zod, Express 4, Drizzle + better-sqlite3, sharp, vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-22-batch5-site-redesign-design.md` (revised 2026-10-22 from the client's Figma comments; §9 lists the frame node ids)

## Global Constraints

- Branch `feat/batch5-redesign` from `main` (`6e90e46`). Commits `feat(site|catalog|product|cart|home|seo|admin): …`, `chore: …`, `docs: …`. Run `npm run check` at the end of every task; `npm test` at the end of every task that touches `.ts` logic.
- Public URLs unchanged: `/`, `/catalogo`, `/catalogo/<slug>`, `/contato`, `/admin`; new `/processo`, `/duvidas`, `/sobre`, `/para-profissionais` (404 `noindex` while `SITE.professionals` is null). No `#sobre` anchor on the home.
- Palette (spec §4.1): `--background #EAE0CE`, `--foreground/--primary/--ring #000000`, `--primary-foreground #EAE0CE`, `--card/--secondary/--muted/--border/--input #D2B389`, `--muted-foreground #3A3A3A`, `--accent #B37640`, `--accent-foreground #EAE0CE`, `--brand-green #1F3A30`, `--brand-concrete #828282`, `--radius 0`, `--font-sans 'Outfit', system-ui, sans-serif`. No `shadow-*` on public components. No `.dark` palette. Cobre and Cinza never for text < 18 px on Areia.
- Type: Outfit 300/400/500 from Google Fonts; headings weight 300; labels 12 px, tracking `0.24em`, uppercase; body 17/16 px, line-height 1.6, `max-width: 65ch` on running text. Touch targets ≥ 44 px on phones.
- Nav (spec §4.3): `Início /`, `Portfólio /catalogo`, `Processo /processo`, `Sobre nós /sobre`, `Dúvidas /duvidas`, `Para profissionais /para-profissionais` (only when `SITE.professionals` is set), `Contato /contato`; 28 px gap on desktop; links + quote button in the Sheet below 1024 px.
- Copy in Brazilian Portuguese taken from the Figma frames (spec §9). **No `[bracketed]` text ships**: `shared/content/content.test.ts` greps every content module. The Para profissionais frame copy is illustrative and is **not** typed into content; the page waits for the client's text.
- Address everywhere (footer, Contato, Sobre nós, JSON-LD): `SITE.address = { street: "Rua João Gualberto dos Santos, 714", district: "Céu Azul", city: "Belo Horizonte — MG" }`. Service area string: `Belo Horizonte e região metropolitana`.
- Message strings: `GENERIC_QUOTE_MESSAGE` unchanged; `CATALOG_MESSAGE = "Olá! Gostaria de receber o catálogo em PDF do Estúdio Pedra Industrial."`; cart message gains `Medidas aproximadas: …` and `Para quando: …` lines only when filled, placed between the item list and `Total de itens`.
- Browser verification with the devtools plugin at 390 × 844 and 1440 × 900; screenshots go to the scratchpad, never into the repo (remove any stray `${HOME}` folder the plugin creates in the cwd).

## Review Focus

1. **The flagged page**: with `SITE.professionals = null`, `/para-profissionais` must answer 404 with `noindex`, appear in neither nav nor footer nor sitemap, and the client route must render `NotFound`; with content set, all four flip without other code changes. Tests in Task 6 (`buildHead`, sitemap) and a browser check in Task 15.
2. **Legacy stored customer**: `{ name, bairro }` saved by Batch 2 loads with the new optional fields undefined, and a cart with no measurements/deadline produces exactly the Batch 2 message. Tests in Task 9 (`parseStoredCustomer`, `buildWhatsAppMessage`).
3. **"Tenho uma data" with nothing typed**: `deadline = { kind: "data", when: "   " }` adds no "Para quando" line and never sends an empty value. Test in Task 9.
4. **Product with zero images, or the custom piece**: the card shows the placeholder, the viewer cannot open (no button rendered), the share image falls back to the default; the custom card hides its photo even when it has one. Tests in Task 7 (`cardImage`) and the existing `buildHead` default-image path.
5. **FAQ JSON-LD escaping**: a question or answer containing `<`, `&` or `"` renders valid JSON inside `<script type="application/ld+json">` (existing `renderHeadHtml` escapes `<`; the test asserts on the rendered HTML). Test in Task 13.

---

## Part A — Foundations

### Task 1: Brand assets, content modules and the no-brackets guard

**Files:**
- Create: `client/public/brand/{simbolo-preto,simbolo-bege,tipografico-preto,assinatura-bege,pattern}.png`, `client/public/brand/icons/{luminaria-lua,luminaria-sol,mesa-loft,mesa-urb,mesa-office-l,penteadeira,estante-divisio,estrutura-gaia,floreira,reforma-sofa}.png`
- Create: `shared/content/site.ts`, `shared/content/home.ts`, `shared/content/processo.ts`, `shared/content/faq.ts`, `shared/content/sobre.ts`, `shared/content/content.test.ts`
- Create: `client/src/lib/categoryIcons.ts`, `client/src/lib/categoryIcons.test.ts`

**Interfaces:**
- Produces `shared/content/site.ts`: `SITE` exactly as spec §4.12 (`responseTime`, `warranty`, `serviceArea`, `address`, `professionals: null`, `leadTime: null`, `stats` (two entries), `catalogPdf: null`, `reviews: null`, `instagramPosts: []`), `type ProfessionalsContent = { lead: string; offers: { title: string; text: string }[]; steps: { title: string; text: string }[]; ctaTitle: string; ctaText: string }`, plus `INSTAGRAM_URL = "https://instagram.com/estudio.pedraindustrial"`, `INSTAGRAM_HANDLE = "@estudio.pedraindustrial"`, `PHONE_DISPLAY = "(31) 97180-3551"`, `HOURS = ["Segunda a sexta: 8h às 18h", "Sábado: 9h às 12h", "Domingo: fechado"]`, `addressLines(): [string, string]` → `["Rua João Gualberto dos Santos, 714 · Céu Azul", "Belo Horizonte — MG"]`.
- Produces `shared/content/home.ts`: `HOME = { hero: { label, title, text }, diferenciais: { icon: "hammer"|"ruler"|"shield"|"pin"; label: string; text: string }[4], servicos: { icon: "mesa-urb"|"reforma-sofa"|"mesa-office-l"; title; text; linkLabel }[3], cta: { title, text } }` with the copy from Figma 47:2 (spec §4.5 items 1–3 and 9).
- Produces `shared/content/processo.ts`: `type ProcessStep = { n: string; title: string; homeTitle?: string; inHome: boolean; icon: "whatsapp"|"ruler"|"pencil-ruler"|"wrench"|"truck"; tag: string; lead: string; summary: string; bullets: string[] }`, `PROCESSO: { intro: { title: string; text: string }; steps: ProcessStep[] }` with five steps (`inHome` true for 1, 3, 4, 5; step 3 `homeTitle: "Projeto"`), `homeSteps(): ProcessStep[]`. Copy from Figma 52:2 / 47:2 with these bracket-free rewrites: step 1 bullet 2 "Primeira estimativa de valor e de prazo"; step 2 bullet 1 "Visita técnica em BH e região metropolitana"; step 3 bullet 3 "Orçamento fechado em PDF, com prazo e forma de pagamento"; step 4 bullet 1 "Prazo informado no orçamento, conforme a peça". Tags per spec §4.9.
- Produces `shared/content/faq.ts`: `type FaqItem = { q: string; a: string }`, `FAQ: { theme: string; slug: string; items: FaqItem[] }[]` — five themes from Figma 54:2; answers rewritten without brackets: "Quanto tempo leva…" → "Depende da peça e da fila da oficina. Luminárias e mesas de cabeceira costumam ser mais rápidas; estantes e móveis grandes, mais demoradas. O prazo exato vai no orçamento."; "Como funciona o pagamento?" → "Combinamos um sinal para iniciar a produção e o restante na entrega. As formas de pagamento vão no orçamento."; "O orçamento tem custo?" → "Não. A conversa, a estimativa e o orçamento fechado são gratuitos. As condições da visita técnica são combinadas no WhatsApp."; "A instalação está incluída?" and "Posso escolher a cor…" → drop the trailing bracket.
- Produces `shared/content/sobre.ts`: `SOBRE = { lead: string; historia: { title: string; paragraphs: string[3]; tag: "Oficina própria · Céu Azul, BH" }; pilares: { missao, visao, valores }: string; valoresDetalhe: { n: "01"|"02"|"03"; title; text }[3]; oficina: { title: "Onde as peças nascem"; atendemos: string }; cta: { title: "Vamos desenhar a sua peça?"; text } }` from Figma 55:2 and today's `Home.tsx` texts.
- Produces `client/src/lib/categoryIcons.ts`: `categoryIcon(slugOrLabel: string): string | null` → `/brand/icons/<name>.png` for `estantes, estruturas, luminarias, mesas, penteadeiras, floreiras, reformas`, `/brand/simbolo-preto.png` for `personalizados`, `null` otherwise; accepts a label and slugifies it.

- [ ] **Step 1: Copy the PNGs.** Source: session scratchpad `manual/final/` (`logo-tagline-bege.png` → `assinatura-bege.png`; `icon-<name>.png` → `icons/<name>.png`, dropping the `icon-` prefix). If the scratchpad is gone, re-extract from `C:\Users\josephz\Downloads\Manual_de_Marca_Estudio_Pedra_v4.pdf` with PyMuPDF (images + smask compositing; the logos are raster). Check: `ls client/public/brand client/public/brand/icons` lists 5 + 10 files, each < 400 KB.

- [ ] **Step 2: Write the failing tests**

```ts
// shared/content/content.test.ts
import { expect, test } from "vitest";
import { FAQ } from "./faq";
import { HOME } from "./home";
import { PROCESSO, homeSteps } from "./processo";
import { SITE, addressLines } from "./site";
import { SOBRE } from "./sobre";

const BRACKET = /\[[^\]]*[A-Za-zÀ-ú0-9]/;
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

test("no illustrative [bracketed] text in any content module", () => {
  for (const s of strings([SITE, PROCESSO, FAQ, HOME, SOBRE])) expect(s, s).not.toMatch(BRACKET);
});

test("processo: five steps with icons and tags, four on the home with Projeto shortened", () => {
  expect(PROCESSO.steps.map((s) => s.n)).toEqual(["01", "02", "03", "04", "05"]);
  expect(PROCESSO.steps.map((s) => s.icon)).toEqual(["whatsapp", "ruler", "pencil-ruler", "wrench", "truck"]);
  expect(homeSteps().map((s) => s.homeTitle ?? s.title)).toEqual(["Conversa", "Projeto", "Fabricação", "Entrega"]);
  for (const s of PROCESSO.steps) expect(s.bullets).toHaveLength(3);
});

test("faq: five themes with slugs and at least two items each", () => {
  expect(FAQ.map((t) => t.theme)).toEqual(["Prazo e pedido", "Pagamento", "Entrega e instalação", "Materiais e cuidados", "Garantia"]);
  for (const t of FAQ) expect(t.items.length).toBeGreaterThanOrEqual(2);
});

test("home: four diferenciais and three serviços", () => {
  expect(HOME.diferenciais.map((d) => d.label)).toEqual(["Fabricação própria", "Peças sob medida", "Garantia de 3 meses", "BH e região metropolitana"]);
  expect(HOME.servicos).toHaveLength(3);
});

test("site facts default to hidden until confirmed; address is fixed", () => {
  expect([SITE.leadTime, SITE.catalogPdf, SITE.reviews, SITE.instagramPosts, SITE.professionals]).toEqual([null, null, null, [], null]);
  expect(SITE.stats.map((s) => s.value)).toEqual(["3 meses", "100%"]);
  expect(addressLines()).toEqual(["Rua João Gualberto dos Santos, 714 · Céu Azul", "Belo Horizonte — MG"]);
  expect(SOBRE.valoresDetalhe.map((v) => v.title)).toEqual(["Personalidade", "Cuidado", "Criatividade"]);
});
```

```ts
// client/src/lib/categoryIcons.test.ts
import { expect, test } from "vitest";
import { categoryIcon } from "./categoryIcons";

test("maps known categories by slug or label; unknown → null", () => {
  expect(categoryIcon("Luminárias")).toBe("/brand/icons/luminaria-lua.png");
  expect(categoryIcon("mesas")).toBe("/brand/icons/mesa-urb.png");
  expect(categoryIcon("Personalizados")).toBe("/brand/simbolo-preto.png");
  expect(categoryIcon("Cadeiras")).toBeNull();
  expect(categoryIcon("")).toBeNull();
});
```

- [ ] **Step 3: Run them** — `npx vitest run shared/content client/src/lib/categoryIcons` — Expected: FAIL, modules not found.
- [ ] **Step 4: Write the five content modules and `categoryIcons.ts`** with the interfaces above and the copy from the frames (use the Figma connector `get_design_context` on 47:2, 52:2, 54:2, 55:2 or the canvas `*.dc.html` text; keep diacritics).
- [ ] **Step 5: Run the tests** — Expected: PASS.
- [ ] **Step 6: Commit** — `git add client/public/brand shared client/src/lib/categoryIcons*` · `git commit -m "feat(site): brand assets and static content modules"`

### Task 2: Tokens, fonts and the og image

**Files:**
- Modify: `client/src/index.css`, `client/index.html`, `client/src/App.tsx` (remove the theme comment block only), `scripts/make-og-image.ts`
- Regenerate: `client/public/og-default.jpg`

**Interfaces:**
- CSS utilities kept by name, new definitions (spec §4.1): `.heading-display` (300, tracking `-0.01em`, `text-wrap: balance`), `.heading-secondary` (500, 12 px, tracking `0.12em`, uppercase), `.text-accent-mono` (400, 12 px, tracking `0.24em`, uppercase). New: `.lbl` = alias of `.text-accent-mono`; `.prose-measure { max-width: 65ch }`; `.pi` (product icon: `display:inline-block; background: currentColor; mask: var(--pi) center/contain no-repeat; -webkit-mask: …`) used as `<span class="pi" style={{ "--pi": "url(/brand/icons/x.png)" }}>`; `.pattern-bg` (pattern image via `::before`, opacity from `--pattern-opacity`, default `.12`).
- `index.html`: Outfit link `https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500&display=swap`, favicon `/brand/simbolo-preto.png`, `<title>` unchanged (the server replaces it).

- [ ] **Step 1: Replace the `:root` palette and delete the `.dark` block and `@custom-variant dark`**, set `--radius: 0`, add `--brand-green`, `--brand-concrete`, `--font-sans`, and set `body { font-family: var(--font-sans); font-size: 17px; line-height: 1.6 } @media (max-width: 639px) { body { font-size: 16px } }`; headings weight 300. Remove Montserrat everywhere in the file.
- [ ] **Step 2: Swap the Google Fonts link and favicon in `client/index.html`.**
- [ ] **Step 3: Update `scripts/make-og-image.ts`** to compose `client/public/brand/assinatura-bege.png` (height 300) centred on `#000000`; run `npm run og:image`. Expected output line: `…og-default.jpg: 1200x630 jpeg, … KB`.
- [ ] **Step 4: `npm run check` and `npm test`** — Expected: PASS (109 + Task 1 tests). Start `npm run dev`, open `http://localhost:3000` at 1440: page background `#EAE0CE`, Outfit loaded (devtools: `document.fonts.check("300 17px Outfit")` → true), buttons square. Admin `/admin` login screen still legible.
- [ ] **Step 5: Commit** — `git commit -am "feat(site): brand tokens, Outfit, square corners, new og image"` (add `client/public/og-default.jpg`).

## Part B — Data

### Task 3: Product columns `finishes` and `details`

**Files:**
- Modify: `server/db/schema.ts`, `server/db/products.repo.ts`, `server/routers/products.ts`
- Create: migration via `npm run db:generate` (`drizzle/0005_*.sql` + meta)
- Test: `server/db/products.repo.test.ts`, `server/routers/routers.test.ts`

**Interfaces:**
- Schema: `finishes: text("finishes").notNull().default("")`, `details: text("details").notNull().default("")`.
- `CreateProductInput` gains `finishes?: string; details?: string`; `createProduct` defaults them to `""`; `updateProduct`'s `fields` list gains both.
- Router `createInput` gains `finishes: z.string().optional()`, `details: z.string().optional()`.

- [ ] **Step 1: Write the failing tests**

```ts
// products.repo.test.ts (append)
test("finishes and details round-trip; defaults are empty", async () => {
  const db = freshDb();
  const a = await repo.createProduct(db, { name: "Mesa" });
  expect([a.finishes, a.details]).toEqual(["", ""]);
  const b = await repo.updateProduct(db, a.id, { finishes: "Preto fosco", details: "Base em C\nSapatas" });
  expect(b!.finishes).toBe("Preto fosco");
  expect((await repo.listPublished(db))[0].details).toBe("Base em C\nSapatas");
});
```

```ts
// routers.test.ts (append)
test("products.create accepts finishes and details", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const ok = await admin.products.create({ name: "Y", finishes: "Preto", details: "d" });
  expect([ok.finishes, ok.details]).toEqual(["Preto", "d"]);
});
```

- [ ] **Step 2: Run** `npx vitest run server/db/products.repo server/routers` — Expected: FAIL (unknown columns / type errors).
- [ ] **Step 3: Edit the schema, run `npm run db:generate`**, check the new `drizzle/0005_*.sql` adds the two columns with defaults; implement repo and router changes.
- [ ] **Step 4: Run the two test files** — Expected: PASS. `npm test` — Expected: all PASS.
- [ ] **Step 5: Commit** — `git add server drizzle` · `git commit -m "feat(catalog): acabamentos and detalhes columns on products"`

### Task 4: Admin editor fields

**Files:**
- Modify: `client/src/lib/productPatch.ts`, `client/src/components/admin/ProductEditor.tsx`
- Test: `client/src/lib/productPatch.test.ts`

**Interfaces:**
- `emptyForm` gains `finishes: ""`, `details: ""`; `ProductPatch` gains both (required); `buildProductPatch` copies them untrimmed like `materials`.
- Editor: after the Materiais/Dimensões grid, `Input id="p-fin"` "Acabamentos" (placeholder `Ex.: Pintura eletrostática preta fosca`) and `Textarea id="p-det"` "Detalhes" (placeholder `Um detalhe por linha`, rows 3). Form fill from `product` includes both.

- [ ] **Step 1: Write the failing test**

```ts
test("finishes and details travel in the patch", () => {
  const form = { ...emptyForm, name: "Mesa", finishes: "Preto", details: "a\nb" };
  expect(buildProductPatch(form, live, { slugDirty: false })).toMatchObject({ finishes: "Preto", details: "a\nb" });
  expect(buildProductPatch(emptyForm, live, { slugDirty: false })).toMatchObject({ finishes: "", details: "" });
});
```

- [ ] **Step 2: Run** `npx vitest run client/src/lib/productPatch` — Expected: FAIL (property missing).
- [ ] **Step 3: Implement** `productPatch.ts` and the editor fields.
- [ ] **Step 4: Run the test** — PASS. `npm run check`. In the browser (`/admin`, 375 px): open a piece, fill Acabamentos/Detalhes, Salvar, reopen → values persist; `products.list` in the network tab shows them.
- [ ] **Step 5: Commit** — `git commit -am "feat(admin): acabamentos and detalhes fields in the editor"`

## Part C — Chrome

### Task 5: Icons, header, footer, floating button

**Files:**
- Create: `client/src/components/icons/WhatsAppIcon.tsx`, `client/src/components/icons/InstagramIcon.tsx`, `client/src/components/icons/LineIcon.tsx`, `client/src/components/icons/ProductIcon.tsx`, `client/src/components/ui/ResponseBadge.tsx`
- Modify: `client/src/components/layout/SiteHeader.tsx`, `client/src/components/layout/SiteFooter.tsx`, `client/src/components/layout/Layout.tsx`, `client/src/components/WhatsAppFab.tsx`, `client/src/lib/whatsapp.ts`

**Interfaces:**
- `WhatsAppIcon({ className })`, `InstagramIcon({ className })`: `<svg viewBox="0 0 24 24" aria-hidden>`; WhatsApp path is the one in the canvas (`M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z…`); Instagram = rounded square + circle + dot (stroke 1.5).
- `LineIcon({ name, className })` with `name: "hammer" | "ruler" | "shield" | "pin" | "pencil-ruler" | "wrench" | "truck" | "clock"` — stroke 1.5 line icons (paths from the canvas / lucide), `currentColor`.
- `ProductIcon({ src, className })` renders `<span className="pi …" style={{ "--pi": \`url(${src})\` }} aria-hidden />`.
- `ResponseBadge({ className })` → Bege chip, `LineIcon name="clock"`, `SITE.responseTime`.
- `lib/whatsapp.ts` adds `CATALOG_MESSAGE` (Global Constraints).
- `navLinks(): { label; href }[]` in `SiteHeader.tsx` returns the seven links of the Global Constraints, omitting Para profissionais while `SITE.professionals` is null; header and footer both use it. `SiteHeader({ rightSlot?, backHref? })`: `backHref` set → below `sm` show `←` link + symbol instead of symbol + wordmark. Below `lg` (1024) the nav links and the quote button are only in the `Sheet`.
- `Layout({ children, showCart?, backHref?, fabHidden? })` passes through; `SiteFooter` reads `navLinks()`, `SITE`, `HOURS`, `INSTAGRAM_*`, `PHONE_DISPLAY`, `addressLines()`, and takes `extraLinks?: { label; href }[]` (the portfolio page passes "Catálogo em PDF" → `#catalogo` when `SITE.catalogPdf` is set).
- FAB: `bg-[var(--brand-green)] text-[var(--background)]`, `WhatsAppIcon`, `aria-label="Falar no WhatsApp"`, hidden when `fabHidden`.

- [ ] **Step 1: Build the icon components, the badge and the message constant.**
- [ ] **Step 2: Rewrite header, footer, FAB per spec §4.3** (Figma 47:2 top/bottom, 48:2 for the phone header). `Sheet` keeps `SheetTitle` sr-only.
- [ ] **Step 3: `npm run check`; browser at 390 and 1440 on `/`**: header shows symbol + wordmark 40 px tall, six links (no Para profissionais), cart badge Cobre, quote button black (desktop) / inside the menu (phone); footer black with the assinatura and the two address lines; FAB green bottom-right; tab order header → content → FAB.
- [ ] **Step 4: Commit** — `git add client/src` · `git commit -m "feat(site): brand header, footer, WhatsApp button and icon components"`

## Part D — Portfólio

### Task 6: SEO routes, titles and the flagged page (pure)

**Files:**
- Modify: `server/lib/seo.ts`, `server/page.ts`, `server/app.ts` (sitemap), `shared/seo-text.ts`
- Test: `server/lib/seo.test.ts`, `shared/seo-text.test.ts`, `server/page.test.ts`

**Interfaces:**
- `seo.ts`: `Route` gains `{ kind: "process" }` (`/processo`), `{ kind: "faq" }` (`/duvidas`), `{ kind: "about" }` (`/sobre`), `{ kind: "professionals" }` (`/para-profissionais`). `buildHead` takes `professionalsEnabled: boolean` (default `SITE.professionals !== null`); for `professionals` while disabled it returns the not-found head. `localBusiness()` adds `address: { "@type": "PostalAddress", streetAddress: "Rua João Gualberto dos Santos, 714", addressLocality: "Belo Horizonte", addressRegion: "MG", addressCountry: "BR" }` and `areaServed: SITE.serviceArea`.
- `seo-text.ts`: `titles.process()`, `titles.faq()`, `titles.about() = \`Sobre nós — ${SITE_NAME}\``, `titles.professionals() = \`Para profissionais — ${SITE_NAME}\``; `descriptions.process()`, `descriptions.faq()`, `descriptions.about()`, `descriptions.professionals()` (one sentence each, ≤ 160 chars, ending with the WhatsApp call to action); `DEFAULT_DESCRIPTION`, `PRODUCT_TAIL`, `descriptions.contact()` say "Belo Horizonte e região metropolitana".
- `app.ts` sitemap: `/processo`, `/duvidas`, `/sobre`, and `/para-profissionais` only when enabled; a pure `sitemapEntries(products, professionalsEnabled)` in `seo.ts` makes this testable.

- [ ] **Step 1: Write the failing tests**

```ts
// seo.test.ts (append)
test("new routes, titles, flagged professionals page, sitemap entries", () => {
  expect(resolveRoute("/processo", "")).toEqual({ kind: "process" });
  expect(resolveRoute("/duvidas/", "")).toEqual({ kind: "faq" });
  expect(resolveRoute("/sobre", "")).toEqual({ kind: "about" });
  expect(resolveRoute("/para-profissionais", "")).toEqual({ kind: "professionals" });
  expect(buildHead({ route: { kind: "about" }, siteUrl: site, path: "/sobre" }).title).toBe("Sobre nós — Estúdio Pedra Industrial");
  const off = buildHead({ route: { kind: "professionals" }, siteUrl: site, path: "/para-profissionais", professionalsEnabled: false });
  expect([off.status, off.robots]).toEqual([404, "noindex, nofollow"]);
  const on = buildHead({ route: { kind: "professionals" }, siteUrl: site, path: "/para-profissionais", professionalsEnabled: true });
  expect([on.status, on.title]).toEqual([200, "Para profissionais — Estúdio Pedra Industrial"]);
  expect(sitemapEntries([], false).map((e) => e.path)).toEqual(["/", "/catalogo", "/processo", "/duvidas", "/sobre", "/contato"]);
  expect(sitemapEntries([], true).map((e) => e.path)).toContain("/para-profissionais");
  const home = buildHead({ route: { kind: "home" }, siteUrl: site, path: "/" });
  expect((home.jsonLd[0] as any).address.streetAddress).toBe("Rua João Gualberto dos Santos, 714");
  expect((home.jsonLd[0] as any).areaServed).toBe("Belo Horizonte e região metropolitana");
});
```

```ts
// seo-text.test.ts (append)
test("new titles and the metropolitan-region descriptions", () => {
  expect(titles.process()).toBe("Processo — Estúdio Pedra Industrial");
  expect(titles.faq()).toBe("Dúvidas frequentes — Estúdio Pedra Industrial");
  expect(titles.about()).toBe("Sobre nós — Estúdio Pedra Industrial");
  for (const d of [DEFAULT_DESCRIPTION, descriptions.contact(), descriptions.process(), descriptions.faq(), descriptions.about(), descriptions.professionals()]) {
    expect(d.length).toBeLessThanOrEqual(160);
  }
  expect(DEFAULT_DESCRIPTION).toContain("região metropolitana");
});
```

In `page.test.ts`, extend the sitemap assertion to include `/processo`, `/duvidas`, `/sobre` and to exclude `/para-profissionais`; add `GET /para-profissionais` → status 404 and `GET /sobre` → `<title>Sobre nós — …`.

- [ ] **Step 2: Run** `npx vitest run server/lib/seo shared/seo-text server/page` — Expected: FAIL.
- [ ] **Step 3: Implement** the four modules. Existing pinned strings in `seo-text.test.ts` / `seo.test.ts` that contain "Belo Horizonte." are updated to the new wording in the same commit (intentional change, spec §3).
- [ ] **Step 4: Run** the three files, then `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(seo): Processo, Dúvidas, Sobre nós and flagged Para profissionais routes; address and region copy"`

### Task 7: Portfólio page UI: card, chips with icons, installed-pieces strip, PDF band

**Files:**
- Create: `client/src/components/catalog/CatalogPdfBand.tsx`, `client/src/lib/cardImage.ts`, `client/src/lib/cardImage.test.ts`, `client/src/lib/galleryCaption.ts`, `client/src/lib/galleryCaption.test.ts`
- Modify: `client/src/components/catalog/ProductCard.tsx`, `client/src/components/catalog/CategoryChips.tsx`, `client/src/components/home/AmbientesStrip.tsx` (move to `client/src/components/catalog/InstalledStrip.tsx`), `client/src/pages/Catalog.tsx`

**Interfaces:**
- `cardImage(product: Pick<PublicProduct, "isCustom" | "images">): PublicImage | null` — `null` for the custom piece or no images.
- `galleryCaption(caption: string, productName: string | undefined): string` — caption as typed; append ` · <name>` when a product is linked and the caption does not already include the name (case-insensitive); empty caption → name or "".
- `CategoryChips` adds the `ProductIcon` (via `categoryIcon(c.slug)`) before the label and renders "Todos · N" using a new `total` prop.
- `InstalledStrip()` — the renamed gallery strip: Bege band, label "Ambientes", H2 "Na casa dos nossos clientes", 288 × 360 tiles, `galleryCaption`, `ImageLightbox` footer unchanged; renders nothing when the gallery is empty.
- `CatalogPdfBand()` — `id="catalogo"`, black; reads `SITE.catalogPdf`; "Baixar catálogo (PDF)" only when set; "Receber pelo WhatsApp" → `whatsappUrl(CATALOG_MESSAGE)`; size/date line when known.
- `Catalog.tsx`: title rule, chips (sticky below `sm`), grid, `InstalledStrip`, `CatalogPdfBand`, footer `extraLinks` with "Catálogo em PDF" when a PDF exists. The custom piece's card gets `id="sob-medida"`.
- `ProductCard` per spec §4.6; the custom card shows `ProductIcon` with `/brand/simbolo-preto.png` on Bege and the label "Sob medida".

- [ ] **Step 1: Write the failing tests**

```ts
// cardImage.test.ts
import { expect, test } from "vitest";
import { cardImage } from "./cardImage";
const img = { url: "/u/a-480.webp", width: 1, height: 1, variants: {} } as any;
test("custom piece and empty galleries have no card image", () => {
  expect(cardImage({ isCustom: true, images: [img] })).toBeNull();
  expect(cardImage({ isCustom: false, images: [] })).toBeNull();
  expect(cardImage({ isCustom: false, images: [img] })).toBe(img);
});
```

```ts
// galleryCaption.test.ts
import { expect, test } from "vitest";
import { galleryCaption } from "./galleryCaption";
test("appends the piece name unless already present", () => {
  expect(galleryCaption("Quarto", "Mesa de Cabeceira Loft")).toBe("Quarto · Mesa de Cabeceira Loft");
  expect(galleryCaption("Sala · luminária sol", "Luminária Sol")).toBe("Sala · luminária sol");
  expect(galleryCaption("", "Mesa Urb")).toBe("Mesa Urb");
  expect(galleryCaption("", undefined)).toBe("");
});
```

- [ ] **Step 2: Run** `npx vitest run client/src/lib/cardImage client/src/lib/galleryCaption` — FAIL. Implement both helpers. Run — PASS.
- [ ] **Step 3: Build the components and the page** per Figma 49:2 / 50:2.
- [ ] **Step 4: `npm run check`; browser**: `/catalogo` at 1440 shows chips with icons; clicking Mesas filters and the URL reads `?categoria=mesas`; the strip shows the gallery photos with captions; the band shows only "Receber pelo WhatsApp"; at 390 the chip bar sticks while scrolling; the custom card shows the symbol and has `id="sob-medida"`.
- [ ] **Step 5: Commit** — `git add client/src` · `git commit -m "feat(catalog): brand portfolio page with iconed chips, installed-pieces strip and PDF band"`

## Part E — Peça

### Task 8: Product page, ficha técnica viewer, share, mobile action bar

**Files:**
- Create: `client/src/lib/ficha.ts`, `client/src/lib/ficha.test.ts`, `client/src/components/product/ProductViewer.tsx`, `client/src/components/product/FichaRows.tsx`, `client/src/components/product/MobileActionBar.tsx`, `client/src/components/product/ShareButton.tsx`
- Modify: `client/src/pages/Product.tsx`

**Interfaces:**
- `fichaRows(p: Pick<PublicProduct,"dimensions"|"materials"|"finishes"|"details"|"isCustom">, site: Pick<typeof SITE,"leadTime"|"warranty">): { label: string; value: string }[]` — order Medidas, Materiais, Acabamentos, Detalhes, Prazo, Garantia; empty values skipped; Medidas suffix ` · feita na medida do seu espaço` when `!isCustom`; Detalhes lines joined with ` · ` (blank lines dropped); Prazo only when `leadTime` non-null.
- `ProductViewer({ product, index, onIndexChange, onClose })` — desktop ≥ 1024: side panel; phone: `Drawer` (vaul) with `snapPoints={[0.45, 1]}`; both render `FichaRows`, `QuoteButton`, `AddToCartButton`; keyboard as `ImageLightbox`.
- `MobileActionBar({ product, anchorRef, onVisibilityChange })` — fixed bottom bar below `sm` when `anchorRef` is out of view (IntersectionObserver); the page passes `fabHidden` to `Layout` from `onVisibilityChange`.
- `ShareButton({ title, url })` — `navigator.share` else clipboard + `toast("Link copiado")`.

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "vitest";
import { fichaRows } from "./ficha";
const site = { leadTime: null, warranty: "3 meses contra defeitos de fabricação" };
test("rows in order, empties skipped, details joined, prazo hidden until known", () => {
  const rows = fichaRows({ dimensions: "60 × 40 × 65 cm", materials: "Aço carbono, MDF", finishes: "", details: "Base em C\n\nSapatas niveladoras", isCustom: false }, site);
  expect(rows).toEqual([
    { label: "Medidas", value: "60 × 40 × 65 cm · feita na medida do seu espaço" },
    { label: "Materiais", value: "Aço carbono, MDF" },
    { label: "Detalhes", value: "Base em C · Sapatas niveladoras" },
    { label: "Garantia", value: "3 meses contra defeitos de fabricação" },
  ]);
  expect(fichaRows({ dimensions: "", materials: "", finishes: "", details: "", isCustom: true }, { ...site, leadTime: "3 a 5 semanas" }).map((r) => r.label)).toEqual(["Prazo", "Garantia"]);
});
```

- [ ] **Step 2: Run** `npx vitest run client/src/lib/ficha` — FAIL. Implement `ficha.ts`. Run — PASS.
- [ ] **Step 3: Build the viewer, rows, action bar, share button and rewrite `Product.tsx`** per spec §4.7 (Figma 53:2, 26:2, 20:2, 25:2): breadcrumb, gallery with "i / N · ampliar e ver a ficha técnica", "Ficha técnica" button, info column with `FichaRows`, actions, facts ("Fabricação — Própria, em BH", "Entrega — BH e região metropolitana"), share, Veja também with "Outras <categoria> →". `Layout` gets `backHref="/catalogo"`. The "Ficha técnica" button and clickable photo render only when `images.length > 0`.
- [ ] **Step 4: `npm run check`; browser**: `/catalogo/mesa-urb` at 1440 — click the photo → viewer with panel, arrows change the photo, `Esc` closes; at 390 — viewer photo on black with the sheet; scroll the page until the buttons leave → bottom bar appears and the FAB hides; share copies the link in a desktop browser.
- [ ] **Step 5: Commit** — `git add client/src` · `git commit -m "feat(product): ficha técnica viewer, share, mobile action bar, brand product page"`

## Part F — Cart

### Task 9: Optional quote fields and the message

**Files:**
- Modify: `client/src/components/cart/storage.ts`, `client/src/components/cart/whatsapp.ts`, `client/src/components/cart/CartWidget.tsx`, `client/src/components/cart/CustomPieceDialog.tsx`
- Create: `client/src/components/cart/DeadlineChips.tsx`
- Test: `client/src/components/cart/storage.test.ts`, `client/src/components/cart/whatsapp.test.ts`

**Interfaces:**
- `storage.ts`: `type Deadline = { kind: "sem-pressa" } | { kind: "ate-1-mes" } | { kind: "ate-2-meses" } | { kind: "data"; when: string }`; `Customer = { name: string; bairro: string; measurements?: string; deadline?: Deadline }`; `parseStoredCustomer` accepts the optional fields and drops malformed ones; `deadlineLabel(d: Deadline): string | null` → `"Sem pressa" | "Em até 1 mês" | "Em até 2 meses" | when.trim() || null`.
- `buildWhatsAppMessage(customer, lines)` inserts, after the item list, `Medidas aproximadas: <trimmed>` when non-empty and `Para quando: <label>` when `deadlineLabel` is non-null, then a blank line, then `Total de itens`.
- `DeadlineChips({ value, onChange })` — four `aria-pressed` chips, "Qual data?" input when `kind === "data"`.
- `CartWidget` footer and `CustomPieceDialog` (`quote` mode) per spec §4.8, with `ResponseBadge` (Task 5) and the helper line "Preencha o bairro para enviar. Medidas e prazo são opcionais.".

- [ ] **Step 1: Write the failing tests**

```ts
// storage.test.ts (append)
test("parseStoredCustomer keeps the optional fields and drops malformed ones", () => {
  expect(parseStoredCustomer(JSON.stringify({ name: "M", bairro: "S" }))).toEqual({ name: "M", bairro: "S" });
  expect(parseStoredCustomer(JSON.stringify({ name: "M", bairro: "S", measurements: "1 m", deadline: { kind: "data", when: "Natal" } })))
    .toEqual({ name: "M", bairro: "S", measurements: "1 m", deadline: { kind: "data", when: "Natal" } });
  expect(parseStoredCustomer(JSON.stringify({ name: "M", bairro: "S", deadline: { kind: "amanha" } }))).toEqual({ name: "M", bairro: "S" });
  expect(deadlineLabel({ kind: "ate-1-mes" })).toBe("Em até 1 mês");
  expect(deadlineLabel({ kind: "data", when: "  " })).toBeNull();
});
```

```ts
// whatsapp.test.ts (append; EXPECTED stays as is for the legacy customer)
test("optional fields appear between the items and the total, only when filled", () => {
  const base = { name: "Maria", bairro: "Savassi" };
  expect(buildWhatsAppMessage({ ...base, measurements: "  ", deadline: { kind: "data", when: " " } }, lines)).toBe(EXPECTED);
  const full = buildWhatsAppMessage({ ...base, measurements: "120 × 60 cm", deadline: { kind: "ate-2-meses" } }, lines);
  expect(full).toContain("Descrição: mesa de jantar 2 m\n\nMedidas aproximadas: 120 × 60 cm\nPara quando: Em até 2 meses\n\nTotal de itens: 3");
  expect(buildWhatsAppMessage({ ...base, deadline: { kind: "data", when: "antes do Natal" } }, lines)).toContain("\n\nPara quando: antes do Natal\n\nTotal");
});
```

- [ ] **Step 2: Run** `npx vitest run client/src/components/cart` — FAIL.
- [ ] **Step 3: Implement** storage, message, chips, and the two UIs (Figma 22:2, 23:2).
- [ ] **Step 4: Run** the cart tests — PASS; `npm run check`. Browser at 390: add two pieces, open the cart, fill name/bairro, pick "Tenho uma data" and type a date, "Finalizar" opens `wa.me` whose decoded text has both new lines; clear the fields → text identical to before. Custom dialog in `quote` mode shows the same fields and the badge.
- [ ] **Step 5: Commit** — `git commit -am "feat(cart): medidas aproximadas, prazo chips and the 1-dia-útil badge"`

## Part G — Home

### Task 10: Home, upper half (hero → Como funciona)

**Files:**
- Create: `client/src/components/home/Hero.tsx`, `HeroIllustration.tsx`, `Diferenciais.tsx`, `Servicos.tsx`, `Destaques.tsx`, `ComoFunciona.tsx`
- Modify: `client/src/pages/Home.tsx` (becomes a list of sections)

**Interfaces:**
- `HeroIllustration()` — the stand-in composition from spec §4.5 item 1 (Bege panel, `.pattern-bg` at `--pattern-opacity: .18`, three `ProductIcon`s on a 2 px baseline, Cobre square, small label "Ilustração da marca"); a single file so the client's artwork replaces it later.
- `Hero` uses `HOME.hero` and `HeroIllustration`. `Diferenciais` renders `HOME.diferenciais` with `LineIcon` (4 columns, 2 on phones). `Servicos` renders `HOME.servicos` as three `<a>` cards whose `href` is `/catalogo`, `/catalogo?categoria=reformas` **only if** `extractCategories(products)` has slug `reformas` (else `/catalogo`), and `/catalogo#sob-medida`. `Destaques` is the existing featured grid on a Bege band. `ComoFunciona` uses `homeSteps()`.

- [ ] **Step 1: Build the six components**; `Home.tsx` renders them in spec §4.5 order (items 1–5), leaving placeholders for Task 11's sections. Delete the old feature row, services, about, pilares and CTA code.
- [ ] **Step 2: `npm run check`; browser** at 390 and 1440: illustration panel with three icons; four diferenciais cells with icons; Serviços cards are links (hover fills Bege) and the third lands on the custom card; Destaques on Bege; four steps.
- [ ] **Step 3: Commit** — `git add client/src` · `git commit -m "feat(home): hero illustration, diferenciais, serviços, destaques, como funciona"`

### Task 11: Home, lower half (Experiência → Chamada final)

**Files:**
- Create: `client/src/components/home/Experiencia.tsx`, `InstagramFeed.tsx`, `Avaliacoes.tsx`, `ChamadaFinal.tsx`
- Create: `client/src/lib/instagram.ts`, `client/src/lib/instagram.test.ts`
- Modify: `client/src/pages/Home.tsx`

**Interfaces:**
- `instagramEmbedUrl(postUrl: string): string | null` — accepts `https://www.instagram.com/p/<code>/…` or `/reel/<code>/`, returns `https://www.instagram.com/p/<code>/embed`; `null` for anything else.
- `Experiencia` renders `SITE.stats` on black with `.pattern-bg` (2 × 2 grid, Grafite separators) and the outline "Conhecer o processo" button. `InstagramFeed` renders header + button always; tiles (lazy iframes, mounted on intersection) only for valid URLs in `SITE.instagramPosts`. `Avaliacoes` renders nothing when `SITE.reviews` is null. `ChamadaFinal` uses `HOME.cta` with the symbol on Areia.

- [ ] **Step 1: Write the failing test**

```ts
import { expect, test } from "vitest";
import { instagramEmbedUrl } from "./instagram";
test("post and reel urls → embed url; others → null", () => {
  expect(instagramEmbedUrl("https://www.instagram.com/p/Cx1Ab2/?img_index=1")).toBe("https://www.instagram.com/p/Cx1Ab2/embed");
  expect(instagramEmbedUrl("https://instagram.com/reel/Zz9/")).toBe("https://www.instagram.com/p/Zz9/embed");
  expect(instagramEmbedUrl("https://instagram.com/estudio.pedraindustrial")).toBeNull();
});
```

- [ ] **Step 2: Run** `npx vitest run client/src/lib/instagram` — FAIL. Implement. PASS.
- [ ] **Step 3: Build the four sections**, wire `Home.tsx` (items 6–9 of spec §4.5).
- [ ] **Step 4: `npm run check`; browser**: stats on black with the texture; Instagram section shows handle + button, no tiles; reviews section absent; final CTA on Areia with the symbol; no PDF band, no Sobre, no Pilares on the home.
- [ ] **Step 5: Commit** — `git add client/src` · `git commit -m "feat(home): experiência, instagram, avaliações, chamada final"`

## Part H — New pages, Contato, 404

### Task 12: Processo page with icon panels

**Files:**
- Create: `client/src/pages/Processo.tsx`, `client/src/components/process/StepPanel.tsx`
- Modify: `client/src/App.tsx` (route `/processo`)

**Interfaces:**
- `StepPanel({ icon, tag })` — Bege square (420 px tall ≥ 640, 300 below), `.pattern-bg` at `--pattern-opacity: .16`, `LineIcon`/`WhatsAppIcon` 140 px black, uppercase tag bottom-left.

- [ ] **Step 1: Build the page** from `PROCESSO` per spec §4.9 (Figma 52:2): intro + `ResponseBadge`, five-step strip, step blocks alternating `StepPanel` left/right, step 1 WhatsApp button, step 5 link to `/duvidas`, final CTA. `usePageTitle(titles.process())`. Add the route.
- [ ] **Step 2: `npm run check`; browser**: `/processo` at 390 and 1440; `curl -s localhost:3000/processo | grep -o "<title>[^<]*"` → `Processo — Estúdio Pedra Industrial`.
- [ ] **Step 3: Commit** — `git add client/src` · `git commit -m "feat(site): Processo page with icon panels"`

### Task 13: Dúvidas frequentes page with FAQPage JSON-LD

**Files:**
- Create: `client/src/pages/Duvidas.tsx`
- Modify: `client/src/App.tsx` (route `/duvidas`), `server/lib/seo.ts` (`faqJsonLd`, used by `buildHead` for `faq`)
- Test: `server/lib/seo.test.ts`

**Interfaces:**
- `faqJsonLd(faq: typeof FAQ): object` → `{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } }…] }` flattened across themes.

- [ ] **Step 1: Write the failing test**

```ts
test("faq head carries FAQPage JSON-LD and special characters survive HTML rendering", () => {
  const real = buildHead({ route: { kind: "faq" }, siteUrl: site, path: "/duvidas" });
  expect(real.jsonLd.map((j: any) => j["@type"])).toEqual(["FAQPage"]);
  expect((real.jsonLd[0] as any).mainEntity.length).toBeGreaterThan(5);

  const tricky = [{ theme: "T", slug: "t", items: [{ q: 'Vocês fazem <vidro> & "madeira"?', a: "Sim." }] }];
  const ld = faqJsonLd(tricky as any) as any;
  expect(ld.mainEntity[0].acceptedAnswer).toEqual({ "@type": "Answer", text: "Sim." });
  const html = renderHeadHtml({ ...real, jsonLd: [ld] });
  const script = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)!;
  expect(script[1]).not.toContain("<");
  expect(JSON.parse(script[1]).mainEntity[0].name).toBe('Vocês fazem <vidro> & "madeira"?');
});
```

- [ ] **Step 2: Run** `npx vitest run server/lib/seo` — FAIL. Implement `faqJsonLd` and wire it into `buildHead` (`case "faq"` → `jsonLd: [faqJsonLd(FAQ)]`). PASS.
- [ ] **Step 3: Build the page** per spec §4.10 (Figma 54:2): intro, "Temas" chips scrolling to `#<slug>`, `Accordion` per theme (first item open), closing WhatsApp block. `usePageTitle(titles.faq())`. Add the route.
- [ ] **Step 4: `npm run check`; `npm test`; browser** at 390/1440; `curl -s localhost:3000/duvidas | grep -c FAQPage` → 1.
- [ ] **Step 5: Commit** — `git add client/src server` · `git commit -m "feat(site): Dúvidas frequentes page with FAQPage JSON-LD"`

### Task 14: Contato and 404

**Files:**
- Modify: `client/src/pages/Contact.tsx`, `client/src/pages/NotFound.tsx`

- [ ] **Step 1: Rewrite `Contact.tsx`** per spec §4.11 (Figma 51:2): two columns, four cards (WhatsApp, Instagram on Areia; Horário and **Nossa oficina** with `addressLines()` on Bege), the pattern strip, `showCart`. Restyle `NotFound.tsx` with the new tokens (label "Erro 404", black button).
- [ ] **Step 2: `npm run check`; browser** at 390/1440 for `/contato` (address card reads "Rua João Gualberto dos Santos, 714 · Céu Azul") and `/nao-existe` (404 status in the network tab).
- [ ] **Step 3: Commit** — `git commit -am "feat(site): Contato with the workshop address; 404 on the new look"`

### Task 15: Sobre nós page and the flagged Para profissionais page

**Files:**
- Create: `client/src/pages/Sobre.tsx`, `client/src/pages/ParaProfissionais.tsx`
- Modify: `client/src/App.tsx` (routes `/sobre`, `/para-profissionais`)

**Interfaces:**
- `Sobre` renders `SOBRE` per spec §4.9b (Figma 55:2): abertura, história (photo = cover of `selectFeatured(products)[0]`, pattern block, black tag), Pilares on black with the 01/02/03 list, "A oficina" three cards (`addressLines()`, map link `https://maps.google.com/?q=<encoded street + city>`, `HOURS`, `SOBRE.oficina.atendemos`), CTA. `usePageTitle(titles.about())`.
- `ParaProfissionais` renders `NotFound` when `SITE.professionals` is null; otherwise the structure of spec §4.9c from `SITE.professionals` (no copy of its own). `usePageTitle(titles.professionals())`.

- [ ] **Step 1: Build both pages and the routes.**
- [ ] **Step 2: `npm run check`; browser**: `/sobre` at 390 and 1440 matches 55:2 (photo, pilares, oficina cards with the address); `/para-profissionais` shows the 404 page and the header has no "Para profissionais" link. Temporarily set `SITE.professionals` to a two-line object in a local uncommitted edit: the link appears, the page renders, the sitemap lists it; revert the edit (`git checkout shared/content/site.ts`).
- [ ] **Step 3: Commit** — `git add client/src` · `git commit -m "feat(site): Sobre nós page and the flagged Para profissionais page"`

## Part I — Finish

### Task 16: Cleanup, docs, full visual pass

**Files:**
- Delete: `client/public/logo.png` (after `grep -rn "logo.png" client server scripts` returns nothing)
- Modify: `README.md` (Pages list, Home description, data fields, content modules, brand assets, Phase 2 note, how to enable Para profissionais), `.env.example` (no change expected; confirm)

- [ ] **Step 1: Remove `logo.png` and any remaining `Montserrat`, `rounded-`/`shadow-` classes on public components** (`grep -rn "shadow-\|rounded-" client/src/components/{home,catalog,product,process,layout,cart} client/src/pages` → only admin-facing files or justified exceptions documented in the commit).
- [ ] **Step 2: Admin legibility pass** at 375 px: Peças list, editor, Ambientes tab, Lixeira. Fix only token-level issues (spec §4.13); record the decision in the commit message.
- [ ] **Step 3: Full visual pass** with the devtools plugin: each public page at 390 and 1440 beside its Figma frame (spec §9); fix spacing/order/copy mismatches. Confirm no horizontal scroll at 390 on any page.
- [ ] **Step 4: README**: pages (`/processo`, `/duvidas`, `/sobre`, `/para-profissionais` and its flag), product fields, `shared/content/*` and the null-hides rule, brand assets folder, fonts, hero illustration swap, "Phase 2" paragraph pointing at spec §4.12.
- [ ] **Step 5: `npm run check && npm test && npm run build`**; `npm start` once and `curl -s localhost:3000/sitemap.xml | grep -c "<url>"` → 6 + products. Expected: all green.
- [ ] **Step 6: Commit** — `git add -A` · `git commit -m "docs: README for the redesigned site; remove old logo"`

---

## Self-review notes

- Spec coverage: §4.1–4.2 → Tasks 1–2; §4.3 → 5; §4.4 → 6, 12, 13, 15; §4.5 → 10, 11; §4.6 → 7; §4.7 → 3, 4, 8; §4.8 → 9; §4.9 → 12; §4.9b–c → 15; §4.10 → 13; §4.11 → 14; §4.12 → 1 (+ Phase 2 out of scope); §4.13 → 4, 16; §4.14 → 3, 6; §4.15 → every task's browser step and Task 16.
- Names used across tasks: `SITE`/`addressLines`/`HOURS`, `HOME`, `SOBRE`, `homeSteps`, `categoryIcon`, `ProductIcon`, `LineIcon`, `ResponseBadge`, `CATALOG_MESSAGE`, `navLinks`, `cardImage`, `galleryCaption`, `InstalledStrip`, `CatalogPdfBand`, `fichaRows`, `Deadline`/`deadlineLabel`, `faqJsonLd`, `sitemapEntries`, `Layout({ backHref, fabHidden })`, `SiteFooter({ extraLinks })` — defined once in their Produces blocks and consumed by name later.
- Review Focus items 1–5 each have a test in Tasks 6/15, 9, 9, 7, 13.
