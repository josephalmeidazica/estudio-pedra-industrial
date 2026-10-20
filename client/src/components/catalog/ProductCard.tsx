import { Plus, Tag } from "lucide-react";
import { Link } from "wouter";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CARD_SIZES, ResponsiveImage } from "@/components/ResponsiveImage";
import type { PublicProduct } from "@/lib/types";
import { QuoteButton } from "./QuoteButton";

/** One catalog card; used by the catalog grid, the home "Destaques" grid and "Veja também". */
export function ProductCard({ product }: { product: PublicProduct }) {
  const href = `/catalogo/${product.slug}`;
  const count = product.images.length;
  return (
    <div className="group border border-border rounded-lg overflow-hidden hover:border-foreground/50 transition-all duration-300">
      <Link href={href}>
        <div className="relative h-64 bg-card flex items-center justify-center overflow-hidden cursor-pointer group/image-area">
          {count > 0 ? (
            <>
              <ResponsiveImage
                image={product.images[0]}
                sizes={CARD_SIZES}
                alt={`${product.name} principal`}
                loading="lazy"
                className="w-full h-full object-cover group-hover/image-area:opacity-80 transition-opacity duration-300"
              />
              <div className="absolute top-4 right-4 bg-foreground/90 text-background px-3 py-1 rounded-full text-xs font-semibold">
                {count} foto{count !== 1 ? "s" : ""}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover/image-area:bg-black/30 transition-all duration-300 flex items-center justify-center">
                <p className="text-white text-sm font-semibold opacity-0 group-hover/image-area:opacity-100 transition-opacity duration-300">
                  Ver detalhes
                </p>
              </div>
            </>
          ) : (
            <div className="text-center">
              <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sem fotos</p>
            </div>
          )}
        </div>
      </Link>

      <div className="p-8">
        <h3 className="heading-secondary text-xl mb-2 text-foreground">
          <Link href={href} className="hover:text-secondary transition-colors duration-300">
            {product.name}
          </Link>
        </h3>
        <p className={`text-sm text-muted-foreground leading-relaxed ${product.category ? "mb-2" : "mb-4"}`}>
          {product.description}
        </p>
        {product.category ? (
          <span className="mt-1 mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            {product.category}
          </span>
        ) : null}
        <div className="flex flex-col gap-2">
          <QuoteButton product={product} />
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
