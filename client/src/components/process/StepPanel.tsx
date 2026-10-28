import { LineIcon, type LineIconName } from "@/components/icons/LineIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export type StepIcon = "whatsapp" | LineIconName;

/** Decorative Bege panel with the step icon centred. */
export function StepPanel({ icon }: { icon: StepIcon }) {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-square max-h-[300px] w-full items-center justify-center overflow-hidden bg-card sm:max-h-[420px]"
    >
      {icon === "whatsapp" ? (
        <WhatsAppIcon className="h-[140px] w-[140px] text-foreground" />
      ) : (
        <LineIcon name={icon} className="h-[140px] w-[140px] text-foreground" />
      )}
    </div>
  );
}
