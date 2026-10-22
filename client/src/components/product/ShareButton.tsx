import { toast } from "sonner";

/** Arrow out of a tray, as in the phone ficha frame. */
function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" />
    </svg>
  );
}

/** Native share sheet when the browser has one; otherwise copies the link. */
export function ShareButton({ title, url }: { title: string; url: string }) {
  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Any other failure: fall through to copying the link.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado");
    } catch {
      toast("Não foi possível copiar o link");
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-11 items-center gap-2 text-[15px] text-foreground transition-colors hover:text-accent"
    >
      <ShareGlyph className="h-5 w-5" />
      Compartilhar
    </button>
  );
}
