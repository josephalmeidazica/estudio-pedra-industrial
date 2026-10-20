import { useRef, useState, type ReactNode } from "react";
import { TRPCClientError } from "@trpc/client";
import { ChevronLeft, ChevronRight, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/imageCompress";
import { thumbUrl, type ImageLike } from "@/lib/imageSrcSet";

export type ManagedImage = ImageLike & { id: number };

export type ImageActions = {
  add(dataUrl: string): Promise<unknown>;
  remove(id: number): Promise<unknown>;
  reorder(orderedIds: number[]): Promise<unknown>;
  /** When absent, there is no cover concept (no badge, no star). */
  setCover?(id: number): Promise<unknown>;
};

type Props = {
  images: ManagedImage[];
  title?: string;
  actions: ImageActions;
  /** Called after any mutation so the owner can refetch. */
  onChanged(): Promise<unknown>;
  /** Extra controls rendered under each tile (caption, related product, …). */
  renderExtra?(img: ManagedImage): ReactNode;
};

/** Upload / reorder / delete a list of images. Bound to products or to the Ambientes gallery via `actions`. */
export function ImageManager({ images, title = "Imagens", actions, onChanged, renderExtra }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList) => {
    setBusy(true);
    for (const file of Array.from(files)) {
      const dataUrl: string = await new Promise((res) => {
        const r = new FileReader();
        r.onload = (e) => res(e.target?.result as string);
        r.readAsDataURL(file);
      });
      try {
        await actions.add(await compressImage(dataUrl));
      } catch (e) {
        // Server messages are specific (HEIC guidance, size cap, unsupported format).
        alert(e instanceof TRPCClientError ? e.message : "Erro ao enviar imagem. Tente uma imagem menor.");
      }
    }
    await onChanged();
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ordered = images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[index], ordered[j]] = [ordered[j], ordered[index]];
    await actions.reorder(ordered);
    await onChanged();
  };

  const withCover = Boolean(actions.setCover);
  const cols = renderExtra ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-3";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
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
        <div className={`grid gap-2 ${cols}`}>
          {images.map((img, i) => (
            <div key={img.id} className="space-y-2">
              <div className="group relative overflow-hidden rounded-md border">
                <img src={thumbUrl(img)} alt="" className="aspect-square w-full object-cover" />
                {withCover && i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-background/80 px-1 text-[10px]">Capa</span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-background/80 p-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Mover para a esquerda" onClick={() => move(i, -1)}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  {withCover && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label="Definir como capa"
                      onClick={async () => {
                        await actions.setCover!(img.id);
                        await onChanged();
                      }}
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Remover"
                    onClick={async () => {
                      await actions.remove(img.id);
                      await onChanged();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Mover para a direita" onClick={() => move(i, 1)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {renderExtra?.(img)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
