import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../trpc";
import * as repo from "../db/images.repo";
import { softDelete } from "../db/trash.repo";
import { isUploadRejection, processUpload } from "../lib/imagePipeline";

export const imagesRouter = router({
  add: adminProcedure
    .input(z.object({ productId: z.number().int(), dataUrl: z.string(), alt: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      let processed;
      try {
        processed = await processUpload(input.dataUrl);
      } catch (e) {
        // The owner's file is the problem -> 400 with the Portuguese guidance.
        // Anything else (disk full, permissions) is ours -> let tRPC report a 500.
        if (isUploadRejection(e)) throw new TRPCError({ code: "BAD_REQUEST", message: e.message });
        throw e;
      }
      return repo.addImage(ctx.db, { productId: input.productId, alt: input.alt, ...processed });
    }),
  // Moves the photo to the Lixeira; the files stay until it is purged.
  delete: adminProcedure
    .input(z.object({ imageId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await softDelete(ctx.db, "image", input.imageId);
      return { success: true as const };
    }),
  reorder: adminProcedure
    .input(z.object({ productId: z.number().int(), orderedIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      await repo.reorderImages(ctx.db, input.productId, input.orderedIds);
      return { success: true as const };
    }),
  setCover: adminProcedure
    .input(z.object({ imageId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await repo.setCover(ctx.db, input.imageId);
      return { success: true as const };
    }),
});
