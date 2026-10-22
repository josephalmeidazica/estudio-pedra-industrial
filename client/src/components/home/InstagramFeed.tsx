import { useEffect, useRef, useState } from "react";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, SITE } from "@shared/content/site";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { instagramEmbedUrl } from "@/lib/instagram";

export function InstagramFeed() {
  const embeds = SITE.instagramPosts
    .map(instagramEmbedUrl)
    .filter((u): u is string => u !== null)
    .slice(0, 6);
  const gridRef = useRef<HTMLUListElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [embeds.length]);

  return (
    <section className="border-b border-border py-16 lg:py-24">
      <div className="container flex flex-col gap-10 lg:gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <p className="lbl text-muted-foreground">Instagram</p>
            <h2 className="heading-display break-words text-[28px] leading-[1.1] lg:text-[44px]">{INSTAGRAM_HANDLE}</h2>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[52px] items-center justify-center gap-2.5 border border-foreground px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-foreground hover:bg-foreground hover:text-background"
          >
            <InstagramIcon className="h-4 w-4" />
            Seguir no Instagram
          </a>
        </div>
        {embeds.length > 0 && (
          <>
            <ul ref={gridRef} className="m-0 grid list-none grid-cols-3 gap-2 p-0 lg:grid-cols-6 lg:gap-4">
              {embeds.map(src => (
                <li key={src} className="relative aspect-square min-w-0 overflow-hidden bg-card">
                  {visible && (
                    <iframe
                      src={src}
                      loading="lazy"
                      title="Publicação no Instagram"
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted-foreground">Publicações recentes do nosso perfil no Instagram.</p>
          </>
        )}
      </div>
    </section>
  );
}
