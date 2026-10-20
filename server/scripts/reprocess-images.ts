// One-off maintenance: convert legacy single-file image rows into WebP
// variants. Bundled to dist/scripts/reprocess-images.js by `npm run build`;
// run with `npm run images:reprocess` from the repo root (same cwd rules as
// the server). Safe to run repeatedly.
import "dotenv/config";
import { db } from "../db/client";
import { reprocessLegacyImages } from "../lib/reprocess";

reprocessLegacyImages(db)
  .then(({ processed, skipped }) => {
    console.log(`processed: ${processed}, skipped: ${skipped}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
