import { ProductIcon } from "@/components/icons/ProductIcon";
import type { Category } from "@/lib/catalogFilter";
import { categoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

type Props = {
  categories: Category[];
  active: string | null;
  onChange: (slug: string | null) => void;
  total: number;
};

/** Category filter with brand icons. On phones it scrolls inside its own container. */
export function CategoryChips({ categories, active, onChange, total }: Props) {
  const chips: { label: string; slug: string | null }[] = [{ label: `Todos · ${total}`, slug: null }, ...categories];
  return (
    <div
      className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:overflow-visible"
      role="group"
      aria-label="Filtrar por tipo de peça"
    >
      {chips.map((c) => {
        const isActive = c.slug === active;
        const icon = c.slug ? categoryIcon(c.slug) : null;
        return (
          <button
            key={c.slug ?? "todos"}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(c.slug)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:h-10 gap-2.5 whitespace-nowrap border border-foreground px-4 text-xs uppercase tracking-[0.12em] transition-colors",
              isActive ? "bg-foreground text-background" : "bg-transparent text-foreground hover:bg-card",
            )}
          >
            {icon ? <ProductIcon src={icon} className="h-4 w-[18px]" /> : null}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
