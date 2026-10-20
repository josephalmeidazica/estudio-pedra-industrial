import { asc, eq, isNull } from "drizzle-orm";
import type { DB } from "./client";
import { galleryImages, type GalleryImage } from "./schema";

/** Gallery photos, excluding ones in the Lixeira. */
export async function listGallery(db: DB): Promise<GalleryImage[]> {
  return db.select().from(galleryImages).where(isNull(galleryImages.deletedAt)).orderBy(asc(galleryImages.sortOrder));
}

export async function addGalleryImage(
  db: DB,
  input: {
    url: string;
    width: number;
    height: number;
    variants: Record<string, string>;
    caption?: string;
    productId?: number | null;
  }
): Promise<GalleryImage> {
  const existing = await listGallery(db);
  const nextOrder = existing.length === 0 ? 0 : Math.max(...existing.map((g) => g.sortOrder)) + 1;
  const [row] = await db
    .insert(galleryImages)
    .values({
      url: input.url,
      width: input.width,
      height: input.height,
      variants: input.variants,
      caption: input.caption ?? "",
      productId: input.productId ?? null,
      sortOrder: nextOrder,
    })
    .returning();
  return row;
}

export async function updateGalleryImage(
  db: DB,
  id: number,
  patch: { caption?: string; productId?: number | null }
): Promise<GalleryImage | undefined> {
  const values: Partial<GalleryImage> = {};
  if (patch.caption !== undefined) values.caption = patch.caption;
  if (patch.productId !== undefined) values.productId = patch.productId;
  if (Object.keys(values).length === 0) {
    const rows = await db.select().from(galleryImages).where(eq(galleryImages.id, id)).limit(1);
    return rows[0];
  }
  const [row] = await db.update(galleryImages).set(values).where(eq(galleryImages.id, id)).returning();
  return row;
}

/** Returns the deleted image's url (for file cleanup), or null if no such row. */
export async function deleteGalleryImage(db: DB, id: number): Promise<string | null> {
  const rows = await db.select({ url: galleryImages.url }).from(galleryImages).where(eq(galleryImages.id, id)).limit(1);
  if (rows.length === 0) return null;
  await db.delete(galleryImages).where(eq(galleryImages.id, id));
  return rows[0].url;
}

export async function reorderGallery(db: DB, orderedIds: number[]): Promise<void> {
  db.transaction((tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      tx.update(galleryImages).set({ sortOrder: i }).where(eq(galleryImages.id, orderedIds[i])).run();
    }
  });
}
