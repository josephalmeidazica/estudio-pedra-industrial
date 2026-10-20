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

// One conversion per file at a time: a share typically triggers two or three
// scrapers within a second, and they must not all run sharp on the same output.
const inFlight = new Map<string, Promise<string | null>>();

/** Number of conversions currently running (exposed for tests). */
export function pendingOgJobs(): number {
  return inFlight.size;
}

/**
 * WhatsApp's link scraper is unreliable with WebP, so share cards use a JPEG
 * derived once from the largest WebP variant of the cover (≤ 1200 px wide).
 * Returns the cached file path, or null when no variant exists for `uuid`.
 * The file is written to a temp name and renamed into place, so a crash or
 * restart mid-write never leaves a truncated image to be served forever.
 */
export function ensureOgJpeg(uuid: string, dir: string = uploadsDir()): Promise<string | null> {
  if (!UUID_RE.test(uuid)) return Promise.resolve(null);
  const out = ogCachePath(uuid, dir);
  if (fs.existsSync(out)) return Promise.resolve(out);

  const running = inFlight.get(out);
  if (running) return running;

  const job = convert(uuid, dir, out).finally(() => inFlight.delete(out));
  inFlight.set(out, job);
  return job;
}

async function convert(uuid: string, dir: string, out: string): Promise<string | null> {
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
  const tmp = `${out}.${process.pid}.tmp`;
  try {
    await sharp(path.join(dir, best.file))
      .resize({ width: OG_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(tmp);
    fs.renameSync(tmp, out);
  } catch (e) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      /* best effort */
    }
    throw e;
  }
  return out;
}
