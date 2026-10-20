export { slugify } from "../../shared/slug";

export function makeUniqueSlug(base: string, existing: Set<string>): string {
  const root = base || "item";
  if (!existing.has(root)) return root;
  let n = 2;
  while (existing.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}
