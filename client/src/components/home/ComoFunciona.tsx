import { Link } from "wouter";
import { PROCESSO, homeSteps } from "@shared/content/processo";

export function ComoFunciona() {
  return (
    <section className="border-b border-border py-16 lg:py-24">
      <div className="container flex flex-col gap-10 lg:gap-14">
        <div className="flex flex-wrap items-end justify-between gap-6 lg:gap-8">
          <div className="flex min-w-0 flex-col gap-4">
            <p className="lbl text-muted-foreground">Como funciona</p>
            <h2 className="heading-display text-[34px] leading-[1.1] lg:text-[52px]">
              Da conversa à entrega, em cinco passos.
            </h2>
          </div>
          <div className="flex max-w-[380px] min-w-0 flex-col gap-4">
            <p className="text-base leading-relaxed text-muted-foreground">
              Cada peça nasce de um projeto feito com você. Você acompanha tudo pelo WhatsApp.
            </p>
            <Link href="/processo" className="lbl self-start border-b border-foreground pb-2">
              Conheça o processo completo →
            </Link>
          </div>
        </div>
        <ol className="m-0 grid list-none grid-cols-1 gap-0 p-0 md:grid-cols-2 md:gap-x-6 lg:grid-cols-5 lg:gap-x-4">
          {homeSteps().map((s, i) => (
            <li key={s.n} className="min-w-0 border-t border-foreground">
              <Link
                href={`/processo#p${PROCESSO.steps.indexOf(s) + 1}`}
                className="group grid h-full grid-cols-[40px_minmax(0,1fr)] gap-x-2 gap-y-2 px-3 py-6 transition-colors hover:bg-accent focus-visible:bg-accent lg:flex lg:flex-col lg:gap-4 lg:px-4"
              >
                <span className="lbl pt-2 lg:pt-0">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-[24px] font-light lg:text-[26px]">{s.homeTitle ?? s.title}</h3>
                <p className="col-start-2 text-[15px] leading-relaxed text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground lg:col-start-auto">
                  {s.summary}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
