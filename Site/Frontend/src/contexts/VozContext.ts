import { createContext } from "react";

/**
 * Leitura por voz: três conceitos, cada um com um único dono.
 *
 * - `preferencias.screenReader` (de `AcessibilidadeContext`): diz se a voz está ativa agora. Todo
 *   código que decide falar algo (aqui, em `useLeituraAutomatica` ou em qualquer componente)
 *   consulta só este valor, que a pessoa liga e desliga em Configurações sem afetar o
 *   consentimento.
 * - `preferencias.voiceConsent`: registro de que a pessoa já respondeu à pergunta de consentimento,
 *   sincronizado com o backend (`consentimentoVoz`) quando há sessão. `null` é nunca respondeu;
 *   `true` ou `false`, já respondeu. Mantém o valor mesmo que `screenReader` mude depois.
 * - `escolha` (só neste contexto): cópia local para o visitante sem conta, guardada no localStorage
 *   porque ainda não há onde salvar no backend.
 *
 * `definirEscolha` grava os três no mesmo instante. O `ConsentimentoVozDialog` decide se pergunta
 * de novo por `preferencias.voiceConsent !== null`, e não por `escolha`, para uma conta que já
 * respondeu não ser perguntada de novo num navegador com localStorage vazio.
 */
export type EscolhaVoz = "accepted" | "declined" | null;

/** Evento `boundary` da `speechSynthesis`, reduzido ao que o Site usa. */
export type LimiteDeFala = {
  /** Posição, no texto falado, onde começa a palavra ou frase que a voz acabou de alcançar. */
  charIndex: number;
  charLength?: number;
  /** `"word"` ou `"sentence"`. Nem toda voz informa, e várias só emitem um dos dois. */
  name: string;
};

export type OpcoesFala = {
  /** Corta o que estiver sendo falado antes de começar. Padrão: `true`. */
  interrupt?: boolean;
  aoIniciar?: () => void;
  /**
   * Chamado a cada palavra (ou frase) alcançada. Depende do navegador e da voz: várias vozes de
   * rede não emitem este evento, e quem usa precisa de um plano B (`useLeituraDestacada`).
   */
  aoLimite?: (limite: LimiteDeFala) => void;
  /** Fim natural, erro ou cancelamento. Cancelar por uma fala nova também chama. */
  aoTerminar?: (motivo: "fim" | "erro" | "cancelada") => void;
};

export type VozContextValue = {
  suportado: boolean;
  falando: boolean;
  /** Fala em andamento que foi pausada com `pausar`. */
  pausado: boolean;
  /** Registro de "já perguntou?" do primeiro acesso: não usar para decidir se a voz está ativa (use `preferencias.screenReader`). */
  escolha: EscolhaVoz;
  perguntouNestaSessao: boolean;
  /**
   * Fala `text`. O texto é aparado (`trim`) antes de falar, e `charIndex` de `aoLimite` vale para
   * o texto **já aparado**: quem sincroniza destaque deve passar um texto que já esteja aparado.
   */
  falar: (text: string, opts?: OpcoesFala) => void;
  parar: () => void;
  pausar: () => void;
  retomar: () => void;
  definirEscolha: (choice: Exclude<EscolhaVoz, null>) => void;
  limparEscolha: () => void;
};

export const VozContext = createContext<VozContextValue | null>(null);
