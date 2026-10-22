import { SITE } from "@shared/content/site";
import { CATALOG_MESSAGE, whatsappUrl } from "@/lib/whatsapp";

/** Black band that offers the PDF catalogue; the download button exists only once a PDF is published. */
export function CatalogPdfBand() {
  const pdf = SITE.catalogPdf;
  const meta =
    pdf && pdf.sizeLabel && pdf.updatedLabel ? `PDF · ${pdf.sizeLabel} · atualizado em ${pdf.updatedLabel}` : null;
  return (
    <section id="catalogo" className="bg-foreground py-[72px] text-background">
      <div className="container flex flex-wrap items-center justify-between gap-12">
        <div className="flex min-w-0 max-w-[640px] flex-col gap-3.5">
          <p className="lbl text-border">Catálogo</p>
          <h2 className="heading-display text-3xl md:text-[40px]">Prefere folhear? Baixe o catálogo em PDF.</h2>
          <p className="text-[17px] leading-relaxed text-border">Todas as peças com fotos, medidas e materiais.</p>
          {meta ? <p className="lbl text-[11px] text-border">{meta}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {pdf ? (
            <a
              href={pdf.url}
              download
              className="inline-flex h-[52px] items-center justify-center border border-border bg-border px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-foreground hover:bg-background"
            >
              Baixar catálogo (PDF)
            </a>
          ) : null}
          <a
            href={whatsappUrl(CATALOG_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[52px] items-center justify-center border border-background px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:bg-background hover:text-foreground"
          >
            Receber pelo WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
