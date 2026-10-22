import { Link } from "wouter";
import { HOME } from "@shared/content/home";
import { ProductIcon } from "@/components/icons/ProductIcon";
import { extractCategories } from "@/lib/catalogFilter";
import type { PublicProduct } from "@/lib/types";

const ICON_SIZE: Record<string, string> = {
  "mesa-urb": "h-12 w-14",
  "reforma-sofa": "h-12 w-[72px]",
  "mesa-office-l": "h-12 w-14",
};

export function Servicos({ products }: { products: PublicProduct[] }) {
  const hasReformas = extractCategories(products).some((c) => c.slug === "reformas");
  const hrefs = ["/catalogo", hasReformas ? "/catalogo?categoria=reformas" : "/catalogo", "/catalogo#sob-medida"];
  return (
    <section id="servicos" className="py-16 lg:py-24">
      <div className="container flex flex-col gap-10 lg:gap-14">
        <div className="flex flex-col gap-4">
          <p className="lbl text-muted-foreground">Serviços</p>
          <h2 className="heading-display text-[34px] leading-[1.1] lg:text-[52px]">O que fazemos</h2>
          <p className="max-w-[560px] text-[17px] leading-relaxed text-muted-foreground">
            Soluções completas em mobiliário industrial, reforma e projetos personalizados.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
          {HOME.servicos.map((s, i) => (
            <Link
              key={s.title}
              href={hrefs[i]}
              className="flex min-w-0 flex-col gap-4 border border-border p-6 text-foreground transition-colors hover:bg-card lg:p-8"
            >
              <ProductIcon src={`/brand/icons/${s.icon}.png`} className={ICON_SIZE[s.icon]} />
              <h3 className="text-[24px] font-light lg:text-[28px]">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
              <span className="lbl mt-auto pt-2">{s.linkLabel}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
