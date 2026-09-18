import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AccessibilityInfo } from "react-native";

import { AcessibilidadeContext } from "./AcessibilidadeContext";
import { PREFERENCIAS_ACESSIBILIDADE_PADRAO } from "./preferenciasPadrao";
import { obterPreferenciasSalvas, salvarPreferencias } from "./armazenamentoAcessibilidade";
import type {
  AcessibilidadeContextValue,
  PreferenciasAcessibilidade,
  ChavePreferenciaBooleana,
} from "./types";

/**
 * Fonte única das preferências de acessibilidade. O `TemaProvider` lê daqui tema, alto contraste e
 * escalas de texto, então nenhuma tela deve guardar uma cópia própria desse estado.
 *
 * Não depende da sessão: as preferências valem antes do login e são lidas do `AsyncStorage` assim
 * que o app abre.
 */
export function AcessibilidadeProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<PreferenciasAcessibilidade>(PREFERENCIAS_ACESSIBILIDADE_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [leitorDeTelaAtivo, setLeitorDeTelaAtivo] = useState(false);
  const [reduzirAnimacoesSistema, setReduzirAnimacoesSistema] = useState(false);

  // Lê as preferências salvas uma única vez. Os filhos só aparecem depois disso para o app não
  // abrir no tema padrão e trocar para o tema salvo logo em seguida; a leitura é rápida o bastante
  // para dispensar uma tela de carregamento.
  useEffect(() => {
    let ativo = true;

    obterPreferenciasSalvas().then((salvas) => {
      if (!ativo) return;
      if (salvas) setPreferencias({ ...PREFERENCIAS_ACESSIBILIDADE_PADRAO, ...salvas });
      setCarregando(false);
    });

    return () => {
      ativo = false;
    };
  }, []);

  // Ajustes do próprio Android, só observados. O `AccessibilityInfo` avisa que há um leitor de tela
  // ativo, mas não diz qual (TalkBack ou outro serviço).
  useEffect(() => {
    let ativo = true;

    AccessibilityInfo.isScreenReaderEnabled().then((valor) => {
      if (ativo) setLeitorDeTelaAtivo(valor);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
      if (ativo) setReduzirAnimacoesSistema(valor);
    });

    const assinaturaLeitor = AccessibilityInfo.addEventListener("screenReaderChanged", setLeitorDeTelaAtivo);
    const assinaturaMovimento = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduzirAnimacoesSistema);

    return () => {
      ativo = false;
      assinaturaLeitor.remove();
      assinaturaMovimento.remove();
    };
  }, []);

  const definirPreferencia = useCallback(
    <K extends keyof PreferenciasAcessibilidade>(chave: K, valor: PreferenciasAcessibilidade[K]) => {
      setPreferencias((atuais) => {
        const novas = { ...atuais, [chave]: valor };
        void salvarPreferencias(novas);
        return novas;
      });
    },
    [],
  );

  const alternarPreferencia = useCallback((chave: ChavePreferenciaBooleana) => {
    setPreferencias((atuais) => {
      const novas = { ...atuais, [chave]: !atuais[chave] };
      void salvarPreferencias(novas);
      return novas;
    });
  }, []);

  const restaurarPreferencias = useCallback(() => {
    setPreferencias(PREFERENCIAS_ACESSIBILIDADE_PADRAO);
    void salvarPreferencias(PREFERENCIAS_ACESSIBILIDADE_PADRAO);
  }, []);

  const valorContexto = useMemo<AcessibilidadeContextValue>(
    () => ({
      preferencias,
      carregando,
      definirPreferencia,
      alternarPreferencia,
      restaurarPreferencias,
      sistema: { leitorDeTelaAtivo, reduzirAnimacoesSistema },
      // Basta um dos dois sinais para reduzir animações: quem já pediu isso ao Android não precisa
      // repetir o pedido no app, e o app nunca força animação contra o ajuste do sistema.
      reduzirAnimacoesEfetivo: preferencias.reduceMotion || reduzirAnimacoesSistema,
    }),
    [preferencias, carregando, definirPreferencia, alternarPreferencia, restaurarPreferencias, leitorDeTelaAtivo, reduzirAnimacoesSistema],
  );

  if (carregando) return null;

  return <AcessibilidadeContext.Provider value={valorContexto}>{children}</AcessibilidadeContext.Provider>;
}
