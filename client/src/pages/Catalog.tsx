/*
  Estúdio Pedra Industrial - Página Portfólio
  Título, filtro por tipo de peça com ícones, grade de cards, faixa de peças instaladas e faixa do catálogo em PDF.
*/

import { Link, useLocation, useSearch } from "wouter";
import { SITE } from "@shared/content/site";
import { trpc } from "@/lib/trpc";
import { Layout } from "@/components/layout/Layout";
import { CatalogPdfBand } from "@/components/catalog/CatalogPdfBand";
import { CategoryChips } from "@/components/catalog/CategoryChips";
import { InstalledStrip } from "@/components/catalog/InstalledStrip";
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
    <Layout showCart footerLinks={SITE.catalogPdf ? [{ label: "Catálogo em PDF", href: "#catalogo" }] : undefined}>
      <section className="container flex flex-col gap-6 pb-10 pt-12 md:pt-16">
        <Link href="/" className="lbl text-muted-foreground hover:text-accent">
          ← Voltar ao início
        </Link>
        <div className="grid items-end gap-6 md:grid-cols-[7fr_5fr] md:gap-16">
          <h1 className="heading-display text-5xl text-foreground md:text-6xl">Portfólio de peças</h1>
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            Explore a nossa coleção de móveis industriais. Além das peças deste portfólio, fazemos projetos
            personalizados sob medida: descreva o móvel que você imagina.
          </p>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="sticky top-[var(--header-h)] z-10 border-y border-border bg-background py-3 sm:static sm:z-auto sm:border-b-0 sm:py-0">
          <div className="container flex flex-col gap-3.5 sm:pb-10 sm:pt-6">
            <span className="lbl hidden text-muted-foreground sm:block">Tipo de peça</span>
            <CategoryChips categories={categories} active={activeKnown} onChange={onCategory} total={products.length} />
          </div>
        </section>
      )}

      <section className="container pb-24 pt-10 sm:pt-0">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <InstalledStrip />
      <CatalogPdfBand />
    </Layout>
  );
}
