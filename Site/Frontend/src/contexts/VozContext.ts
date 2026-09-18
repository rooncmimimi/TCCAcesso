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

export type VozContextValue = {
  suportado: boolean;
  falando: boolean;
  /** Registro de "já perguntou?" do primeiro acesso: não usar para decidir se a voz está ativa (use `preferencias.screenReader`). */
  escolha: EscolhaVoz;
  perguntouNestaSessao: boolean;
  falar: (text: string, opts?: { interrupt?: boolean }) => void;
  parar: () => void;
  definirEscolha: (choice: Exclude<EscolhaVoz, null>) => void;
  limparEscolha: () => void;
};

export const VozContext = createContext<VozContextValue | null>(null);
