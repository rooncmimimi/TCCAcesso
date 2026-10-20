import type { Dicionario } from "../dicionario";

export const status: Dicionario["status"] = {
  pendente: "Pendiente",
  visualizada: "Vista",
  em_analise: "En revisión",
  aprovada: "Aprobada",
  rejeitada: "Rechazada",
  cancelada: "Cancelada",
  aberta: "Abierta",
  pausada: "Archivada",
  encerrada: "Cerrada",
};
