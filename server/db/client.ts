import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// Anchored to process.cwd() rather than __dirname: both `npm run dev` (tsx,
// unbundled source under server/db/) and `npm start` (esbuild bundle at
// dist/index.js) are launched from the repo root, so cwd is stable in both —
// unlike __dirname, which points into dist/ after bundling and would resolve
// this two levels too far up.
const PROJECT_ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "drizzle");

export type DB = BetterSQLite3Database<typeof schema>;

export function createDb(dbPath: string): DB {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

const DEFAULT_DB_PATH =
  process.env.DATABASE_PATH ?? path.join(PROJECT_ROOT, ".data", "app.db");

export const db = createDb(DEFAULT_DB_PATH);
