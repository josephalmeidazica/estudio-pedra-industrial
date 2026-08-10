import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../trpc";
import * as repo from "../db/products.repo";
import { deleteImageByUrl } from "../lib/images";

const createInput = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  materials: z.string().optional(),
  dimensions: z.string().optional(),
  price: z.number().nullable().optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const productsRouter = router({
  list: publicProcedure.query(({ ctx }) => repo.listPublished(ctx.db)),
  listAll: adminProcedure.query(({ ctx }) => repo.listAll(ctx.db)),
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => repo.getBySlug(ctx.db, input.slug)),
  create: adminProcedure
    .input(createInput)
    .mutation(({ ctx, input }) => repo.createProduct(ctx.db, input)),
  update: adminProcedure
    .input(createInput.partial().extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return repo.updateProduct(ctx.db, id, patch);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const urls = await repo.deleteProduct(ctx.db, input.id);
      urls.forEach(deleteImageByUrl);
      return { success: true as const };
    }),
  reorder: adminProcedure
    .input(z.object({ orderedIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      await repo.reorderProducts(ctx.db, input.orderedIds);
      return { success: true as const };
    }),
});
