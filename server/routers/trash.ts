import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../trpc";
import * as repo from "../db/trash.repo";
import { deleteImageByUrl } from "../lib/images";

const item = z.object({ kind: z.enum(["product", "image", "gallery"]), id: z.number().int() });

/** The Lixeira: everything the owner deleted, restorable for 30 days. */
export const trashRouter = router({
  list: adminProcedure.query(({ ctx }) => repo.listTrash(ctx.db)),
  restore: adminProcedure.input(item).mutation(async ({ ctx, input }) => {
    const ok = await repo.restore(ctx.db, input.kind, input.id);
    if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Item not in trash" });
    return { ok: true as const };
  }),
  // "Excluir definitivamente": rows and files are gone for good.
  purge: adminProcedure.input(item).mutation(async ({ ctx, input }) => {
    const urls = await repo.purge(ctx.db, input.kind, input.id);
    if (urls === null) throw new TRPCError({ code: "NOT_FOUND", message: "Item not in trash" });
    urls.forEach(deleteImageByUrl);
    return { ok: true as const, files: urls.length };
  }),
});
