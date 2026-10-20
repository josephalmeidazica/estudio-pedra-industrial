import crypto from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { SESSION_COOKIE, parseCookies, sessionKey, verifySession } from "./session";

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
