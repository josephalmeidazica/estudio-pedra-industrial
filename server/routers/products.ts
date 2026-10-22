import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../trpc";
import * as repo from "../db/products.repo";
import { softDelete } from "../db/trash.repo";

const createInput = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  materials: z.string().optional(),
  dimensions: z.string().optional(),
  finishes: z.string().optional(),
  details: z.string().optional(),
  price: z.number().nullable().optional(),
  featured: z.boolean().optional(),
  isCustom: z.boolean().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const productsRouter = router({
  list: publicProcedure.query(({ ctx }) => repo.listPublished(ctx.db)),
  listAll: adminProcedure.query(({ ctx }) => repo.listAll(ctx.db)),
  // Public: drafts and deleted pieces must look exactly like missing products.
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => repo.getPublishedBySlug(ctx.db, input.slug)),
  create: adminProcedure
    .input(createInput)
    .mutation(({ ctx, input }) => repo.createProduct(ctx.db, input)),
  update: adminProcedure
    .input(createInput.partial().extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const product = await repo.updateProduct(ctx.db, id, patch);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return product;
    }),
  // Moves the piece to the Lixeira; files stay until it is purged (trash.purge or 30 days).
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const ok = await softDelete(ctx.db, "product", input.id);
      if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return { success: true as const };
    }),
  // Hard-deletes an untouched "Nova peça" draft; a no-op for anything else.
  discardEmptyDraft: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => ({ discarded: await repo.discardEmptyDraft(ctx.db, input.id) })),
  reorder: adminProcedure
    .input(z.object({ orderedIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      await repo.reorderProducts(ctx.db, input.orderedIds);
      return { success: true as const };
    }),
});
