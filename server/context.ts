import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { db } from "./db/client";
import type { TrpcContext } from "./trpc";

export function createContext(opts: CreateExpressContextOptions): TrpcContext {
  return { req: opts.req, res: opts.res, db };
}
