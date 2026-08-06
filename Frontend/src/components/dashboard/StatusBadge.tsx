import { Badge } from "@/components/ui/badge";
import type { StatusCandidatura } from "@/types";

const ROTULOS: Record<string, string> = {
  Pendente: "Pendente",
  EmAnalise: "Em análise",
  Aprovada: "Aprovada",
  Reprovada: "Reprovada",
  Cancelada: "Cancelada",
};

const VARIANTES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Pendente: "outline",
  EmAnalise: "secondary",
  Aprovada: "default",
  Reprovada: "destructive",
  Cancelada: "outline",
};

export function StatusBadge({ status }: { status: StatusCandidatura | string }) {
  return (
    <Badge variant={VARIANTES[status] ?? "outline"} className="font-medium">
      {ROTULOS[status] ?? status}
    </Badge>
  );
}
