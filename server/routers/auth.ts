import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { isValidAdminRequest, isValidAdminToken, loginLimiter } from "../lib/auth";
import { LOGIN_THROTTLED_MESSAGE, SESSION_TTL_MS, clearSessionCookie, serializeSessionCookie, sessionKey, signSession } from "../lib/session";

export const authRouter = router({
  login: publicProcedure.input(z.object({ password: z.string() })).mutation(({ ctx, input }) => {
    const ip = ctx.req.ip ?? "unknown";
    if (!loginLimiter.allowed(ip)) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: LOGIN_THROTTLED_MESSAGE });
    }
    const key = sessionKey(process.env);
    if (!key || !isValidAdminToken(`Bearer ${input.password}`)) {
      loginLimiter.fail(ip);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha incorreta." });
    }
    loginLimiter.succeed(ip);
    const value = signSession(Date.now() + SESSION_TTL_MS, key);
    ctx.res.setHeader(
      "Set-Cookie",
      serializeSessionCookie(value, { secure: ctx.req.secure, maxAgeSec: SESSION_TTL_MS / 1000 })
    );
    return { ok: true as const };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.setHeader("Set-Cookie", clearSessionCookie());
    return { ok: true as const };
  }),
  me: publicProcedure.query(({ ctx }) => ({ authenticated: isValidAdminRequest(ctx.req) })),
});
