import crypto from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { SESSION_COOKIE, createLoginLimiter, parseCookies, sessionKey, verifySession } from "./session";

/** One process, one limiter: 5 failed passphrase guesses per IP per 15 minutes (login and bearer alike). */
export const loginLimiter = createLoginLimiter();

export function isValidAdminToken(authHeader: string | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false; // fail closed
  if (!authHeader?.startsWith("Bearer ")) return false;
  const provided = authHeader.slice("Bearer ".length);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Admin access: a bearer token (scripts, tests) or a valid session cookie (the admin UI). */
export function isValidAdminRequest(req: { headers: IncomingHttpHeaders }, now = Date.now()): boolean {
  if (isValidAdminToken(req.headers.authorization)) return true;
  const cookie = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return verifySession(cookie, sessionKey(process.env), now);
}

export type AdminAuthResult = "ok" | "unauthorized" | "throttled";

/**
 * Admin access with brute-force protection. A bearer header is a passphrase
 * guess, so wrong ones count against the same limiter as `auth.login` and a
 * throttled IP is refused even with the right token. Cookies are never
 * counted: an expired cookie on every page load must not lock the owner out.
 */
export function authorizeAdminRequest(req: { headers: IncomingHttpHeaders; ip?: string }, now = Date.now()): AdminAuthResult {
  const auth = req.headers.authorization;
  if (auth !== undefined) {
    const ip = req.ip ?? "unknown";
    if (!loginLimiter.allowed(ip)) return "throttled";
    if (isValidAdminToken(auth)) {
      loginLimiter.succeed(ip);
      return "ok";
    }
    loginLimiter.fail(ip);
    return "unauthorized";
  }
  const cookie = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  return verifySession(cookie, sessionKey(process.env), now) ? "ok" : "unauthorized";
}
