import { createContext } from "react";

/**
 * Preferências de acessibilidade do Site. Visitantes guardam só no localStorage; com sessão, elas
 * também são sincronizadas com a conta: no login e no cadastro (`SessaoProvider`) e ao salvar em
 * Configurações ou nas boas-vindas.
 */
export type PreferenciasAcessibilidade = {
  highContrast: boolean;
  darkMode: boolean;
  fontScale: number; // 0.875 – 1.6
  letterSpacing: number; // em
  lineHeight: number;
  dyslexiaFont: boolean;
  bigCursor: boolean;
  reduceMotion: boolean;
  focusHighlight: boolean;
  keyboardNav: boolean;
  screenReader: boolean; // leitura por voz: preferência efetiva atual (liga/desliga a qualquer momento em Configurações)
  /**
   * Registro da resposta ao consentimento de voz; nunca decide se a voz está ativa agora (isso é
   * `screenReader`). `null`: ainda não respondeu; `true` ou `false`: já respondeu. Só controla se o
   * `ConsentimentoVozDialog` pergunta de novo. Com sessão, é sincronizado com o backend
   * (`consentimentoVoz`); antes do login, fica só no localStorage (ver `definirEscolha` em
   * `VozProvider.tsx`).
   */
  voiceConsent: boolean | null;
  speechRate: number;
  vlibras: boolean;
  /**
   * Cursor de leitura: com a leitura por voz ligada, ↑ e ↓ percorrem o conteúdo da página, bloco a
   * bloco (`hooks/useCursorDeLeitura.ts`). Fica só no navegador, como as demais preferências sem
   * campo no backend; desligado por padrão porque as setas também rolam a página.
   */
  arrowReading: boolean;

  // Bloco 1 da acessibilidade avançada. Todas ficam só no navegador (sem coluna no backend).

  /** Destaca a palavra que a voz está dizendo (`hooks/useLeituraDestacada.ts`). */
  wordHighlight: boolean;
  /** Régua de leitura: faixa clara que acompanha o mouse ou o foco, com o resto da tela escurecido. */
  readingRuler: boolean;
  rulerHeight: number; // px, 24 – 160
  rulerDim: number; // 0.2 – 0.85: quanto o resto da tela escurece
  /** Avisos (toasts) ficam na tela até a pessoa fechar. */
  persistentToasts: boolean;
  /** Esconde elementos secundários (colunas laterais, rodapé de suporte). */
  focusMode: boolean;
  /** Modo leitura: coluna estreita, texto à esquerda, mais respiro e fundo à escolha. */
  readingMode: boolean;
  readingBg: "padrao" | "creme" | "escuro";
  readingFont: "padrao" | "sem-serifa" | "serifada";
  /** Cores à escolha da pessoa, sempre em `#rrggbb`. */
  customColors: boolean;
  colorText: string;
  colorBg: string;
  colorLink: string;
  colorFocus: string;
  /** Paleta que não depende de vermelho x verde, com links sublinhados e estados com ícone. */
  colorBlind: boolean;
};

export const PREFERENCIAS_PADRAO: PreferenciasAcessibilidade = {
  highContrast: false,
  darkMode: false,
  fontScale: 1,
  letterSpacing: 0,
  lineHeight: 1.6,
  dyslexiaFont: false,
  bigCursor: false,
  reduceMotion: false,
  focusHighlight: true,
  keyboardNav: true,
  screenReader: false,
  voiceConsent: null,
  speechRate: 1,
  vlibras: true,
  arrowReading: false,
  wordHighlight: true,
  readingRuler: false,
  rulerHeight: 64,
  rulerDim: 0.6,
  persistentToasts: false,
  focusMode: false,
  readingMode: false,
  readingBg: "padrao",
  readingFont: "padrao",
  customColors: false,
  colorText: "#111111",
  colorBg: "#ffffff",
  colorLink: "#0b3d91",
  colorFocus: "#c2410c",
  colorBlind: false,
};

export const CHAVE_ESCOLHA_VOZ = "acesso:voice-choice";

export type AcessibilidadeContextValue = {
  preferencias: PreferenciasAcessibilidade;
  rascunho: PreferenciasAcessibilidade;
  inicializado: boolean;
  alterado: boolean;
  /** Atualiza em tempo real (pré-visualização imediata, sem salvar). */
  definir: <K extends keyof PreferenciasAcessibilidade>(chave: K, valor: PreferenciasAcessibilidade[K]) => void;
  /**
   * Confirma as preferências no localStorage; as telas de Configurações e de boas-vindas também as
   * enviam para a conta.
   */
  salvar: (next?: PreferenciasAcessibilidade) => void;
  /** Descarta a pré-visualização e volta ao último estado salvo. */
  descartar: () => void;
  restaurar: () => void;
};

export const AcessibilidadeContext = createContext<AcessibilidadeContextValue | null>(null);
