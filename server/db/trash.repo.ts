import { and, desc, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import type { DB } from "./client";
import { galleryImages, productImages, products, type GalleryImage, type Product, type ProductImage } from "./schema";

export type TrashKind = "product" | "image" | "gallery";

export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export type TrashListing = {
  products: (Product & { images: ProductImage[]; deletedAt: Date })[];
  images: (ProductImage & { productName: string; deletedAt: Date })[];
  gallery: (GalleryImage & { deletedAt: Date })[];
};

/** Move one row to the Lixeira. False when it does not exist or is already there. */
export async function softDelete(db: DB, kind: TrashKind, id: number, now = new Date()): Promise<boolean> {
  switch (kind) {
    case "product": {
      const row = (await db.select({ deletedAt: products.deletedAt }).from(products).where(eq(products.id, id)).limit(1))[0];
      if (!row || row.deletedAt) return false;
      await db.update(products).set({ deletedAt: now }).where(eq(products.id, id));
      return true;
    }
    case "image": {
      const row = (await db.select({ deletedAt: productImages.deletedAt }).from(productImages).where(eq(productImages.id, id)).limit(1))[0];
      if (!row || row.deletedAt) return false;
      await db.update(productImages).set({ deletedAt: now }).where(eq(productImages.id, id));
      return true;
    }
    case "gallery": {
      const row = (await db.select({ deletedAt: galleryImages.deletedAt }).from(galleryImages).where(eq(galleryImages.id, id)).limit(1))[0];
      if (!row || row.deletedAt) return false;
      await db.update(galleryImages).set({ deletedAt: now }).where(eq(galleryImages.id, id));
      return true;
    }
  }
}

export async function listTrash(db: DB): Promise<TrashListing> {
  const deletedProducts = await db.select().from(products).where(isNotNull(products.deletedAt)).orderBy(desc(products.deletedAt));
  const productIds = deletedProducts.map((p) => p.id);
  const theirImages = productIds.length
    ? await db.select().from(productImages).where(and(inArray(productImages.productId, productIds), isNull(productImages.deletedAt)))
    : [];
  const byProduct = new Map<number, ProductImage[]>();
  for (const img of theirImages) byProduct.set(img.productId, [...(byProduct.get(img.productId) ?? []), img]);

  // Individually deleted photos of products that are themselves alive.
  const deletedImages = await db
    .select({ image: productImages, productName: products.name })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(and(isNotNull(productImages.deletedAt), isNull(products.deletedAt)))
    .orderBy(desc(productImages.deletedAt));

  const deletedGallery = await db.select().from(galleryImages).where(isNotNull(galleryImages.deletedAt)).orderBy(desc(galleryImages.deletedAt));

  return {
    products: deletedProducts.map((p) => ({ ...p, deletedAt: p.deletedAt!, images: (byProduct.get(p.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder) })),
    images: deletedImages.map((r) => ({ ...r.image, deletedAt: r.image.deletedAt!, productName: r.productName })),
    gallery: deletedGallery.map((g) => ({ ...g, deletedAt: g.deletedAt! })),
  };
}

/** Bring a row back. Restoring a photo whose product is in the Lixeira restores the product too. */
export async function restore(db: DB, kind: TrashKind, id: number): Promise<boolean> {
  switch (kind) {
    case "product": {
      const row = (await db.select({ deletedAt: products.deletedAt }).from(products).where(eq(products.id, id)).limit(1))[0];
      if (!row || !row.deletedAt) return false;
      await db.update(products).set({ deletedAt: null }).where(eq(products.id, id));
      return true;
    }
    case "image": {
      const row = (await db.select({ deletedAt: productImages.deletedAt, productId: productImages.productId }).from(productImages).where(eq(productImages.id, id)).limit(1))[0];
      if (!row || !row.deletedAt) return false;
      await db.update(productImages).set({ deletedAt: null }).where(eq(productImages.id, id));
      await db.update(products).set({ deletedAt: null }).where(and(eq(products.id, row.productId), isNotNull(products.deletedAt)));
      return true;
    }
    case "gallery": {
      const row = (await db.select({ deletedAt: galleryImages.deletedAt }).from(galleryImages).where(eq(galleryImages.id, id)).limit(1))[0];
      if (!row || !row.deletedAt) return false;
      await db.update(galleryImages).set({ deletedAt: null }).where(eq(galleryImages.id, id));
      return true;
    }
  }
}

/**
 * Hard delete of a row that is in the Lixeira. Returns the image urls whose
 * files must be removed from disk, or null when the row is not in the Lixeira
 * (missing, or alive again because it was restored from another device).
 */
export async function purge(db: DB, kind: TrashKind, id: number): Promise<string[] | null> {
  switch (kind) {
    case "product": {
      const row = (await db.select({ deletedAt: products.deletedAt }).from(products).where(eq(products.id, id)).limit(1))[0];
      if (!row?.deletedAt) return null;
      // Every photo of the piece, trashed or not: the cascade removes all their rows.
      const imgs = await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.productId, id));
      await db.delete(products).where(and(eq(products.id, id), isNotNull(products.deletedAt)));
      return imgs.map((i) => i.url);
    }
    case "image": {
      const deleted = await db
        .delete(productImages)
        .where(and(eq(productImages.id, id), isNotNull(productImages.deletedAt)))
        .returning({ url: productImages.url });
      return deleted.length ? deleted.map((d) => d.url) : null;
    }
    case "gallery": {
      const deleted = await db
        .delete(galleryImages)
        .where(and(eq(galleryImages.id, id), isNotNull(galleryImages.deletedAt)))
        .returning({ url: galleryImages.url });
      return deleted.length ? deleted.map((d) => d.url) : null;
    }
  }
}

/** Purge everything deleted more than `maxAgeMs` ago. Returns every file url to remove. */
export async function purgeExpired(db: DB, now = new Date(), maxAgeMs = TRASH_RETENTION_MS): Promise<string[]> {
  const cutoff = new Date(now.getTime() - maxAgeMs);
  const urls: string[] = [];
  const oldProducts = await db.select({ id: products.id }).from(products).where(and(isNotNull(products.deletedAt), lte(products.deletedAt, cutoff)));
  for (const p of oldProducts) urls.push(...((await purge(db, "product", p.id)) ?? []));
  const oldImages = await db.select({ id: productImages.id }).from(productImages).where(and(isNotNull(productImages.deletedAt), lte(productImages.deletedAt, cutoff)));
  for (const i of oldImages) urls.push(...((await purge(db, "image", i.id)) ?? []));
  const oldGallery = await db.select({ id: galleryImages.id }).from(galleryImages).where(and(isNotNull(galleryImages.deletedAt), lte(galleryImages.deletedAt, cutoff)));
  for (const g of oldGallery) urls.push(...((await purge(db, "gallery", g.id)) ?? []));
  return urls;
}
