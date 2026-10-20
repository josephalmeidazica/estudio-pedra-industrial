import { useEffect, useState } from "react";
import { ArrowLeft, Tag } from "lucide-react";
import { Link, useParams } from "wouter";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductCard } from "@/components/catalog/ProductCard";
import { QuoteButton } from "@/components/catalog/QuoteButton";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Layout } from "@/components/layout/Layout";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { hasDimensions, thumbUrl } from "@/lib/imageSrcSet";
import { relatedProducts } from "@/lib/related";
import { trpc } from "@/lib/trpc";
import NotFound from "./NotFound";

const SITE_TITLE = "Estúdio Pedra Industrial";

export default function Product() {
  const { slug = "" } = useParams<{ slug: string }>();
  const product = trpc.products.getBySlug.useQuery({ slug });
  const { data: all = [] } = trpc.products.list.useQuery();
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    setIndex(0);
    setLightbox(false);
  }, [slug]);

  const name = product.data?.name;
  useEffect(() => {
    if (!name) return;
    const previous = document.title;
    document.title = `${name} — ${SITE_TITLE}`;
    return () => {
      document.title = previous;
    };
  }, [name]);

  if (product.isLoading) {
    return (
      <Layout showCart>
        <section className="py-32">
          <div className="container">
            <p className="text-muted-foreground">Carregando…</p>
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

  return (
    <Layout showCart>
      <section className="py-12 md:py-20 bg-background">
        <div className="container">
          <Link href="/catalogo">
            <div className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao portfólio
            </div>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Gallery */}
            <div>
              {main ? (
                <>
                  <button
                    type="button"
                    aria-label="Ampliar foto"
                    className="w-full overflow-hidden rounded-lg bg-card cursor-zoom-in"
                    style={hasDimensions(main) ? { aspectRatio: `${main.width} / ${main.height}` } : undefined}
                    onClick={() => setLightbox(true)}
                  >
                    <ResponsiveImage
                      image={main}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      alt={`${p.name} ${index + 1}`}
                      loading="eager"
                      className="w-full h-full object-contain"
                    />
                  </button>
                  {images.length > 1 && (
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                      {images.map((img, i) => (
                        <button
                          key={img.id}
                          type="button"
                          aria-label={`Ver foto ${i + 1}`}
                          onClick={() => setIndex(i)}
                          className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                            i === index ? "border-foreground" : "border-border hover:border-foreground/50"
                          }`}
                        >
                          <img src={thumbUrl(img)} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg bg-card text-sm text-muted-foreground">
                  Sem fotos
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="heading-display text-4xl sm:text-5xl text-foreground mb-4">{p.name}</h1>
              {p.category ? (
                <span className="mb-6 inline-flex items-center gap-1 rounded border border-foreground/30 px-3 py-1 text-xs text-accent-mono text-foreground">
                  <Tag className="h-3 w-3" />
                  {p.category}
                </span>
              ) : null}
              {p.description ? (
                <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{p.description}</p>
              ) : null}
              {(p.materials || p.dimensions) && (
                <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  {p.materials ? (
                    <>
                      <dt className="heading-secondary text-foreground">Materiais</dt>
                      <dd className="text-muted-foreground">{p.materials}</dd>
                    </>
                  ) : null}
                  {p.dimensions ? (
                    <>
                      <dt className="heading-secondary text-foreground">Dimensões</dt>
                      <dd className="text-muted-foreground">{p.dimensions}</dd>
                    </>
                  ) : null}
                </dl>
              )}
              <div className="mt-10 flex flex-col gap-3 sm:max-w-sm">
                <QuoteButton product={p} />
                <AddToCartButton product={p} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-20 bg-card border-t border-border">
          <div className="container">
            <h2 className="heading-display text-3xl sm:text-4xl text-foreground mb-10">Veja também</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {related.map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      {lightbox && images.length > 0 && (
        <ImageLightbox
          images={images}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setLightbox(false)}
          altBase={p.name}
        />
      )}
    </Layout>
  );
}
