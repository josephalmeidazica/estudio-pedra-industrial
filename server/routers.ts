import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import {
  addProductImage,
  deleteProductImage,
  getAllProductImages,
  getProductImages,
} from "./db";

export const appRouter = router({
  products: router({
    addImage: publicProcedure
      .input(
        z.object({
          productName: z.string(),
          imageUrl: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await addProductImage(input.productName, input.imageUrl);
        return { success: true };
      }),

    getImages: publicProcedure
      .input(
        z.object({
          productName: z.string(),
        })
      )
      .query(async ({ input }) => {
        return await getProductImages(input.productName);
      }),

    deleteImage: publicProcedure
      .input(
        z.object({
          imageId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await deleteProductImage(input.imageId);
        return { success: true };
      }),

    getAllImages: publicProcedure.query(async () => {
      return await getAllProductImages();
    }),
  }),
});

export type AppRouter = typeof appRouter;
