import { expect, test } from "vitest";
import { buildProductPatch, emptyForm } from "./productPatch";

const live = { slug: "mesa-urb" };

test("slug is sent only when the owner edited the field (a stale snapshot must not revert a server-derived slug)", () => {
  // Server re-derived the slug on publish; the form still holds the old draft slug.
  const stale = { ...emptyForm, name: "Mesa Urb", slug: "nova-peca" };
  expect(buildProductPatch(stale, live, { slugDirty: false })).not.toHaveProperty("slug");
  expect(buildProductPatch(stale, live, { slugDirty: true })).toMatchObject({ slug: "nova-peca" });
  // Edited but unchanged or emptied: nothing to send.
  expect(buildProductPatch({ ...stale, slug: "mesa-urb" }, live, { slugDirty: true })).not.toHaveProperty("slug");
  expect(buildProductPatch({ ...stale, slug: "  " }, live, { slugDirty: true })).not.toHaveProperty("slug");
});

test("publish flag and price parsing", () => {
  const form = { ...emptyForm, name: " Mesa ", price: "" };
  expect(buildProductPatch(form, live, { slugDirty: false })).toMatchObject({ name: "Mesa", price: null });
  expect(buildProductPatch(form, live, { slugDirty: false })).not.toHaveProperty("published");
  expect(buildProductPatch({ ...form, price: "1200" }, live, { slugDirty: false, publish: true })).toMatchObject({ price: 1200, published: true });
  expect(buildProductPatch({ ...form, price: "abc" }, live, { slugDirty: false })).toBeNull();
});
