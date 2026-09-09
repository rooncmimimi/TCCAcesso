import type { NavigatorScreenParams } from "@react-navigation/native";

import type { EntidadeTipoDenuncia } from "../moderacao";

/**
 * Tipos da navegação real do app (Fase 4). Cada `ParamList` corresponde a um
 * navigator de verdade — nenhuma tela usa `navigation: any` nem
 * `navigation.navigate("string" as any)` em lugar nenhum do app.
 */

/**
 * `Login`/`ForgotPassword`/`ResetPassword` continuam sendo os MESMOS
 * componentes de tela da Fase 3 — só passaram a ser telas de um Stack real
 * em vez de alternadas por `useState` (ver `navigation/AuthNavigator.tsx`).
 */
export type AuthStackParamList = {
  /** `email` é opcional — preenchido quando se chega aqui vindo de um cadastro recém-confirmado (Fase 11), mesmo padrão de `ResetPassword` abaixo. */
  Login: { email?: string } | undefined;
  ForgotPassword: undefined;
  /** `email` é opcional — o usuário pode chegar aqui digitando o código manualmente, sem ter passado por "Esqueci minha senha" nesta sessão. */
  ResetPassword: { email?: string } | undefined;
  Register: undefined;
};

/**
 * A aba "Perfil" das Bottom Tabs renderiza este Stack (não é uma tela
 * única) — é o que dá "navegação interna" à aba, conforme a Fase 4 pede.
 * `ProfileMenu` é o que a aba mostra por padrão; os demais são empilhados
 * por cima quando o usuário toca um item do menu.
 */
export type ProfileStackParamList = {
  ProfileMenu: undefined;
  MyProfile: undefined;
  Activities: undefined;
  Discover: undefined;
  Settings: undefined;
  Accessibility: undefined;
  Help: undefined;
  /** Fase 18 (Modo Empresa) — só alcançável pelo menu quando `tipoUsuario === "empresa"`; o backend também recusa (403) se um candidato tentar direto pela API. */
  MyJobs: undefined;
  /** `vagaId` ausente = criar; presente = editar (pré-preenche buscando `VagasService.obterPorId`, reaproveitado da Fase 9). */
  JobForm: { vagaId?: string };
  /** `vagaTitulo` só para o título do header aparecer antes da busca resolver — mesmo padrão de `FollowList.nomeUsuario`/`Conversation.nomeOutroParticipante`. */
  JobApplicants: { vagaId: string; vagaTitulo?: string };
  /** Fase 19 — lista de quem EU bloqueei, com "Desbloquear"; alcançada a partir de Configurações. */
  BlockedUsers: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Jobs: undefined;
  Messages: undefined;
  Notifications: undefined;
  /** A aba em si não recebe parâmetros, mas permite navegar direto a uma tela interna do Profile Stack (ex.: a partir de um deep link). */
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

/**
 * `Tabs` é a raiz da área autenticada. `VagaDetail` (Fase 9) foi a primeira
 * tela empilhada por cima das tabs que este Stack já existia preparado para
 * receber (comentário das fases anteriores citava literalmente "detalhe de
 * vaga" como exemplo). `NovaPostagem`/`PostagemDetail` (Fase 10) mesmo
 * motivo: `HomeScreen` (a aba) precisa empilhar por cima de TODAS as tabs
 * pra criar/abrir uma publicação, não só trocar de aba.
 */
export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList> | undefined;
  VagaDetail: { vagaId: string };
  NovaPostagem: undefined;
  PostagemDetail: { postagemId: string };
  /** Fase 14 — resolvido por `usuarioId` (nunca `candidatoId`/`empresaId` direto) para funcionar a partir de qualquer superfície (Feed, Vagas, seguidores/seguindo, sugestões). */
  PublicProfile: { usuarioId: string };
  /** `nomeUsuario` é só para o título do header — opcional porque nem sempre já se tem o nome à mão (ex.: vindo de um deep link futuro). */
  FollowList: { usuarioId: string; modo: "seguidores" | "seguindo"; nomeUsuario?: string };
  /** Fase 17 — `nomeOutroParticipante` só para o título do header aparecer imediatamente (antes de `GET /conversas/:id` resolver), mesmo padrão de `nomeUsuario` em `FollowList` acima. */
  Conversation: { conversaId: string; nomeOutroParticipante?: string };
  /** Fase 19 — genérica: qualquer superfície (perfil, publicação, comentário, vaga) navega pra cá informando o que está denunciando. `tituloAlvo` só para dar contexto visual (opcional). */
  Report: { entidadeTipo: EntidadeTipoDenuncia; entidadeId: string; tituloAlvo?: string };
};

/**
 * Raiz de tudo. Alterna entre 4 ramos conforme o `status` do `AuthProvider`
 * — nunca duplica esse estado, só o consome (Fase 4, item 9).
 */
export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Unsupported: undefined;
  App: NavigatorScreenParams<AppStackParamList> | undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- forma oficial do React Navigation de tipar `useNavigation()`/`navigation.navigate()` global sem anotar o tipo em toda tela; a interface só existe para o `extends`.
    interface RootParamList extends RootStackParamList {}
  }
}
