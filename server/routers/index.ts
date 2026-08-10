import { router } from "../trpc";
import { imagesRouter } from "./images";
import { productsRouter } from "./products";

export const appRouter = router({
  products: productsRouter,
  images: imagesRouter,
});

export type AppRouter = typeof appRouter;
