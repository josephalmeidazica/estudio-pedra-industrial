import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProduct } from "@/lib/types";
import { trpc } from "@/lib/trpc";
import { ImageManager } from "./ImageManager";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AdminProduct | null;
};

const empty = {
  name: "",
  slug: "",
  description: "",
  category: "",
  materials: "",
  dimensions: "",
  price: "",
  featured: false,
  published: true,
};

export function ProductDialog({ open, onOpenChange, product }: Props) {
  const utils = trpc.useUtils();
  const create = trpc.products.create.useMutation();
  const update = trpc.products.update.useMutation();
  const [form, setForm] = useState(empty);
  const [currentId, setCurrentId] = useState<number | null>(null);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        materials: product.materials,
        dimensions: product.dimensions,
        price: product.price == null ? "" : String(product.price),
        featured: product.featured,
        published: product.published,
      });
      setCurrentId(product.id);
    } else {
      setForm(empty);
      setCurrentId(null);
    }
  }, [product, open]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const refreshLists = async () => {
    await utils.products.listAll.invalidate();
    await utils.products.list.invalidate();
  };

  const save = async () => {
    if (!form.name.trim()) return;

    const price = form.price.trim() === "" ? null : Number(form.price);
    if (price !== null && Number.isNaN(price)) {
      alert("Preço inválido.");
      return;
    }

    const base = {
      name: form.name.trim(),
      description: form.description,
      category: form.category,
      materials: form.materials,
      dimensions: form.dimensions,
      price: price,
      featured: form.featured,
      published: form.published,
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    };

    try {
      if (currentId == null) {
        const created = await create.mutateAsync(base);
        setCurrentId(created.id); // switch to edit mode so images can be added
      } else {
        await update.mutateAsync({ id: currentId, ...base });
      }
      await refreshLists();
    } catch {
      alert("Erro ao salvar o produto. Verifique os campos e tente novamente.");
    }
  };

  // The current product's fresh images (for the ImageManager) come from listAll.
  const listAll = trpc.products.listAll.useQuery(undefined, { enabled: currentId != null });
  const currentImages = listAll.data?.find((p) => p.id === currentId)?.images ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{currentId == null ? "Novo produto" : "Editar produto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="p-name">Nome</Label>
            <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-slug">Slug (opcional)</Label>
            <Input id="p-slug" placeholder="gerado a partir do nome" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-cat">Categoria</Label>
            <Input id="p-cat" value={form.category} onChange={(e) => set("category", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="p-mat">Materiais</Label>
              <Input id="p-mat" value={form.materials} onChange={(e) => set("materials", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-dim">Dimensões</Label>
              <Input id="p-dim" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-price">Preço (vazio = sob consulta)</Label>
            <Input id="p-price" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea id="p-desc" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} /> Destaque
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} /> Publicado
            </label>
          </div>

          {currentId != null && (
            <div className="border-t pt-3">
              <ImageManager productId={currentId} images={currentImages} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={save} disabled={!form.name.trim() || create.isPending || update.isPending}>
            {currentId == null ? "Criar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
