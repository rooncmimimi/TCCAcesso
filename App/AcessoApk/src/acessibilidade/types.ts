/**
 * Preferências de acessibilidade escolhidas no app e salvas no aparelho.
 *
 * Leitor de tela não é uma preferência: o TalkBack é ligado nas configurações do Android, então
 * aparece só como estado detectado em `EstadoAcessibilidadeSistema`. Um botão para ele no app daria
 * a entender que o ACESSO consegue ativá-lo.
 *
 * `keyboardNavigation` e `largeCursor` existem no modelo, mas nada lê esses valores: o foco por
 * teclado ou D-pad já funciona sempre no Android, e apps comuns não controlam o tamanho do cursor.
 * O `README.md` desta pasta descreve o efeito real de cada preferência.
 */
export interface PreferenciasAcessibilidade {
  /** Tema claro, escuro ou igual ao do sistema, aplicado pelo `TemaProvider` no app inteiro. */
  themeMode: PreferenciaModoTema;
  /** Variação de alto contraste do tema ativo, e não um modo à parte (veja `tema/temaAcessivel.ts`). */
  highContrast: boolean;
  fontScale: EscalaFonte;
  letterSpacing: EspacamentoLetras;
  lineHeightScale: EscalaAlturaLinha;
  /** Troca a fonte do app pela Lexend (`tema/fonteDislexia.ts`). */
  dyslexiaFont: boolean;
  /** Sem efeito: telas de toque não têm cursor e o Android não deixa um app ampliar o cursor do sistema. */
  largeCursor: boolean;
  reduceMotion: boolean;
  enhancedFocus: boolean;
  /** Sem efeito: o foco por teclado ou D-pad do Android já funciona sempre, não é algo que o app liga. */
  keyboardNavigation: boolean;
  /** Consentimento para ler conteúdos em voz alta com `expo-speech` (`BotaoOuvir`); não tem relação com o TalkBack. */
  voiceEnabled: boolean;
}

export type PreferenciaModoTema = "light" | "dark" | "system";
export type EscalaFonte = "small" | "medium" | "large" | "extraLarge";
export type EspacamentoLetras = "normal" | "comfortable" | "wide";
export type EscalaAlturaLinha = "normal" | "relaxed" | "loose";

/** Só as chaves booleanas: o que `alternarPreferencia` aceita (as demais são enums, exigem um valor específico via `definirPreferencia`). */
export type ChavePreferenciaBooleana = {
  [K in keyof PreferenciasAcessibilidade]: PreferenciasAcessibilidade[K] extends boolean ? K : never;
}[keyof PreferenciasAcessibilidade];

/** Ajustes de acessibilidade do Android. Só leitura: quem guarda e altera esses valores é o sistema. */
export interface EstadoAcessibilidadeSistema {
  /** `AccessibilityInfo.isScreenReaderEnabled()`: há um leitor de tela ativo, sem dizer qual. */
  leitorDeTelaAtivo: boolean;
  /** `AccessibilityInfo.isReduceMotionEnabled()`: a opção "Remover animações" do Android. */
  reduzirAnimacoesSistema: boolean;
}

export interface AcessibilidadeContextValue {
  preferencias: PreferenciasAcessibilidade;
  /** `true` só durante a leitura inicial do armazenamento local, nunca depois disso. */
  carregando: boolean;
  definirPreferencia: <K extends keyof PreferenciasAcessibilidade>(chave: K, valor: PreferenciasAcessibilidade[K]) => void;
  alternarPreferencia: (chave: ChavePreferenciaBooleana) => void;
  restaurarPreferencias: () => void;
  sistema: EstadoAcessibilidadeSistema;
  /** `preferencias.reduceMotion` ou o ajuste do sistema; qualquer um dos dois reduz as animações. */
  reduzirAnimacoesEfetivo: boolean;
}
