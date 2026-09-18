import { clienteApi } from "../services/api/cliente";
import type {
  AlternarSeguirResposta,
  ListaSeguidoresResposta,
  ListaSeguindoResposta,
  ListarPaginaParametros,
  ResumoEmpresaSeguidores,
  ResumoRelacao,
  ResumoRelacaoEmpresa,
  ResumoSeguidores,
  SolicitarSeguirResposta,
  SugestaoEmpresa,
  SugestaoPessoa,
  SugestoesEmpresasResposta,
  SugestoesPessoasResposta,
  UsuarioPublicoBasico,
  UsuarioPublicoBasicoResposta,
} from "./types";

/** Seguir pessoas e empresas, solicitações de seguir, listas de seguidores e sugestões. */
export const SeguidorService = {
  /** `GET /perfil/usuario/:usuarioId`: primeiro passo para abrir qualquer perfil de terceiro: descobre o `tipoUsuario` antes de buscar os dados completos (candidato/empresa têm rotas diferentes). */
  async obterUsuarioPublicoBasico(usuarioId: string): Promise<UsuarioPublicoBasico> {
    const { data } = await clienteApi.get<UsuarioPublicoBasicoResposta>(`/perfil/usuario/${usuarioId}`);
    return data.usuario;
  },

  /**
   * `POST /seguir/usuarios/:usuarioId`: toggle direto. O backend recusa
   * (403) se o perfil for privado; a tela sempre checa `resumo().perfilPublico`
   * antes de decidir entre isto e `solicitarSeguir`, nunca chama isto "no
   * escuro" torcendo para dar certo.
   */
  async alternarSeguirUsuario(usuarioId: string): Promise<{ seguindo: boolean; totalSeguidores: number }> {
    const { data } = await clienteApi.post<AlternarSeguirResposta>(`/seguir/usuarios/${usuarioId}`);
    return { seguindo: data.seguindo, totalSeguidores: data.totalSeguidores };
  },

  /** `POST /seguir/empresas/:empresaId`: toggle; só candidatos podem seguir empresa (o backend já valida, 403 caso contrário). */
  async alternarSeguirEmpresa(empresaId: string): Promise<{ seguindo: boolean; totalSeguidores: number }> {
    const { data } = await clienteApi.post<AlternarSeguirResposta>(`/seguir/empresas/${empresaId}`);
    return { seguindo: data.seguindo, totalSeguidores: data.totalSeguidores };
  },

  /** `POST /seguir/solicitacoes/:destinatarioId`: perfil privado. Se o alvo virou público entre o clique e a chamada, o backend já segue direto em vez de criar uma solicitação inútil. */
  async solicitarSeguir(usuarioId: string): Promise<SolicitarSeguirResposta> {
    const { data } = await clienteApi.post<SolicitarSeguirResposta>(`/seguir/solicitacoes/${usuarioId}`);
    return data;
  },

  /** `DELETE /seguir/solicitacoes/:destinatarioId`: desiste da própria solicitação pendente; idempotente no servidor. */
  async cancelarSolicitacao(usuarioId: string): Promise<void> {
    await clienteApi.delete(`/seguir/solicitacoes/${usuarioId}`);
  },

  /**
   * `POST /seguir/solicitacoes/:solicitacaoId/aceitar`. O `solicitacaoId` vem da notificação
   * (`entidadeId`), porque a API não tem rota para listar as solicitações pendentes.
   */
  async aceitarSolicitacao(solicitacaoId: string): Promise<void> {
    await clienteApi.post(`/seguir/solicitacoes/${solicitacaoId}/aceitar`);
  },

  /** `POST /seguir/solicitacoes/:solicitacaoId/recusar`: mesma observação de `aceitarSolicitacao`. */
  async recusarSolicitacao(solicitacaoId: string): Promise<void> {
    await clienteApi.post(`/seguir/solicitacoes/${solicitacaoId}/recusar`);
  },

  /** `GET /seguir/seguidores/:usuarioId`. */
  async listarSeguidores(usuarioId: string, parametros: ListarPaginaParametros = {}) {
    const { data } = await clienteApi.get<ListaSeguidoresResposta>(`/seguir/seguidores/${usuarioId}`, {
      params: parametros,
    });
    return data;
  },

  /** `GET /seguir/seguindo/:usuarioId`. */
  async listarSeguindo(usuarioId: string, parametros: ListarPaginaParametros = {}) {
    const { data } = await clienteApi.get<ListaSeguindoResposta>(`/seguir/seguindo/${usuarioId}`, {
      params: parametros,
    });
    return data;
  },

  /** `GET /seguir/resumo/:usuarioId`: contadores + toda a relação (sigo/me seguem/solicitação pendente/bloqueado) numa chamada só. */
  async resumo(usuarioId: string): Promise<ResumoRelacao> {
    const { data } = await clienteApi.get<ResumoSeguidores>(`/seguir/resumo/${usuarioId}`);
    return {
      totalSeguidores: data.totalSeguidores,
      totalSeguindo: data.totalSeguindo,
      seguindoEsteUsuario: data.seguindoEsteUsuario,
      perfilPublico: data.perfilPublico,
      elesSeguemVoce: data.elesSeguemVoce,
      solicitacaoPendente: data.solicitacaoPendente,
      bloqueado: data.bloqueado,
    };
  },

  /** `GET /seguir/resumo/empresas/:empresaId`. */
  async resumoEmpresa(empresaId: string): Promise<ResumoRelacaoEmpresa> {
    const { data } = await clienteApi.get<ResumoEmpresaSeguidores>(`/seguir/resumo/empresas/${empresaId}`);
    return { totalSeguidores: data.totalSeguidores, seguindoEstaEmpresa: data.seguindoEstaEmpresa };
  },

  /** `GET /seguir/sugestoes`: no máximo 20 no backend, e as sugestões nunca usam deficiência. */
  async sugestoesPessoas(limit?: number): Promise<SugestaoPessoa[]> {
    const { data } = await clienteApi.get<SugestoesPessoasResposta>("/seguir/sugestoes", { params: { limit } });
    return data.sugestoes;
  },

  /** `GET /seguir/sugestoes/empresas`. */
  async sugestoesEmpresas(limit?: number): Promise<SugestaoEmpresa[]> {
    const { data } = await clienteApi.get<SugestoesEmpresasResposta>("/seguir/sugestoes/empresas", {
      params: { limit },
    });
    return data.sugestoes;
  },
};
