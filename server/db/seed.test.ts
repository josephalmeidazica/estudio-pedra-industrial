import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import * as repo from "./products.repo";
import { seedIfEmpty } from "./seed";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-seed-"));
  dirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

test("seeds 9 products once and is idempotent", async () => {
  const db = freshDb();
  await seedIfEmpty(db);
  const first = await repo.listPublished(db);
  expect(first).toHaveLength(9);
  expect(first[0].slug).toBe("estrutura-gaia");
  expect(first[0].materials).toBe("Aço carbono, MDF");
  await seedIfEmpty(db);
  expect(await repo.listPublished(db)).toHaveLength(9);
});
