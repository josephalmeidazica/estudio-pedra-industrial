import { MessageCircle } from "lucide-react";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";

/**
 * Floating WhatsApp button, bottom-right on every public page.
 * Black circle with the beige icon: 10.6:1 against the beige page and 21:1
 * against the white card sections; the inverse would vanish on the beige.
 */
export function WhatsAppFab() {
  return (
    <a
      href={whatsappUrl(GENERIC_QUOTE_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-secondary shadow-lg transition-colors duration-300 hover:bg-secondary hover:text-foreground"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
