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
import { tx } from "@/i18n/frases";

/** Espelham exatamente os ENUMs validados pelo backend (`Site/Backend/src/validators/vagaValidator.js`). */
export const MODALIDADES: ModalidadeVaga[] = ["presencial", "hibrido", "remoto"];
export const CONTRATOS: ContratoVaga[] = ["clt", "pj", "estagio", "jovem_aprendiz", "temporario"];
export const STATUS_VAGA: StatusVaga[] = ["aberta", "pausada", "encerrada"];

/** O contrato como se lê na tela; valor fora da lista aparece como veio. */
export function rotuloDoContrato(contrato: string): string {
  return ROTULO_CONTRATO[contrato as ContratoVaga] ?? tx(contrato);
}

export const ROTULO_CONTRATO: Record<ContratoVaga, string> = {
  clt: "CLT",
  pj: "PJ",
  get estagio() { return tx("Estágio"); },
  get jovem_aprendiz() { return tx("Jovem aprendiz"); },
  get temporario() { return tx("Temporário"); },
};

export const ROTULO_STATUS_VAGA: Record<StatusVaga, string> = {
  get aberta() { return tx("Aberta"); },
  get pausada() { return tx("Arquivada"); },
  get encerrada() { return tx("Encerrada"); },
};

/** Público-alvo da vaga: é o único campo que define se ela é exclusiva para PCD. */
export const PUBLICO_ALVO: PublicoAlvoVaga[] = ["geral", "pcd", "cinquenta_mais", "pcd_cinquenta_mais"];

export const ROTULO_PUBLICO_ALVO: Record<PublicoAlvoVaga, string> = {
  get geral() { return tx("Aberta a todos os públicos"); },
  get pcd() { return tx("Exclusiva para pessoas com deficiência"); },
  get cinquenta_mais() { return tx("Exclusiva para pessoas 50+"); },
  get pcd_cinquenta_mais() { return tx("Para pessoas com deficiência e 50+"); },
};

/** Rótulo curto, usado em badge de card (espaço reduzido). */
export const ROTULO_PUBLICO_ALVO_CURTO: Record<PublicoAlvoVaga, string> = {
  get geral() { return tx("Todos os públicos"); },
  get pcd() { return tx("Exclusiva PCD"); },
  get cinquenta_mais() { return tx("Exclusiva 50+"); },
  get pcd_cinquenta_mais() { return tx("PCD e 50+"); },
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
  get interprete_libras() { return tx("Intérprete de Libras"); },
  get tecnologia_assistiva() { return tx("Tecnologia assistiva"); },
  get ambiente_fisico_acessivel() { return tx("Ambiente físico acessível"); },
  get banheiro_adaptado() { return tx("Banheiro adaptado"); },
  get elevador_rampa() { return tx("Elevador ou rampa de acesso"); },
  get jornada_adaptavel() { return tx("Jornada adaptável"); },
  get ferramentas_digitais_acessiveis() { return tx("Ferramentas digitais acessíveis"); },
  get outro() { return tx("Outro recurso (ver descrição)"); },
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
