import { useEffect, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { ChevronDown, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { DRAFT_PRODUCT_NAME } from "@shared/draft";
import { ImageManager } from "./ImageManager";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = "Nova peça": a hidden draft is created the moment the editor opens. */
  productId: number | null;
};

const emptyForm = {
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
type Form = typeof emptyForm;

// Full-screen below `sm`, the usual centred dialog above it.
const PANEL =
  "max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none overflow-y-auto sm:max-h-[90vh] sm:max-w-lg";

/** Photos-first editor for a piece. Used for "Nova peça" and for editing. */
export function ProductEditor({ open, onOpenChange, productId }: Props) {
  const utils = trpc.useUtils();
  const create = trpc.products.create.useMutation();
  const update = trpc.products.update.useMutation();
  const del = trpc.products.delete.useMutation();
  const discard = trpc.products.discardEmptyDraft.useMutation();
  const restore = trpc.trash.restore.useMutation();
  const addImage = trpc.images.add.useMutation();
  const delImage = trpc.images.delete.useMutation();
  const reorderImages = trpc.images.reorder.useMutation();
  const setCover = trpc.images.setCover.useMutation();

  const [id, setId] = useState<number | null>(null);
  const [isNewDraft, setIsNewDraft] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const listAll = trpc.products.listAll.useQuery(undefined, { enabled: open && id != null });
  const product = listAll.data?.find((p) => p.id === id) ?? null;

  const refreshLists = async () => {
    await utils.products.listAll.invalidate();
    await utils.products.list.invalidate();
  };

  // Opening: create the draft (new) or point at the existing piece.
  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setLoadedFor(null);
    setMoreOpen(false);
    setConfirmingDelete(false);
    if (productId != null) {
      setId(productId);
      setIsNewDraft(false);
      return;
    }
    let cancelled = false;
    setId(null);
    setIsNewDraft(true);
    create
      .mutateAsync({ name: DRAFT_PRODUCT_NAME, published: false })
      .then(async (p) => {
        if (cancelled) return;
        setId(p.id);
        await refreshLists();
      })
      .catch(() => toast.error("Não foi possível criar a peça. Tente de novo."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  // Fill the form once the product row is available (once per opened piece).
  useEffect(() => {
    if (!product || loadedFor === product.id) return;
    setForm({
      name: product.name === DRAFT_PRODUCT_NAME ? "" : product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      materials: product.materials,
      dimensions: product.dimensions,
      price: product.price == null ? "" : String(product.price),
      featured: product.featured,
      isCustom: product.isCustom,
    });
    setLoadedFor(product.id);
  }, [product, loadedFor]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const images = product?.images ?? [];
  const nameOk = form.name.trim().length > 0 && form.name.trim() !== DRAFT_PRODUCT_NAME;
  const untouched = isNewDraft && !nameOk && form.description.trim() === "" && images.length === 0;
  const saving = create.isPending || update.isPending;

  const close = async () => {
    if (id != null && untouched) {
      await discard.mutateAsync({ id }).catch(() => undefined);
      await refreshLists();
    }
    onOpenChange(false);
  };

  const save = async (publish?: boolean): Promise<boolean> => {
    if (id == null || !nameOk) return false;
    const price = form.price.trim() === "" ? null : Number(form.price);
    if (price !== null && Number.isNaN(price)) {
      toast.error("Preço inválido.");
      return false;
    }
    try {
      await update.mutateAsync({
        id,
        name: form.name.trim(),
        description: form.description,
        category: form.category.trim(),
        materials: form.materials,
        dimensions: form.dimensions,
        price,
        featured: form.featured,
        isCustom: form.isCustom,
        ...(publish !== undefined ? { published: publish } : {}),
        ...(form.slug.trim() && form.slug.trim() !== product?.slug ? { slug: form.slug.trim() } : {}),
      });
      await refreshLists();
      return true;
    } catch (e) {
      toast.error(e instanceof TRPCClientError ? e.message : "Erro ao salvar. Verifique os campos e tente de novo.");
      return false;
    }
  };

  const onSave = async () => {
    if (await save()) {
      toast.success("Peça salva.");
      onOpenChange(false);
    }
  };
  const onPublish = async () => {
    if (await save(true)) {
      setIsNewDraft(false);
      toast.success("Peça publicada. Já aparece no site.");
    }
  };
  const onUnpublish = async () => {
    if (await save(false)) toast.success("Peça despublicada.");
  };

  const onDelete = async () => {
    if (id == null) return;
    const deletedId = id;
    try {
      await del.mutateAsync({ id: deletedId });
      await refreshLists();
      setConfirmingDelete(false);
      onOpenChange(false);
      toast("Peça movida para a Lixeira", {
        duration: 5000,
        action: {
          label: "Desfazer",
          onClick: async () => {
            await restore.mutateAsync({ kind: "product", id: deletedId });
            await refreshLists();
          },
        },
      });
    } catch {
      toast.error("Erro ao excluir a peça.");
    }
  };

  const published = product?.published ?? false;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : void close())}>
      <DialogContent className={PANEL}>
        <DialogHeader>
          <DialogTitle>{isNewDraft ? "Nova peça" : "Editar peça"}</DialogTitle>
          <DialogDescription className="sr-only">Fotos primeiro, depois os detalhes da peça.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {id == null ? (
            <p className="text-sm text-muted-foreground">Preparando…</p>
          ) : (
            <ImageManager
              images={images}
              actions={{
                add: (dataUrl) => addImage.mutateAsync({ productId: id, dataUrl }),
                remove: (imageId) => delImage.mutateAsync({ imageId }),
                onUndo: (imageId) => restore.mutateAsync({ kind: "image", id: imageId }),
                reorder: (orderedIds) => reorderImages.mutateAsync({ productId: id, orderedIds }),
                setCover: (imageId) => setCover.mutateAsync({ imageId }),
              }}
              onChanged={() => utils.products.listAll.invalidate()}
            />
          )}

          <div className="space-y-1">
            <Label htmlFor="p-name">Nome</Label>
            <Input id="p-name" placeholder="Ex.: Mesa Urb" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-cat">Categoria</Label>
            <Input id="p-cat" placeholder="Ex.: Mesas" value={form.category} onChange={(e) => set("category", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea id="p-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="p-mat">Materiais</Label>
              <Input id="p-mat" placeholder="Ex.: Aço carbono, MDF" value={form.materials} onChange={(e) => set("materials", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-dim">Dimensões</Label>
              <Input id="p-dim" placeholder="Ex.: 120 × 60 × 75 cm" value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
            </div>
          </div>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between px-0 text-muted-foreground">
                Mais opções
                <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label htmlFor="p-slug">Endereço (slug)</Label>
                <Input id="p-slug" placeholder="gerado a partir do nome" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-price">Preço (vazio = sob consulta)</Label>
                <Input id="p-price" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} /> Destaque
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.isCustom} onCheckedChange={(v) => set("isCustom", v)} /> Personalizado
                </label>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            {id != null && !isNewDraft &&
              (confirmingDelete ? (
                <>
                  <span className="text-sm text-muted-foreground">Mover para a Lixeira?</span>
                  <Button variant="destructive" size="sm" disabled={del.isPending} onClick={onDelete}>
                    Confirmar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => setConfirmingDelete(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              ))}
            {published && product && (
              <a
                href={`/catalogo/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
              >
                Ver no site <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={close}>
              Fechar
            </Button>
            <Button variant="outline" onClick={onSave} disabled={!nameOk || saving || id == null}>
              Salvar
            </Button>
            {published ? (
              <Button onClick={onUnpublish} disabled={!nameOk || saving}>
                Despublicar
              </Button>
            ) : (
              <Button onClick={onPublish} disabled={!nameOk || saving || id == null}>
                Publicar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
