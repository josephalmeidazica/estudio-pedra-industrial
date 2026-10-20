import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { uploadsDir } from "./images";
import { OG_MAX_WIDTH } from "./seo";

const UUID_RE = /^[0-9a-f-]{36}$/;

/** Where the derived JPEG for an upload lives: `<uploads>/og/<uuid>.jpg`. */
export function ogCachePath(uuid: string, dir: string = uploadsDir()): string {
  return path.join(dir, "og", `${uuid}.jpg`);
}

/**
 * WhatsApp's link scraper is unreliable with WebP, so share cards use a JPEG
 * derived once from the largest WebP variant of the cover (≤ 1200 px wide).
 * Returns the cached file path, or null when no variant exists for `uuid`.
 */
export async function ensureOgJpeg(uuid: string, dir: string = uploadsDir()): Promise<string | null> {
  if (!UUID_RE.test(uuid)) return null;
  const out = ogCachePath(uuid, dir);
  if (fs.existsSync(out)) return out;

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const re = new RegExp(`^${uuid}-(\\d+)\\.webp$`);
  const best = entries
    .map((f) => {
      const m = re.exec(f);
      return m ? { file: f, width: Number(m[1]) } : null;
    })
    .filter((x): x is { file: string; width: number } => x !== null)
    .sort((a, b) => b.width - a.width)[0];
  if (!best) return null;

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(path.join(dir, best.file))
    .resize({ width: OG_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(out);
  return out;
}
