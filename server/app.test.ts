import fs from "node:fs";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, expect, test } from "vitest";
import { createDb, type DB } from "./db/client";

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-app-"));
  dirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
beforeAll(() => {
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-appup-"));
});
afterEach(() => {
  // Close the underlying better-sqlite3 handle first — on Windows, rmSync
  // can't remove a directory whose db/wal/shm files are still open.
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

test("healthz answers 200 ok and uploads are immutable-cached", async () => {
  const { createApp } = await import("./app");
  const db = freshDb();
  const server = createApp(db).listen(0);
  const port = (server.address() as AddressInfo).port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    fs.mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
    fs.writeFileSync(path.join(process.env.UPLOADS_DIR!, "x-480.webp"), "x");
    const up = await fetch(`http://127.0.0.1:${port}/uploads/x-480.webp`);
    expect(up.status).toBe(200);
    expect(up.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  } finally {
    await new Promise((r) => server.close(r));
  }
});
