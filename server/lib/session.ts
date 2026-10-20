import crypto from "node:crypto";

export const SESSION_COOKIE = "eps_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const LOGIN_THROTTLED_MESSAGE = "Muitas tentativas. Aguarde 15 minutos e tente de novo.";

/**
 * HMAC key for session cookies: SESSION_SECRET when set, otherwise derived
 * from ADMIN_PASSWORD, so changing the password logs every device out.
 * Null (no sessions possible) when neither is set.
 */
export function sessionKey(env: { SESSION_SECRET?: string; ADMIN_PASSWORD?: string }): Buffer | null {
  if (env.SESSION_SECRET) return Buffer.from(env.SESSION_SECRET);
  if (!env.ADMIN_PASSWORD) return null;
  return Buffer.from(crypto.hkdfSync("sha256", env.ADMIN_PASSWORD, "", "eps-session", 32));
}

function sign(expiresAt: number, key: Buffer): Buffer {
  return crypto.createHmac("sha256", key).update(String(expiresAt)).digest();
}

/** `<expiresAtMs>.<base64url hmac>` — stateless, verifiable, nothing stored server-side. */
export function signSession(expiresAt: number, key: Buffer): string {
  return `${expiresAt}.${sign(expiresAt, key).toString("base64url")}`;
}

export function verifySession(value: string | undefined, key: Buffer | null, now: number): boolean {
  if (!value || !key) return false;
  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return false;
  const expiresAt = Number(value.slice(0, dot));
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  let provided: Buffer;
  try {
    provided = Buffer.from(value.slice(dot + 1), "base64url");
  } catch {
    return false;
  }
  const expected = sign(expiresAt, key);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

export function serializeSessionCookie(value: string, opts: { secure: boolean; maxAgeSec: number }): string {
  const base = `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${opts.maxAgeSec}`;
  return opts.secure ? `${base}; Secure` : base;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export type LoginLimiter = {
  allowed(ip: string): boolean;
  fail(ip: string): void;
  succeed(ip: string): void;
};

/** In-memory per-IP failure counter: `max` failures within `windowMs` block further attempts. */
export function createLoginLimiter(opts: { max?: number; windowMs?: number; now?: () => number } = {}): LoginLimiter {
  const max = opts.max ?? 5;
  const windowMs = opts.windowMs ?? 15 * 60 * 1000;
  const now = opts.now ?? Date.now;
  const failures = new Map<string, number[]>();

  const recent = (ip: string): number[] => {
    const cutoff = now() - windowMs;
    const kept = (failures.get(ip) ?? []).filter((t) => t > cutoff);
    if (kept.length) failures.set(ip, kept);
    else failures.delete(ip);
    return kept;
  };

  return {
    allowed: (ip) => recent(ip).length < max,
    fail: (ip) => {
      failures.set(ip, [...recent(ip), now()]);
    },
    succeed: (ip) => {
      failures.delete(ip);
    },
  };
}
