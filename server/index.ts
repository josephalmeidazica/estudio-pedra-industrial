import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";
import { getDb } from "./db/client";
import { ensureCustomProduct, ensureProductImages, seedIfEmpty } from "./db/seed";
import { assertProductionConfig } from "./lib/config";
import { createPageHandler } from "./page";
import { devTemplate, prodTemplate, serveStatic, setupVite, type HtmlTransform } from "./vite";

async function startServer() {
  assertProductionConfig(process.env);
  const db = getDb();

  await seedIfEmpty(db);
  await ensureCustomProduct(db);
  await ensureProductImages(db);

  const app = createApp(db);
  const server = createServer(app);

  // Static client first, then the HTML catch-all that renders the per-URL head.
  let template: () => Promise<string>;
  let transform: HtmlTransform | undefined;
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
    template = await prodTemplate();
  } else {
    ({ transform } = await setupVite(app, server));
    template = devTemplate;
  }
  app.use("*", createPageHandler(db, { template, transform }));

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
