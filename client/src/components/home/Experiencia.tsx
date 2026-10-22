import { Link } from "wouter";
import { SITE } from "@shared/content/site";

export function Experiencia() {
  const stats = SITE.stats;
  return (
    <section className="pattern-bg bg-foreground py-16 text-background lg:py-24" style={{ ["--pattern-opacity" as string]: ".12" }}>
      <div className="container relative grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="flex min-w-0 flex-col gap-6">
          <p className="lbl text-brand-concrete">Experiência e garantia</p>
          <h2 className="heading-display text-[34px] leading-[1.1] lg:text-[52px]">Quem faz, responde pela peça.</h2>
          <p className="max-w-[520px] text-base leading-relaxed text-brand-concrete">
            Fabricação própria em Belo Horizonte, projeto aprovado por você antes do corte e garantia em todas as peças
            que saem do estúdio.
          </p>
          <Link
            href="/processo"
            className="inline-flex h-[52px] items-center justify-center self-start border border-background px-6 text-[13px] font-medium uppercase tracking-[0.12em] text-background hover:bg-background hover:text-foreground"
          >
            Conhecer o processo
          </Link>
        </div>
        {stats.length > 0 && (
          <dl className="m-0 grid min-w-0 grid-cols-2">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`flex min-w-0 flex-col gap-2 border-brand-concrete p-5 lg:p-8 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t" : ""}`}
              >
                <dt className="order-2 text-[15px] leading-snug text-card">{s.label}</dt>
                <dd className="m-0 text-[40px] font-light leading-none lg:text-[56px]">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
