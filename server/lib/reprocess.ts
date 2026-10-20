import fs from "node:fs";
import path from "node:path";
import type { DB } from "../db/client";
import * as repo from "../db/images.repo";
import { defaultImagePath } from "../db/seed";
import { processImage } from "./imagePipeline";
import { deleteImageByUrl, uploadsDir } from "./images";

/** Where a legacy row's bytes live on disk, or null for an unknown URL shape. */
export function sourcePathFor(url: string): string | null {
  const upload = /^\/uploads\/([^/\\]+)$/.exec(url);
  if (upload) return path.join(uploadsDir(), upload[1]);
  const product = /^\/products\/([^/\\]+)$/.exec(url);
  if (product) return defaultImagePath(product[1]);
  return null;
}

/**
 * Convert every legacy `product_images` row (width = 0) into WebP variants.
 * Rows whose source file cannot be found are skipped and reported. Safe to
 * run repeatedly: converted rows are no longer legacy.
 */
export async function reprocessLegacyImages(
  db: DB,
  log: (line: string) => void = console.log
): Promise<{ processed: number; skipped: number }> {
  let processed = 0;
  let skipped = 0;
  for (const row of await repo.listLegacy(db)) {
    const source = sourcePathFor(row.url);
    if (!source || !fs.existsSync(source)) {
      skipped++;
      log(`skip #${row.id}: source not found for ${row.url}`);
      continue;
    }
    const result = await processImage(fs.readFileSync(source));
    await repo.setProcessed(db, row.id, result);
    if (row.url.startsWith("/uploads/")) deleteImageByUrl(row.url);
    processed++;
    log(`ok   #${row.id}: ${row.url} -> ${result.url} (${Object.keys(result.variants).join("/")})`);
  }
  return { processed, skipped };
}
