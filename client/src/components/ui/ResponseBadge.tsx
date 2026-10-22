import { LineIcon } from "@/components/icons/LineIcon";
import { cn } from "@/lib/utils";
import { SITE } from "@shared/content/site";

export function ResponseBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 bg-card px-3 py-2 text-sm text-foreground",
        className
      )}
    >
      <LineIcon name="clock" className="h-4 w-4 shrink-0" />
      {SITE.responseTime}
    </span>
  );
}
