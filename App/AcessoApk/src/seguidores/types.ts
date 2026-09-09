/**
 * Tipos do contrato real de rede de conexões (Site/Backend), conforme
 * auditoria da Fase 14 — `SeguidorController`/`SeguidorService`,
 * `UsuarioController.perfilPublico`, `PerfilCandidatoController`. Nomes de
 * campo em português são literais ao que a API envia.
 *
 * IMPORTANTE (achado da auditoria): não existe endpoint para LISTAR
 * solicitações de seguimento pendentes recebidas — só agir sobre uma
 * (`aceitar`/`recusar` por `solicitacaoId`), que só chega ao usuário via
 * notificação (`subtipo: "solicitacao_seguimento"`, `entidadeId` = o
 * `solicitacaoId`). `aceitarSolicitacao`/`recusarSolicitacao` abaixo já
 * estão prontos para quando a Fase 16 (Notificações) existir — sem UI de
 * entrada própria nesta fase, porque não haveria de onde chamá-los.
 */

/** `GET /perfil/usuario/:usuarioId` — dados públicos mínimos de QUALQUER usuário, usado para decidir se o perfil é de candidato/empresa/administrador antes de buscar os dados completos. */
export interface UsuarioPublicoBasico {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  capaPerfil?: string | null;
  tipoUsuario: "candidato" | "empresa" | "administrador";
  perfilPublico: boolean;
  [chave: string]: unknown;
}

export interface UsuarioPublicoBasicoResposta {
  sucesso: true;
  usuario: UsuarioPublicoBasico;
}

/** Resumo de usuário nas listas de seguidores/seguindo/sugestões — mesma allowlist `PERFIL_PUBLICO` do backend. */
export interface UsuarioResumoSocial {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  capaPerfil?: string | null;
  tipoUsuario: string;
  [chave: string]: unknown;
}

/** `POST /seguir/usuarios/:usuarioId` — toggle; 403 se o perfil for privado (o app precisa checar `resumo().perfilPublico` antes de decidir entre isto e `solicitarSeguir`). */
export interface AlternarSeguirResposta {
  sucesso: true;
  seguindo: boolean;
  totalSeguidores: number;
}

/** `POST /seguir/solicitacoes/:destinatarioId` — se o alvo virou público entre o clique e a chamada, o backend já segue direto (`solicitacaoCriada:false`) em vez de deixar uma solicitação inútil pendurada. */
export interface SolicitarSeguirResposta {
  sucesso: true;
  seguindo?: boolean;
  totalSeguidores?: number;
  solicitacaoCriada: boolean;
  solicitacaoPendente?: boolean;
}

/** `GET /seguir/resumo/:usuarioId` — todo o estado de relação com um usuário numa chamada só. */
export interface ResumoSeguidores {
  sucesso: true;
  totalSeguidores: number;
  totalSeguindo: number;
  seguindoEsteUsuario: boolean;
  perfilPublico: boolean;
  elesSeguemVoce: boolean;
  solicitacaoPendente: boolean;
  bloqueado: boolean;
}

/** `GET /seguir/resumo/empresas/:empresaId`. */
export interface ResumoEmpresaSeguidores {
  sucesso: true;
  totalSeguidores: number;
  seguindoEstaEmpresa: boolean;
}

/** `ResumoSeguidores` desembrulhado (sem `sucesso`) — o que `SeguidorService.resumo` de fato devolve. */
export type ResumoRelacao = Omit<ResumoSeguidores, "sucesso">;

/** `ResumoEmpresaSeguidores` desembrulhado — o que `SeguidorService.resumoEmpresa` devolve. */
export type ResumoRelacaoEmpresa = Omit<ResumoEmpresaSeguidores, "sucesso">;

/** `GET /seguir/seguidores/:usuarioId` e `GET /seguir/seguindo/:usuarioId` — paginados, mesmo envelope de `montarResposta`. */
export interface ListaSeguidoresResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  seguidores: UsuarioResumoSocial[];
}

export interface ListaSeguindoResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  seguindo: UsuarioResumoSocial[];
}

export interface ListarPaginaParametros {
  page?: number;
  limit?: number;
}

/** `GET /seguir/sugestoes` — sugestões explicáveis; nunca baseadas em deficiência/diagnóstico (confirmado por auditoria do backend). */
export interface SugestaoPessoa {
  id: string;
  nome: string;
  fotoPerfil: string | null;
  tipo: string;
  titulo: string | null;
  motivo: string;
}

export interface SugestoesPessoasResposta {
  sucesso: true;
  sugestoes: SugestaoPessoa[];
}

/** `GET /seguir/sugestoes/empresas`. */
export interface SugestaoEmpresa {
  id: string;
  usuarioId: string;
  nomeFantasia: string | null;
  razaoSocial: string;
  logo: string | null;
  setor: string | null;
  cidade: string | null;
  descricao: string | null;
  empresaVerificada: boolean;
  motivo: string;
}

export interface SugestoesEmpresasResposta {
  sucesso: true;
  sugestoes: SugestaoEmpresa[];
}
