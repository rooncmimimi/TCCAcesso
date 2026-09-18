import type { PreferenciasAcessibilidade } from "../acessibilidade";

/** Formato que `PerfilService`/`EmpresaService`/`ConfiguracoesService` já devolvem: reexportado aqui só pela conveniência de nomear o formato final exportado, sem duplicar nenhum tipo de contrato real. */
export interface DadosExportados {
  geradoEm: string;
  conta: Record<string, unknown>;
  candidato?: Record<string, unknown>;
  experiencias?: unknown[];
  formacoes?: unknown[];
  certificados?: unknown[];
  habilidades?: unknown[];
  empresa?: Record<string, unknown>;
  preferenciasNotificacao?: Record<string, unknown>;
  preferenciasAcessibilidade: PreferenciasAcessibilidade;
}
