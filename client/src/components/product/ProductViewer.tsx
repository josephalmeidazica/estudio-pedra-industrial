import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { QuoteButton } from "@/components/catalog/QuoteButton";
import { ProductIcon } from "@/components/icons/ProductIcon";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { categoryIcon } from "@/lib/categoryIcons";
import { fichaRows } from "@/lib/ficha";
import { thumbUrl } from "@/lib/imageSrcSet";
import type { PublicProduct } from "@/lib/types";
import { SITE } from "@shared/content/site";
import { FichaRows } from "./FichaRows";

type Props = {
  product: PublicProduct;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const DESKTOP = "(min-width: 1024px)";
const SNAP_POINTS = [0.45, 1];
const iconBtn =
  "flex h-11 w-11 items-center justify-center bg-black/50 text-background transition-colors hover:bg-black/70 hover:text-border";
const actionClass = "h-12 text-xs font-medium uppercase tracking-[0.12em]";

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const onChange = () => setDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

/** Ficha body: header, rows, actions. Shared by the desktop panel and the phone sheet. */
function FichaPanel({ product, titleSlot, layout }: { product: PublicProduct; titleSlot: React.ReactNode; layout: "panel" | "sheet" }) {
  const rows = fichaRows(product, SITE);
  const icon = product.isCustom ? null : categoryIcon(product.category);
  const panel = layout === "panel";
  return (
    <>
      <div className={`flex flex-col gap-2 border-b border-border ${panel ? "px-8 pb-5 pt-7" : "px-5 pb-3 pt-2.5"}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="lbl text-muted-foreground">Ficha técnica</span>
          {icon ? <ProductIcon src={icon} className="h-[22px] w-7 text-accent" /> : null}
        </div>
        {titleSlot}
        {product.category ? <span className="lbl text-[10px] text-muted-foreground">{product.category}</span> : null}
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto ${panel ? "px-8 pb-5 pt-2" : "px-5 pb-3 pt-1"}`}>
        <FichaRows rows={rows} className="border-b-0" />
      </div>
      <div className={`border-t border-border bg-background ${panel ? "grid gap-2 px-8 pb-6 pt-4" : "flex gap-2 px-5 pb-4 pt-3"}`}>
        {panel ? null : <AddToCartButton product={product} iconOnly className="h-12 w-[50px] shrink-0 px-0" />}
        <QuoteButton
          product={product}
          hideIcon
          label={product.isCustom || !panel ? undefined : "Pedir orçamento desta peça"}
          className={`${actionClass} ${panel ? "" : "flex-1"}`}
        />
        {panel ? <AddToCartButton product={product} className={actionClass} /> : null}
      </div>
    </>
  );
}

/** Full-screen photo + ficha técnica. Side panel on desktop, bottom sheet over the photo on phones. */
export function ProductViewer({ product, index, onIndexChange, onClose }: Props) {
  const desktop = useIsDesktop();
  const images = product.images;
  const image = images[index];
  const many = images.length > 1;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]);

  const prev = () => onIndexChange((index - 1 + images.length) % images.length);
  const next = () => onIndexChange((index + 1) % images.length);

  // Esc closes, arrows navigate. Keys typed inside a nested dialog or a field are left alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const owner = target?.closest("[role='dialog']");
      if (owner && !owner.hasAttribute("data-product-viewer")) return;
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowLeft") prev();
      if (many && e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Desktop: lock page scroll, move focus into the dialog and give it back on close.
  useEffect(() => {
    if (!desktop) return;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [desktop]);

  if (!image) return null;
  const alt = `${product.name}, foto ${index + 1} de ${images.length}`;
  const arrows = many ? (
    <>
      <button type="button" onClick={prev} aria-label="Foto anterior" className={`${iconBtn} absolute left-4 top-1/2 -translate-y-1/2`}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={next} aria-label="Próxima foto" className={`${iconBtn} absolute right-4 top-1/2 -translate-y-1/2`}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  ) : null;

  if (desktop) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ficha-title"
          data-product-viewer=""
          tabIndex={-1}
          className="absolute inset-y-10 left-[60px] right-[60px] grid grid-cols-[minmax(0,62fr)_minmax(0,38fr)] bg-black outline-none"
        >
          <div className="relative flex min-w-0 flex-col">
            <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between">
              <span className="lbl bg-black/60 px-2.5 py-1.5 text-border">
                {product.name} · foto {index + 1} de {images.length}
              </span>
              <button type="button" onClick={onClose} aria-label="Fechar" className={iconBtn}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <img src={image.url} alt={alt} className="h-full min-h-0 w-full flex-1 bg-black object-contain" />
            {arrows}
            <div className="flex gap-2 border-t border-muted-foreground px-6 py-4">
              {many &&
                images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    aria-label={`Ver foto ${i + 1}`}
                    aria-pressed={i === index}
                    onClick={() => onIndexChange(i)}
                    className={`h-14 w-14 shrink-0 overflow-hidden border ${i === index ? "border-border" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img src={thumbUrl(img)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              <span className="ml-auto self-center text-[13px] text-muted-foreground">← → para navegar · Esc fecha</span>
            </div>
          </div>
          <aside className="flex min-w-0 flex-col overflow-hidden bg-background">
            <FichaPanel
              product={product}
              layout="panel"
              titleSlot={
                <h2 id="ficha-title" className="m-0 text-4xl font-light leading-[1.05] text-foreground">
                  {product.name}
                </h2>
              }
            />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black" data-product-viewer="">
        <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between">
          <button type="button" onClick={onClose} aria-label="Fechar" className={iconBtn}>
            <X className="h-5 w-5" />
          </button>
          <span className="lbl text-border">
            {index + 1} / {images.length}
          </span>
          <span className="w-11" aria-hidden="true" />
        </div>
        <div className="relative h-[55dvh]">
          <img src={image.url} alt={alt} className="h-full w-full object-contain" />
          {arrows}
        </div>
      </div>
      <Drawer
        open
        modal={false}
        snapPoints={SNAP_POINTS}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DrawerContent
          data-product-viewer=""
          className="h-[100dvh] border-t-2 border-border bg-background outline-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none data-[vaul-drawer-direction=bottom]:rounded-none [&>div:first-child]:hidden"
        >
          <div className="flex shrink-0 justify-center pt-2" aria-hidden="true">
            <span className="h-[3px] w-10 bg-muted-foreground" />
          </div>
          <DrawerDescription className="sr-only">Medidas, materiais e detalhes da peça</DrawerDescription>
          <div className="flex min-h-0 flex-1 flex-col" style={{ maxHeight: snap === 1 ? undefined : "45dvh" }}>
            <FichaPanel
              product={product}
              layout="sheet"
              titleSlot={
                <DrawerTitle className="m-0 text-[28px] font-light leading-[1.05] text-foreground">{product.name}</DrawerTitle>
              }
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
