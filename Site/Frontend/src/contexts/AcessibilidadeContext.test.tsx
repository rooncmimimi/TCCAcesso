import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { PREFERENCIAS_PADRAO } from "./AcessibilidadeContext";
import { AcessibilidadeProvider } from "./AcessibilidadeProvider";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";

/**
 * Comportamento de visitante, sem login e sem backend: preferências padrão, pré-visualização com
 * `definir` sem gravar, `salvar` gravando no localStorage, um provider novo (como recarregar a
 * página) restaurando o que foi salvo, e `restaurar` limpando tudo.
 */

const CHAVE_PREFERENCIAS = "acesso:a11y-prefs";

function wrapper({ children }: { children: ReactNode }) {
    return <AcessibilidadeProvider>{children}</AcessibilidadeProvider>;
}

beforeEach(() => {
    window.localStorage.clear();
});

describe("AcessibilidadeContext — visitante (sem login)", () => {
    it("hidrata com as preferências padrão quando não há nada salvo", async () => {
        const { result } = renderHook(() => useAcessibilidade(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));
        expect(result.current.preferencias).toEqual(PREFERENCIAS_PADRAO);
    });

    it("set atualiza só o rascunho (pré-visualização em tempo real) sem persistir ainda", async () => {
        const { result } = renderHook(() => useAcessibilidade(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        act(() => result.current.definir("highContrast", true));

        expect(result.current.rascunho.highContrast).toBe(true);
        expect(window.localStorage.getItem(CHAVE_PREFERENCIAS)).toBeNull();
    });

    it("save persiste o rascunho em localStorage — funciona sem nenhuma conta", async () => {
        const { result } = renderHook(() => useAcessibilidade(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        act(() => result.current.definir("darkMode", true));
        act(() => result.current.salvar());

        expect(result.current.preferencias.darkMode).toBe(true);
        const salvo = JSON.parse(window.localStorage.getItem(CHAVE_PREFERENCIAS) ?? "{}") as { darkMode?: boolean };
        expect(salvo.darkMode).toBe(true);
    });

    it("um provider novo (equivalente a recarregar a página) restaura o que foi salvo", async () => {
        const primeiro = renderHook(() => useAcessibilidade(), { wrapper });
        await waitFor(() => expect(primeiro.result.current.inicializado).toBe(true));
        act(() => primeiro.result.current.definir("fontScale", 1.4));
        act(() => primeiro.result.current.salvar());

        const segundo = renderHook(() => useAcessibilidade(), { wrapper });
        await waitFor(() => expect(segundo.result.current.inicializado).toBe(true));
        expect(segundo.result.current.preferencias.fontScale).toBe(1.4);
    });

    it("reset volta ao padrão e limpa o localStorage", async () => {
        const { result } = renderHook(() => useAcessibilidade(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        act(() => result.current.definir("highContrast", true));
        act(() => result.current.salvar());
        act(() => result.current.restaurar());

        expect(result.current.preferencias).toEqual(PREFERENCIAS_PADRAO);
        expect(window.localStorage.getItem(CHAVE_PREFERENCIAS)).toBeNull();
    });
});
