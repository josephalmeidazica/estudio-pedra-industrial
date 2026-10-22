import { useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Deadline } from "./storage";

const OPTIONS: { kind: Deadline["kind"]; label: string }[] = [
  { kind: "sem-pressa", label: "Sem pressa" },
  { kind: "ate-1-mes", label: "Em até 1 mês" },
  { kind: "ate-2-meses", label: "Em até 2 meses" },
  { kind: "data", label: "Tenho uma data" },
];

type Props = {
  value: Deadline | undefined;
  onChange: (next: Deadline | undefined) => void;
};

/** Optional "Para quando precisa?" choice; clicking the active chip clears it. */
export function DeadlineChips({ value, onChange }: Props) {
  const dateId = useId();

  const toggle = (kind: Deadline["kind"]) => {
    if (value?.kind === kind) {
      onChange(undefined);
      return;
    }
    onChange(kind === "data" ? { kind, when: "" } : { kind });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => {
          const active = value?.kind === o.kind;
          return (
            <button
              key={o.kind}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(o.kind)}
              className={cn(
                "min-h-11 border border-foreground px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:min-h-9",
                active ? "bg-foreground text-background" : "bg-transparent text-foreground"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {value?.kind === "data" && (
        <div className="space-y-1">
          <label htmlFor={dateId} className="text-sm font-medium">
            Qual data?
          </label>
          <Input
            id={dateId}
            placeholder="Ex.: antes do Natal"
            value={value.when}
            onChange={(e) => onChange({ kind: "data", when: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
