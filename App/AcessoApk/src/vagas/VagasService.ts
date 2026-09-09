import { apiClient } from "../services/api/client";
import type {
  AtualizarStatusCandidaturaResposta,
  CandidatarSeResposta,
  Candidatura,
  FavoritarVagaResposta,
  ListaCandidaturasResposta,
  ListaMinhasVagasResposta,
  ListaVagasResposta,
  ListarCandidaturasParametros,
  ListarVagasParametros,
  MinhasVagasParametros,
  StatusCandidatura,
  StatusVaga,
  Vaga,
  VagaDados,
  VagaDetalheResposta,
} from "./types";

/**
 * Única camada que conhece os endpoints reais de vagas
 * (`Site/Backend/src/routes/vagaRoutes.js`, confirmado por auditoria). Todo
 * path, payload e formato de resposta aqui é literal ao que o backend
 * realmente expõe hoje — nada foi presumido. Nenhum método trata 401 por
 * conta própria: o interceptor de `apiClient` (renovação automática /
 * encerramento de sessão) já cuida disso para todo o app, igual faz para
 * `AuthService`.
 */
export const VagasService = {
  /**
   * `GET /vagas` — público (auth opcional), paginação clássica por página.
   * Sem filtros nesta fase (a API aceita mais — busca textual, cidade,
   * modalidade etc. — fica para uma iteração futura).
   */
  async listar(parametros: ListarVagasParametros = {}): Promise<ListaVagasResposta> {
    const { data } = await apiClient.get<ListaVagasResposta>("/vagas", { params: parametros });
    return data;
  },

  /** `GET /vagas/:id` — auth opcional; devolve só a vaga, não o envelope. */
  async obterPorId(id: string): Promise<Vaga> {
    const { data } = await apiClient.get<VagaDetalheResposta>(`/vagas/${id}`);
    return data.vaga;
  },

  /** `POST /vagas/:vagaId/candidaturas` — exige candidato autenticado. Sem pré-checagem: o 409 (já candidatado) é tratado pelo chamador via `getFriendlyErrorMessage`. */
  async candidatarSe(vagaId: string, mensagem?: string): Promise<Candidatura> {
    const { data } = await apiClient.post<CandidatarSeResposta>(`/vagas/${vagaId}/candidaturas`, { mensagem });
    return data.candidatura;
  },

  /** `POST /vagas/:vagaId/favoritar` — toggle idempotente; devolve só o novo estado (fonte de verdade é sempre o servidor, nunca um cálculo local). */
  async favoritar(vagaId: string): Promise<boolean> {
    const { data } = await apiClient.post<FavoritarVagaResposta>(`/vagas/${vagaId}/favoritar`);
    return data.favoritado;
  },

  /* ==========================================================
     MODO EMPRESA (Fase 18) — gestão das próprias vagas/candidaturas.
     Todos exigem empresa aprovada (`garantirEmpresaAprovada` no backend);
     nenhum método aqui repete essa checagem — o 403 já vem com a
     mensagem certa (pendente/reprovada/suspensa), tratada pelo chamador
     via `getFriendlyErrorMessage`.
  ========================================================== */

  /** `GET /vagas/minhas` — só a empresa autenticada; cada vaga já vem com `totalCandidaturas`. */
  async minhas(parametros: MinhasVagasParametros = {}): Promise<ListaMinhasVagasResposta> {
    const { data } = await apiClient.get<ListaMinhasVagasResposta>("/vagas/minhas", { params: parametros });
    return data;
  },

  /** `POST /vagas` — cria em nome da empresa autenticada. */
  async criar(dados: VagaDados): Promise<Vaga> {
    const { data } = await apiClient.post<VagaDetalheResposta>("/vagas", dados);
    return data.vaga;
  },

  /** `PUT /vagas/:id` — atualização PARCIAL de verdade (diferente do perfil de candidato/empresa) — só os campos enviados mudam. */
  async atualizar(id: string, dados: VagaDados): Promise<Vaga> {
    const { data } = await apiClient.put<VagaDetalheResposta>(`/vagas/${id}`, dados);
    return data.vaga;
  },

  /** `PATCH /vagas/:id/status` — atalho dedicado (Aberta/Pausada/Encerrada), separado de `atualizar` porque é a ação mais comum no dia a dia (pausar/reabrir/encerrar uma vaga). */
  async alterarStatus(id: string, status: StatusVaga): Promise<Vaga> {
    const { data } = await apiClient.patch<VagaDetalheResposta>(`/vagas/${id}/status`, { status });
    return data.vaga;
  },

  /** `DELETE /vagas/:id` — exclusão definitiva (o backend não tem "arquivar"; pausar/encerrar via `alterarStatus` é o caminho não-destrutivo). */
  async remover(id: string): Promise<void> {
    await apiClient.delete(`/vagas/${id}`);
  },

  /** `GET /vagas/:vagaId/candidaturas` — cada candidatura vem com `candidato.usuario` embutido. */
  async listarCandidaturas(vagaId: string, parametros: ListarCandidaturasParametros = {}): Promise<ListaCandidaturasResposta> {
    const { data } = await apiClient.get<ListaCandidaturasResposta>(`/vagas/${vagaId}/candidaturas`, {
      params: parametros,
    });
    return data;
  },

  /** `PATCH /candidaturas/:id/status` — rota separada (`/candidaturas`, não `/vagas`); o backend só aceita Visualizada/EmAnalise/Aprovada/Rejeitada vindo da empresa (400 para qualquer outro valor). */
  async atualizarStatusCandidatura(candidaturaId: string, status: StatusCandidatura): Promise<Candidatura> {
    const { data } = await apiClient.patch<AtualizarStatusCandidaturaResposta>(`/candidaturas/${candidaturaId}/status`, {
      status,
    });
    return data.candidatura;
  },
};
