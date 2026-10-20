import { useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { hasDimensions, thumbUrl, type ImageLike } from "@/lib/imageSrcSet";

type Props = {
  images: ImageLike[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Prefix for alt texts, e.g. the product name. */
  altBase: string;
  /** Rendered under the thumbnails (e.g. a "Ver a peça" link). */
  footer?: ReactNode;
};

/** Full-screen image viewer shared by the product page and the Ambientes strip. */
export function ImageLightbox({ images, index, onIndexChange, onClose, altBase, footer }: Props) {
  const image = images[index];
  const many = images.length > 1;
  const prev = () => onIndexChange((index - 1 + images.length) % images.length);
  const next = () => onIndexChange((index + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowLeft") prev();
      if (many && e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!image) return null;
  const known = hasDimensions(image);
  const arrow =
    "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors";

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" role="dialog" aria-modal="true">
      <button onClick={onClose} aria-label="Fechar" className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors">
        <X className="w-8 h-8" />
      </button>

      <div className="relative w-full max-w-4xl mb-8">
        <div
          className={known ? "mx-auto max-h-[70vh] w-full" : undefined}
          style={known ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
        >
          <img
            src={image.url}
            alt={`${altBase} ${index + 1}`}
            width={known ? image.width : undefined}
            height={known ? image.height : undefined}
            className={known ? "h-full w-full object-contain" : "w-full h-auto max-h-96 object-contain"}
          />
        </div>

        {many && (
          <>
            <button onClick={prev} aria-label="Imagem anterior" className={`${arrow} left-2`}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={next} aria-label="Próxima imagem" className={`${arrow} right-2`}>
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
          Imagem {index + 1} de {images.length}
        </div>
      </div>

      {many && (
        <div className="flex gap-4 overflow-x-auto pb-4 w-full max-w-4xl">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => onIndexChange(idx)}
              aria-label={`Ver imagem ${idx + 1}`}
              className={`flex-shrink-0 w-20 h-20 rounded border-2 transition-all ${
                idx === index ? "border-white" : "border-gray-600 hover:border-gray-400"
              }`}
            >
              <img src={thumbUrl(img)} alt="" className="w-full h-full object-cover rounded" />
            </button>
          ))}
        </div>
      )}

      {footer ? <div className="mt-2 text-white">{footer}</div> : null}
    </div>
  );
}
