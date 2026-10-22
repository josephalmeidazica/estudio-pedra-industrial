import { Link } from "wouter";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductIcon } from "@/components/icons/ProductIcon";
import { CARD_SIZES, ResponsiveImage } from "@/components/ResponsiveImage";
import { cardImage } from "@/lib/cardImage";
import { categoryIcon } from "@/lib/categoryIcons";
import type { PublicProduct } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QuoteButton } from "./QuoteButton";

/** One catalog card; used by the catalog grid, the home "Destaques" grid and "Veja também". */
export function ProductCard({ product }: { product: PublicProduct }) {
  const href = `/catalogo/${product.slug}`;
  const photo = cardImage(product);
  const count = product.images.length;
  const icon = product.isCustom ? null : categoryIcon(product.category);
  return (
    <article
      id={product.isCustom ? "sob-medida" : undefined}
      className={cn(
        "flex min-w-0 flex-col border border-border",
        product.isCustom ? "border-dashed bg-card" : "bg-background",
      )}
    >
      <Link
        href={href}
        aria-label={`Ver ${product.name}`}
        className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-card"
      >
        {photo ? (
          <>
            <ResponsiveImage
              image={photo}
              sizes={CARD_SIZES}
              alt={`${product.name} principal`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute right-4 top-4 bg-foreground px-2.5 py-1.5 text-[11px] uppercase tracking-[0.12em] text-background">
              {count} foto{count !== 1 ? "s" : ""}
            </span>
          </>
        ) : product.isCustom ? (
          <span className="flex flex-col items-center gap-5">
            <ProductIcon src="/brand/simbolo-preto.png" className="h-[100px] w-[120px]" />
            <span className="lbl">Sob medida</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Sem fotos</span>
        )}
      </Link>

      <div className="flex flex-col gap-3 px-6 pb-7 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-2xl font-light text-foreground">
            <Link href={href} className="hover:text-accent">
              {product.name}
            </Link>
          </h3>
          {icon ? <ProductIcon src={icon} className="h-[22px] w-6 shrink-0 text-accent" /> : null}
        </div>
        {product.category ? <p className="lbl text-[10px] text-muted-foreground">{product.category}</p> : null}
        <p className="text-[15px] leading-relaxed text-muted-foreground">{product.description}</p>
        <div className="flex flex-col gap-2 pt-2">
          <QuoteButton product={product} hideIcon className="h-11 text-xs font-medium uppercase tracking-[0.12em]" />
          <AddToCartButton
            product={product}
            variant="ghost"
            className="h-11 text-xs font-medium uppercase tracking-[0.12em] hover:bg-transparent hover:text-accent"
          />
        </div>
      </div>
    </article>
  );
}
