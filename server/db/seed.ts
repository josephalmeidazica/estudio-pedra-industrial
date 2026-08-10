import { eq } from "drizzle-orm";
import type { DB } from "./client";
import { products, productImages } from "./schema";

const SEED: { slug: string; name: string; description: string; category: string }[] = [
  { slug: "estrutura-gaia", name: "Estrutura Gaia", description: "Estrutura modular que se adapta a qualquer espaço", category: "Estruturas" },
  { slug: "estante-divisio", name: "Estante Divisio", description: "Estante modular em aço carbono e MDF que divide espaços com elegância", category: "Estantes" },
  { slug: "luminaria-lua", name: "Luminária Lua", description: "Luminária artesanal que traz a serenidade da lua para seus ambientes", category: "Luminárias" },
  { slug: "luminaria-sol", name: "Luminária Sol", description: "Luminária que aquece e ilumina com a energia do sol", category: "Luminárias" },
  { slug: "mesa-cabeceira-loft", name: "Mesa de Cabeceira Loft", description: "Minimalismo, força e identidade urbana. Opções com gaveta e gaveta + nicho", category: "Mesas" },
  { slug: "mesa-office-l", name: "Mesa Office L", description: "Mesa de escritório em formato L, perfeita para home office", category: "Mesas" },
  { slug: "mesa-urb", name: "Mesa Urb", description: "Mesa urbana em aço carbono com design contemporâneo", category: "Mesas" },
  { slug: "penteadeira-glam", name: "Penteadeira Glam", description: "Penteadeira sofisticada que combina funcionalidade e elegância", category: "Penteadeiras" },
  { slug: "projetos-personalizados", name: "Projetos Personalizados", description: "Crie seu próprio móvel sob medida com nossa equipe", category: "Personalizados" },
];

export async function seedIfEmpty(db: DB): Promise<void> {
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length > 0) return;
  await db.insert(products).values(
    SEED.map((p, i) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category,
      materials: "Aço carbono, MDF",
      dimensions: "",
      price: null,
      featured: false,
      published: true,
      sortOrder: i,
    }))
  );
}

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
