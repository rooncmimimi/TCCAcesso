import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useFonts } from "expo-font";
import { useColorScheme } from "react-native";

import { useAcessibilidade } from "../acessibilidade";
import { montarTemaAcessivel } from "./temaAcessivel";
import { ARQUIVOS_FONTE_MARCA } from "./fonteMarca";
import { ARQUIVOS_FONTE_DISLEXIA } from "./fonteDislexia";
import type { Tema, ModoTema } from "./temas";

/**
 * Tema do app a partir das preferências do `AcessibilidadeProvider` (modo, alto contraste, escalas
 * de texto e fonte). No modo `"system"`, segue o esquema de cores do aparelho via `useColorScheme`.
 * Precisa estar dentro do `AcessibilidadeProvider` (ver a ordem em `App.tsx`).
 */
type TemaContextValue = {
  tema: Tema;
  modo: ModoTema;
};

const TemaContext = createContext<TemaContextValue | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const esquemaDoSistema = useColorScheme();
  const { preferencias, reduzirAnimacoesEfetivo } = useAcessibilidade();
  // Uma única chamada a `useFonts` para a Lexend (fonte para dislexia) e as fontes da marca
  // (Manrope e Plus Jakarta Sans), porque a regra dos hooks exige sempre as mesmas chamadas. Os
  // arquivos são locais: carregar tudo sempre não custa rede, só cerca de 900 KB no pacote.
  // Enquanto `fontesCarregadas` é `false`, `montarTemaAcessivel` ignora as duas fontes com
  // segurança.
  const [fontesCarregadas] = useFonts({ ...ARQUIVOS_FONTE_DISLEXIA, ...ARQUIVOS_FONTE_MARCA });

  const modo: ModoTema =
    preferencias.themeMode === "system" ? (esquemaDoSistema === "dark" ? "dark" : "light") : preferencias.themeMode;

  const valorContexto = useMemo<TemaContextValue>(
    () => ({
      tema: montarTemaAcessivel(modo, preferencias, reduzirAnimacoesEfetivo, fontesCarregadas, fontesCarregadas),
      modo,
    }),
    [modo, preferencias, reduzirAnimacoesEfetivo, fontesCarregadas],
  );

  return <TemaContext.Provider value={valorContexto}>{children}</TemaContext.Provider>;
}

export function useTema(): TemaContextValue {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error("useTema precisa estar dentro de TemaProvider");
  return ctx;
}
