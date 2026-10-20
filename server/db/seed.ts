import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import type { DB } from "./client";
import { processImage } from "../lib/imagePipeline";
import { products, productImages } from "./schema";

const SEED: { slug: string; name: string; description: string; category: string; isCustom?: boolean }[] = [
  { slug: "estrutura-gaia", name: "Estrutura Gaia", description: "Estrutura modular que se adapta a qualquer espaço", category: "Estruturas" },
  { slug: "estante-divisio", name: "Estante Divisio", description: "Estante modular em aço carbono e MDF que divide espaços com elegância", category: "Estantes" },
  { slug: "luminaria-lua", name: "Luminária Lua", description: "Luminária artesanal que traz a serenidade da lua para seus ambientes", category: "Luminárias" },
  { slug: "luminaria-sol", name: "Luminária Sol", description: "Luminária que aquece e ilumina com a energia do sol", category: "Luminárias" },
  { slug: "mesa-cabeceira-loft", name: "Mesa de Cabeceira Loft", description: "Minimalismo, força e identidade urbana. Opções com gaveta e gaveta + nicho", category: "Mesas" },
  { slug: "mesa-office-l", name: "Mesa Office L", description: "Mesa de escritório em formato L, perfeita para home office", category: "Mesas" },
  { slug: "mesa-urb", name: "Mesa Urb", description: "Mesa urbana em aço carbono com design contemporâneo", category: "Mesas" },
  { slug: "penteadeira-glam", name: "Penteadeira Glam", description: "Penteadeira sofisticada que combina funcionalidade e elegância", category: "Penteadeiras" },
  { slug: "movel-personalizado", name: "Móvel personalizado", description: "Não achou o que procura? Descreva o móvel dos seus sonhos e fazemos sob medida.", category: "Personalizados", isCustom: true },
];

const CUSTOM = SEED[SEED.length - 1];
const LEGACY_CUSTOM_SLUG = "projetos-personalizados";

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
      isCustom: p.isCustom ?? false,
      published: true,
      sortOrder: i,
    }))
  );
}

/**
 * One-time conversion for databases seeded before the custom piece existed:
 * if nothing is marked `isCustom` and the old "Projetos Personalizados" row
 * is still there, turn it into "Móvel personalizado". Never inserts, so an
 * owner who removed the custom piece on purpose is respected.
 */
export async function ensureCustomProduct(db: DB): Promise<void> {
  const custom = await db.select({ id: products.id }).from(products).where(eq(products.isCustom, true)).limit(1);
  if (custom.length > 0) return;
  const legacy = await db.select({ id: products.id }).from(products).where(eq(products.slug, LEGACY_CUSTOM_SLUG)).limit(1);
  if (legacy.length === 0) return;
  await db
    .update(products)
    .set({ slug: CUSTOM.slug, name: CUSTOM.name, description: CUSTOM.description, isCustom: true, updatedAt: new Date() })
    .where(eq(products.id, legacy[0].id));
}

/** Default photo file (under client/public/products/) per seeded slug. */
export const DEFAULT_PRODUCT_IMAGE_FILES: Record<string, string> = Object.fromEntries(
  SEED.map((p) => [p.slug, `${p.slug}.jpg`])
);

// Anchored to process.cwd() — see server/db/client.ts.
export function defaultImagePath(file: string): string {
  return path.join(process.cwd(), "client", "public", "products", file);
}

/**
 * Attach a default image to any known product that currently has none. The
 * default JPEG is run through the same variant pipeline as owner uploads so
 * there is a single rendering path.
 *
 * Idempotent: only acts when a product has zero images, so it never
 * duplicates and never overrides owner-added photos.
 *
 * Tradeoff: the guard is "has zero images", so if the owner later deletes
 * ALL images from one of the seeded products, its default image is
 * re-added on the next boot. Acceptable for default illustrative images.
 */
export async function ensureProductImages(db: DB): Promise<void> {
  for (const [slug, file] of Object.entries(DEFAULT_PRODUCT_IMAGE_FILES)) {
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

    const source = defaultImagePath(file);
    if (!fs.existsSync(source)) {
      console.warn(`[seed] default image missing for ${slug}: ${source}`);
      continue;
    }
    const processed = await processImage(fs.readFileSync(source));
    await db.insert(productImages).values({
      productId: product.id,
      alt: product.name,
      sortOrder: 0,
      ...processed,
    });
  }
}
