import type { Dicionario } from "../dicionario";

export const status: Dicionario["status"] = {
  pendente: "Pending",
  visualizada: "Viewed",
  em_analise: "Under review",
  aprovada: "Approved",
  rejeitada: "Rejected",
  cancelada: "Cancelled",
  aberta: "Open",
  pausada: "Archived",
  encerrada: "Closed",
};
