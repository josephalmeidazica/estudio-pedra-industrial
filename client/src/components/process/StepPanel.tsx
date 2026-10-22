import type { CSSProperties } from "react";
import { LineIcon, type LineIconName } from "@/components/icons/LineIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export type StepIcon = "whatsapp" | LineIconName;

/** Decorative Bege panel with the step icon centred and a small tag bottom-left. */
export function StepPanel({ icon, tag }: { icon: StepIcon; tag: string }) {
  return (
    <div
      aria-hidden="true"
      className="pattern-bg relative flex aspect-square max-h-[300px] w-full items-center justify-center overflow-hidden bg-card sm:max-h-[420px]"
      style={{ "--pattern-opacity": 0.16 } as CSSProperties}
    >
      {icon === "whatsapp" ? (
        <WhatsAppIcon className="relative h-[140px] w-[140px] text-foreground" />
      ) : (
        <LineIcon name={icon} className="relative h-[140px] w-[140px] text-foreground" />
      )}
      <span className="lbl absolute bottom-6 left-6 right-6 text-[10px] text-muted-foreground">{tag}</span>
    </div>
  );
}
