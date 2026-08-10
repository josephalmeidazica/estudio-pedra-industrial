import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import superjson from "superjson";
import type { DB } from "./db/client";
import { isValidAdminToken } from "./lib/auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  db: DB;
};

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!isValidAdminToken(ctx.req.headers.authorization)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or missing admin token" });
  }
  return next({ ctx });
});

export const adminProcedure = t.procedure.use(requireAdmin);
