import { clienteApi } from "../services/api/cliente";
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

/** Vagas: listagem e detalhe, candidatura e favoritos, e a gestão das próprias vagas pela empresa. */
export const VagasService = {
  /**
   * `GET /vagas`: público (autenticação opcional) e paginado por página, com os filtros de
   * `ListarVagasParametros`.
   */
  async listar(parametros: ListarVagasParametros = {}): Promise<ListaVagasResposta> {
    const { data } = await clienteApi.get<ListaVagasResposta>("/vagas", { params: parametros });
    return data;
  },

  /** `GET /vagas/:id`: auth opcional; devolve só a vaga, não o envelope. */
  async obterPorId(id: string): Promise<Vaga> {
    const { data } = await clienteApi.get<VagaDetalheResposta>(`/vagas/${id}`);
    return data.vaga;
  },

  /** `POST /vagas/:vagaId/candidaturas`: exige candidato autenticado. Sem pré-checagem: o 409 (já candidatado) é tratado pelo chamador via `extrairMensagemErro`. */
  async candidatarSe(vagaId: string, mensagem?: string): Promise<Candidatura> {
    const { data } = await clienteApi.post<CandidatarSeResposta>(`/vagas/${vagaId}/candidaturas`, { mensagem });
    return data.candidatura;
  },

  /** `POST /vagas/:vagaId/favoritar`: toggle idempotente; devolve só o novo estado (fonte de verdade é sempre o servidor, nunca um cálculo local). */
  async favoritar(vagaId: string): Promise<boolean> {
    const { data } = await clienteApi.post<FavoritarVagaResposta>(`/vagas/${vagaId}/favoritar`);
    return data.favoritado;
  },

  /*
   * Modo empresa: gestão das próprias vagas e candidaturas. Tudo exige empresa aprovada
   * (`garantirEmpresaAprovada` no backend), e o 403 já traz a mensagem certa (pendente, reprovada
   * ou suspensa), exibida pelo chamador com `extrairMensagemErro`.
   */

  /** `GET /vagas/minhas`: só a empresa autenticada; cada vaga já vem com `totalCandidaturas`. */
  async minhas(parametros: MinhasVagasParametros = {}): Promise<ListaMinhasVagasResposta> {
    const { data } = await clienteApi.get<ListaMinhasVagasResposta>("/vagas/minhas", { params: parametros });
    return data;
  },

  /** `POST /vagas`: cria em nome da empresa autenticada. */
  async criar(dados: VagaDados): Promise<Vaga> {
    const { data } = await clienteApi.post<VagaDetalheResposta>("/vagas", dados);
    return data.vaga;
  },

  /**
   * `PUT /vagas/:id`: atualização parcial de verdade (ao contrário do perfil de candidato e de
   * empresa); só os campos enviados mudam.
   */
  async atualizar(id: string, dados: VagaDados): Promise<Vaga> {
    const { data } = await clienteApi.put<VagaDetalheResposta>(`/vagas/${id}`, dados);
    return data.vaga;
  },

  /** `PATCH /vagas/:id/status`: atalho dedicado (Aberta/Pausada/Encerrada), separado de `atualizar` porque é a ação mais comum no dia a dia (pausar/reabrir/encerrar uma vaga). */
  async alterarStatus(id: string, status: StatusVaga): Promise<Vaga> {
    const { data } = await clienteApi.patch<VagaDetalheResposta>(`/vagas/${id}/status`, { status });
    return data.vaga;
  },

  /** `DELETE /vagas/:id`: exclusão definitiva (o backend não tem "arquivar"; pausar/encerrar via `alterarStatus` é o caminho não-destrutivo). */
  async remover(id: string): Promise<void> {
    await clienteApi.delete(`/vagas/${id}`);
  },

  /** `GET /vagas/:vagaId/candidaturas`: cada candidatura vem com `candidato.usuario` embutido. */
  async listarCandidaturas(vagaId: string, parametros: ListarCandidaturasParametros = {}): Promise<ListaCandidaturasResposta> {
    const { data } = await clienteApi.get<ListaCandidaturasResposta>(`/vagas/${vagaId}/candidaturas`, {
      params: parametros,
    });
    return data;
  },

  /** `PATCH /candidaturas/:id/status`: rota separada (`/candidaturas`, não `/vagas`); o backend só aceita Visualizada/EmAnalise/Aprovada/Rejeitada vindo da empresa (400 para qualquer outro valor). */
  async atualizarStatusCandidatura(candidaturaId: string, status: StatusCandidatura): Promise<Candidatura> {
    const { data } = await clienteApi.patch<AtualizarStatusCandidaturaResposta>(`/candidaturas/${candidaturaId}/status`, {
      status,
    });
    return data.candidatura;
  },
};
