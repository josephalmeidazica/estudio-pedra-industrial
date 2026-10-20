import type { DB } from "../db/client";
import { purgeExpired } from "../db/trash.repo";
import { deleteImageByUrl } from "./images";

export const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Purge Lixeira items older than 30 days (rows + files). Returns how many files were removed. */
export async function runPurge(db: DB, now = new Date()): Promise<number> {
  const urls = await purgeExpired(db, now);
  urls.forEach(deleteImageByUrl);
  if (urls.length > 0) console.log(`[trash] purged ${urls.length} expired file(s)`);
  return urls.length;
}

/** Run once now and then daily; the timer never keeps the process alive. */
export function schedulePurge(db: DB): void {
  runPurge(db).catch((e) => console.error("[trash] purge failed", e));
  setInterval(() => runPurge(db).catch((e) => console.error("[trash] purge failed", e)), PURGE_INTERVAL_MS).unref();
}
