import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";

export default function NotFound() {
  return (
    <Layout>
      <section className="py-32 md:py-48 bg-background">
        <div className="container max-w-2xl text-center">
          <div className="inline-block mb-6 px-4 py-1 border border-foreground/30 rounded">
            <span className="text-accent-mono text-foreground text-xs">ERRO 404</span>
          </div>
          <h1 className="text-5xl sm:text-6xl heading-display text-foreground mb-6">Página não encontrada</h1>
          <p className="text-lg text-muted-foreground mb-12">
            O endereço que você acessou não existe ou foi movido.
          </p>
          <Link href="/">
            <Button className="bg-foreground text-background hover:bg-secondary text-sm px-8 py-3 rounded heading-secondary transition-all duration-300">
              Voltar ao início
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
