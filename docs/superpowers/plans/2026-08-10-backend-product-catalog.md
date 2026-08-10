# Backend Product Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the product catalog into the backend as the source of truth with a rich data model, file-on-disk images, full CRUD, and static bearer-token auth on writes.

**Architecture:** Express + tRPC server backed by SQLite (Drizzle ORM). Pure helper libs (slug, image files, auth) + DB repository modules (products, images) are unit-tested in isolation; thin tRPC routers compose them and are tested via `createCaller` with a temp DB injected through context. Reads are public; writes require `Authorization: Bearer <ADMIN_API_TOKEN>`. The React catalog reads live data and gets a minimal token-gated edit mode.

**Tech Stack:** TypeScript (ESM, strict), Express, tRPC v11, Drizzle ORM + better-sqlite3, Vite/React 19, Vitest.

## Global Constraints

- ESM project (`"type": "module"`); local imports are extensionless (tsx/bundler resolution). Strict TypeScript.
- Windows-safe npm scripts only (use `cross-env` for env vars — already a dep).
- New runtime deps: `drizzle-orm`, `better-sqlite3`. New dev deps: `drizzle-kit`, `@types/better-sqlite3`, `vitest`. If `better-sqlite3` fails to build on Node 24/Windows, fall back to `@libsql/client` + `drizzle-orm/libsql` (`createClient({ url: 'file:' + dbPath })`); schema and repo code are identical, only `server/db/client.ts` changes.
- Reads are public (`publicProcedure`); all writes use `adminProcedure`. Auth **fails closed**: empty/unset `ADMIN_API_TOKEN` ⇒ every write returns `UNAUTHORIZED`.
- `.data/` (SQLite file + uploads) and `.env` stay git-ignored. Do **not** add a git remote or push.
- Image URLs are stored as `/uploads/<uuid>.<ext>`; the lowest `sortOrder` image is the cover.
- Commit after every task.

---

### Task 1: DB foundation — deps, schema, migrations, client

**Files:**
- Modify: `package.json` (deps + `test`/`db:generate` scripts)
- Create: `drizzle.config.ts`
- Create: `server/db/schema.ts`
- Create: `server/db/client.ts`
- Create: `vitest.config.ts`
- Test: `server/db/client.test.ts`
- Generated: `drizzle/*.sql` (via drizzle-kit)

**Interfaces:**
- Produces: `products`, `product_images` Drizzle tables; types `Product`, `NewProduct`, `ProductImage`, `NewProductImage`, `ProductWithImages`; `createDb(dbPath: string): DB`, `db` (default singleton), type `DB`.

- [ ] **Step 1: Install dependencies**

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3 vitest
```
Expected: installs succeed. If `better-sqlite3` errors on native build, see Global Constraints fallback and switch the driver in Step 5 before continuing.

- [ ] **Step 2: Add scripts to `package.json`**

Add to `"scripts"`:
```json
"test": "vitest run",
"db:generate": "drizzle-kit generate"
```

- [ ] **Step 3: Write `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
```

- [ ] **Step 4: Write `server/db/schema.ts`**

```ts
import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default(""),
  materials: text("materials").notNull().default(""),
  dimensions: text("dimensions").notNull().default(""),
  price: real("price"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sortOrder").notNull().default(0),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const productImages = sqliteTable("product_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("productId")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type ProductWithImages = Product & { images: ProductImage[] };
```

- [ ] **Step 5: Write `server/db/client.ts`**

```ts
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "drizzle");

export type DB = BetterSQLite3Database<typeof schema>;

export function createDb(dbPath: string): DB {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

const DEFAULT_DB_PATH =
  process.env.DATABASE_PATH ?? path.join(PROJECT_ROOT, ".data", "app.db");

export const db = createDb(DEFAULT_DB_PATH);
```

- [ ] **Step 6: Generate migrations**

Run: `npm run db:generate`
Expected: creates `drizzle/0000_*.sql` + `drizzle/meta/` with `products` and `product_images` tables.

- [ ] **Step 7: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["server/**/*.test.ts"] },
});
```

- [ ] **Step 8: Write the failing test `server/db/client.test.ts`**

```ts
import { eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb } from "./client";
import { productImages, products } from "./schema";

const tmpDirs: string[] = [];
function freshDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-db-"));
  tmpDirs.push(dir);
  return createDb(path.join(dir, "test.db"));
}
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

test("migrations create tables and CRUD works", async () => {
  const db = freshDb();
  const [p] = await db.insert(products).values({ slug: "a", name: "A" }).returning();
  expect(p.id).toBeGreaterThan(0);
  expect(p.published).toBe(true);
  const [img] = await db
    .insert(productImages)
    .values({ productId: p.id, url: "/uploads/x.jpg" })
    .returning();
  expect(img.productId).toBe(p.id);
});

test("deleting a product cascades to its images", async () => {
  const db = freshDb();
  const [p] = await db.insert(products).values({ slug: "b", name: "B" }).returning();
  await db.insert(productImages).values({ productId: p.id, url: "/uploads/y.jpg" });
  await db.delete(products).where(eq(products.id, p.id));
  const left = await db.select().from(productImages);
  expect(left).toHaveLength(0);
});
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (migrations applied to the temp DB, CRUD + cascade verified). If FK cascade fails, confirm `foreign_keys = ON` pragma in `client.ts`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts vitest.config.ts server/db drizzle
git commit -m "feat(db): SQLite schema, migrations, and client with tests"
```

---

### Task 2: Slug helper

**Files:**
- Create: `server/lib/slug.ts`
- Test: `server/lib/slug.test.ts`

**Interfaces:**
- Produces: `slugify(input: string): string`, `makeUniqueSlug(base: string, existing: Set<string>): string`

- [ ] **Step 1: Write the failing test `server/lib/slug.test.ts`**

```ts
import { expect, test } from "vitest";
import { makeUniqueSlug, slugify } from "./slug";

test("slugify lowercases, strips accents, dashes non-alphanumerics", () => {
  expect(slugify("Estrutura Gaia")).toBe("estrutura-gaia");
  expect(slugify("Luminária Lua!")).toBe("luminaria-lua");
  expect(slugify("  Mesa   Office L  ")).toBe("mesa-office-l");
});

test("makeUniqueSlug appends a counter on collision", () => {
  const existing = new Set(["mesa-urb", "mesa-urb-2"]);
  expect(makeUniqueSlug("mesa-urb", existing)).toBe("mesa-urb-3");
  expect(makeUniqueSlug("nova", existing)).toBe("nova");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- slug`
Expected: FAIL ("Cannot find module './slug'").

- [ ] **Step 3: Write `server/lib/slug.ts`**

```ts
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeUniqueSlug(base: string, existing: Set<string>): string {
  const root = base || "item";
  if (!existing.has(root)) return root;
  let n = 2;
  while (existing.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- slug`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/lib/slug.ts server/lib/slug.test.ts
git commit -m "feat(lib): slugify + unique slug helper"
```

---

### Task 3: Image file helper

**Files:**
- Create: `server/lib/images.ts`
- Test: `server/lib/images.test.ts`

**Interfaces:**
- Produces: `UPLOADS_DIR: string`, `decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: string }`, `saveImageBuffer(buffer: Buffer, ext: string): string`, `deleteImageByUrl(url: string): void`

- [ ] **Step 1: Write the failing test `server/lib/images.test.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, expect, test } from "vitest";

beforeAll(() => {
  process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-up-"));
});

test("decodeDataUrl parses a jpeg data URL", async () => {
  const { decodeDataUrl } = await import("./images");
  const { buffer, ext } = decodeDataUrl("data:image/jpeg;base64," + Buffer.from("hi").toString("base64"));
  expect(ext).toBe("jpg");
  expect(buffer.toString()).toBe("hi");
});

test("decodeDataUrl rejects non-image data", async () => {
  const { decodeDataUrl } = await import("./images");
  expect(() => decodeDataUrl("data:text/plain;base64,aGk=")).toThrow();
  expect(() => decodeDataUrl("not-a-data-url")).toThrow();
});

test("saveImageBuffer writes a file and deleteImageByUrl removes it", async () => {
  const { saveImageBuffer, deleteImageByUrl, UPLOADS_DIR } = await import("./images");
  const url = saveImageBuffer(Buffer.from("data"), "png");
  expect(url).toMatch(/^\/uploads\/.+\.png$/);
  const file = path.join(UPLOADS_DIR, url.replace("/uploads/", ""));
  expect(fs.existsSync(file)).toBe(true);
  deleteImageByUrl(url);
  expect(fs.existsSync(file)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- images`
Expected: FAIL ("Cannot find module './images'").

- [ ] **Step 3: Write `server/lib/images.ts`**

```ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(PROJECT_ROOT, ".data", "uploads");
}
export const UPLOADS_DIR = uploadsDir();

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function decodeDataUrl(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");
  const [, mime, b64] = match;
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new Error(`Unsupported image type: ${mime}`);
  return { buffer: Buffer.from(b64, "base64"), ext };
}

export function saveImageBuffer(buffer: Buffer, ext: string): string {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  return `/uploads/${name}`;
}

export function deleteImageByUrl(url: string): void {
  const name = url.replace(/^\/uploads\//, "");
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return;
  try {
    fs.rmSync(path.join(uploadsDir(), name), { force: true });
  } catch {
    /* file already gone — ignore */
  }
}
```

Note: `UPLOADS_DIR` is exported for the static-serve mount; the internal `uploadsDir()` re-reads the env each call so tests that set `process.env.UPLOADS_DIR` work.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- images`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/lib/images.ts server/lib/images.test.ts
git commit -m "feat(lib): data-URL decode + image file save/delete"
```

---

### Task 4: Auth helper + tRPC procedures/context type

**Files:**
- Create: `server/lib/auth.ts`
- Test: `server/lib/auth.test.ts`
- Modify: `server/trpc.ts` (replace whole file — add `db` to context type, add `adminProcedure`, remove `createContext`)

**Interfaces:**
- Consumes: `DB` type from `server/db/client`.
- Produces: `isValidAdminToken(authHeader: string | undefined): boolean`; `router`, `publicProcedure`, `adminProcedure`, type `TrpcContext = { req; res; db: DB }`.

- [ ] **Step 1: Write the failing test `server/lib/auth.test.ts`**

```ts
import { afterEach, beforeEach, expect, test } from "vitest";
import { isValidAdminToken } from "./auth";

const original = process.env.ADMIN_API_TOKEN;
beforeEach(() => { process.env.ADMIN_API_TOKEN = "s3cret-token"; });
afterEach(() => { process.env.ADMIN_API_TOKEN = original; });

test("accepts a matching bearer token", () => {
  expect(isValidAdminToken("Bearer s3cret-token")).toBe(true);
});
test("rejects wrong, malformed, or missing tokens", () => {
  expect(isValidAdminToken("Bearer nope")).toBe(false);
  expect(isValidAdminToken("s3cret-token")).toBe(false);
  expect(isValidAdminToken(undefined)).toBe(false);
});
test("fails closed when the env token is empty", () => {
  process.env.ADMIN_API_TOKEN = "";
  expect(isValidAdminToken("Bearer s3cret-token")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth`
Expected: FAIL ("Cannot find module './auth'").

- [ ] **Step 3: Write `server/lib/auth.ts`**

```ts
import crypto from "node:crypto";

export function isValidAdminToken(authHeader: string | undefined): boolean {
  const expected = process.env.ADMIN_API_TOKEN ?? "";
  if (!expected) return false; // fail closed
  if (!authHeader?.startsWith("Bearer ")) return false;
  const provided = authHeader.slice("Bearer ".length);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Replace `server/trpc.ts`**

```ts
import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import superjson from "superjson";
import type { DB } from "./db/client";
import { isValidAdminToken } from "./lib/auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  db: DB;
};

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!isValidAdminToken(ctx.req.headers.authorization)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or missing admin token" });
  }
  return next({ ctx });
});

export const adminProcedure = t.procedure.use(requireAdmin);
```

Note: `createContext` moves to `server/context.ts` in Task 8. `server/routers.ts` and `server/db.ts` (old flat files) are deleted in Task 7/8; nothing imports them after that.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- auth`
Expected: PASS. (`trpc.ts` won't type-check standalone until routers exist; that's fine — verified in Task 7.)

- [ ] **Step 6: Commit**

```bash
git add server/lib/auth.ts server/lib/auth.test.ts server/trpc.ts
git commit -m "feat(auth): bearer-token check + adminProcedure, db in context"
```

---

### Task 5: Products repository

**Files:**
- Create: `server/db/products.repo.ts`
- Test: `server/db/products.repo.test.ts`

**Interfaces:**
- Consumes: `DB`, `createDb` (test); `products`, `productImages`, `Product`, `ProductWithImages` from schema; `slugify`, `makeUniqueSlug`.
- Produces: `listPublished(db)`, `listAll(db)`, `getBySlug(db, slug)`, `createProduct(db, input: CreateProductInput)`, `updateProduct(db, id, patch: UpdateProductPatch)`, `deleteProduct(db, id): Promise<string[]>`, `reorderProducts(db, orderedIds)`; types `CreateProductInput`, `UpdateProductPatch`.

- [ ] **Step 1: Write the failing test `server/db/products.repo.test.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import { productImages } from "./schema";
import * as repo from "./products.repo";

const dirs: string[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-repo-"));
  dirs.push(dir);
  return createDb(path.join(dir, "test.db"));
}
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true }); });

test("create generates a unique slug and defaults", async () => {
  const db = freshDb();
  const a = await repo.createProduct(db, { name: "Mesa Urb" });
  const b = await repo.createProduct(db, { name: "Mesa Urb" });
  expect(a.slug).toBe("mesa-urb");
  expect(b.slug).toBe("mesa-urb-2");
  expect(a.published).toBe(true);
});

test("listPublished hides unpublished and orders by sortOrder", async () => {
  const db = freshDb();
  await repo.createProduct(db, { name: "Second", sortOrder: 1 });
  await repo.createProduct(db, { name: "First", sortOrder: 0 });
  await repo.createProduct(db, { name: "Hidden", published: false });
  const list = await repo.listPublished(db);
  expect(list.map((p) => p.name)).toEqual(["First", "Second"]);
  expect(list[0].images).toEqual([]);
});

test("getBySlug returns product with images, null when missing", async () => {
  const db = freshDb();
  const p = await repo.createProduct(db, { name: "Lamp" });
  await db.insert(productImages).values({ productId: p.id, url: "/uploads/a.jpg", sortOrder: 0 });
  const got = await repo.getBySlug(db, "lamp");
  expect(got?.images[0].url).toBe("/uploads/a.jpg");
  expect(await repo.getBySlug(db, "nope")).toBeNull();
});

test("update changes fields and re-slugs on demand", async () => {
  const db = freshDb();
  const p = await repo.createProduct(db, { name: "Old" });
  const up = await repo.updateProduct(db, p.id, { name: "New Name", slug: "New Name", price: 100 });
  expect(up.name).toBe("New Name");
  expect(up.slug).toBe("new-name");
  expect(up.price).toBe(100);
});

test("delete returns image urls and cascades", async () => {
  const db = freshDb();
  const p = await repo.createProduct(db, { name: "Has Images" });
  await db.insert(productImages).values({ productId: p.id, url: "/uploads/x.jpg" });
  const urls = await repo.deleteProduct(db, p.id);
  expect(urls).toEqual(["/uploads/x.jpg"]);
  expect(await repo.getBySlug(db, "has-images")).toBeNull();
});

test("reorder sets sortOrder by index", async () => {
  const db = freshDb();
  const a = await repo.createProduct(db, { name: "A" });
  const b = await repo.createProduct(db, { name: "B" });
  await repo.reorderProducts(db, [b.id, a.id]);
  const list = await repo.listPublished(db);
  expect(list.map((p) => p.name)).toEqual(["B", "A"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- products.repo`
Expected: FAIL ("Cannot find module './products.repo'").

- [ ] **Step 3: Write `server/db/products.repo.ts`**

```ts
import { asc, eq, inArray } from "drizzle-orm";
import type { DB } from "./client";
import {
  productImages,
  products,
  type Product,
  type ProductImage,
  type ProductWithImages,
} from "./schema";
import { makeUniqueSlug, slugify } from "../lib/slug";

async function attachImages(db: DB, rows: Product[]): Promise<ProductWithImages[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const imgs = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, ids))
    .orderBy(asc(productImages.sortOrder));
  const byProduct = new Map<number, ProductImage[]>();
  for (const img of imgs) {
    const list = byProduct.get(img.productId) ?? [];
    list.push(img);
    byProduct.set(img.productId, list);
  }
  return rows.map((r) => ({ ...r, images: byProduct.get(r.id) ?? [] }));
}

export async function listPublished(db: DB): Promise<ProductWithImages[]> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.published, true))
    .orderBy(asc(products.sortOrder));
  return attachImages(db, rows);
}

export async function listAll(db: DB): Promise<ProductWithImages[]> {
  const rows = await db.select().from(products).orderBy(asc(products.sortOrder));
  return attachImages(db, rows);
}

export async function getBySlug(db: DB, slug: string): Promise<ProductWithImages | null> {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  return (await attachImages(db, rows))[0];
}

export type CreateProductInput = {
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  materials?: string;
  dimensions?: string;
  price?: number | null;
  featured?: boolean;
  published?: boolean;
  sortOrder?: number;
};
export type UpdateProductPatch = Partial<CreateProductInput>;

async function allSlugs(db: DB): Promise<Set<string>> {
  const rows = await db.select({ slug: products.slug }).from(products);
  return new Set(rows.map((r) => r.slug));
}

export async function createProduct(db: DB, input: CreateProductInput): Promise<Product> {
  const existing = await allSlugs(db);
  const base = slugify(input.slug ?? input.name);
  const slug = makeUniqueSlug(base, existing);
  const [row] = await db
    .insert(products)
    .values({
      slug,
      name: input.name,
      description: input.description ?? "",
      category: input.category ?? "",
      materials: input.materials ?? "",
      dimensions: input.dimensions ?? "",
      price: input.price ?? null,
      featured: input.featured ?? false,
      published: input.published ?? true,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return row;
}

export async function updateProduct(
  db: DB,
  id: number,
  patch: UpdateProductPatch
): Promise<Product> {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  const fields = [
    "name", "description", "category", "materials",
    "dimensions", "price", "featured", "published", "sortOrder",
  ] as const;
  for (const k of fields) if (patch[k] !== undefined) values[k] = patch[k];
  if (patch.slug !== undefined) {
    const existing = await allSlugs(db);
    const current = await db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (current[0]) existing.delete(current[0].slug);
    values.slug = makeUniqueSlug(slugify(patch.slug), existing);
  }
  const [row] = await db.update(products).set(values).where(eq(products.id, id)).returning();
  return row;
}

export async function deleteProduct(db: DB, id: number): Promise<string[]> {
  const imgs = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, id));
  await db.delete(products).where(eq(products.id, id)); // cascade removes images
  return imgs.map((i) => i.url);
}

export async function reorderProducts(db: DB, orderedIds: number[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(products).set({ sortOrder: i }).where(eq(products.id, orderedIds[i]));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- products.repo`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/db/products.repo.ts server/db/products.repo.test.ts
git commit -m "feat(db): products repository with tests"
```

---

### Task 6: Images repository

**Files:**
- Create: `server/db/images.repo.ts`
- Test: `server/db/images.repo.test.ts`

**Interfaces:**
- Consumes: `DB`, `productImages`, `ProductImage`, and `createProduct` (test setup).
- Produces: `listForProduct(db, productId)`, `addImage(db, { productId, url, alt? })`, `deleteImage(db, imageId): Promise<string | null>`, `reorderImages(db, productId, orderedIds)`, `setCover(db, imageId)`.

- [ ] **Step 1: Write the failing test `server/db/images.repo.test.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import * as prods from "./products.repo";
import * as repo from "./images.repo";

const dirs: string[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-img-"));
  dirs.push(dir);
  return createDb(path.join(dir, "test.db"));
}
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true }); });

test("addImage assigns increasing sortOrder", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "P" });
  const a = await repo.addImage(db, { productId: p.id, url: "/uploads/a.jpg" });
  const b = await repo.addImage(db, { productId: p.id, url: "/uploads/b.jpg" });
  expect(a.sortOrder).toBe(0);
  expect(b.sortOrder).toBe(1);
});

test("deleteImage returns the url and removes the row", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "P" });
  const a = await repo.addImage(db, { productId: p.id, url: "/uploads/a.jpg" });
  expect(await repo.deleteImage(db, a.id)).toBe("/uploads/a.jpg");
  expect(await repo.deleteImage(db, 9999)).toBeNull();
  expect(await repo.listForProduct(db, p.id)).toHaveLength(0);
});

test("setCover moves the chosen image to the front", async () => {
  const db = freshDb();
  const p = await prods.createProduct(db, { name: "P" });
  const a = await repo.addImage(db, { productId: p.id, url: "/uploads/a.jpg" });
  const b = await repo.addImage(db, { productId: p.id, url: "/uploads/b.jpg" });
  await repo.setCover(db, b.id);
  const list = await repo.listForProduct(db, p.id);
  expect(list.map((i) => i.id)).toEqual([b.id, a.id]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- images.repo`
Expected: FAIL ("Cannot find module './images.repo'").

- [ ] **Step 3: Write `server/db/images.repo.ts`**

```ts
import { asc, eq } from "drizzle-orm";
import type { DB } from "./client";
import { productImages, type ProductImage } from "./schema";

export async function listForProduct(db: DB, productId: number): Promise<ProductImage[]> {
  return db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));
}

export async function addImage(
  db: DB,
  input: { productId: number; url: string; alt?: string }
): Promise<ProductImage> {
  const existing = await listForProduct(db, input.productId);
  const nextOrder =
    existing.length === 0 ? 0 : Math.max(...existing.map((i) => i.sortOrder)) + 1;
  const [row] = await db
    .insert(productImages)
    .values({
      productId: input.productId,
      url: input.url,
      alt: input.alt ?? "",
      sortOrder: nextOrder,
    })
    .returning();
  return row;
}

export async function deleteImage(db: DB, imageId: number): Promise<string | null> {
  const rows = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);
  if (rows.length === 0) return null;
  await db.delete(productImages).where(eq(productImages.id, imageId));
  return rows[0].url;
}

export async function reorderImages(
  db: DB,
  productId: number,
  orderedIds: number[]
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(productImages)
      .set({ sortOrder: i })
      .where(eq(productImages.id, orderedIds[i]));
  }
}

export async function setCover(db: DB, imageId: number): Promise<void> {
  const rows = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);
  if (rows.length === 0) return;
  const productId = rows[0].productId;
  const imgs = await listForProduct(db, productId);
  const ordered = [imageId, ...imgs.map((i) => i.id).filter((id) => id !== imageId)];
  await reorderImages(db, productId, ordered);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- images.repo`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/db/images.repo.ts server/db/images.repo.test.ts
git commit -m "feat(db): images repository with tests"
```

---

### Task 7: tRPC routers (products + images) + appRouter

**Files:**
- Create: `server/routers/products.ts`
- Create: `server/routers/images.ts`
- Create: `server/routers/index.ts`
- Delete: `server/routers.ts` (old flat file)
- Test: `server/routers/routers.test.ts`

**Interfaces:**
- Consumes: `router`, `publicProcedure`, `adminProcedure`, `TrpcContext`; both repos; image lib; `zod`.
- Produces: `productsRouter`, `imagesRouter`, `appRouter`, type `AppRouter`. Routers call repo functions with `ctx.db`. The client keeps importing `AppRouter` from `../../../server/routers` (now the folder's `index.ts`).

- [ ] **Step 1: Delete the old flat router file**

```bash
git rm server/routers.ts
```

- [ ] **Step 2: Write `server/routers/products.ts`**

```ts
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../trpc";
import * as repo from "../db/products.repo";
import { deleteImageByUrl } from "../lib/images";

const createInput = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  materials: z.string().optional(),
  dimensions: z.string().optional(),
  price: z.number().nullable().optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const productsRouter = router({
  list: publicProcedure.query(({ ctx }) => repo.listPublished(ctx.db)),
  listAll: adminProcedure.query(({ ctx }) => repo.listAll(ctx.db)),
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => repo.getBySlug(ctx.db, input.slug)),
  create: adminProcedure
    .input(createInput)
    .mutation(({ ctx, input }) => repo.createProduct(ctx.db, input)),
  update: adminProcedure
    .input(createInput.partial().extend({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return repo.updateProduct(ctx.db, id, patch);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const urls = await repo.deleteProduct(ctx.db, input.id);
      urls.forEach(deleteImageByUrl);
      return { success: true as const };
    }),
  reorder: adminProcedure
    .input(z.object({ orderedIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      await repo.reorderProducts(ctx.db, input.orderedIds);
      return { success: true as const };
    }),
});
```

- [ ] **Step 3: Write `server/routers/images.ts`**

```ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../trpc";
import * as repo from "../db/images.repo";
import { decodeDataUrl, saveImageBuffer } from "../lib/images";

export const imagesRouter = router({
  add: adminProcedure
    .input(z.object({ productId: z.number().int(), dataUrl: z.string(), alt: z.string().optional() }))
    .mutation(({ ctx, input }) => {
      let url: string;
      try {
        const { buffer, ext } = decodeDataUrl(input.dataUrl);
        url = saveImageBuffer(buffer, ext);
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message });
      }
      return repo.addImage(ctx.db, { productId: input.productId, url, alt: input.alt });
    }),
  delete: adminProcedure
    .input(z.object({ imageId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { deleteImageByUrl } = await import("../lib/images");
      const url = await repo.deleteImage(ctx.db, input.imageId);
      if (url) deleteImageByUrl(url);
      return { success: true as const };
    }),
  reorder: adminProcedure
    .input(z.object({ productId: z.number().int(), orderedIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      await repo.reorderImages(ctx.db, input.productId, input.orderedIds);
      return { success: true as const };
    }),
  setCover: adminProcedure
    .input(z.object({ imageId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await repo.setCover(ctx.db, input.imageId);
      return { success: true as const };
    }),
});
```

- [ ] **Step 4: Write `server/routers/index.ts`**

```ts
import { router } from "../trpc";
import { imagesRouter } from "./images";
import { productsRouter } from "./products";

export const appRouter = router({
  products: productsRouter,
  images: imagesRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 5: Write the failing test `server/routers/routers.test.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createDb, type DB } from "../db/client";
import { appRouter } from "./index";
import type { TrpcContext } from "../trpc";

const dirs: string[] = [];
function ctxFor(db: DB, token?: string): TrpcContext {
  return {
    req: { headers: token ? { authorization: `Bearer ${token}` } : {} } as any,
    res: {} as any,
    db,
  };
}
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-rt-"));
  dirs.push(dir);
  return createDb(path.join(dir, "test.db"));
}
beforeEach(() => { process.env.ADMIN_API_TOKEN = "test-token"; process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eps-rtup-")); });
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true }); });

test("public list works without a token; admin create requires one", async () => {
  const db = freshDb();
  const anon = appRouter.createCaller(ctxFor(db));
  await expect(anon.products.create({ name: "X" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(await anon.products.list()).toEqual([]);

  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const created = await admin.products.create({ name: "Mesa Urb" });
  expect(created.slug).toBe("mesa-urb");
  expect(await anon.products.list()).toHaveLength(1);
});

test("images.add rejects invalid data URLs", async () => {
  const db = freshDb();
  const admin = appRouter.createCaller(ctxFor(db, "test-token"));
  const p = await admin.products.create({ name: "P" });
  await expect(admin.images.add({ productId: p.id, dataUrl: "nope" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  const img = await admin.images.add({
    productId: p.id,
    dataUrl: "data:image/png;base64," + Buffer.from("x").toString("base64"),
  });
  expect(img.url).toMatch(/^\/uploads\/.+\.png$/);
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- routers`
Expected: PASS (public read open, admin write gated, image validation enforced).

- [ ] **Step 7: Commit**

```bash
git add server/routers server/trpc.ts
git rm --cached server/routers.ts 2>/dev/null || true
git commit -m "feat(api): products + images tRPC routers with caller tests"
```

---

### Task 8: Server wiring — context, seed, /uploads, boot; delete old db.ts; .env

**Files:**
- Create: `server/context.ts`
- Create: `server/db/seed.ts`
- Modify: `server/index.ts` (replace whole file)
- Delete: `server/db.ts` (old flat store)
- Create: `.env.example`
- Test: `server/db/seed.test.ts`

**Interfaces:**
- Consumes: `db` singleton, `appRouter`, `createContext`, `seedIfEmpty`, `UPLOADS_DIR`.
- Produces: `createContext(opts): TrpcContext`; `seedIfEmpty(db): Promise<void>`; a booting server that seeds, serves `/uploads`, mounts tRPC, and serves the client.

- [ ] **Step 1: Delete the old flat db file**

```bash
git rm server/db.ts
```

- [ ] **Step 2: Write `server/context.ts`**

```ts
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { db } from "./db/client";
import type { TrpcContext } from "./trpc";

export function createContext(opts: CreateExpressContextOptions): TrpcContext {
  return { req: opts.req, res: opts.res, db };
}
```

- [ ] **Step 3: Write the failing test `server/db/seed.test.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb, type DB } from "./client";
import * as repo from "./products.repo";
import { seedIfEmpty } from "./seed";

const dirs: string[] = [];
function freshDb(): DB {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-seed-"));
  dirs.push(dir);
  return createDb(path.join(dir, "test.db"));
}
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true }); });

test("seeds 9 products once and is idempotent", async () => {
  const db = freshDb();
  await seedIfEmpty(db);
  const first = await repo.listPublished(db);
  expect(first).toHaveLength(9);
  expect(first[0].slug).toBe("estrutura-gaia");
  expect(first[0].materials).toBe("Aço carbono, MDF");
  await seedIfEmpty(db);
  expect(await repo.listPublished(db)).toHaveLength(9);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- seed`
Expected: FAIL ("Cannot find module './seed'").

- [ ] **Step 5: Write `server/db/seed.ts`**

```ts
import type { DB } from "./client";
import { products } from "./schema";

const SEED: { slug: string; name: string; description: string; category: string }[] = [
  { slug: "estrutura-gaia", name: "Estrutura Gaia", description: "Estrutura modular que se adapta a qualquer espaço", category: "Estruturas" },
  { slug: "estante-divisio", name: "Estante Divisio", description: "Estante modular em aço carbono e MDF que divide espaços com elegância", category: "Estantes" },
  { slug: "luminaria-lua", name: "Luminária Lua", description: "Luminária artesanal que traz a serenidade da lua para seus ambientes", category: "Luminárias" },
  { slug: "luminaria-sol", name: "Luminária Sol", description: "Luminária que aquece e ilumina com a energia do sol", category: "Luminárias" },
  { slug: "mesa-cabeceira-loft", name: "Mesa de Cabeceira Loft", description: "Minimalismo, força e identidade urbana. Opções com gaveta e gaveta + nicho", category: "Mesas" },
  { slug: "mesa-office-l", name: "Mesa Office L", description: "Mesa de escritório em formato L, perfeita para home office", category: "Mesas" },
  { slug: "mesa-urb", name: "Mesa Urb", description: "Mesa urbana em aço carbono com design contemporâneo", category: "Mesas" },
  { slug: "penteadeira-glam", name: "Penteadeira Glam", description: "Penteadeira sofisticada que combina funcionalidade e elegância", category: "Penteadeiras" },
  { slug: "projetos-personalizados", name: "Projetos Personalizados", description: "Crie seu próprio móvel sob medida com nossa equipe", category: "Personalizados" },
];

export async function seedIfEmpty(db: DB): Promise<void> {
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length > 0) return;
  await db.insert(products).values(
    SEED.map((p, i) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category,
      materials: "Aço carbono, MDF",
      dimensions: "",
      price: null,
      featured: false,
      published: true,
      sortOrder: i,
    }))
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- seed`
Expected: PASS

- [ ] **Step 7: Replace `server/index.ts`**

```ts
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./context";
import { db } from "./db/client";
import { seedIfEmpty } from "./db/seed";
import { UPLOADS_DIR } from "./lib/images";
import { appRouter } from "./routers";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  await seedIfEmpty(db);

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

  if (!process.env.ADMIN_API_TOKEN) {
    console.warn("[auth] ADMIN_API_TOKEN is not set — write endpoints are disabled. Set it in .env.");
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`\n  Estúdio Pedra Industrial  ->  http://localhost:${port}/\n`);
  });
}

startServer().catch(console.error);
```

- [ ] **Step 8: Write `.env.example`**

```
# Bearer token required for all write (admin) API endpoints.
# Generate one with:
#   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
ADMIN_API_TOKEN=change-me-to-a-long-random-string

# Optional overrides:
# PORT=3000
# DATABASE_PATH=.data/app.db
# UPLOADS_DIR=.data/uploads
```

- [ ] **Step 9: Create a local `.env` with a real token (git-ignored)**

```bash
node -e "const fs=require('fs');const t=require('crypto').randomBytes(24).toString('hex');fs.writeFileSync('.env',`ADMIN_API_TOKEN=${t}\n`);console.log('Wrote .env with ADMIN_API_TOKEN='+t)"
```
Record the printed token — you'll paste it into the catalog's edit mode. Confirm `.env` is git-ignored: `git check-ignore .env` prints `.env`.

- [ ] **Step 10: Boot + integration smoke test**

Run (leave server running in one shell): `npm run dev`
In another shell (replace `$TOKEN` with the value from Step 9):
```bash
# public read: 9 seeded products
curl -s "http://localhost:3000/api/trpc/products.list?input=%7B%7D" | head -c 200
# write without token -> UNAUTHORIZED
curl -s -X POST "http://localhost:3000/api/trpc/products.create" -H "Content-Type: application/json" --data '{"name":"Teste"}' | head -c 200
# write with token -> success
curl -s -X POST "http://localhost:3000/api/trpc/products.create" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" --data '{"name":"Teste"}' | head -c 200
```
Expected: first returns product JSON incl. `estrutura-gaia`; second returns an `UNAUTHORIZED` error; third returns the created product. Stop the server afterward.

- [ ] **Step 11: Commit**

```bash
git add server/context.ts server/db/seed.ts server/db/seed.test.ts server/index.ts .env.example
git rm --cached server/db.ts 2>/dev/null || true
git commit -m "feat(server): context, seed-on-boot, /uploads static, env token"
```

---

### Task 9: Frontend — bearer header + live catalog + edit mode

**Files:**
- Modify: `client/src/main.tsx` (attach bearer header from localStorage)
- Modify: `client/src/pages/Catalog.tsx` (read live data; rewire upload/delete; edit-mode gate)

**Interfaces:**
- Consumes: `trpc.products.list`, `trpc.images.add`, `trpc.images.delete` (from Task 7's `AppRouter`). Server products have shape `{ id: number; slug; name; description; category; ...; images: { id: number; url: string; alt: string; sortOrder: number }[] }`.

- [ ] **Step 1: Update the tRPC fetch in `client/src/main.tsx`**

Replace the `fetch(input, init)` function inside `httpBatchLink` with:
```ts
      fetch(input, init) {
        const token =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("eps_admin_token")
            : null;
        const headers = new Headers(init?.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
```

- [ ] **Step 2: Read the current `client/src/pages/Catalog.tsx`**

Open the file. It currently: (a) holds products in `useState([...9 hardcoded...])`; (b) has an `allImages` effect that regroups images by `productName`; (c) uploads via `addImageMutation.mutateAsync({ productName, imageUrl })`; (d) renders cover via `product.images[0].imageUrl` and gallery via `img.imageUrl`; (e) deletes via `deleteImageMutation.mutateAsync({ imageId })`. You will change each of these to use server data with `productId` and `url`.

- [ ] **Step 3: Replace product state + data loading (top of the component)**

Remove the hardcoded `useState([...])` products array **and** the `allImages`/`useEffect` regrouping block. Replace with live queries and edit-mode state:
```tsx
  const utils = trpc.useUtils();
  const { data: products = [] } = trpc.products.list.useQuery();
  const addImageMutation = trpc.images.add.useMutation();
  const deleteImageMutation = trpc.images.delete.useMutation();

  const [adminToken, setAdminToken] = useState<string | null>(
    typeof localStorage !== "undefined" ? localStorage.getItem("eps_admin_token") : null
  );
  const editMode = Boolean(adminToken);

  const enableEditMode = () => {
    const token = window.prompt("Cole o token de administrador para editar:");
    if (!token) return;
    localStorage.setItem("eps_admin_token", token.trim());
    setAdminToken(token.trim());
  };
  const exitEditMode = () => {
    localStorage.removeItem("eps_admin_token");
    setAdminToken(null);
  };
```
Keep the existing `selectedProduct`, `currentImageIndex`, `uploadingProduct` state and the `compressImage` helper as-is. Delete any remaining `setProducts(...)` calls (products are now server-owned) — after each mutation you'll call `utils.products.list.invalidate()` instead.

- [ ] **Step 4: Rewire upload + delete to the new API**

Replace the body of `handleImageUpload` so it uploads by `productId` and refreshes from the server:
```tsx
  const handleImageUpload = async (productId: number, files: FileList) => {
    setUploadingProduct(String(productId));
    for (const file of Array.from(files)) {
      const dataUrl: string = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      let compressed = await compressImage(dataUrl, 0.5);
      try {
        await addImageMutation.mutateAsync({ productId, dataUrl: compressed });
      } catch {
        compressed = await compressImage(dataUrl, 0.3);
        try {
          await addImageMutation.mutateAsync({ productId, dataUrl: compressed });
        } catch {
          alert("Erro ao salvar imagem. Verifique o token de edição e tente uma imagem menor.");
        }
      }
    }
    await utils.products.list.invalidate();
    setUploadingProduct(null);
  };

  const removeImage = async (_productId: number, imageId: number) => {
    await deleteImageMutation.mutateAsync({ imageId });
    await utils.products.list.invalidate();
  };
```

- [ ] **Step 5: Update field names + gate controls in the JSX**

Throughout the render:
- Change every `img.imageUrl` / `product.images[0].imageUrl` to `img.url` / `product.images[0].url`.
- `product.id` is now a `number`; pass it directly to `handleImageUpload`, `removeImage`, `openGallery`, `handleAddPhotosClick`.
- Wrap the "Adicionar Fotos" / "Adicionar Mais" buttons and the per-image remove (`X`) button so they only render when `editMode` is true. Public visitors see photos but no edit controls.
- Add an edit-mode toggle near the page header:
```tsx
        {editMode ? (
          <button onClick={exitEditMode} className="text-xs underline opacity-60">
            Sair do modo edição
          </button>
        ) : (
          <button onClick={enableEditMode} className="text-xs underline opacity-60">
            Editar
          </button>
        )}
```
Ensure `handleAddPhotosClick` calls `handleImageUpload(productId, files)` with the numeric id (it already builds a hidden file input — just pass `product.id`).

- [ ] **Step 6: Type-check**

Run: `npm run check`
Expected: PASS. Fix any remaining `imageUrl`→`url` or `string`→`number` id mismatches the compiler flags.

- [ ] **Step 7: Browser verification**

Start `npm run dev`, then:
1. Open `http://localhost:3000/catalogo` — 9 seeded products render (no photos yet), no edit buttons.
2. Click **Editar**, paste the token from Task 8 Step 9. Edit controls appear.
3. Upload a photo to one product → it appears and (reload the page) persists.
4. Confirm the image loads from `/uploads/...` (Network tab) and the file exists under `.data/uploads/`.
5. Remove the photo → it disappears and the file is deleted.
6. Open a private window (no token) → catalog is read-only.
Also confirm Home (`/`) and Contact (`/contato`) still render.

- [ ] **Step 8: Commit**

```bash
git add client/src/main.tsx client/src/pages/Catalog.tsx
git commit -m "feat(client): live catalog from API + token-gated edit mode"
```

---

### Task 10: Final verification, docs, checkpoint

**Files:**
- Modify: `README.md`

**Interfaces:** none (wrap-up).

- [ ] **Step 1: Full test + type-check + build**

```bash
npm test
npm run check
npm run build
```
Expected: all PASS. The build emits `dist/` (client) and the bundled server.

- [ ] **Step 2: Update `README.md`**

Under a new "Backend / catalog" section, document:
- SQLite store at `.data/app.db`, uploads at `.data/uploads/`, both git-ignored.
- `ADMIN_API_TOKEN` in `.env` (copy from `.env.example`, generate with the node one-liner); reads are public, writes need `Authorization: Bearer <token>`.
- The catalog "Editar" button + pasting the token to manage images.
- tRPC endpoints list (products.list/getBySlug/create/update/delete/reorder, images.add/delete/reorder/setCover) and that CRUD for product fields is available via the API (admin UI is a future addition).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document backend catalog, auth token, and edit mode"
```

- [ ] **Step 4: Confirm no remote / nothing pushed**

Run: `git remote -v`
Expected: empty. Everything stays local, as requested.

---

## Self-review notes

- **Spec coverage:** storage engine (T1), data model (T1 schema), file-on-disk images (T3), public read / admin write with fail-closed token (T4/T7/T8), products CRUD+reorder (T5/T7), images add/delete/reorder/setCover (T6/T7), seed 9 products (T8), `/uploads` static + boot (T8), frontend live data + edit mode + bearer header (T9), `.env`/`.env.example` (T8), tests re-introduced via vitest (T1–T8), final build/docs (T10). All covered.
- **Auth on reads:** `products.list`/`getBySlug` are public; `listAll` is admin — consistent everywhere.
- **Type consistency:** repos take `(db, ...)`; routers pass `ctx.db`; image field is `url` (server) — the frontend task explicitly renames the old `imageUrl` usages. Product `id` is `number` end-to-end.
- **Client import path:** `client/src/lib/trpc.ts` imports `AppRouter` from `../../../server/routers`, which now resolves to `server/routers/index.ts` — no client change needed for that import.
