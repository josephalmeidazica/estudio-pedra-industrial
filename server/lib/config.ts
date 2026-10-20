/**
 * Refuse to start in production without the admin token. In development a
 * missing token only disables the write endpoints (index.ts warns).
 * SITE_URL is recommended in production (link previews and the sitemap use
 * it for absolute URLs); without it the request host is used, so it only warns.
 */
export function assertProductionConfig(env: NodeJS.ProcessEnv, warn: (msg: string) => void = console.warn): void {
  if (env.NODE_ENV !== "production") return;
  if (!env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_PASSWORD is not set. Refusing to start in production. Set it in .env (see .env.example)."
    );
  }
  if (!env.SITE_URL) {
    warn("[seo] SITE_URL is not set; link previews will use the request host. Set it in .env.");
  }
}
