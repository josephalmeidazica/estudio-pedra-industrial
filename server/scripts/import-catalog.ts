// One-off maintenance: bring an already-seeded database up to the studio's
// fichas técnicas (server/db/catalog.ts). Bundled to dist/scripts/import-catalog.js
// by `npm run build`; run with `npm run catalog:import` from the repo root.
// Fills only empty/placeholder fields and adds missing pieces as drafts, so
// it never overwrites what the owner typed. Safe to run repeatedly.
import "dotenv/config";
import { getDb } from "../db/client";
import { importCatalog } from "../db/seed";

importCatalog(getDb())
  .then(({ filled, added }) => {
    console.log(`filled: ${filled.join(", ") || "none"}`);
    console.log(`added as drafts: ${added.join(", ") || "none"}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
