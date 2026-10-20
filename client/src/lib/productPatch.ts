/** The editor's form state: every field as the text the owner typed. */
export const emptyForm = {
  name: "",
  slug: "",
  description: "",
  category: "",
  materials: "",
  dimensions: "",
  price: "",
  featured: false,
  isCustom: false,
};
export type ProductForm = typeof emptyForm;

export type ProductPatch = {
  name: string;
  description: string;
  category: string;
  materials: string;
  dimensions: string;
  price: number | null;
  featured: boolean;
  isCustom: boolean;
  published?: boolean;
  slug?: string;
};

/**
 * Builds the `products.update` input from the form. Returns null when the
 * price is not a number. The slug travels only when the owner edited that
 * field: the form holds a snapshot, and the server re-derives the slug from
 * the name while a piece is unpublished, so a stale snapshot sent back would
 * revert a live address to the draft's one.
 */
export function buildProductPatch(
  form: ProductForm,
  current: { slug: string } | null,
  opts: { slugDirty: boolean; publish?: boolean }
): ProductPatch | null {
  const price = form.price.trim() === "" ? null : Number(form.price);
  if (price !== null && Number.isNaN(price)) return null;
  const slug = form.slug.trim();
  return {
    name: form.name.trim(),
    description: form.description,
    category: form.category.trim(),
    materials: form.materials,
    dimensions: form.dimensions,
    price,
    featured: form.featured,
    isCustom: form.isCustom,
    ...(opts.publish !== undefined ? { published: opts.publish } : {}),
    ...(opts.slugDirty && slug && slug !== current?.slug ? { slug } : {}),
  };
}
