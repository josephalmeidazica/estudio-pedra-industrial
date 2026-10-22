/*
  Estúdio Pedra Industrial - Página Processo
  Abertura, resumo em cinco etapas, etapas alternadas com painel de ícone e chamada final.
*/

import { Link } from "wouter";
import { PROCESSO } from "@shared/content/processo";
import { titles } from "@shared/seo-text";
import { Layout } from "@/components/layout/Layout";
import { StepPanel } from "@/components/process/StepPanel";
import { ResponseBadge } from "@/components/ui/ResponseBadge";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";
import { usePageTitle } from "@/lib/usePageTitle";

const BTN_BLACK =
  "inline-flex h-[52px] items-center justify-center border border-foreground bg-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:border-accent hover:bg-accent";
const BTN_OUTLINE =
  "inline-flex h-[52px] items-center justify-center border border-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background";

export default function Processo() {
  usePageTitle(titles.process());
  const { intro, steps } = PROCESSO;

  return (
    <Layout showCart>
      <section className="container py-12 md:py-[72px]">
        <div className="grid items-end gap-8 md:grid-cols-[7fr_5fr] md:gap-16">
          <div className="flex min-w-0 flex-col gap-5">
            <p className="lbl text-muted-foreground">Processo</p>
            <h1 className="heading-display text-[40px] leading-[1.05] md:text-6xl">{intro.title}</h1>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-5">
            <p className="text-[17px] leading-relaxed text-muted-foreground">{intro.text}</p>
            <ResponseBadge />
          </div>
        </div>
      </section>

      <div className="bg-foreground py-7 text-background">
        <ol className="container grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {steps.map((s, i) => (
            <li key={s.n} className="flex min-w-0 items-baseline gap-3">
              <span className="lbl text-card">{String(i + 1).padStart(2, "0")}</span>
              <a href={`#p${i + 1}`} className="text-base hover:text-card">
                {s.homeTitle ?? s.title}
              </a>
            </li>
          ))}
        </ol>
      </div>

      <div className="container">
        {steps.map((s, i) => {
          const flip = i % 2 === 1;
          return (
            <section
              key={s.n}
              id={`p${i + 1}`}
              className={`scroll-mt-[var(--header-h)] grid items-center gap-8 py-12 md:gap-16 md:py-[72px] ${
                flip ? "md:grid-cols-[7fr_5fr]" : "md:grid-cols-[5fr_7fr]"
              } ${i === 0 ? "" : "border-t border-card"}`}
            >
              <div className={flip ? "md:order-2" : ""}>
                <StepPanel icon={s.icon} />
              </div>
              <div className={`flex min-w-0 flex-col items-start gap-5 ${flip ? "md:order-1" : ""}`}>
                <span className="text-[64px] font-light leading-none text-card md:text-[88px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="text-[32px] font-light leading-[1.1] md:text-[40px]">{s.title}</h2>
                <p className="text-[17px] leading-relaxed text-muted-foreground">{s.lead}</p>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-[15px] leading-normal text-muted-foreground">
                      <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 bg-accent" />
                      <span className="min-w-0">{b}</span>
                    </li>
                  ))}
                </ul>
                {i === 0 && (
                  <a
                    href={whatsappUrl(GENERIC_QUOTE_MESSAGE)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BTN_BLACK} !h-11 !px-[18px] !text-xs`}
                  >
                    Começar a conversa
                  </a>
                )}
                {i === steps.length - 1 && (
                  <Link href="/duvidas" className="lbl border-b border-foreground pb-2">
                    Dúvidas sobre prazo, pagamento e garantia →
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="bg-card py-16 lg:py-24">
        <div className="container flex flex-col items-center gap-6 text-center">
          <img src="/brand/simbolo-preto.png" alt="" aria-hidden="true" className="h-14 w-14" />
          <h2 className="heading-display min-w-0 text-[34px] leading-[1.1] lg:text-[52px]">Comece pela conversa.</h2>
          <p className="max-w-[520px] min-w-0 text-base leading-relaxed">
            Mande uma foto ou uma ideia. Em até 1 dia útil você tem uma primeira resposta.
          </p>
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
