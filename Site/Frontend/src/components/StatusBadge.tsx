import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Hourglass,
  Lock,
  Pause,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { StatusCandidatura, StatusVaga } from "@/types";
import type { ChaveBase } from "@/i18n/dicionarios";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Rótulos e variantes seguem exatamente os ENUMs do backend:
 * candidatura (Pendente, Visualizada, EmAnalise, Aprovada, Rejeitada, Cancelada)
 * e vaga (Aberta, Pausada, Encerrada).
 */
const ROTULOS: Record<string, ChaveBase> = {
  pendente: "status.pendente",
  visualizada: "status.visualizada",
  em_analise: "status.emAnalise",
  aprovada: "status.aprovada",
  rejeitada: "status.rejeitada",
  cancelada: "status.cancelada",
  aberta: "status.aberta",
  pausada: "status.arquivada",
  encerrada: "status.encerrada",
};

const VARIANTES: Record<string, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  pendente: "outline",
  visualizada: "secondary",
  em_analise: "secondary",
  aprovada: "success",
  rejeitada: "destructive",
  cancelada: "outline",
  aberta: "success",
  pausada: "outline",
  encerrada: "secondary",
};

/**
 * Um símbolo por status, para o selo não depender só da cor (WCAG 1.4.1). A forma do ícone é o que
 * distingue: ampulheta (ainda não olharam), olho (viram), relógio (em análise), círculo com certo
 * (aprovada), círculo com xis (recusada), proibido (cancelada).
 *
 * Os ícones são `aria-hidden`: o texto do selo já diz o status, e um leitor de tela anunciando
 * "imagem: círculo com certo" antes de "Aprovada" só atrapalharia.
 */
const ICONES: Record<string, LucideIcon> = {
  pendente: Hourglass,
  visualizada: Eye,
  em_analise: Clock,
  aprovada: CheckCircle2,
  rejeitada: XCircle,
  cancelada: Ban,
  aberta: CheckCircle2,
  pausada: Pause,
  encerrada: Lock,
};

/** Tons usados pelas tabelas administrativas (rótulo livre via children). */
const TONS: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning" | "success"> = {
  sucesso: "success",
  atencao: "warning",
  perigo: "destructive",
  neutro: "outline",
};

/** Mesmo motivo dos ícones de status: o tom nunca é a única pista. "Neutro" não afirma nada, então não leva símbolo. */
const ICONES_DO_TOM: Record<string, LucideIcon | undefined> = {
  sucesso: CheckCircle2,
  atencao: AlertTriangle,
  perigo: XCircle,
  neutro: undefined,
};

type StatusBadgeProps =
  | { status: StatusCandidatura | StatusVaga | string; tom?: never; children?: never }
  | { tom: "sucesso" | "atencao" | "perigo" | "neutro"; children: ReactNode; status?: never };

/**
 * Selo de status. Com `status`, usa o rótulo, a variante e o ícone de candidatura ou vaga; com
 * `tom`, mostra um texto livre (`children`) num dos tons das tabelas administrativas.
 */
export function StatusBadge(props: StatusBadgeProps) {
  const { t } = useIdioma();

  if (props.tom) {
    const IconeDoTom = ICONES_DO_TOM[props.tom];

    return (
      <Badge variant={TONS[props.tom] ?? "outline"} className="gap-1 font-medium">
        {IconeDoTom && <IconeDoTom className="size-3.5 shrink-0" aria-hidden="true" />}
        {props.children}
      </Badge>
    );
  }

  const status = props.status as string;
  const Icone = ICONES[status];

  return (
    <Badge variant={VARIANTES[status] ?? "outline"} className="gap-1 font-medium">
      {Icone && <Icone className="size-3.5 shrink-0" aria-hidden="true" />}
      {ROTULOS[status] ? t(ROTULOS[status]) : status}
    </Badge>
  );
}
