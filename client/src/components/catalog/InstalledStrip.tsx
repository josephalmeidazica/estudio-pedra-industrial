import { useState } from "react";
import { Link } from "wouter";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { galleryCaption } from "@/lib/galleryCaption";
import { trpc } from "@/lib/trpc";

/** "Na casa dos nossos clientes": photos of installed pieces, managed in the admin's Ambientes tab. */
export function InstalledStrip() {
  const { data: gallery = [] } = trpc.gallery.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery();
  const [index, setIndex] = useState<number | null>(null);

  if (gallery.length === 0) return null;

  const productFor = (productId: number | null | undefined) =>
    productId != null ? products.find((p) => p.id === productId) : undefined;
  const current = index !== null ? gallery[index] : null;
  const related = productFor(current?.productId);

  return (
    <section className="bg-card py-20">
      <div className="container">
        <div className="mb-10 flex flex-col gap-4">
          <p className="lbl text-muted-foreground">Ambientes</p>
          <h2 className="heading-display text-4xl text-foreground md:text-[44px]">Na casa dos nossos clientes</h2>
        </div>
        <div className="-mx-4 flex gap-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {gallery.map((g, i) => {
            const caption = galleryCaption(g.caption, productFor(g.productId)?.name);
            return (
              <figure key={g.id} className="flex w-72 shrink-0 flex-col gap-3">
                <button
                  type="button"
                  aria-label={g.caption ? `Ampliar foto: ${g.caption}` : `Ampliar foto ${i + 1}`}
                  className="block h-[360px] w-72 cursor-zoom-in overflow-hidden bg-background"
                  onClick={() => setIndex(i)}
                >
                  <ResponsiveImage
                    image={g}
                    sizes="288px"
                    alt={g.caption || `Ambiente ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
                {caption ? <figcaption className="text-sm text-muted-foreground">{caption}</figcaption> : null}
              </figure>
            );
          })}
        </div>
      </div>

      {index !== null && (
        <ImageLightbox
          images={gallery}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setIndex(null)}
          altBase="Ambiente"
          footer={
            related ? (
              <Link href={`/catalogo/${related.slug}`} className="heading-secondary text-sm underline underline-offset-4">
                Ver a peça: {related.name}
              </Link>
            ) : current?.caption ? (
              <span className="text-sm text-white/80">{current.caption}</span>
            ) : null
          }
        />
      )}
    </section>
  );
}
