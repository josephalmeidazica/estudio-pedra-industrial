import type { ReactNode } from "react";
import { CartWidget } from "@/components/cart/CartWidget";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Shared chrome for the public pages. Admin and NotFound do not use it. */
export function Layout({
  children,
  showCart = false,
  backHref,
  fabHidden = false,
  footerLinks,
}: {
  children: ReactNode;
  showCart?: boolean;
  backHref?: string;
  fabHidden?: boolean;
  footerLinks?: { label: string; href: string }[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader rightSlot={showCart ? <CartWidget /> : undefined} backHref={backHref} />
      {children}
      <WhatsAppFab hidden={fabHidden} />
      <SiteFooter extraLinks={footerLinks} />
    </div>
  );
}
