import type { NavigatorScreenParams } from "@react-navigation/native";

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
  Login: undefined;
  ForgotPassword: undefined;
  /** `email` é opcional — o usuário pode chegar aqui digitando o código manualmente, sem ter passado por "Esqueci minha senha" nesta sessão. */
  ResetPassword: { email?: string } | undefined;
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
 * Hoje só existe a tela "Tabs". Este Stack existe desde já (em vez de as
 * Bottom Tabs serem a raiz da área autenticada) para as próximas fases
 * poderem empilhar telas em tela cheia por cima das tabs (detalhe de vaga,
 * conversa de mensagens, etc.) sem precisar reestruturar nada agora.
 */
export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList> | undefined;
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
