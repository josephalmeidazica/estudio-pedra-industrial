import { Link } from "wouter";
import { ProductCard } from "@/components/catalog/ProductCard";
import { selectFeatured } from "@/lib/featured";
import type { PublicProduct } from "@/lib/types";

export function Destaques({ products }: { products: PublicProduct[] }) {
  const featured = selectFeatured(products);
  if (featured.length === 0) return null;
  return (
    <section className="bg-card py-16 lg:py-24">
      <div className="container">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-12 lg:gap-8">
          <div className="flex flex-col gap-4">
            <p className="lbl text-muted-foreground">Portfólio</p>
            <h2 className="heading-display text-[34px] leading-[1.1] lg:text-[52px]">Destaques</h2>
          </div>
          <Link href="/catalogo" className="lbl border-b border-foreground pb-2 lg:pb-3">
            Ver portfólio completo →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
