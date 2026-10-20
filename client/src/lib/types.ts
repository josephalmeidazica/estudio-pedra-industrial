import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type AdminProduct = RouterOutputs["products"]["listAll"][number];
export type AdminImage = AdminProduct["images"][number];
export type PublicProduct = RouterOutputs["products"]["list"][number];
export type PublicImage = PublicProduct["images"][number];
export type GalleryItem = RouterOutputs["gallery"]["list"][number];
