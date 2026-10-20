import { useState } from "react";
import { ImageOff, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { thumbUrl, type ImageLike } from "@/lib/imageSrcSet";
import { trpc } from "@/lib/trpc";

type Kind = "product" | "image" | "gallery";
type Row = { kind: Kind; id: number; name: string; note?: string; thumb?: ImageLike; deletedAt: Date };

export function daysAgoLabel(deletedAt: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - deletedAt.getTime()) / 86_400_000);
  if (days <= 0) return "Excluído hoje";
  return `Excluído há ${days} ${days === 1 ? "dia" : "dias"}`;
}

/** Everything the owner deleted; restorable for 30 days, then purged automatically. */
export function LixeiraTab() {
  const utils = trpc.useUtils();
  const { data } = trpc.trash.list.useQuery();
  const restore = trpc.trash.restore.useMutation();
  const purge = trpc.trash.purge.useMutation();
  const [toPurge, setToPurge] = useState<Row | null>(null);

  const refresh = async () => {
    await Promise.all([
      utils.trash.list.invalidate(),
      utils.products.listAll.invalidate(),
      utils.products.list.invalidate(),
      utils.gallery.list.invalidate(),
    ]);
  };

  const groups: { title: string; rows: Row[] }[] = data
    ? [
        {
          title: "Peças",
          rows: data.products.map((p): Row => ({
            kind: "product",
            id: p.id,
            name: p.name,
            note: "o endereço continua reservado",
            thumb: p.images[0],
            deletedAt: p.deletedAt,
          })),
        },
        {
          title: "Fotos",
          rows: data.images.map((i): Row => ({ kind: "image", id: i.id, name: `Foto de ${i.productName}`, thumb: i, deletedAt: i.deletedAt })),
        },
        {
          title: "Ambientes",
          rows: data.gallery.map((g): Row => ({ kind: "gallery", id: g.id, name: g.caption || "Ambiente", thumb: g, deletedAt: g.deletedAt })),
        },
      ].filter((g) => g.rows.length > 0)
    : [];

  const onRestore = async (row: Row) => {
    await restore.mutateAsync({ kind: row.kind, id: row.id });
    await refresh();
    toast.success("Restaurado.");
  };

  const onPurge = async () => {
    if (!toPurge) return;
    await purge.mutateAsync({ kind: toPurge.kind, id: toPurge.id });
    setToPurge(null);
    await refresh();
    toast.success("Excluído definitivamente.");
  };

  return (
    <div className="space-y-6">
      {groups.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">A lixeira está vazia.</p>
      ) : (
        groups.map((g) => (
          <section key={g.title} className="space-y-2">
            <h2 className="text-sm font-medium">{g.title}</h2>
            <div className="divide-y rounded-md border">
              {g.rows.map((row) => (
                <div key={`${row.kind}-${row.id}`} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded border bg-muted">
                    {row.thumb ? (
                      <img src={thumbUrl(row.thumb)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageOff className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {daysAgoLabel(row.deletedAt)}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onRestore(row)} disabled={restore.isPending}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restaurar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setToPurge(row)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir definitivamente
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
      <p className="text-xs text-muted-foreground">Itens são apagados automaticamente após 30 dias.</p>

      <AlertDialog open={toPurge != null} onOpenChange={(o) => !o && setToPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toPurge?.name}" será apagado junto com seus arquivos. Isso apaga os arquivos para sempre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onPurge} disabled={purge.isPending}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
