import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWhatsApp, productQuoteMessage, whatsappUrl } from "@/lib/whatsapp";

/** Primary card action: opens WhatsApp with the product name pre-filled. */
export function QuoteButton({ productName }: { productName: string }) {
  const quote = () => {
    const catalogUrl = window.location.origin + "/catalogo";
    openWhatsApp(whatsappUrl(productQuoteMessage(productName, catalogUrl)));
  };
  return (
    <Button className="w-full" onClick={quote}>
      <MessageCircle className="mr-2 h-4 w-4" />
      Pedir orçamento
    </Button>
  );
}
