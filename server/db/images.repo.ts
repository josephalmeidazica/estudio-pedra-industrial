import { asc, eq } from "drizzle-orm";
import type { DB } from "./client";
import { productImages, type ProductImage } from "./schema";

export async function listForProduct(db: DB, productId: number): Promise<ProductImage[]> {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));
}

export async function addImage(
  db: DB,
  input: {
    productId: number;
    url: string;
    alt?: string;
    width?: number;
    height?: number;
    variants?: Record<string, string>;
  }
): Promise<ProductImage> {
  const existing = await listForProduct(db, input.productId);
  const nextOrder =
    existing.length === 0 ? 0 : Math.max(...existing.map((i) => i.sortOrder)) + 1;
  const [row] = await db
    .insert(productImages)
    .values({
      productId: input.productId,
      url: input.url,
      alt: input.alt ?? "",
      sortOrder: nextOrder,
      width: input.width ?? 0,
      height: input.height ?? 0,
      variants: input.variants ?? {},
    })
    .returning();
  return row;
}

/** Rows stored before the variant pipeline: a single file, no intrinsic size. */
export async function listLegacy(db: DB): Promise<ProductImage[]> {
  return db.select().from(productImages).where(eq(productImages.width, 0));
}

export async function setProcessed(
  db: DB,
  imageId: number,
  p: { url: string; width: number; height: number; variants: Record<string, string> }
): Promise<void> {
  await db
    .update(productImages)
    .set({ url: p.url, width: p.width, height: p.height, variants: p.variants })
    .where(eq(productImages.id, imageId));
}

export async function deleteImage(db: DB, imageId: number): Promise<string | null> {
  const rows = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);
  if (rows.length === 0) return null;
  await db.delete(productImages).where(eq(productImages.id, imageId));
  return rows[0].url;
}

export async function reorderImages(
  db: DB,
  productId: number,
  orderedIds: number[]
): Promise<void> {
  db.transaction((tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      tx.update(productImages).set({ sortOrder: i }).where(eq(productImages.id, orderedIds[i])).run();
    }
  });
}

export async function setCover(db: DB, imageId: number): Promise<void> {
  const rows = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);
  if (rows.length === 0) return;
  const productId = rows[0].productId;
  const imgs = await listForProduct(db, productId);
  const ordered = [imageId, ...imgs.map((i) => i.id).filter((id) => id !== imageId)];
  await reorderImages(db, productId, ordered);
}
