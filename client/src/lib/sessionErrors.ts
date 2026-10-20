import { TRPCClientError } from "@trpc/client";

export const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Entre de novo.";

/** True for a tRPC error whose server code is UNAUTHORIZED (expired cookie, changed passphrase). */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof TRPCClientError && (error.data as { code?: string } | undefined)?.code === "UNAUTHORIZED";
}
