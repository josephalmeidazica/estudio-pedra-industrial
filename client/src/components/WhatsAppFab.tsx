import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { GENERIC_QUOTE_MESSAGE, whatsappUrl } from "@/lib/whatsapp";

/**
 * Floating WhatsApp button, bottom-right on every public page.
 * Verde Pedra circle with the Areia glyph; hidden while a page shows its own action bar.
 */
export function WhatsAppFab({ hidden = false }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <a
      href={whatsappUrl(GENERIC_QUOTE_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-background transition-opacity duration-300 hover:opacity-90"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
