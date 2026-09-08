import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AccessibilityInfo } from "react-native";

import { AccessibilityContext } from "./AccessibilityContext";
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from "./accessibilityDefaults";
import { getStoredPreferences, savePreferences } from "./accessibilityStorage";
import type {
  AccessibilityContextValue,
  AccessibilityPreferences,
  BooleanPreferenceKey,
} from "./accessibilityTypes";

/**
 * Fonte única de verdade das preferências de acessibilidade — nenhum outro
 * lugar do app guarda o seu próprio estado para a mesma coisa. O
 * `ThemeProvider` (Fase 5) lê daqui para decidir tema/alto contraste/escala
 * de fonte; nenhuma tela deve manter uma cópia paralela.
 *
 * De propósito, NÃO depende do `AuthProvider` nem de nenhuma sessão — as
 * preferências existem e funcionam antes do login (item 8 da Fase 5), lidas
 * direto do `AsyncStorage` assim que o app abre.
 */
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULT_ACCESSIBILITY_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  // Carrega a preferência salva uma única vez, ao montar. Enquanto isso não
  // termina, o Provider não renderiza os filhos (ver `if (isLoading)`
  // abaixo) — evita o flash de "tema padrão -> tema salvo" descrito no item
  // 37 da Fase 5. Uma leitura do AsyncStorage é rápida o bastante (poucos
  // milissegundos) para isso não custar uma tela de carregamento própria.
  useEffect(() => {
    let ativo = true;

    getStoredPreferences().then((salvas) => {
      if (!ativo) return;
      if (salvas) setPreferences({ ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...salvas });
      setIsLoading(false);
    });

    return () => {
      ativo = false;
    };
  }, []);

  // Estado do SISTEMA (não do app) — detectado, nunca definido por nós.
  // `AccessibilityInfo` é a única fonte real disponível no React Native
  // para isso (item 32 da Fase 5); ela não diz QUAL leitor de tela está
  // ativo, só que algum está — não há como distinguir "é o TalkBack"
  // de outro serviço de acessibilidade instalado, e isto é documentado
  // como uma limitação da própria plataforma, não presumido.
  useEffect(() => {
    let ativo = true;

    AccessibilityInfo.isScreenReaderEnabled().then((valor) => {
      if (ativo) setScreenReaderEnabled(valor);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
      if (ativo) setReduceMotionEnabled(valor);
    });

    const assinaturaLeitor = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReaderEnabled);
    const assinaturaMovimento = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotionEnabled);

    return () => {
      ativo = false;
      assinaturaLeitor.remove();
      assinaturaMovimento.remove();
    };
  }, []);

  const setPreference = useCallback(
    <K extends keyof AccessibilityPreferences>(chave: K, valor: AccessibilityPreferences[K]) => {
      setPreferences((atuais) => {
        const novas = { ...atuais, [chave]: valor };
        void savePreferences(novas);
        return novas;
      });
    },
    [],
  );

  const togglePreference = useCallback((chave: BooleanPreferenceKey) => {
    setPreferences((atuais) => {
      const novas = { ...atuais, [chave]: !atuais[chave] };
      void savePreferences(novas);
      return novas;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES);
    void savePreferences(DEFAULT_ACCESSIBILITY_PREFERENCES);
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      preferences,
      isLoading,
      setPreference,
      togglePreference,
      resetPreferences,
      system: { screenReaderEnabled, reduceMotionEnabled },
      // Regra de prioridade (item 18 da Fase 5): a preferência do usuário
      // OU o sinal do sistema — qualquer um dos dois liga a redução de
      // movimento efetiva. Nunca o contrário (o usuário não consegue
      // "forçar" animação se o sistema pediu redução) e nunca exigindo os
      // dois ao mesmo tempo — um usuário que já pediu ao Android para
      // reduzir animações não deveria precisar repetir o pedido dentro de
      // cada app.
      effectiveReduceMotion: preferences.reduceMotion || reduceMotionEnabled,
    }),
    [preferences, isLoading, setPreference, togglePreference, resetPreferences, screenReaderEnabled, reduceMotionEnabled],
  );

  if (isLoading) return null;

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}
