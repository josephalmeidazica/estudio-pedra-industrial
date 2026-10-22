/*
  Estúdio Pedra Industrial - Página Sobre nós
  Abertura, história com foto, pilares em bloco preto, a oficina e chamada final.
*/

import type { CSSProperties } from "react";
import { Link } from "wouter";
import { HOURS, SITE, addressLines } from "@shared/content/site";
import { SOBRE } from "@shared/content/sobre";
import { titles } from "@shared/seo-text";
import { Layout } from "@/components/layout/Layout";
import { LineIcon } from "@/components/icons/LineIcon";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { selectFeatured } from "@/lib/featured";
import { trpc } from "@/lib/trpc";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";
import { usePageTitle } from "@/lib/usePageTitle";

const BTN_BLACK =
  "inline-flex h-[52px] items-center justify-center border border-foreground bg-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:border-accent hover:bg-accent";
const BTN_OUTLINE =
  "inline-flex h-[52px] items-center justify-center border border-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background";
const CARD = "flex min-w-0 flex-col gap-5 border border-card p-6 md:p-9";

const MAP_URL = `https://maps.google.com/?q=${encodeURIComponent(`${SITE.address.street}, ${SITE.address.city.split(" — ")[0]}`)}`;

export default function Sobre() {
  usePageTitle(titles.about());
  const { data: products = [] } = trpc.products.list.useQuery();
  const photo = selectFeatured(products)[0]?.images[0];
  const { historia, pilares, valoresDetalhe, oficina, cta } = SOBRE;

  const pillars = [
    { label: "Missão", text: pilares.missao },
    { label: "Visão", text: pilares.visao },
    { label: "Valores", text: pilares.valores },
  ];

  return (
    <Layout showCart>
      <section className="container py-12 md:py-[72px]">
        <div className="grid items-end gap-8 md:grid-cols-[7fr_5fr] md:gap-16">
          <div className="flex min-w-0 flex-col gap-5">
            <p className="lbl text-muted-foreground">Sobre nós</p>
            <h1 className="heading-display text-[40px] leading-[1.05] md:text-6xl">
              Entre o aço e a madeira, nasce a forma.
            </h1>
          </div>
          <p className="min-w-0 text-[17px] leading-relaxed text-muted-foreground">{SOBRE.lead}</p>
        </div>
      </section>

      <section className="container grid items-center gap-10 pb-12 md:grid-cols-2 md:gap-16 md:pb-[72px]">
        <div className="relative pb-6 pr-6 md:pb-8 md:pr-8">
          <div
            aria-hidden="true"
            className="pattern-bg absolute bottom-0 right-0 h-[85%] w-[85%]"
            style={{ "--pattern-opacity": 0.16 } as CSSProperties}
          />
          <div className="relative h-[360px] w-[88%] overflow-hidden bg-card md:h-[520px] md:w-[78%]">
            {photo && (
              <ResponsiveImage
                image={photo}
                sizes="(min-width: 1024px) 40vw, 100vw"
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <span className="lbl absolute bottom-0 right-0 bg-foreground px-4 py-3 text-[10px] text-background">
            {historia.tag}
          </span>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-5">
          <p className="lbl text-muted-foreground">Nossa história</p>
          <h2 className="heading-display text-[32px] leading-[1.1] md:text-[40px]">{historia.title}</h2>
          {historia.paragraphs.map((p) => (
            <p key={p} className="text-base leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/processo" className={BTN_BLACK}>
              Conhecer o processo
            </Link>
            <Link href="/catalogo" className={BTN_OUTLINE}>
              Ver portfólio
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-foreground py-16 text-background lg:py-24">
        <div className="container flex flex-col gap-10 md:gap-14">
          <div className="flex flex-col gap-5">
            <p className="lbl text-card">Pilares</p>
            <h2 className="heading-display text-[34px] leading-[1.1] md:text-5xl">Missão, visão e valores</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {pillars.map((p) => (
              <div key={p.label} className="flex min-w-0 flex-col gap-4 border-t border-background/40 pt-5">
                <h3 className="lbl text-card">{p.label}</h3>
                <p className="text-base leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
          <ol className="m-0 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-10">
            {valoresDetalhe.map((v) => (
              <li key={v.n} className="flex min-w-0 flex-col gap-3 border-t border-background/40 pt-5">
                <span className="text-[44px] font-light leading-none text-card">{v.n}</span>
                <h3 className="text-2xl font-light">{v.title}</h3>
                <p className="text-[15px] leading-relaxed text-card">{v.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container flex flex-col gap-10 py-12 md:gap-14 md:py-[72px]">
        <div className="flex flex-col gap-5">
          <p className="lbl text-muted-foreground">A oficina</p>
          <h2 className="heading-display text-[34px] leading-[1.1] md:text-5xl">{oficina.title}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          <div className={`${CARD} bg-background`}>
            <LineIcon name="pin" className="h-9 w-9" />
            <h3 className="text-[28px] font-light">Nossa oficina</h3>
            <div className="flex flex-col gap-1.5 text-[17px]">
              {addressLines().map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
            <a
              href={MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lbl mt-auto self-start border-b border-foreground pb-2"
            >
              Abrir no mapa →
            </a>
          </div>
          <div className={`${CARD} bg-card`}>
            <LineIcon name="clock" className="h-9 w-9" />
            <h3 className="text-[28px] font-light">Horário</h3>
            <div className="flex flex-col gap-1.5 text-[17px]">
              {HOURS.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>
          <div className={`${CARD} bg-card`}>
            <LineIcon name="truck" className="h-9 w-9" />
            <h3 className="text-[28px] font-light">Onde atendemos</h3>
            <p className="text-[17px] leading-relaxed">{oficina.atendemos}</p>
          </div>
        </div>
      </section>

      <section className="bg-card py-16 lg:py-24">
        <div className="container flex flex-col items-center gap-6 text-center">
          <img src="/brand/simbolo-preto.png" alt="" aria-hidden="true" className="h-14 w-14" />
          <h2 className="heading-display min-w-0 text-[34px] leading-[1.1] lg:text-[52px]">{cta.title}</h2>
          <p className="max-w-[520px] min-w-0 text-base leading-relaxed">{cta.text}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={whatsappUrl(GENERIC_QUOTE_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_BLACK}
            >
              Pedir orçamento no WhatsApp
            </a>
            <Link href="/catalogo" className={BTN_OUTLINE}>
              Ver portfólio
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
