import crypto from "node:crypto";

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
