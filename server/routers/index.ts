import { router } from "../trpc";
import { authRouter } from "./auth";
import { galleryRouter } from "./gallery";
import { imagesRouter } from "./images";
import { productsRouter } from "./products";
import { trashRouter } from "./trash";

export const appRouter = router({
  auth: authRouter,
  products: productsRouter,
  images: imagesRouter,
  gallery: galleryRouter,
  trash: trashRouter,
});

export type AppRouter = typeof appRouter;
