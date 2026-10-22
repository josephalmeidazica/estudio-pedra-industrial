import { SITE } from "@shared/content/site";

export function Avaliacoes() {
  const reviews = SITE.reviews;
  if (!reviews) return null;
  return (
    <section className="border-b border-border bg-card py-16 lg:py-24">
      <div className="container flex flex-col gap-10 lg:gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <p className="lbl text-muted-foreground">Avaliações</p>
            <h2 className="heading-display text-[34px] leading-[1.1] lg:text-[52px]">O que dizem os clientes</h2>
          </div>
          <div className="flex min-w-0 flex-col gap-2 border border-brand-concrete px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-[32px] font-light leading-none">{reviews.rating}</span>
              <span className="sr-only">nota {reviews.rating} de 5</span>
              <span className="text-accent" aria-hidden="true">★★★★★</span>
            </div>
            <a
              href={reviews.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              {reviews.count} avaliações no Google · ver todas →
            </a>
          </div>
        </div>
        <ul className="m-0 flex list-none snap-x gap-4 overflow-x-auto p-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {reviews.quotes.map(q => (
            <li
              key={q.author + q.text}
              className="flex w-[300px] min-w-0 shrink-0 snap-start flex-col gap-6 border border-brand-concrete bg-background p-6 lg:w-auto lg:p-8"
            >
              <p className="text-base leading-relaxed">“{q.text}”</p>
              <div className="mt-auto flex flex-col gap-1">
                <span className="text-[15px] font-medium">{q.author}</span>
                <span className="text-[13px] text-muted-foreground">{q.context}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
