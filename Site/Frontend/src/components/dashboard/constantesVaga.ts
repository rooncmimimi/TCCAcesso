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

export const ROTULO_CONTRATO: Record<ContratoVaga, string> = {
  clt: "CLT",
  pj: "PJ",
  estagio: "Estágio",
  jovem_aprendiz: "Jovem aprendiz",
  temporario: "Temporário",
};

export const ROTULO_STATUS_VAGA: Record<StatusVaga, string> = {
  aberta: "Aberta",
  pausada: "Arquivada",
  encerrada: "Encerrada",
};

/** Público-alvo da vaga: é o único campo que define se ela é exclusiva para PCD. */
export const PUBLICO_ALVO: PublicoAlvoVaga[] = ["geral", "pcd", "cinquenta_mais", "pcd_cinquenta_mais"];

export const ROTULO_PUBLICO_ALVO: Record<PublicoAlvoVaga, string> = {
  geral: "Aberta a todos os públicos",
  pcd: "Exclusiva para pessoas com deficiência",
  cinquenta_mais: "Exclusiva para pessoas 50+",
  pcd_cinquenta_mais: "Para pessoas com deficiência e 50+",
};

/** Rótulo curto, usado em badge de card (espaço reduzido). */
export const ROTULO_PUBLICO_ALVO_CURTO: Record<PublicoAlvoVaga, string> = {
  geral: "Todos os públicos",
  pcd: "Exclusiva PCD",
  cinquenta_mais: "Exclusiva 50+",
  pcd_cinquenta_mais: "PCD e 50+",
};

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

export const ROTULO_RECURSO_ACESSIBILIDADE: Record<RecursoAcessibilidadeVaga, string> = {
  interprete_libras: "Intérprete de Libras",
  tecnologia_assistiva: "Tecnologia assistiva",
  ambiente_fisico_acessivel: "Ambiente físico acessível",
  banheiro_adaptado: "Banheiro adaptado",
  elevador_rampa: "Elevador ou rampa de acesso",
  jornada_adaptavel: "Jornada adaptável",
  ferramentas_digitais_acessiveis: "Ferramentas digitais acessíveis",
  outro: "Outro recurso (ver descrição)",
};

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
