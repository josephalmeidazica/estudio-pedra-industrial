import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductCard } from "@/components/catalog/ProductCard";
import { QuoteButton } from "@/components/catalog/QuoteButton";
import { ProductIcon } from "@/components/icons/ProductIcon";
import { Layout } from "@/components/layout/Layout";
import { FichaRows } from "@/components/product/FichaRows";
import { MobileActionBar } from "@/components/product/MobileActionBar";
import { ProductViewer } from "@/components/product/ProductViewer";
import { ShareButton } from "@/components/product/ShareButton";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { Button } from "@/components/ui/button";
import { categorySlug } from "@/lib/catalogFilter";
import { categoryIcon } from "@/lib/categoryIcons";
import { fichaRows } from "@/lib/ficha";
import { thumbUrl } from "@/lib/imageSrcSet";
import { relatedProducts } from "@/lib/related";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/lib/usePageTitle";
import { SITE } from "@shared/content/site";
import { titles } from "@shared/seo-text";
import NotFound from "./NotFound";

const bigAction = "h-14 text-[13px] font-medium uppercase tracking-[0.12em]";

export default function Product() {
  const { slug = "" } = useParams<{ slug: string }>();
  const product = trpc.products.getBySlug.useQuery({ slug });
  const { data: all = [] } = trpc.products.list.useQuery();
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIndex(0);
    setViewer(false);
  }, [slug]);

  const name = product.data?.name;
  usePageTitle(name ? titles.product(name) : undefined);

  if (product.isLoading) {
    return (
      <Layout showCart backHref="/catalogo">
        <section className="py-32">
          <div className="container">
            <p className="text-muted-foreground">Carregando…</p>
          </div>
        </section>
      </Layout>
    );
  }
  if (product.isError) {
    return (
      <Layout showCart backHref="/catalogo">
        <section className="py-32">
          <div className="container max-w-2xl text-center">
            <h1 className="heading-display text-3xl sm:text-4xl text-foreground mb-4">Não foi possível carregar esta peça</h1>
            <p className="text-muted-foreground mb-8">Verifique sua conexão e tente de novo.</p>
            <Button
              className="bg-foreground text-background hover:bg-secondary heading-secondary text-sm px-8 py-3"
              onClick={() => product.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        </section>
      </Layout>
    );
  }
  if (!product.data) return <NotFound />;

  const p = product.data;
  const images = p.images;
  const main = images[index] ?? images[0];
  const related = relatedProducts(all, p);
  const categoryHref = p.category ? `/catalogo?categoria=${categorySlug(p.category)}` : "/catalogo";
  const icon = p.isCustom ? null : categoryIcon(p.category);
  const rows = fichaRows(p, SITE);
  const url = `${window.location.origin}/catalogo/${p.slug}`;

  return (
    <Layout showCart backHref="/catalogo" fabHidden={barVisible}>
      <section className="bg-background pb-10 pt-0 sm:pb-16 sm:pt-10 lg:pb-24">
        <div className="container flex flex-col gap-6 sm:gap-10">
          <nav aria-label="Caminho" className="hidden flex-wrap items-center gap-3 sm:flex">
            <Link href="/catalogo" className="lbl text-muted-foreground hover:text-accent">
              Portfólio
            </Link>
            {p.category ? (
              <>
                <span className="lbl text-[#828282]">/</span>
                <Link href={categoryHref} className="lbl text-muted-foreground hover:text-accent">
                  {p.category}
                </Link>
              </>
            ) : null}
            <span className="lbl text-[#828282]">/</span>
            <span className="lbl text-foreground">{p.name}</span>
          </nav>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            {/* Gallery */}
            <div className="-mx-4 flex min-w-0 flex-col gap-4 sm:mx-0">
              {main ? (
                <>
                  <button
                    type="button"
                    aria-label="Ampliar foto"
                    className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-card"
                    onClick={() => setViewer(true)}
                  >
                    <ResponsiveImage
                      image={main}
                      sizes="(min-width: 1024px) 58vw, 100vw"
                      alt={`${p.name}, foto ${index + 1} de ${images.length}`}
                      loading="eager"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-4 left-5 bg-foreground px-2.5 py-1.5 text-[11px] uppercase tracking-[0.12em] text-background sm:left-4">
                      {index + 1} / {images.length}
                      <span className="hidden sm:inline"> · ampliar e ver a ficha técnica</span>
                    </span>
                    <span className="absolute bottom-4 right-5 bg-background px-2.5 py-1.5 text-[11px] uppercase tracking-[0.12em] text-foreground sm:hidden">
                      Ampliar · ficha técnica
                    </span>
                  </button>
                  <div className="flex flex-col gap-3 px-4 sm:px-0 lg:flex-row lg:items-center">
                    {images.length > 1 ? (
                      <div className="flex min-w-0 gap-3 overflow-x-auto [scrollbar-width:none]">
                        {images.map((img, i) => (
                          <button
                            key={img.id}
                            type="button"
                            aria-label={`Ver foto ${i + 1}`}
                            aria-pressed={i === index}
                            onClick={() => setIndex(i)}
                            className={`h-20 w-20 flex-shrink-0 overflow-hidden border transition-colors lg:h-[72px] lg:w-[72px] ${
                              i === index ? "border-foreground" : "border-border hover:border-foreground/50"
                            }`}
                          >
                            <img src={thumbUrl(img)} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setViewer(true)}
                      className="flex h-12 items-center justify-center gap-3 border border-foreground px-5 transition-colors hover:bg-foreground hover:text-background lg:ml-auto lg:h-[72px]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[22px] w-[22px]"
                        aria-hidden="true"
                      >
                        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                      </svg>
                      <span className="flex flex-col items-start gap-0.5 text-left">
                        <span className="text-[15px]">Ficha técnica</span>
                        <span className="lbl hidden whitespace-nowrap text-[9px] opacity-80 lg:block">Medidas · materiais · detalhes</span>
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="mx-4 flex h-64 items-center justify-center bg-card text-sm text-muted-foreground sm:mx-0">
                  Sem fotos
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-col gap-7 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
              <div className="flex flex-col gap-3.5">
                {p.category ? (
                  <div className="flex items-center gap-3.5">
                    {icon ? <ProductIcon src={icon} className="h-6 w-[30px] text-accent" /> : null}
                    <span className="lbl text-muted-foreground">{p.category}</span>
                  </div>
                ) : null}
                <h1 className="heading-display text-[40px] leading-[1.05] text-foreground sm:text-5xl lg:text-[56px]">{p.name}</h1>
                {p.description ? <p className="text-[17px] leading-relaxed text-muted-foreground">{p.description}</p> : null}
              </div>

              <FichaRows rows={rows} className="border-t border-border [&>div:first-child]:border-t-0" />

              <div ref={actionsRef} className="flex flex-col gap-2.5">
                <QuoteButton
                  product={p}
                  hideIcon
                  label={p.isCustom ? undefined : "Pedir orçamento desta peça"}
                  className={bigAction}
                />
                <AddToCartButton product={p} className={bigAction} />
                <p className="pt-1.5 text-center text-[13px] leading-relaxed text-muted-foreground">
                  A mensagem já vai com o nome e o link da peça. Respondemos de segunda a sexta, 8h às 18h.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-x-7 gap-y-4">
                <div className="flex flex-col gap-1">
                  <span className="lbl text-[10px] text-muted-foreground">Fabricação</span>
                  <span className="text-[15px]">Própria, em BH</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="lbl text-[10px] text-muted-foreground">Entrega</span>
                  <span className="text-[15px]">BH e região metropolitana</span>
                </div>
                <ShareButton title={p.name} url={url} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-border bg-background py-14 sm:py-20">
          <div className="container flex flex-col gap-10">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <h2 className="heading-display text-3xl text-foreground sm:text-[44px] sm:leading-[1.05]">Veja também</h2>
              {p.category && !p.isCustom ? (
                <Link href={categoryHref} className="lbl border-b border-foreground pb-3 hover:text-accent">
                  Outras {p.category.toLowerCase()} →
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <MobileActionBar product={p} anchorRef={actionsRef} onVisibilityChange={setBarVisible} />

      {viewer && images.length > 0 && (
        <ProductViewer product={p} index={index} onIndexChange={setIndex} onClose={() => setViewer(false)} />
      )}
    </Layout>
  );
}
