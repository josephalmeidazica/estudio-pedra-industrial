import { Link } from "wouter";
import { HOME } from "@shared/content/home";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";
import { HeroIllustration } from "./HeroIllustration";

export function Hero() {
  const { label, title, text } = HOME.hero;
  return (
    <section className="bg-background py-12 lg:pb-[88px] lg:pt-[72px]">
      {/* On phones the text column dissolves (`contents`) so the illustration sits between title and text. */}
      <div className="container grid items-center gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-8">
          <p className="lbl min-w-0 text-muted-foreground">{label}</p>
          <h1 className="heading-display min-w-0 text-[40px] leading-[1.05] text-foreground lg:text-[72px]">{title}</h1>
          <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-none lg:gap-8">
            <p className="max-w-[560px] text-[17px] leading-relaxed text-muted-foreground lg:text-[19px]">{text}</p>
            <div className="flex flex-wrap gap-4">
              <a
                href={whatsappUrl(GENERIC_QUOTE_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 border border-foreground bg-foreground px-4 sm:w-auto sm:px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:border-accent hover:bg-accent"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Pedir orçamento no WhatsApp
              </a>
              <Link
                href="/catalogo"
                className="inline-flex h-[52px] items-center justify-center border border-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background"
              >
                Ver portfólio
              </Link>
            </div>
          </div>
        </div>
        <div className="order-1 min-w-0 lg:order-none">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}
