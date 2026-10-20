/**
 * Refuse to start in production without the admin token. In development a
 * missing token only disables the write endpoints (index.ts warns).
 */
export function assertProductionConfig(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV === "production" && !env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_PASSWORD is not set. Refusing to start in production. Set it in .env (see .env.example)."
    );
  }
}
