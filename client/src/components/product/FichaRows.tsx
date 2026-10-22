import type { FichaRow } from "@/lib/ficha";
import { cn } from "@/lib/utils";

/** Definition list of the ficha técnica rows; one hairline per row, closed by a bottom rule. */
export function FichaRows({ rows, className }: { rows: FichaRow[]; className?: string }) {
  if (rows.length === 0) return null;
  return (
    <dl className={cn("m-0 border-b border-border", className)}>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-5 gap-y-2 border-t border-border py-3.5 sm:grid-cols-[120px_minmax(0,1fr)]"
        >
          <dt className="pt-[3px] text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{r.label}</dt>
          <dd className="m-0 text-[15px] leading-normal text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
