import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { StatusCandidatura, StatusVaga } from "@/types";

/**
 * Rótulos e variantes seguem exatamente os ENUMs do backend:
 * candidatura (Pendente, Visualizada, EmAnalise, Aprovada, Rejeitada, Cancelada)
 * e vaga (Aberta, Pausada, Encerrada).
 */
const ROTULOS: Record<string, string> = {
  Pendente: "Pendente",
  Visualizada: "Visualizada",
  EmAnalise: "Em análise",
  Aprovada: "Aprovada",
  Rejeitada: "Rejeitada",
  Cancelada: "Cancelada",
  Aberta: "Aberta",
  Pausada: "Arquivada",
  Encerrada: "Encerrada",
};

const VARIANTES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Pendente: "outline",
  Visualizada: "secondary",
  EmAnalise: "secondary",
  Aprovada: "default",
  Rejeitada: "destructive",
  Cancelada: "outline",
  Aberta: "default",
  Pausada: "outline",
  Encerrada: "secondary",
};

/** Tons usados pelas tabelas administrativas (rótulo livre via children). */
const TONS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sucesso: "default",
  atencao: "secondary",
  perigo: "destructive",
  neutro: "outline",
};

type StatusBadgeProps =
  | { status: StatusCandidatura | StatusVaga | string; tom?: never; children?: never }
  | { tom: "sucesso" | "atencao" | "perigo" | "neutro"; children: ReactNode; status?: never };

export function StatusBadge(props: StatusBadgeProps) {
  if (props.tom) {
    return (
      <Badge variant={TONS[props.tom] ?? "outline"} className="font-medium">
        {props.children}
      </Badge>
    );
  }

  const status = props.status as string;

  return (
    <Badge variant={VARIANTES[status] ?? "outline"} className="font-medium">
      {ROTULOS[status] ?? status}
    </Badge>
  );
}
