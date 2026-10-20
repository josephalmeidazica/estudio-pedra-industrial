import { expect, test } from "vitest";
import {
  clearSessionCookie,
  createLoginLimiter,
  parseCookies,
  serializeSessionCookie,
  sessionKey,
  signSession,
  verifySession,
} from "./session";

const key = sessionKey({ ADMIN_PASSWORD: "correct horse battery staple" })!;

test("sessionKey: SESSION_SECRET wins, HKDF otherwise, null when nothing is set", () => {
  expect(sessionKey({})).toBeNull();
  expect(sessionKey({ ADMIN_PASSWORD: "" })).toBeNull();
  expect(key.length).toBe(32);
  expect(sessionKey({ SESSION_SECRET: "s", ADMIN_PASSWORD: "p" })!.toString()).toBe("s");
  expect(sessionKey({ ADMIN_PASSWORD: "other" })!.equals(key)).toBe(false);
});

test("sign/verify: valid until expiry; tampered, foreign-key and malformed values fail", () => {
  const now = 1_700_000_000_000;
  const v = signSession(now + 1000, key);
  expect(verifySession(v, key, now)).toBe(true);
  expect(verifySession(v, key, now + 1001)).toBe(false);
  expect(verifySession(v.replace(/^\d+/, String(now + 999_999)), key, now)).toBe(false);
  expect(verifySession(v, sessionKey({ ADMIN_PASSWORD: "changed" }), now)).toBe(false);
  expect(verifySession(v, null, now)).toBe(false);
  for (const bad of [undefined, "", "abc", "123.", ".sig", "notanumber.sig", v + "x"]) {
    expect(verifySession(bad, key, now)).toBe(false);
  }
});

test("cookie helpers", () => {
  expect(parseCookies("a=1; eps_session=x.y; b=%20z")).toEqual({ a: "1", eps_session: "x.y", b: " z" });
  expect(parseCookies(undefined)).toEqual({});
  expect(serializeSessionCookie("x.y", { secure: true, maxAgeSec: 60 })).toBe(
    "eps_session=x.y; Path=/; HttpOnly; SameSite=Lax; Max-Age=60; Secure"
  );
  expect(serializeSessionCookie("x.y", { secure: false, maxAgeSec: 60 })).not.toContain("Secure");
  expect(clearSessionCookie()).toBe("eps_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
});

test("login limiter: 5 failures lock an ip for the window; success clears; other ips unaffected", () => {
  let t = 0;
  const l = createLoginLimiter({ now: () => t });
  for (let i = 0; i < 5; i++) {
    expect(l.allowed("1.1.1.1")).toBe(true);
    l.fail("1.1.1.1");
  }
  expect(l.allowed("1.1.1.1")).toBe(false);
  expect(l.allowed("2.2.2.2")).toBe(true);
  t = 15 * 60 * 1000 + 1;
  expect(l.allowed("1.1.1.1")).toBe(true);
  l.fail("1.1.1.1");
  l.succeed("1.1.1.1");
  for (let i = 0; i < 5; i++) {
    expect(l.allowed("1.1.1.1")).toBe(true);
    l.fail("1.1.1.1");
  }
  expect(l.allowed("1.1.1.1")).toBe(false);
});
