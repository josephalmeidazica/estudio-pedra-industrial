import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type AdminProduct = RouterOutputs["products"]["listAll"][number];
export type AdminImage = AdminProduct["images"][number];
