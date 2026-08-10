import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../trpc";
import * as repo from "../db/images.repo";
import { decodeDataUrl, deleteImageByUrl, saveImageBuffer } from "../lib/images";

export const imagesRouter = router({
  add: adminProcedure
    .input(z.object({ productId: z.number().int(), dataUrl: z.string(), alt: z.string().optional() }))
    .mutation(({ ctx, input }) => {
      let url: string;
      try {
        const { buffer, ext } = decodeDataUrl(input.dataUrl);
        url = saveImageBuffer(buffer, ext);
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message });
      }
      return repo.addImage(ctx.db, { productId: input.productId, url, alt: input.alt });
    }),
  delete: adminProcedure
    .input(z.object({ imageId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const url = await repo.deleteImage(ctx.db, input.imageId);
      if (url) deleteImageByUrl(url);
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
