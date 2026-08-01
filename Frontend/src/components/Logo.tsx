import { Accessibility } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
      >
        <Accessibility className="size-5" />
      </span>
      {showWordmark && (
        <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
          ACESSO
        </span>
      )}
    </span>
  );
}
