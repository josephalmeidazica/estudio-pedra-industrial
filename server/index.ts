import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";
import { db } from "./db/client";
import { ensureProductImages, seedIfEmpty } from "./db/seed";
import { assertProductionConfig } from "./lib/config";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  assertProductionConfig(process.env);

  await seedIfEmpty(db);
  await ensureProductImages(db);

  const app = createApp(db);
  const server = createServer(app);

  // The client is a catch-all, so it mounts after /uploads, /healthz and /api.
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

startServer().catch((e) => {
  console.error(e);
  process.exit(1);
});
