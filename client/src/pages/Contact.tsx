/*
  Estúdio Pedra Industrial - Página de Contato
  Abertura, quatro cartões (WhatsApp, Instagram, horário, oficina) em xadrez claro/escuro e faixa de padrão.
*/

import { HOURS, INSTAGRAM_HANDLE, INSTAGRAM_URL, PHONE_DISPLAY, addressLines } from "@shared/content/site";
import { titles } from "@shared/seo-text";
import { Layout } from "@/components/layout/Layout";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { LineIcon } from "@/components/icons/LineIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { ResponseBadge } from "@/components/ui/ResponseBadge";
import { WHATSAPP_LINK } from "@/lib/whatsapp";
import { usePageTitle } from "@/lib/usePageTitle";

const CARD = "flex min-w-0 flex-col gap-5 border border-card p-6 md:p-9";
const LIGHT = "bg-background";
const DARK = "bg-card";

export default function Contact() {
  usePageTitle(titles.contact());

  return (
    <Layout showCart>
      <section className="container flex flex-col gap-10 py-12 md:gap-14 md:py-[72px]">
        <div className="grid items-end gap-8 md:grid-cols-[7fr_5fr] md:gap-16">
          <div className="flex min-w-0 flex-col gap-5">
            <p className="lbl text-muted-foreground">Contato</p>
            <h1 className="heading-display text-[40px] leading-[1.05] md:text-6xl">
              Fale com a gente. O projeto começa pelo diálogo.
            </h1>
          </div>
          <p className="min-w-0 text-[17px] leading-relaxed text-muted-foreground">
            Mande uma foto, uma ideia ou as medidas do seu espaço. Respondemos de segunda a sexta, das 8h às 18h, e aos
            sábados pela manhã.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className={`${CARD} ${LIGHT} hover:bg-card`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <WhatsAppIcon className="h-9 w-9" />
              <ResponseBadge className="border border-brand-green bg-transparent text-brand-green" />
            </div>
            <h3 className="text-[28px] font-light">WhatsApp</h3>
            <span className="text-[26px] font-light">{PHONE_DISPLAY}</span>
            <span className="lbl mt-auto pt-2">Abrir conversa →</span>
          </a>

          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={`${CARD} ${DARK} hover:bg-background`}>
            <InstagramIcon className="h-9 w-9" />
            <h3 className="text-[28px] font-light">Instagram</h3>
            <span className="min-w-0 break-words text-[26px] font-light">{INSTAGRAM_HANDLE}</span>
            <span className="lbl mt-auto pt-2">Ver as peças em casa →</span>
          </a>

          <div className={`${CARD} ${DARK}`}>
            <LineIcon name="clock" className="h-9 w-9" />
            <h3 className="text-[28px] font-light">Horário de atendimento</h3>
            <div className="flex flex-col gap-1.5 text-[17px]">
              {HOURS.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>

          <div className={`${CARD} ${LIGHT}`}>
            <LineIcon name="pin" className="h-9 w-9" />
            <h3 className="text-[28px] font-light">Nossa oficina</h3>
            <div className="flex flex-col gap-1.5 text-[17px]">
              {addressLines().map((l) => (
                <span key={l}>{l}</span>
              ))}
              <span className="mt-2 text-[15px] leading-normal text-muted-foreground">
                Fabricação própria. Atendemos, entregamos e instalamos em BH e região metropolitana. Outras cidades sob
                consulta.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Faixa do grafismo da marca, de ponta a ponta, como divisória antes do rodapé. */}
      <div aria-hidden="true" className="pattern-bg h-[120px] w-full" style={{ ["--pattern-opacity" as string]: ".12" }} />
    </Layout>
  );
}
