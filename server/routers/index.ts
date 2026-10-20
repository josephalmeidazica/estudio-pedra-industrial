import { router } from "../trpc";
import { authRouter } from "./auth";
import { galleryRouter } from "./gallery";
import { imagesRouter } from "./images";
import { productsRouter } from "./products";

export const appRouter = router({
  auth: authRouter,
  products: productsRouter,
  images: imagesRouter,
  gallery: galleryRouter,
});

export type AppRouter = typeof appRouter;
