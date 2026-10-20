import type { ReactNode } from "react";
import { CartWidget } from "@/components/cart/CartWidget";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Shared chrome for the public pages. Admin and NotFound do not use it. */
export function Layout({ children, showCart = false }: { children: ReactNode; showCart?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader rightSlot={showCart ? <CartWidget /> : undefined} />
      {children}
      <WhatsAppFab />
      <SiteFooter />
    </div>
  );
}
