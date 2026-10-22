import { HOME } from "@shared/content/home";
import { LineIcon } from "@/components/icons/LineIcon";
import { cn } from "@/lib/utils";

/** Cell separators: 2 x 2 grid on phones, one row of four from `lg`. */
function cellBorders(i: number): string {
  return cn(
    "border-border",
    i % 2 === 1 && "border-l",
    i >= 2 && "border-t lg:border-t-0",
    i > 0 ? "lg:border-l" : "lg:border-l-0",
  );
}

export function Diferenciais() {
  return (
    <section className="border-y border-border">
      <div className="container grid grid-cols-2 lg:grid-cols-4">
        {HOME.diferenciais.map((d, i) => (
          <div
            key={d.label}
            className={cn(
              "flex min-w-0 flex-col gap-3 py-6 lg:flex-row lg:items-center lg:gap-[18px] lg:px-6 lg:py-8",
              i % 2 === 1 ? "pl-4 pr-0" : "pl-0 pr-4",
              i === 0 && "lg:pl-0",
              i === 3 && "lg:pr-0",
              cellBorders(i),
            )}
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center border border-foreground text-foreground">
              <LineIcon name={d.icon} className="h-[22px] w-[22px]" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="lbl text-[11px]">{d.label}</span>
              <span className="text-sm text-muted-foreground">{d.text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
