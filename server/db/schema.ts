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
  // The "Móvel personalizado" entry: adding it asks for a description. At most
  // one product has it (the repo clears the others when setting it).
  isCustom: integer("isCustom", { mode: "boolean" }).notNull().default(false),
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
  // Intrinsic size of the largest variant; 0/0 marks a legacy single-file row.
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  // { "480": "/uploads/<uuid>-480.webp", ... }; {} marks a legacy row.
  variants: text("variants", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'`),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

/** Photos of pieces installed in clients' homes ("Ambientes"), shown on the home page. */
export const galleryImages = sqliteTable("gallery_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull(),
  caption: text("caption").notNull().default(""),
  // Optional link to the piece in the photo; cleared if that product is deleted.
  productId: integer("productId").references(() => products.id, { onDelete: "set null" }),
  sortOrder: integer("sortOrder").notNull().default(0),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  variants: text("variants", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'`),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type GalleryImage = typeof galleryImages.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type ProductWithImages = Product & { images: ProductImage[] };
