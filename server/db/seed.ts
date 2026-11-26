import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import type { DB } from "./client";
import { processImage } from "../lib/imagePipeline";
import { products, productImages } from "./schema";
import { CATALOG, type CatalogPiece } from "./catalog";

const SEED = CATALOG;
const CUSTOM = SEED.find((p) => p.isCustom)!;
const LEGACY_CUSTOM_SLUG = "projetos-personalizados";

function rowOf(p: CatalogPiece, sortOrder: number) {
  return {
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    materials: p.materials,
    dimensions: p.dimensions,
    finishes: p.finishes,
    details: p.details,
    leadTime: p.leadTime,
    price: p.price,
    featured: false,
    isCustom: p.isCustom ?? false,
    published: p.published,
    sortOrder,
  };
}

export async function seedIfEmpty(db: DB): Promise<void> {
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length > 0) return;
  await db.insert(products).values(SEED.map((p, i) => rowOf(p, i)));
}

/**
 * Values the first seed shipped as stand-ins before the studio sent its fichas
 * (every piece had "Aço carbono, MDF"; Mesa Urb had example finishes/details).
 * The import treats them like empty fields.
 */
const PLACEHOLDERS: Partial<Record<"materials" | "finishes" | "details", string[]>> = {
  materials: ["Aço carbono, MDF"],
  finishes: ["Preto fosco (padrão) · outras cores sob consulta"],
  details: ["Base em C que entra por baixo do sofá ou da cama\nSapatas niveladoras"],
};

/**
 * Brings an already-seeded database up to the catalogue (`npm run catalog:import`).
 * For each catalogue piece that exists (Lixeira included), fills only ficha
 * fields that are empty or still hold a seed placeholder, and the price/prazo
 * only when unset: whatever the owner typed is kept. Pieces whose address
 * never existed are added as unpublished drafts. Safe to run more than once.
 */
export async function importCatalog(db: DB): Promise<{ filled: string[]; added: string[] }> {
  const filled: string[] = [];
  const added: string[] = [];
  const all = await db.select().from(products);
  const bySlug = new Map(all.map((r) => [r.slug, r]));
  let nextSort = all.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1;

  for (const piece of CATALOG) {
    const row = bySlug.get(piece.slug);
    if (!row) {
      await db.insert(products).values({ ...rowOf(piece, nextSort++), published: false });
      added.push(piece.slug);
      continue;
    }
    const patch: Record<string, unknown> = {};
    for (const k of ["materials", "dimensions", "finishes", "details", "leadTime"] as const) {
      const current = row[k].trim();
      const stale = current === "" || (PLACEHOLDERS[k as keyof typeof PLACEHOLDERS] ?? []).includes(current);
      if (stale && piece[k] !== "" && piece[k] !== current) patch[k] = piece[k];
    }
    if (row.price == null && piece.price != null) patch.price = piece.price;
    if (Object.keys(patch).length === 0) continue;
    await db.update(products).set({ ...patch, updatedAt: new Date() }).where(eq(products.id, row.id));
    filled.push(piece.slug);
  }
  return { filled, added };
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

/** Default photo file (under client/public/products/) per seeded slug; drafts have none yet. */
export const DEFAULT_PRODUCT_IMAGE_FILES: Record<string, string> = Object.fromEntries(
  SEED.filter((p) => p.published).map((p) => [p.slug, `${p.slug}.jpg`])
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
