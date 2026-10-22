/*
  Estúdio Pedra Industrial - Página Dúvidas frequentes
  Abertura, chips de temas, um acordeão por tema e chamada final para o WhatsApp.
*/

import { FAQ } from "@shared/content/faq";
import { titles } from "@shared/seo-text";
import { Layout } from "@/components/layout/Layout";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { ResponseBadge } from "@/components/ui/ResponseBadge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";
import { usePageTitle } from "@/lib/usePageTitle";

const BTN_BLACK =
  "inline-flex h-[52px] items-center justify-center gap-2.5 border border-foreground bg-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:border-accent hover:bg-accent";

export default function Duvidas() {
  usePageTitle(titles.faq());

  return (
    <Layout showCart>
      <section className="container py-12 md:py-[72px]">
        <div className="grid items-end gap-8 md:grid-cols-[7fr_5fr] md:gap-16">
          <div className="flex min-w-0 flex-col gap-5">
            <p className="lbl text-muted-foreground">Dúvidas frequentes</p>
            <h1 className="heading-display text-[40px] leading-[1.05] md:text-6xl">
              O que mais perguntam antes de pedir um orçamento.
            </h1>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-5">
            <p className="text-[17px] leading-relaxed text-muted-foreground">
              Respostas curtas. Se a sua dúvida não estiver aqui, é só chamar no WhatsApp.
            </p>
            <ResponseBadge />
          </div>
        </div>
      </section>

      <nav aria-label="Temas" className="container pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="lbl mr-2 text-muted-foreground">Temas</span>
          {FAQ.map((t) => (
            <a
              key={t.slug}
              href={`#${t.slug}`}
              className="inline-flex h-11 items-center border border-foreground px-4 text-sm hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:h-10"
            >
              {t.theme}
            </a>
          ))}
        </div>
      </nav>

      <div className="container">
        {FAQ.map((t, ti) => (
          <section
            key={t.slug}
            id={t.slug}
            className="scroll-mt-[var(--header-h)] grid gap-6 border-t border-card py-10 md:grid-cols-[4fr_8fr] md:gap-16 md:py-14"
          >
            <h2 className="min-w-0 text-[28px] font-light leading-[1.15] md:text-[32px]">{t.theme}</h2>
            <Accordion
              type="single"
              collapsible
              defaultValue={ti === 0 ? "item-0" : undefined}
              className="min-w-0 border-t border-card"
            >
              {t.items.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-card">
                  <AccordionTrigger className="py-5 text-[17px] font-normal leading-snug">
                    <span className="min-w-0">{item.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pr-8 text-[15px] leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>

      <section className="bg-card py-16 lg:py-24">
        <div className="container flex flex-col items-center gap-6 text-center">
          <h2 className="heading-display min-w-0 text-[34px] leading-[1.1] lg:text-[52px]">Não achou a sua dúvida?</h2>
          <p className="max-w-[520px] min-w-0 text-base leading-relaxed">
            Chame no WhatsApp. Respondemos em até 1 dia útil.
          </p>
          <a href={whatsappUrl(GENERIC_QUOTE_MESSAGE)} target="_blank" rel="noopener noreferrer" className={BTN_BLACK}>
            <WhatsAppIcon className="h-5 w-5" />
            Perguntar no WhatsApp
          </a>
        </div>
      </section>
    </Layout>
  );
}
