import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Brand product icon, painted with the current text colour through a CSS mask (see `.pi`). */
export function ProductIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("pi", className)}
      style={{ "--pi": `url(${src})` } as CSSProperties}
      aria-hidden="true"
    />
  );
}
