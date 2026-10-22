// Pure SEO rendering: route resolution, <head> data, HTML tags, sitemap and
// robots. No I/O here; server/page.ts wires it to Express and the database.
import { FAQ } from "../../shared/content/faq";
import { SITE } from "../../shared/content/site";
import { DEFAULT_DESCRIPTION, SITE_NAME, descriptions, titles } from "../../shared/seo-text";

export type Route =
  | { kind: "home" }
  | { kind: "catalog"; category: string | null }
  | { kind: "product"; slug: string }
  | { kind: "contact" }
  | { kind: "process" }
  | { kind: "faq" }
  | { kind: "about" }
  | { kind: "professionals" }
  | { kind: "admin" }
  | { kind: "unknown" };

export type HeadImage = { url: string; width?: number; height?: number; alt: string };

export type HeadData = {
  title: string;
  description: string | null;
  canonical: string | null;
  robots: "index, follow" | "noindex, nofollow";
  ogType: "website" | "product";
  image: HeadImage | null;
  url: string;
  jsonLd: object[];
  status: 200 | 404;
};

export type ProductForHead = {
  name: string;
  slug: string;
  description: string;
  category: string;
  materials: string;
  images: { url: string; width: number; height: number }[];
};

export const DEFAULT_IMAGE = {
  path: "/og-default.jpg",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — móveis industriais sob medida`,
} as const;

export const OG_MAX_WIDTH = 1200;
const INSTAGRAM_URL = "https://instagram.com/estudio.pedraindustrial";
const PHONE = "+55 31 97180-3551";

// ---- routes ---------------------------------------------------------------

function stripTrailingSlash(p: string): string {
  return p.length > 1 && p.endsWith("/") ? p.replace(/\/+$/, "") : p;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function resolveRoute(pathname: string, search: string): Route {
  const path = stripTrailingSlash(pathname || "/");
  if (path === "/" || path === "/index.html") return { kind: "home" };
  if (path === "/contato") return { kind: "contact" };
  if (path === "/processo") return { kind: "process" };
  if (path === "/duvidas") return { kind: "faq" };
  if (path === "/sobre") return { kind: "about" };
  if (path === "/para-profissionais") return { kind: "professionals" };
  if (path === "/admin") return { kind: "admin" };
  if (path === "/catalogo") {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const category = params.get("categoria");
    return { kind: "catalog", category: category ? category : null };
  }
  const m = /^\/catalogo\/([^/]+)$/.exec(path);
  if (m) return { kind: "product", slug: safeDecode(m[1]) };
  return { kind: "unknown" };
}

// ---- images ---------------------------------------------------------------

const VARIANT_URL = /^\/uploads\/([0-9a-f-]{36})-\d+\.webp$/;

/** `/uploads/<uuid>-<w>.webp` -> `/og/<uuid>.jpg`; anything else has no derived JPEG. */
export function ogImagePathFor(url: string): string | null {
  const m = VARIANT_URL.exec(url);
  return m ? `/og/${m[1]}.jpg` : null;
}

/** Dimensions of the derived JPEG (width capped at 1200); null for legacy rows without a size. */
export function ogDimensions(width: number, height: number): { width: number; height: number } | null {
  if (!(width > 0) || !(height > 0)) return null;
  if (width <= OG_MAX_WIDTH) return { width, height };
  return { width: OG_MAX_WIDTH, height: Math.round((height * OG_MAX_WIDTH) / width) };
}

export function normalizeSiteUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

// ---- head -----------------------------------------------------------------

type BuildArgs = {
  route: Route;
  siteUrl: string;
  path: string;
  product?: ProductForHead | null;
  categoryLabel?: string | null;
  /** Whether the "Para profissionais" page is live; defaults to the content flag. */
  professionalsEnabled?: boolean;
};

function defaultImage(siteUrl: string): HeadImage {
  return { url: siteUrl + DEFAULT_IMAGE.path, width: DEFAULT_IMAGE.width, height: DEFAULT_IMAGE.height, alt: DEFAULT_IMAGE.alt };
}

function coverImage(siteUrl: string, p: ProductForHead): HeadImage {
  const cover = p.images[0];
  if (!cover) return defaultImage(siteUrl);
  const derived = ogImagePathFor(cover.url);
  const dims = ogDimensions(cover.width, cover.height);
  const url = siteUrl + (derived ?? cover.url);
  return dims ? { url, ...dims, alt: p.name } : { url, alt: p.name };
}

export function faqJsonLd(faq: typeof FAQ): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.flatMap((t) =>
      t.items.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    ),
  };
}

function localBusiness(siteUrl: string): object {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    name: SITE_NAME,
    url: siteUrl + "/",
    image: siteUrl + DEFAULT_IMAGE.path,
    description: DEFAULT_DESCRIPTION,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: "Belo Horizonte",
      addressRegion: "MG",
      addressCountry: "BR",
    },
    areaServed: SITE.serviceArea,
    sameAs: [INSTAGRAM_URL],
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "18:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday"], opens: "09:00", closes: "12:00" },
    ],
  };
}

function breadcrumbs(siteUrl: string, p: ProductForHead): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl + "/" },
      { "@type": "ListItem", position: 2, name: "Portfólio", item: siteUrl + "/catalogo" },
      { "@type": "ListItem", position: 3, name: p.name, item: `${siteUrl}/catalogo/${p.slug}` },
    ],
  };
}

function notFoundHead(siteUrl: string, path: string): HeadData {
  return {
    title: titles.notFound(),
    description: DEFAULT_DESCRIPTION,
    canonical: null,
    robots: "noindex, nofollow",
    ogType: "website",
    image: defaultImage(siteUrl),
    url: siteUrl + path,
    jsonLd: [],
    status: 404,
  };
}

export function buildHead({
  route,
  siteUrl,
  path,
  product,
  categoryLabel,
  professionalsEnabled = SITE.professionals !== null,
}: BuildArgs): HeadData {
  const base = {
    robots: "index, follow" as const,
    ogType: "website" as const,
    image: defaultImage(siteUrl),
    url: siteUrl + path,
    jsonLd: [] as object[],
    status: 200 as const,
  };
  switch (route.kind) {
    case "home":
      return { ...base, title: titles.home(), description: DEFAULT_DESCRIPTION, canonical: siteUrl + "/", jsonLd: [localBusiness(siteUrl)] };
    case "catalog": {
      const known = route.category && categoryLabel ? categoryLabel : null;
      return {
        ...base,
        title: known ? titles.category(known) : titles.catalog(),
        description: known ? descriptions.category(known) : descriptions.catalog(),
        canonical: siteUrl + "/catalogo",
      };
    }
    case "product": {
      if (!product) return notFoundHead(siteUrl, path);
      return {
        ...base,
        title: titles.product(product.name),
        description: descriptions.product(product.description, product.materials),
        canonical: `${siteUrl}/catalogo/${product.slug}`,
        ogType: "product",
        image: coverImage(siteUrl, product),
        jsonLd: [breadcrumbs(siteUrl, product)],
      };
    }
    case "contact":
      return { ...base, title: titles.contact(), description: descriptions.contact(), canonical: siteUrl + "/contato" };
    case "process":
      return { ...base, title: titles.process(), description: descriptions.process(), canonical: siteUrl + "/processo" };
    case "faq":
      return { ...base, title: titles.faq(), description: descriptions.faq(), canonical: siteUrl + "/duvidas", jsonLd: [faqJsonLd(FAQ)] };
    case "about":
      return { ...base, title: titles.about(), description: descriptions.about(), canonical: siteUrl + "/sobre" };
    case "professionals":
      if (!professionalsEnabled) return notFoundHead(siteUrl, path);
      return {
        ...base,
        title: titles.professionals(),
        description: descriptions.professionals(),
        canonical: siteUrl + "/para-profissionais",
      };
    case "admin":
      return { ...base, title: titles.admin(), description: null, canonical: null, robots: "noindex, nofollow", image: null };
    case "unknown":
      return notFoundHead(siteUrl, path);
  }
}

// ---- html -----------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const meta = (attr: "name" | "property", key: string, value: string) =>
  `<meta ${attr}="${key}" content="${escapeHtml(value)}">`;

export function renderHeadHtml(head: HeadData): string {
  const out: string[] = [`<title>${escapeHtml(head.title)}</title>`];
  if (head.description) out.push(meta("name", "description", head.description));
  if (head.canonical) out.push(`<link rel="canonical" href="${escapeHtml(head.canonical)}">`);
  out.push(meta("name", "robots", head.robots));
  out.push(meta("property", "og:type", head.ogType));
  out.push(meta("property", "og:site_name", SITE_NAME));
  out.push(meta("property", "og:locale", "pt_BR"));
  out.push(meta("property", "og:title", head.title));
  if (head.description) out.push(meta("property", "og:description", head.description));
  out.push(meta("property", "og:url", head.url));
  if (head.image) {
    out.push(meta("property", "og:image", head.image.url));
    if (head.image.width) out.push(meta("property", "og:image:width", String(head.image.width)));
    if (head.image.height) out.push(meta("property", "og:image:height", String(head.image.height)));
    out.push(meta("property", "og:image:alt", head.image.alt));
    out.push(meta("name", "twitter:card", "summary_large_image"));
    out.push(meta("name", "twitter:image", head.image.url));
  } else {
    out.push(meta("name", "twitter:card", "summary"));
  }
  out.push(meta("name", "twitter:title", head.title));
  if (head.description) out.push(meta("name", "twitter:description", head.description));
  for (const block of head.jsonLd) {
    out.push(`<script type="application/ld+json">${JSON.stringify(block).replace(/</g, "\\u003c")}</script>`);
  }
  return out.join("\n    ");
}

const TITLE_RE = /<title>[\s\S]*?<\/title>\s*/i;
const MARKER = "<!--app-head-->";

/** Replace the template's <title> and the <!--app-head--> marker with the rendered tags. */
export function injectHead(template: string, headHtml: string): string {
  const withoutTitle = template.replace(TITLE_RE, "");
  if (withoutTitle.includes(MARKER)) return withoutTitle.replace(MARKER, headHtml);
  return withoutTitle.replace(/<\/head>/i, `${headHtml}</head>`);
}

// ---- sitemap / robots -----------------------------------------------------

export function renderSitemap(siteUrl: string, entries: { path: string; lastmod?: Date }[]): string {
  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod ? `<lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>` : "";
      return `  <url><loc>${escapeHtml(siteUrl + e.path)}</loc>${lastmod}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function sitemapEntries(
  products: { slug: string; updatedAt: Date }[],
  professionalsEnabled: boolean
): { path: string; lastmod?: Date }[] {
  const paths = ["/", "/catalogo", "/processo", "/duvidas", "/sobre"];
  if (professionalsEnabled) paths.push("/para-profissionais");
  paths.push("/contato");
  return [
    ...paths.map((path) => ({ path })),
    ...products.map((p) => ({ path: `/catalogo/${p.slug}`, lastmod: p.updatedAt })),
  ];
}

export function renderRobots(siteUrl: string): string {
  return `User-agent: *\nDisallow: /admin\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
}
