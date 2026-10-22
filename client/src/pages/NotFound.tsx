import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { usePageTitle } from "@/lib/usePageTitle";
import { titles } from "@shared/seo-text";

const BTN_BLACK =
  "inline-flex h-[52px] items-center justify-center border border-foreground bg-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:border-accent hover:bg-accent";

export default function NotFound() {
  usePageTitle(titles.notFound());
  return (
    <Layout>
      <section className="bg-background py-24 md:py-40">
        <div className="container flex max-w-2xl flex-col items-center gap-6 text-center">
          <p className="lbl text-muted-foreground">Erro 404</p>
          <h1 className="heading-display text-[40px] leading-[1.05] md:text-6xl">Página não encontrada</h1>
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            O endereço que você acessou não existe ou foi movido.
          </p>
          <Link href="/" className={BTN_BLACK}>
            Voltar ao início
          </Link>
        </div>
      </section>
    </Layout>
  );
}
