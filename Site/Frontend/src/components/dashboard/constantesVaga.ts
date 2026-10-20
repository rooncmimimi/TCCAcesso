import {
  Accessibility,
  Building2,
  DoorOpen,
  Hand,
  Laptop,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type {
  ContratoVaga,
  ModalidadeVaga,
  PublicoAlvoVaga,
  RecursoAcessibilidadeVaga,
  StatusVaga,
} from "@/types";

/** Espelham exatamente os ENUMs validados pelo backend (`Site/Backend/src/validators/vagaValidator.js`). */
export const MODALIDADES: ModalidadeVaga[] = ["presencial", "hibrido", "remoto"];
export const CONTRATOS: ContratoVaga[] = ["clt", "pj", "estagio", "jovem_aprendiz", "temporario"];
export const STATUS_VAGA: StatusVaga[] = ["aberta", "pausada", "encerrada"];

/** Público-alvo da vaga: é o único campo que define se ela é exclusiva para PCD. */
export const PUBLICO_ALVO: PublicoAlvoVaga[] = ["geral", "pcd", "cinquenta_mais", "pcd_cinquenta_mais"];

/**
 * Recursos de acessibilidade da vaga: lista fechada (não texto livre).
 * Espelha `RECURSOS_ACESSIBILIDADE` de `Site/Backend/src/validators/vagaValidator.js`.
 */
export const RECURSOS_ACESSIBILIDADE: RecursoAcessibilidadeVaga[] = [
  "interprete_libras",
  "tecnologia_assistiva",
  "ambiente_fisico_acessivel",
  "banheiro_adaptado",
  "elevador_rampa",
  "jornada_adaptavel",
  "ferramentas_digitais_acessiveis",
  "outro",
];

export const ICONE_RECURSO_ACESSIBILIDADE: Record<RecursoAcessibilidadeVaga, LucideIcon> = {
  interprete_libras: Hand,
  tecnologia_assistiva: Laptop,
  ambiente_fisico_acessivel: Accessibility,
  banheiro_adaptado: DoorOpen,
  elevador_rampa: Building2,
  jornada_adaptavel: Timer,
  ferramentas_digitais_acessiveis: Laptop,
  outro: Sparkles,
};
