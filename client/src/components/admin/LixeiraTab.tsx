import { trpc } from "@/lib/trpc";

/** Placeholder until Task 7 fills it in. */
export function LixeiraTab() {
  const { data } = trpc.trash.list.useQuery();
  const total = data ? data.products.length + data.images.length + data.gallery.length : 0;
  return <p className="text-sm text-muted-foreground">{total === 0 ? "A lixeira está vazia." : `${total} item(ns) na lixeira.`}</p>;
}
