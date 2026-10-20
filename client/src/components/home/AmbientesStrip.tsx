import { useState } from "react";
import { Link } from "wouter";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { trpc } from "@/lib/trpc";

/** "Na casa dos nossos clientes": photos of installed pieces, managed in the admin's Ambientes tab. */
export function AmbientesStrip() {
  const { data: gallery = [] } = trpc.gallery.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery();
  const [index, setIndex] = useState<number | null>(null);

  if (gallery.length === 0) return null;

  const current = index !== null ? gallery[index] : null;
  const related = current?.productId != null ? products.find((p) => p.id === current.productId) : undefined;

  return (
    <section className="py-20 bg-background border-t border-border">
      <div className="container">
        <div className="mb-10">
          <div className="inline-block mb-6 px-4 py-1 border border-foreground/30 rounded">
            <span className="text-accent-mono text-foreground text-xs">AMBIENTES</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl heading-display text-foreground">
            Na casa dos nossos clientes
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto snap-x pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {gallery.map((g, i) => (
            <figure key={g.id} className="w-64 shrink-0 snap-start">
              <button
                type="button"
                aria-label={g.caption ? `Ampliar foto: ${g.caption}` : `Ampliar foto ${i + 1}`}
                className="block w-full aspect-[4/5] overflow-hidden rounded-lg bg-card cursor-zoom-in"
                onClick={() => setIndex(i)}
              >
                <ResponsiveImage
                  image={g}
                  sizes="256px"
                  alt={g.caption || `Ambiente ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover hover:opacity-90 transition-opacity duration-300"
                />
              </button>
              {g.caption ? (
                <figcaption className="mt-2 text-sm text-muted-foreground">{g.caption}</figcaption>
              ) : null}
            </figure>
          ))}
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
