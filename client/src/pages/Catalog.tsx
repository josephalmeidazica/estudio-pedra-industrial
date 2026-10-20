/*
  Estúdio Pedra Industrial - Página Portfólio
  Design: Minimalista sofisticado, elegante, premium
  Foco em aço carbono e MDF
*/

import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Layout } from "@/components/layout/Layout";
import { CategoryChips } from "@/components/catalog/CategoryChips";
import { ProductCard } from "@/components/catalog/ProductCard";
import { extractCategories, filterByCategory } from "@/lib/catalogFilter";
import { usePageTitle } from "@/lib/usePageTitle";
import { titles } from "@shared/seo-text";

export default function Catalog() {
  const { data: products = [] } = trpc.products.list.useQuery();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const active = new URLSearchParams(search).get("categoria");
  const categories = extractCategories(products);
  const visible = filterByCategory(products, active);
  const activeKnown = active !== null && categories.some((c) => c.slug === active) ? active : null;
  const activeLabel = categories.find((c) => c.slug === activeKnown)?.label;
  usePageTitle(activeLabel ? titles.category(activeLabel) : titles.catalog());

  const onCategory = (slug: string | null) =>
    setLocation(slug ? `/catalogo?categoria=${slug}` : "/catalogo", { replace: true });

  return (
    <Layout showCart>
      {/* Catalog Header */}
      <section className="py-20 bg-background border-b border-border">
        <div className="container">
          <div className="mb-8">
            <Link href="/">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </div>
            </Link>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl heading-display text-foreground mb-6">
            Portfólio de Produtos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore nossa coleção completa de móveis industriais.
            <br />
            <br />
            Para além dos produtos existentes neste portfólio, fazemos projetos personalizados sob medida. Entre em contato conosco!
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 md:py-32 bg-background">
        <div className="container">
          {categories.length > 0 && (
            <div className="mb-12">
              <CategoryChips categories={categories} active={activeKnown} onChange={onCategory} />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
