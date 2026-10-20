import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import superjson from "superjson";
import type { DB } from "./db/client";
import { authorizeAdminRequest } from "./lib/auth";
import { LOGIN_THROTTLED_MESSAGE } from "./lib/session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  db: DB;
};

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

const requireAdmin = t.middleware(({ ctx, next }) => {
  const result = authorizeAdminRequest(ctx.req);
  if (result === "throttled") throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: LOGIN_THROTTLED_MESSAGE });
  if (result === "unauthorized") throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or missing admin token" });
  return next({ ctx });
});

export const adminProcedure = t.procedure.use(requireAdmin);
