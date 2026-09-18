import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { StatusCandidatura, StatusVaga } from "@/types";

/**
 * Rótulos e variantes seguem exatamente os ENUMs do backend:
 * candidatura (Pendente, Visualizada, EmAnalise, Aprovada, Rejeitada, Cancelada)
 * e vaga (Aberta, Pausada, Encerrada).
 */
const ROTULOS: Record<string, string> = {
  pendente: "Pendente",
  visualizada: "Visualizada",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  cancelada: "Cancelada",
  aberta: "Aberta",
  pausada: "Arquivada",
  encerrada: "Encerrada",
};

const VARIANTES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "outline",
  visualizada: "secondary",
  em_analise: "secondary",
  aprovada: "default",
  rejeitada: "destructive",
  cancelada: "outline",
  aberta: "default",
  pausada: "outline",
  encerrada: "secondary",
};

/** Tons usados pelas tabelas administrativas (rótulo livre via children). */
const TONS: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning"> = {
  sucesso: "default",
  atencao: "warning",
  perigo: "destructive",
  neutro: "outline",
};

type StatusBadgeProps =
  | { status: StatusCandidatura | StatusVaga | string; tom?: never; children?: never }
  | { tom: "sucesso" | "atencao" | "perigo" | "neutro"; children: ReactNode; status?: never };

/**
 * Selo de status. Com `status`, usa o rótulo e a variante de candidatura ou vaga; com `tom`, mostra
 * um texto livre (`children`) num dos tons das tabelas administrativas.
 */
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
