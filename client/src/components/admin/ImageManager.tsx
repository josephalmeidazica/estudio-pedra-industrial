import { useRef, useState, type ReactNode } from "react";
import { TRPCClientError } from "@trpc/client";
import { ChevronLeft, ChevronRight, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertHeicToJpeg, isHeicFile } from "@/lib/heic";
import { compressImage } from "@/lib/imageCompress";
import { thumbUrl, type ImageLike } from "@/lib/imageSrcSet";

export type ManagedImage = ImageLike & { id: number };

export type ImageActions = {
  add(dataUrl: string): Promise<unknown>;
  /** Moves the image to the Lixeira. */
  remove(id: number): Promise<unknown>;
  /** Brings a just-removed image back (the toast's "Desfazer"). */
  onUndo?(id: number): Promise<unknown>;
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

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target?.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });

const readHead = async (file: File) => new Uint8Array(await file.slice(0, 16).arrayBuffer());

/** Raised when a HEIC could not be converted; its message is shown as-is. */
class HeicConversionError extends Error {}

/**
 * Browser-side JPEG for upload. Safari decodes HEIC natively; elsewhere the
 * first decode fails and, if the bytes look like HEIC, the lazy converter runs.
 */
async function prepareUpload(file: File): Promise<string> {
  const first = await compressImage(await readAsDataUrl(file));
  if (first.decoded || !isHeicFile(file, await readHead(file))) return first.dataUrl;

  const toastId = toast.loading("Convertendo foto do iPhone…");
  try {
    const jpeg = await convertHeicToJpeg(file);
    return (await compressImage(await readAsDataUrl(jpeg))).dataUrl;
  } catch {
    throw new HeicConversionError(`Não foi possível converter ${file.name}. Tente enviar a foto como JPEG.`);
  } finally {
    toast.dismiss(toastId);
  }
}

/**
 * Upload / reorder / delete a list of images. Bound to products or to the
 * Ambientes gallery via `actions`. Built for touch: every control is always
 * visible and at least 36 px.
 */
export function ImageManager({ images, title = "Fotos", actions, onChanged, renderExtra }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const onFiles = async (files: FileList) => {
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    let failed = 0;
    for (const [i, file] of list.entries()) {
      setProgress({ done: i + 1, total: list.length });
      try {
        await actions.add(await prepareUpload(file));
      } catch (e) {
        failed++;
        // Server messages are specific (size cap, unsupported format); so is the HEIC one.
        const specific = e instanceof TRPCClientError || e instanceof HeicConversionError;
        toast.error(specific ? e.message : `Não foi possível enviar ${file.name}.`);
      }
    }
    await onChanged();
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    if (list.length > 1 && failed === 0) toast.success(`${list.length} fotos enviadas.`);
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ordered = images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[index], ordered[j]] = [ordered[j], ordered[index]];
    await actions.reorder(ordered);
    await onChanged();
  };

  const remove = async (img: ManagedImage) => {
    await actions.remove(img.id);
    await onChanged();
    const undo = actions.onUndo;
    toast("Foto movida para a Lixeira", {
      duration: 5000,
      action: undo
        ? {
            label: "Desfazer",
            onClick: async () => {
              await undo(img.id);
              await onChanged();
            },
          }
        : undefined,
    });
  };

  const withCover = Boolean(actions.setCover);
  const cols = renderExtra ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3";
  const busy = progress !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {busy ? `Enviando ${progress.done} de ${progress.total}…` : "Adicionar fotos"}
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
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-sm text-muted-foreground"
        >
          <Upload className="h-6 w-6" />
          Toque para escolher fotos do seu celular
        </button>
      ) : (
        <div className={`grid gap-3 ${cols}`}>
          {images.map((img, i) => (
            <div key={img.id} className="space-y-2">
              <div className="relative overflow-hidden rounded-md border">
                <img src={thumbUrl(img)} alt="" className="aspect-square w-full object-cover" />
                {withCover && i === 0 && (
                  <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-0.5 text-xs font-medium">Capa</span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 text-white">
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/20 hover:text-white" aria-label="Mover para a esquerda" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {withCover && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-white/20 hover:text-white"
                      aria-label="Definir como capa"
                      disabled={i === 0}
                      onClick={async () => {
                        await actions.setCover!(img.id);
                        await onChanged();
                      }}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/20 hover:text-white" aria-label="Remover" onClick={() => remove(img)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/20 hover:text-white" aria-label="Mover para a direita" disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                    <ChevronRight className="h-4 w-4" />
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
