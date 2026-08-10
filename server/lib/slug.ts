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
