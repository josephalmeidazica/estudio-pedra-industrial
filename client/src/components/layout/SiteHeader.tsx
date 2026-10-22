import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Link } from "wouter";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";
import { SITE } from "@shared/content/site";

/** Single source of the site navigation, used by the header and the footer. */
export function navLinks(): { label: string; href: string }[] {
  return [
    { label: "Início", href: "/" },
    { label: "Portfólio", href: "/catalogo" },
    { label: "Processo", href: "/processo" },
    { label: "Sobre nós", href: "/sobre" },
    { label: "Dúvidas", href: "/duvidas" },
    ...(SITE.professionals !== null
      ? [{ label: "Para profissionais", href: "/para-profissionais" }]
      : []),
    { label: "Contato", href: "/contato" },
  ];
}

/** Kept for compatibility with older imports. */
export const NAV_LINKS = navLinks();

const DESKTOP_LINK =
  "heading-secondary whitespace-nowrap text-foreground hover:text-accent transition-colors duration-300";
const MOBILE_LINK =
  "heading-secondary text-sm text-foreground hover:text-accent transition-colors duration-300 py-1";

function HeaderQuoteButton({ className }: { className?: string }) {
  return (
    <Button
      asChild
      className={cn(
        "bg-foreground text-background hover:bg-brand-green heading-secondary gap-2 px-5 transition-colors duration-300",
        className
      )}
    >
      <a href={whatsappUrl(GENERIC_QUOTE_MESSAGE)} target="_blank" rel="noopener noreferrer">
        <WhatsAppIcon className="h-4 w-4" />
        Pedir orçamento
      </a>
    </Button>
  );
}

export function SiteHeader({ rightSlot, backHref }: { rightSlot?: ReactNode; backHref?: string }) {
  const [open, setOpen] = useState(false);
  const links = navLinks();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container">
        <nav className="flex h-[calc(var(--header-h)-1px)] items-center justify-between" aria-label="Principal">
          <div className="flex items-center gap-3">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Voltar ao portfólio"
                className="flex h-11 w-11 items-center justify-center text-xl text-foreground sm:hidden"
              >
                <span aria-hidden="true">←</span>
              </Link>
            )}
            <Link href="/" aria-label="Estúdio Pedra Industrial, página inicial" className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-300">
              <img
                src="/brand/simbolo-preto.png"
                alt=""
                className="h-8 w-auto lg:h-10"
              />
              <img
                src="/brand/tipografico-preto.png"
                alt=""
                className={cn("h-6 w-auto lg:h-[30px]", backHref && "hidden sm:block")}
              />
            </Link>
          </div>

          <div className="flex items-center gap-2 xl:gap-7">
            <div className="hidden xl:flex items-center gap-7">
              {links.map((l) => (
                <a key={l.href} href={l.href} className={DESKTOP_LINK}>
                  {l.label}
                </a>
              ))}
            </div>
            {rightSlot}
            <HeaderQuoteButton className="hidden xl:inline-flex" />
            <Button
              variant="ghost"
              size="icon"
              className="size-11 sm:size-9 xl:hidden"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </nav>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm bg-background">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação do site</SheetDescription>
          <nav className="mt-12 flex flex-col gap-5 px-6" aria-label="Menu">
            {links.map((l) => (
              <a key={l.href} href={l.href} className={MOBILE_LINK} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <HeaderQuoteButton className="mt-2 w-full justify-center" />
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
