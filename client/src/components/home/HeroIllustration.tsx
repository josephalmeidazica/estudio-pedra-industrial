import type { CSSProperties } from "react";
import { ProductIcon } from "@/components/icons/ProductIcon";

/**
 * Stand-in for the hero artwork: brand pattern, three product icons on a baseline.
 * The client's final illustration replaces this file only.
 */
export function HeroIllustration() {
  return (
    <div
      className="pattern-bg h-[300px] min-w-0 bg-card lg:h-[600px]"
      style={{ "--pattern-opacity": ".18" } as CSSProperties}
      role="img"
      aria-label="Ilustração da marca com luminária, mesa e estante"
    >
      <span className="absolute left-5 top-5 h-5 w-5 bg-accent lg:left-10 lg:top-10 lg:h-7 lg:w-7" />
      <div className="absolute inset-x-5 bottom-14 flex items-end justify-center gap-5 text-foreground lg:inset-x-10 lg:bottom-[120px] lg:gap-9">
        <ProductIcon src="/brand/icons/luminaria-lua.png" className="h-[96px] w-[58px] lg:h-[160px] lg:w-[96px]" />
        <ProductIcon src="/brand/icons/mesa-urb.png" className="h-[102px] w-[120px] lg:h-[170px] lg:w-[200px]" />
        <ProductIcon src="/brand/icons/estante-divisio.png" className="h-[108px] w-[72px] lg:h-[180px] lg:w-[120px]" />
      </div>
      <span className="absolute inset-x-5 bottom-12 h-0.5 bg-foreground lg:inset-x-10 lg:bottom-[104px]" />
      <span className="lbl absolute bottom-5 left-5 text-[10px] text-muted-foreground lg:bottom-10 lg:left-10">
        Ilustração da marca
      </span>
    </div>
  );
}
