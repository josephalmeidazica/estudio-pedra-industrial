import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../trpc";
import * as repo from "../db/gallery.repo";
import { isUploadRejection, processUpload } from "../lib/imagePipeline";
import { deleteImageByUrl } from "../lib/images";

export const galleryRouter = router({
  list: publicProcedure.query(({ ctx }) => repo.listGallery(ctx.db)),
  add: adminProcedure
    .input(
      z.object({
        dataUrl: z.string(),
        caption: z.string().optional(),
        productId: z.number().int().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let processed;
      try {
        processed = await processUpload(input.dataUrl);
      } catch (e) {
        if (isUploadRejection(e)) throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        throw e;
      }
      return repo.addGalleryImage(ctx.db, { caption: input.caption, productId: input.productId, ...processed });
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        caption: z.string().optional(),
        productId: z.number().int().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const row = await repo.updateGalleryImage(ctx.db, id, patch);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Gallery image not found" });
      return row;
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const url = await repo.deleteGalleryImage(ctx.db, input.id);
      if (url) deleteImageByUrl(url);
      return { success: true as const };
    }),
  reorder: adminProcedure
    .input(z.object({ orderedIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      await repo.reorderGallery(ctx.db, input.orderedIds);
      return { success: true as const };
    }),
});
