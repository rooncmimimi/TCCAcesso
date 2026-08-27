import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  titulo,
  valor,
  icon: Icon,
  descricao,
}: {
  titulo: string;
  valor: number | string;
  icon: LucideIcon;
  descricao?: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-extrabold tabular-nums">{valor}</p>
          {descricao ? <p className="text-xs text-muted-foreground">{descricao}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
