import { useState, type ReactNode } from "react";
import { Menu, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";

export const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Início", href: "/" },
  { label: "Serviços", href: "/#servicos" },
  { label: "Sobre", href: "/#sobre" },
  { label: "Portfólio", href: "/catalogo" },
  { label: "Contato", href: "/contato" },
];

const DESKTOP_LINK =
  "heading-secondary text-sm text-foreground hover:text-secondary transition-colors duration-300";
const MOBILE_LINK =
  "heading-secondary text-base text-foreground hover:text-secondary transition-colors duration-300";

function HeaderQuoteButton({ className }: { className?: string }) {
  return (
    <a href={whatsappUrl(GENERIC_QUOTE_MESSAGE)} target="_blank" rel="noopener noreferrer">
      <Button
        className={cn(
          "bg-foreground text-background hover:bg-secondary text-sm px-6 py-2 rounded heading-secondary transition-all duration-300 flex items-center gap-2",
          className
        )}
      >
        <MessageCircle className="w-4 h-4" />
        Faça um Orçamento
      </Button>
    </a>
  );
}

export function SiteHeader({ rightSlot }: { rightSlot?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container">
        <nav className="flex items-center justify-between py-6">
          <Link href="/">
            <div className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-300 cursor-pointer">
              <img
                src="/logo.png"
                alt="Estúdio Pedra Industrial Logo"
                className="w-12 h-12 object-contain"
              />
              <div>
                <p className="heading-secondary text-sm font-bold text-foreground">Estúdio Pedra</p>
                <p className="text-xs text-accent-mono text-muted-foreground">INDUSTRIAL</p>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3 md:gap-12">
            <div className="hidden md:flex items-center gap-12">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className={DESKTOP_LINK}>
                  {l.label}
                </a>
              ))}
              <HeaderQuoteButton />
            </div>
            {rightSlot}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </nav>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação do site</SheetDescription>
          <nav className="mt-12 flex flex-col gap-6 px-6">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={MOBILE_LINK} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <HeaderQuoteButton className="w-full justify-center" />
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
