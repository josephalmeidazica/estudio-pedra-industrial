/**
 * Local file-backed data store for product images.
 *
 * Replaces the original MySQL + Drizzle backend so the app runs locally with
 * zero external services. Data persists across restarts in `.data/product-images.json`
 * (git-ignored). Product images are stored as base64 data URLs uploaded from the UI.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", ".data");
const DATA_FILE = path.join(DATA_DIR, "product-images.json");

export type ProductImage = {
  id: number;
  productName: string;
  imageUrl: string;
  createdAt: string;
};

type Store = { nextId: number; images: ProductImage[] };

function read(): Store {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    if (parsed && Array.isArray(parsed.images) && typeof parsed.nextId === "number") {
      return parsed as Store;
    }
  } catch {
    // Missing or corrupt file -> start fresh.
  }
  return { nextId: 1, images: [] };
}

function write(store: Store): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function addProductImage(productName: string, imageUrl: string): Promise<void> {
  const store = read();
  store.images.push({
    id: store.nextId++,
    productName,
    imageUrl,
    createdAt: new Date().toISOString(),
  });
  write(store);
}

export async function getProductImages(productName: string): Promise<ProductImage[]> {
  return read().images.filter((img) => img.productName === productName);
}

export async function deleteProductImage(imageId: number): Promise<void> {
  const store = read();
  store.images = store.images.filter((img) => img.id !== imageId);
  write(store);
}

export async function getAllProductImages(): Promise<ProductImage[]> {
  return read().images;
}
