import type { ContratoVaga, ModalidadeVaga, StatusVaga } from "@/types";

/** Espelham exatamente os ENUMs validados pelo backend (`Backend/src/validators/vagaValidator.js`). */
export const MODALIDADES: ModalidadeVaga[] = ["Presencial", "Hibrido", "Remoto"];
export const CONTRATOS: ContratoVaga[] = ["CLT", "PJ", "Estagio", "JovemAprendiz", "Temporario"];
export const STATUS_VAGA: StatusVaga[] = ["Aberta", "Pausada", "Encerrada"];

export const ROTULO_CONTRATO: Record<ContratoVaga, string> = {
  CLT: "CLT",
  PJ: "PJ",
  Estagio: "Estágio",
  JovemAprendiz: "Jovem aprendiz",
  Temporario: "Temporário",
};

export const ROTULO_STATUS_VAGA: Record<StatusVaga, string> = {
  Aberta: "Aberta",
  Pausada: "Arquivada",
  Encerrada: "Encerrada",
};
