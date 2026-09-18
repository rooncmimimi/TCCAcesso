import type { NavigatorScreenParams } from "@react-navigation/native";

import type { TipoBusca } from "../busca";
import type { EntidadeTipoDenuncia } from "../moderacao";

/**
 * Rotas e parâmetros de cada navigator. Com eles, `navigation.navigate` é checado no app inteiro,
 * sem `any`.
 */

export type AutenticacaoStackParamList = {
  /** `email` opcional: vem preenchido quando a pessoa acabou de confirmar o cadastro. */
  Login: { email?: string } | undefined;
  ForgotPassword: undefined;
  /** `email` é opcional: o usuário pode chegar aqui digitando o código manualmente, sem ter passado por "Esqueci minha senha" nesta sessão. */
  ResetPassword: { email?: string } | undefined;
  Register: undefined;
};

/** Pilha da aba Perfil: `ProfileMenu` é a tela inicial e as demais abrem por cima. */
export type PerfilStackParamList = {
  ProfileMenu: undefined;
  MyProfile: undefined;
  Activities: undefined;
  Discover: undefined;
  /** Busca global com resumo por categoria; o "ver mais" de cada categoria abre `SearchResults` na pilha principal. */
  Search: undefined;
  Settings: undefined;
  Accessibility: undefined;
  Help: undefined;
  /** Só aparece no menu de contas de empresa; o backend também recusa (403) candidatos. */
  MyJobs: undefined;
  /** Sem `vagaId` cria uma vaga; com `vagaId` edita, carregando os dados por `VagasService.obterPorId`. */
  JobForm: { vagaId?: string };
  /** `vagaTitulo` só para o título do header aparecer antes da busca resolver, no mesmo padrão de `FollowList.nomeUsuario`/`Conversation.nomeOutroParticipante`. */
  JobApplicants: { vagaId: string; vagaTitulo?: string };
  /** Lista de quem a pessoa bloqueou, com a opção de desbloquear; aberta a partir de Configurações. */
  BlockedUsers: undefined;
};

export type AbasParamList = {
  Home: undefined;
  Jobs: undefined;
  Messages: undefined;
  Notifications: undefined;
  /** A aba em si não recebe parâmetros, mas permite navegar direto a uma tela interna do Profile Stack (ex.: a partir de um deep link). */
  Profile: NavigatorScreenParams<PerfilStackParamList> | undefined;
};

/**
 * Pilha principal da área logada. `Tabs` é a base, e telas como o detalhe de vaga ou de publicação
 * ficam por cima de todas as abas, não dentro de uma delas.
 */
export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AbasParamList> | undefined;
  VagaDetail: { vagaId: string };
  NovaPostagem: undefined;
  PostagemDetail: { postagemId: string };
  /**
   * Sempre por `usuarioId` (nunca `candidatoId` ou `empresaId`), para abrir o perfil de qualquer
   * lugar do app: feed, vagas, seguidores, sugestões.
   */
  PublicProfile: { usuarioId: string };
  /** `nomeUsuario` é só para o título do header: opcional porque nem sempre já se tem o nome à mão (ex.: vindo de um deep link futuro). */
  FollowList: { usuarioId: string; modo: "seguidores" | "seguindo"; nomeUsuario?: string };
  /**
   * `nomeOutroParticipante` só serve para o título aparecer antes de `GET /conversas/:id`
   * responder, como `nomeUsuario` em `FollowList`.
   */
  Conversation: { conversaId: string; nomeOutroParticipante?: string };
  /**
   * Tela genérica de denúncia: perfil, publicação, comentário ou vaga informam o que está sendo
   * denunciado. `tituloAlvo` dá contexto visual e é opcional.
   */
  Report: { entidadeTipo: EntidadeTipoDenuncia; entidadeId: string; tituloAlvo?: string };
  /** Resultados completos e paginados de uma categoria da busca (o "ver mais" da `BuscaScreen`). */
  SearchResults: { termo: string; tipo: TipoBusca };
};

/**
 * Raiz da navegação: alterna entre os ramos conforme o `status` do `AutenticacaoProvider`, sem
 * guardar estado próprio.
 */
export type RaizStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AutenticacaoStackParamList> | undefined;
  Unsupported: undefined;
  /** Sessão autenticada com o conteúdo bloqueado pela biometria do aparelho (`useSeguranca`). */
  BiometricLock: undefined;
  App: NavigatorScreenParams<AppStackParamList> | undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- forma oficial do React Navigation de tipar `useNavigation()`/`navigation.navigate()` global sem anotar o tipo em toda tela; a interface só existe para o `extends`.
    interface RootParamList extends RaizStackParamList {}
  }
}
