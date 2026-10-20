import { router } from "../trpc";
import { galleryRouter } from "./gallery";
import { imagesRouter } from "./images";
import { productsRouter } from "./products";

export const appRouter = router({
  products: productsRouter,
  images: imagesRouter,
  gallery: galleryRouter,
});

export type AppRouter = typeof appRouter;
