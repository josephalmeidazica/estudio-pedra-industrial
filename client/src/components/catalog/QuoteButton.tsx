import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartContext";
import { CustomPieceDialog } from "@/components/cart/CustomPieceDialog";
import { buildWhatsAppUrl } from "@/components/cart/whatsapp";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/lib/types";
import { openWhatsApp, productQuoteMessage, whatsappUrl } from "@/lib/whatsapp";

type Props = { product: Pick<PublicProduct, "id" | "name" | "slug" | "isCustom">; className?: string; hideIcon?: boolean };

/** Primary card action: opens WhatsApp with the product pre-filled. The custom piece asks for a description first. */
export function QuoteButton({ product, className, hideIcon }: Props) {
  const { setCustomer } = useCart();
  const [open, setOpen] = useState(false);

  const quote = () => {
    if (product.isCustom) {
      setOpen(true);
      return;
    }
    const url = window.location.origin + "/catalogo/" + product.slug;
    openWhatsApp(whatsappUrl(productQuoteMessage(product.name, url)));
  };

  return (
    <>
      <Button className={cn("w-full", className)} onClick={quote}>
        {hideIcon ? null : <MessageCircle className="mr-2 h-4 w-4" />}
        {product.isCustom ? "Descrever meu móvel" : "Pedir orçamento"}
      </Button>
      {product.isCustom && (
        <CustomPieceDialog
          open={open}
          onOpenChange={setOpen}
          mode="quote"
          onConfirm={({ note, customer }) => {
            if (!customer) return;
            setCustomer(customer);
            openWhatsApp(buildWhatsAppUrl(customer, [{ name: product.name, quantity: 1, note }]));
          }}
        />
      )}
    </>
  );
}
