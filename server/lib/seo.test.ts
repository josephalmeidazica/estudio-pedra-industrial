import { expect, test } from "vitest";
import {
  buildHead,
  faqJsonLd,
  injectHead,
  normalizeSiteUrl,
  ogDimensions,
  ogImagePathFor,
  renderHeadHtml,
  renderRobots,
  renderSitemap,
  resolveRoute,
  sitemapEntries,
  type ProductForHead,
} from "./seo";

const site = "https://example.com.br";
const mesa: ProductForHead = {
  name: "Mesa Urb",
  slug: "mesa-urb",
  description: "Mesa urbana em aço carbono com design contemporâneo",
  category: "Mesas",
  materials: "Aço carbono, MDF",
  images: [{ url: "/uploads/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1080.webp", width: 1080, height: 1301 }],
};
const UUID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("resolveRoute", () => {
  expect(resolveRoute("/", "")).toEqual({ kind: "home" });
  expect(resolveRoute("/catalogo", "")).toEqual({ kind: "catalog", category: null });
  expect(resolveRoute("/catalogo/", "?categoria=mesas")).toEqual({ kind: "catalog", category: "mesas" });
  expect(resolveRoute("/catalogo/m%C3%B3vel-x/", "")).toEqual({ kind: "product", slug: "móvel-x" });
  expect(resolveRoute("/contato", "")).toEqual({ kind: "contact" });
  expect(resolveRoute("/admin", "")).toEqual({ kind: "admin" });
  expect(resolveRoute("/qualquer", "")).toEqual({ kind: "unknown" });
  expect(resolveRoute("/catalogo/a/b", "")).toEqual({ kind: "unknown" });
});

test("product head: title, description, canonical, JPEG cover, breadcrumb only", () => {
  const h = buildHead({ route: { kind: "product", slug: "mesa-urb" }, siteUrl: site, path: "/catalogo/mesa-urb", product: mesa });
  expect(h.status).toBe(200);
  expect(h.title).toBe("Mesa Urb — Estúdio Pedra Industrial");
  expect(h.description).toBe(
    "Mesa urbana em aço carbono com design contemporâneo. Materiais: Aço carbono, MDF. Sob medida em BH e região metropolitana. Peça um orçamento pelo WhatsApp."
  );
  expect(h.canonical).toBe("https://example.com.br/catalogo/mesa-urb");
  expect(h.ogType).toBe("product");
  expect(h.image).toEqual({
    url: "https://example.com.br/og/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg",
    width: 1080,
    height: 1301,
    alt: "Mesa Urb",
  });
  expect(h.jsonLd.map((j: any) => j["@type"])).toEqual(["BreadcrumbList"]);
  // wide covers are scaled to 1200 for the preview card
  const wide = buildHead({
    route: { kind: "product", slug: "w" },
    siteUrl: site,
    path: "/catalogo/w",
    product: { ...mesa, images: [{ url: `/uploads/${UUID_B}-1600.webp`, width: 1600, height: 1067 }] },
  });
  expect([wide.image?.width, wide.image?.height, wide.image?.url]).toEqual([1200, 800, `https://example.com.br/og/${UUID_B}.jpg`]);
  // legacy rows: url as-is, no dimensions
  const legacy = buildHead({
    route: { kind: "product", slug: "l" },
    siteUrl: site,
    path: "/catalogo/l",
    product: { ...mesa, images: [{ url: "/uploads/old.jpg", width: 0, height: 0 }] },
  });
  expect(legacy.image).toEqual({ url: "https://example.com.br/uploads/old.jpg", alt: "Mesa Urb" });
  expect(ogImagePathFor("/uploads/0f1e2d3c-1111-2222-3333-444455556666-960.webp")).toBe(
    "/og/0f1e2d3c-1111-2222-3333-444455556666.jpg"
  );
  expect(ogImagePathFor("/products/x.jpg")).toBeNull();
  expect(ogDimensions(0, 0)).toBeNull();
});

test("missing or unpublished product, unknown route and admin", () => {
  const nf = buildHead({ route: { kind: "product", slug: "x" }, siteUrl: site, path: "/catalogo/x", product: null });
  expect([nf.status, nf.robots, nf.canonical]).toEqual([404, "noindex, nofollow", null]);
  expect(nf.title).toBe("Página não encontrada — Estúdio Pedra Industrial");
  expect(buildHead({ route: { kind: "unknown" }, siteUrl: site, path: "/zzz" }).status).toBe(404);
  const admin = buildHead({ route: { kind: "admin" }, siteUrl: site, path: "/admin" });
  expect([admin.status, admin.robots, admin.description, admin.image]).toEqual([200, "noindex, nofollow", null, null]);
});

test("home, catalog and category heads", () => {
  const home = buildHead({ route: { kind: "home" }, siteUrl: site, path: "/" });
  expect(home.jsonLd.map((j: any) => j["@type"])).toEqual([["LocalBusiness", "HomeAndConstructionBusiness"]]);
  expect(home.image?.url).toBe("https://example.com.br/og-default.jpg");
  expect(home.canonical).toBe("https://example.com.br/");
  const cat = buildHead({ route: { kind: "catalog", category: "mesas" }, siteUrl: site, path: "/catalogo", categoryLabel: "Mesas" });
  expect(cat.title).toBe("Mesas — Portfólio | Estúdio Pedra Industrial");
  expect(cat.canonical).toBe("https://example.com.br/catalogo");
  const unknownCat = buildHead({ route: { kind: "catalog", category: "zzz" }, siteUrl: site, path: "/catalogo", categoryLabel: null });
  expect(unknownCat.title).toBe("Portfólio — Estúdio Pedra Industrial");
});

test("product without photos uses the default image", () => {
  const h = buildHead({ route: { kind: "product", slug: "s" }, siteUrl: site, path: "/catalogo/s", product: { ...mesa, images: [] } });
  expect(h.image).toEqual({
    url: "https://example.com.br/og-default.jpg",
    width: 1200,
    height: 630,
    alt: "Estúdio Pedra Industrial — móveis industriais sob medida",
  });
});

test("renderHeadHtml escapes owner text in attributes and JSON-LD", () => {
  const evil = { ...mesa, name: `Mesa "Loft" <b>&</b>`, description: "x</script><script>alert(1)</script>" };
  const html = renderHeadHtml(buildHead({ route: { kind: "product", slug: "s" }, siteUrl: site, path: "/catalogo/s", product: evil }));
  expect(html).toContain("<title>Mesa &quot;Loft&quot; &lt;b&gt;&amp;&lt;/b&gt; — Estúdio Pedra Industrial</title>");
  expect(html).not.toContain("</script><script>alert");
  // the product name reaches the BreadcrumbList JSON-LD: "<" must be escaped there too
  expect(html).toContain("\\u003cb>");
  expect(html).toContain("&lt;/script&gt;");
  expect(html).toContain('<meta property="og:locale" content="pt_BR">');
  expect(html).not.toContain("theme-color");
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  expect(html).toContain('<meta property="og:image:width" content="1080">');
});

test("injectHead with and without the marker", () => {
  const head = '<title>T</title><meta name="x" content="y">';
  const withMarker = '<html><head><title>Old</title><link rel="icon"><!--app-head--></head><body></body></html>';
  const out = injectHead(withMarker, head);
  expect(out).not.toContain("<title>Old</title>");
  expect(out).toContain('<link rel="icon"><title>T</title>');
  expect(out).not.toContain("app-head");
  const stale = "<html><head><title>Old</title></head><body></body></html>";
  expect(injectHead(stale, head)).toBe('<html><head><title>T</title><meta name="x" content="y"></head><body></body></html>');
});

test("sitemap, robots, normalizeSiteUrl", () => {
  const xml = renderSitemap(site, [{ path: "/" }, { path: "/catalogo/mesa-urb", lastmod: new Date("2026-10-20T12:00:00Z") }]);
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  expect(xml).toContain("<loc>https://example.com.br/catalogo/mesa-urb</loc>");
  expect(xml).toContain("<lastmod>2026-10-20</lastmod>");
  expect(renderRobots(site)).toBe("User-agent: *\nDisallow: /admin\nAllow: /\nSitemap: https://example.com.br/sitemap.xml\n");
  expect(normalizeSiteUrl("https://example.com.br//")).toBe("https://example.com.br");
});

test("new routes, titles, flagged professionals page, sitemap entries", () => {
  expect(resolveRoute("/processo", "")).toEqual({ kind: "process" });
  expect(resolveRoute("/duvidas/", "")).toEqual({ kind: "faq" });
  expect(resolveRoute("/sobre", "")).toEqual({ kind: "about" });
  expect(resolveRoute("/para-profissionais", "")).toEqual({ kind: "professionals" });
  expect(buildHead({ route: { kind: "about" }, siteUrl: site, path: "/sobre" }).title).toBe("Sobre nós — Estúdio Pedra Industrial");
  const off = buildHead({ route: { kind: "professionals" }, siteUrl: site, path: "/para-profissionais", professionalsEnabled: false });
  expect([off.status, off.robots, off.canonical]).toEqual([200, "noindex, follow", null]);
  const on = buildHead({ route: { kind: "professionals" }, siteUrl: site, path: "/para-profissionais", professionalsEnabled: true });
  expect([on.status, on.title]).toEqual([200, "Para profissionais — Estúdio Pedra Industrial"]);
  expect(sitemapEntries([], false).map((e) => e.path)).toEqual(["/", "/catalogo", "/processo", "/duvidas", "/sobre", "/contato"]);
  expect(sitemapEntries([], true).map((e) => e.path)).toContain("/para-profissionais");
  const home = buildHead({ route: { kind: "home" }, siteUrl: site, path: "/" });
  expect((home.jsonLd[0] as any).address.streetAddress).toBe("Rua João Gualberto dos Santos, 714");
  expect((home.jsonLd[0] as any).areaServed).toBe("Belo Horizonte e região metropolitana");
});

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
