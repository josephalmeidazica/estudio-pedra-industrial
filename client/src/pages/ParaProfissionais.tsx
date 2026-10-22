/*
  Estúdio Pedra Industrial - Página Para profissionais
  Atrás de SITE.professionals: enquanto o conteúdo não existe, responde com a página 404.
*/

import type { CSSProperties } from "react";
import { Link } from "wouter";
import { SITE, type ProfessionalsContent } from "@shared/content/site";
import { titles } from "@shared/seo-text";
import { Layout } from "@/components/layout/Layout";
import { ProductIcon } from "@/components/icons/ProductIcon";
import NotFound from "@/pages/NotFound";
import { ResponseBadge } from "@/components/ui/ResponseBadge";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";
import { usePageTitle } from "@/lib/usePageTitle";

const BTN_BEGE =
  "inline-flex h-[52px] items-center justify-center border border-card bg-card px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-foreground hover:border-accent hover:bg-accent hover:text-background";
const BTN_OUTLINE_LIGHT =
  "inline-flex h-[52px] items-center justify-center border border-background px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:bg-background hover:text-foreground";
const OFFER_ICONS = ["estante-divisio", "mesa-office-l", "estrutura-gaia"];

export default function ParaProfissionais() {
  const content = SITE.professionals;
  if (!content) return <NotFound />;
  return <Enabled content={content} />;
}

function Enabled({ content }: { content: ProfessionalsContent }) {
  usePageTitle(titles.professionals());
  const { lead, offers, steps, ctaTitle, ctaText } = content;

  return (
    <Layout showCart>
      <section className="container py-12 md:py-[72px]">
        <div className="grid items-end gap-8 md:grid-cols-[7fr_5fr] md:gap-16">
          <div className="flex min-w-0 flex-col gap-5">
            <p className="lbl text-muted-foreground">Para profissionais</p>
            <h1 className="heading-display text-[40px] leading-[1.05] md:text-6xl">
              Arquitetos, designers e lojistas: vamos fazer juntos.
            </h1>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-5">
            <p className="text-[17px] leading-relaxed text-muted-foreground">{lead}</p>
            <ResponseBadge />
          </div>
        </div>
      </section>

      <section className="bg-card py-16 lg:py-24">
        <div className="container flex flex-col gap-10 md:gap-14">
          <h2 className="heading-display text-[34px] leading-[1.1] md:text-5xl">O que oferecemos a quem especifica</h2>
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {offers.map((o, i) => (
              <div key={o.title} className="flex min-w-0 flex-col gap-5 bg-background p-6 md:p-9">
                <ProductIcon
                  src={`/brand/icons/${OFFER_ICONS[i % OFFER_ICONS.length]}.png`}
                  className="h-14 w-14 text-accent"
                />
                <h3 className="text-[26px] font-light leading-tight">{o.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">{o.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container flex flex-col gap-10 py-12 md:gap-14 md:py-[72px]">
        <h2 className="heading-display text-[34px] leading-[1.1] md:text-5xl">Do briefing à entrega na obra</h2>
        <ol className="m-0 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-10">
          {steps.map((s, i) => (
            <li key={s.title} className="flex min-w-0 flex-col gap-3 border-t border-foreground pt-5">
              <span className="text-[44px] font-light leading-none text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-2xl font-light">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="pattern-bg bg-foreground py-16 text-background lg:py-24"
        style={{ "--pattern-opacity": 0.12 } as CSSProperties}
      >
        <div className="container relative flex flex-col items-center gap-6 text-center">
          <img src="/brand/simbolo-bege.png" alt="" aria-hidden="true" className="h-14 w-14" />
          <h2 className="heading-display min-w-0 text-[34px] leading-[1.1] lg:text-[52px]">{ctaTitle}</h2>
          <p className="max-w-[520px] min-w-0 text-base leading-relaxed">{ctaText}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={whatsappUrl(GENERIC_QUOTE_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_BEGE}
            >
              Falar com o estúdio
            </a>
            <Link href="/catalogo#catalogo" className={BTN_OUTLINE_LIGHT}>
              Receber o catálogo
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
