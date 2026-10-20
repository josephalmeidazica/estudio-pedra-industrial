import fs from "node:fs";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type DB } from "./db/client";

const PASSWORD = "correct horse battery staple";
const NO_INPUT = encodeURIComponent(JSON.stringify({ json: null, meta: { values: ["undefined"] } }));

const dirs: string[] = [];
const openDbs: DB[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-auth-"));
  dirs.push(dir);
  const db = createDb(path.join(dir, "test.db"));
  openDbs.push(db);
  return db;
}
beforeEach(() => {
  process.env.ADMIN_PASSWORD = PASSWORD;
  delete process.env.SESSION_SECRET;
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-authup-"));
});
afterEach(() => {
  while (openDbs.length) openDbs.pop()!.$client.close();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

async function serve(db: DB) {
  const { createApp } = await import("./app");
  const server = createApp(db).listen(0);
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}/api/trpc/`;
  const parse = async (r: Response) => ({ status: r.status, headers: r.headers, json: await r.json().catch(() => null) });
  const call = (proc: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + proc, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body === undefined ? { json: null, meta: { values: ["undefined"] } } : { json: body }),
    }).then(parse);
  const get = (proc: string, headers: Record<string, string> = {}) =>
    fetch(`${base}${proc}?input=${NO_INPUT}`, { headers }).then(parse);
  return { server, call, get };
}

test("login sets a session cookie that authorises admin calls; logout clears it; bearer still works", async () => {
  const { server, call, get } = await serve(freshDb());
  try {
    const bad = await call("auth.login", { password: "nope" });
    expect(bad.status).toBe(401);
    const ok = await call("auth.login", { password: PASSWORD });
    expect(ok.status).toBe(200);
    const setCookie = ok.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/^eps_session=\d+\.[A-Za-z0-9_-]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/); // http: no Secure
    const cookie = setCookie.split(";")[0];
    expect((await get("products.listAll", { cookie })).status).toBe(200);
    expect((await get("auth.me", { cookie })).json.result.data.json).toEqual({ authenticated: true });
    expect((await get("auth.me")).json.result.data.json).toEqual({ authenticated: false });
    expect((await get("products.listAll", { cookie: "eps_session=123.bad" })).status).toBe(401);
    expect((await get("products.listAll", { authorization: `Bearer ${PASSWORD}` })).status).toBe(200);
    const out = await call("auth.logout", undefined, { cookie });
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("login over a forwarded https request sets Secure; five failures throttle that ip only", async () => {
  const { server, call } = await serve(freshDb());
  try {
    const ok = await call("auth.login", { password: PASSWORD }, { "x-forwarded-proto": "https" });
    expect(ok.headers.get("set-cookie")).toContain("; Secure");
    for (let i = 0; i < 5; i++) await call("auth.login", { password: "nope" }, { "x-forwarded-for": "9.9.9.9" });
    const throttled = await call("auth.login", { password: PASSWORD }, { "x-forwarded-for": "9.9.9.9" });
    expect(throttled.status).toBe(429);
    expect(JSON.stringify(throttled.json)).toContain("Muitas tentativas");
    expect((await call("auth.login", { password: PASSWORD }, { "x-forwarded-for": "8.8.8.8" })).status).toBe(200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
