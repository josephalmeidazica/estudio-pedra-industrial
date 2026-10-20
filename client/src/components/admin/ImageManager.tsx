import { useRef, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { ChevronLeft, ChevronRight, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/imageCompress";
import type { AdminImage } from "@/lib/types";
import { thumbUrl } from "@/lib/imageSrcSet";
import { trpc } from "@/lib/trpc";

export function ImageManager({ productId, images }: { productId: number; images: AdminImage[] }) {
  const utils = trpc.useUtils();
  const addImage = trpc.images.add.useMutation();
  const delImage = trpc.images.delete.useMutation();
  const reorder = trpc.images.reorder.useMutation();
  const setCover = trpc.images.setCover.useMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => utils.products.listAll.invalidate();

  const onFiles = async (files: FileList) => {
    setBusy(true);
    for (const file of Array.from(files)) {
      const dataUrl: string = await new Promise((res) => {
        const r = new FileReader();
        r.onload = (e) => res(e.target?.result as string);
        r.readAsDataURL(file);
      });
      try {
        await addImage.mutateAsync({ productId, dataUrl: await compressImage(dataUrl) });
      } catch (e) {
        // Server messages are specific (HEIC guidance, size cap, unsupported format).
        alert(e instanceof TRPCClientError ? e.message : "Erro ao enviar imagem. Tente uma imagem menor.");
      }
    }
    await refresh();
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ordered = images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[index], ordered[j]] = [ordered[j], ordered[index]];
    await reorder.mutateAsync({ productId, orderedIds: ordered });
    await refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Imagens</span>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {busy ? "Enviando..." : "Enviar imagem"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onFiles(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma imagem ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={img.id} className="group relative overflow-hidden rounded-md border">
              <img src={thumbUrl(img)} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-background/80 px-1 text-[10px]">Capa</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-background/80 p-1 opacity-0 transition group-hover:opacity-100">
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Mover para a esquerda" onClick={() => move(i, -1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Definir como capa" onClick={async () => { await setCover.mutateAsync({ imageId: img.id }); await refresh(); }}>
                  <Star className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Remover" onClick={async () => { await delImage.mutateAsync({ imageId: img.id }); await refresh(); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Mover para a direita" onClick={() => move(i, 1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
