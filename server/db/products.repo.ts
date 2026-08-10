import { asc, eq, inArray } from "drizzle-orm";
import type { DB } from "./client";
import {
  productImages,
  products,
  type Product,
  type ProductImage,
  type ProductWithImages,
} from "./schema";
import { makeUniqueSlug, slugify } from "../lib/slug";

async function attachImages(db: DB, rows: Product[]): Promise<ProductWithImages[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const imgs = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, ids))
    .orderBy(asc(productImages.sortOrder));
  const byProduct = new Map<number, ProductImage[]>();
  for (const img of imgs) {
    const list = byProduct.get(img.productId) ?? [];
    list.push(img);
    byProduct.set(img.productId, list);
  }
  return rows.map((r) => ({ ...r, images: byProduct.get(r.id) ?? [] }));
}

export async function listPublished(db: DB): Promise<ProductWithImages[]> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.published, true))
    .orderBy(asc(products.sortOrder));
  return attachImages(db, rows);
}

export async function listAll(db: DB): Promise<ProductWithImages[]> {
  const rows = await db.select().from(products).orderBy(asc(products.sortOrder));
  return attachImages(db, rows);
}

export async function getBySlug(db: DB, slug: string): Promise<ProductWithImages | null> {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  return (await attachImages(db, rows))[0];
}

export type CreateProductInput = {
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  materials?: string;
  dimensions?: string;
  price?: number | null;
  featured?: boolean;
  published?: boolean;
  sortOrder?: number;
};
export type UpdateProductPatch = Partial<CreateProductInput>;

async function allSlugs(db: DB): Promise<Set<string>> {
  const rows = await db.select({ slug: products.slug }).from(products);
  return new Set(rows.map((r) => r.slug));
}

export async function createProduct(db: DB, input: CreateProductInput): Promise<Product> {
  const existing = await allSlugs(db);
  const base = slugify(input.slug ?? input.name);
  const slug = makeUniqueSlug(base, existing);
  const [row] = await db
    .insert(products)
    .values({
      slug,
      name: input.name,
      description: input.description ?? "",
      category: input.category ?? "",
      materials: input.materials ?? "",
      dimensions: input.dimensions ?? "",
      price: input.price ?? null,
      featured: input.featured ?? false,
      published: input.published ?? true,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row;
}

export async function updateProduct(
  db: DB,
  id: number,
  patch: UpdateProductPatch
): Promise<Product | undefined> {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  const fields = [
    "name", "description", "category", "materials",
    "dimensions", "price", "featured", "published", "sortOrder",
  ] as const;
  for (const k of fields) if (patch[k] !== undefined) values[k] = patch[k];
  if (patch.slug !== undefined) {
    const existing = await allSlugs(db);
    const current = await db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (current[0]) existing.delete(current[0].slug);
    values.slug = makeUniqueSlug(slugify(patch.slug), existing);
  }
  const [row] = await db.update(products).set(values).where(eq(products.id, id)).returning();
  return row;
}

/** Returns the deleted product's image urls, or undefined if no such product exists. */
export async function deleteProduct(db: DB, id: number): Promise<string[] | undefined> {
  const existing = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  if (existing.length === 0) return undefined;
  const imgs = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, id));
  await db.delete(products).where(eq(products.id, id)); // cascade removes images
  return imgs.map((i) => i.url);
}

export async function reorderProducts(db: DB, orderedIds: number[]): Promise<void> {
  db.transaction((tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      tx.update(products).set({ sortOrder: i }).where(eq(products.id, orderedIds[i])).run();
    }
  });
}
