import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GalleryItem } from "@/lib/types";
import { trpc } from "@/lib/trpc";
import { ImageManager } from "./ImageManager";

const NONE = "none";

/** Caption + related product controls under one Ambientes tile. */
function GalleryExtra({ item, products }: { item: GalleryItem; products: { id: number; name: string }[] }) {
  const utils = trpc.useUtils();
  const update = trpc.gallery.update.useMutation();
  const [caption, setCaption] = useState(item.caption);
  useEffect(() => setCaption(item.caption), [item.caption]);

  const saveCaption = async () => {
    if (caption === item.caption) return;
    await update.mutateAsync({ id: item.id, caption });
    await utils.gallery.list.invalidate();
  };
  const setProduct = async (value: string) => {
    const productId = value === NONE ? null : Number(value);
    await update.mutateAsync({ id: item.id, productId });
    await utils.gallery.list.invalidate();
  };

  return (
    <div className="space-y-2">
      <Input
        aria-label="Legenda"
        placeholder="Legenda (opcional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={saveCaption}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <Select value={item.productId == null ? NONE : String(item.productId)} onValueChange={setProduct}>
        <SelectTrigger aria-label="Peça relacionada">
          <SelectValue placeholder="Peça relacionada" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Nenhuma</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Admin tab: photos of pieces installed in clients' homes, shown on the home page. */
export function AmbientesTab() {
  const utils = trpc.useUtils();
  const gallery = trpc.gallery.list.useQuery();
  const listAll = trpc.products.listAll.useQuery();
  const add = trpc.gallery.add.useMutation();
  const del = trpc.gallery.delete.useMutation();
  const reorder = trpc.gallery.reorder.useMutation();
  const restore = trpc.trash.restore.useMutation();

  const products = (listAll.data ?? []).filter((p) => p.published).map((p) => ({ id: p.id, name: p.name }));
  const items = gallery.data ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Fotos de peças instaladas na casa dos clientes. Aparecem na página inicial, nesta ordem. A legenda e a
        peça relacionada são opcionais.
      </p>
      <ImageManager
        title="Ambientes"
        images={items}
        actions={{
          add: (dataUrl) => add.mutateAsync({ dataUrl }),
          remove: (id) => del.mutateAsync({ id }),
          onUndo: (id) => restore.mutateAsync({ kind: "gallery", id }),
          reorder: (orderedIds) => reorder.mutateAsync({ orderedIds }),
        }}
        onChanged={() => utils.gallery.list.invalidate()}
        renderExtra={(img) => {
          const item = items.find((g) => g.id === img.id);
          return item ? <GalleryExtra item={item} products={products} /> : null;
        }}
      />
    </div>
  );
}
