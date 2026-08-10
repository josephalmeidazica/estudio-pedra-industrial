import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./context";
import { db } from "./db/client";
import { ensureProductImages, seedIfEmpty } from "./db/seed";
import { UPLOADS_DIR } from "./lib/images";
import { appRouter } from "./routers";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  await seedIfEmpty(db);
  await ensureProductImages(db);

  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Uploaded product images (must be before the Vite/static catch-all).
  app.use("/uploads", express.static(UPLOADS_DIR));

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.warn("[auth] ADMIN_PASSWORD is not set — write endpoints are disabled. Set it in .env.");
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`\n  Estúdio Pedra Industrial  ->  http://localhost:${port}/\n`);
  });
}

startServer().catch(console.error);
