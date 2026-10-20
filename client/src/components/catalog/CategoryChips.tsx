import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/catalogFilter";

type Props = {
  categories: Category[];
  active: string | null;
  onChange: (slug: string | null) => void;
};

/** Horizontal, scrollable category filter. "Todos" first; the active chip is filled black. */
export function CategoryChips({ categories, active, onChange }: Props) {
  const chips: { label: string; slug: string | null }[] = [{ label: "Todos", slug: null }, ...categories];
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por categoria">
      {chips.map((c) => {
        const isActive = c.slug === active;
        return (
          <Button
            key={c.slug ?? "todos"}
            type="button"
            size="sm"
            variant={isActive ? "default" : "outline"}
            aria-pressed={isActive}
            className={`shrink-0 rounded-full heading-secondary text-xs ${
              isActive ? "bg-foreground text-background hover:bg-foreground/90" : "border-foreground/30 hover:border-foreground"
            }`}
            onClick={() => onChange(c.slug)}
          >
            {c.label}
          </Button>
        );
      })}
    </div>
  );
}
