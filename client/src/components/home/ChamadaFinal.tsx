import { Link } from "wouter";
import { HOME } from "@shared/content/home";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";

export function ChamadaFinal() {
  return (
    <section className="border-t border-card bg-background py-16 lg:py-24">
      <div className="container flex flex-col items-center gap-6 text-center">
        <img src="/brand/simbolo-preto.png" alt="" aria-hidden="true" className="h-14 w-14" />
        <h2 className="heading-display min-w-0 text-[34px] leading-[1.1] lg:text-[52px]">{HOME.cta.title}</h2>
        <p className="max-w-[520px] min-w-0 text-base leading-relaxed text-muted-foreground">{HOME.cta.text}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={whatsappUrl(GENERIC_QUOTE_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[52px] items-center justify-center border border-foreground bg-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:border-accent hover:bg-accent"
          >
            Solicitar orçamento
          </a>
          <Link
            href="/catalogo"
            className="inline-flex h-[52px] items-center justify-center border border-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background"
          >
            Ver portfólio
          </Link>
        </div>
      </div>
    </section>
  );
}
