import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { AccessibilityProvider, useAccessibility, DEFAULT_PREFS } from "./AccessibilityContext";

/**
 * Cobertura básica que ainda não existia para o comportamento de visitante
 * (sem login): preferências padrão, pré-visualização em `draft` sem
 * persistir, `save` gravando em localStorage, um provider novo (equivalente
 * a recarregar a página) restaurando o que foi salvo, e `reset` limpando
 * tudo. Não usa nenhuma conta/backend — é exatamente o caminho que um
 * visitante anônimo percorre.
 */

const STORAGE_KEY = "acesso:a11y-prefs";

function wrapper({ children }: { children: ReactNode }) {
    return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

beforeEach(() => {
    window.localStorage.clear();
});

describe("AccessibilityContext — visitante (sem login)", () => {
    it("hidrata com as preferências padrão quando não há nada salvo", async () => {
        const { result } = renderHook(() => useAccessibility(), { wrapper });
        await waitFor(() => expect(result.current.hydrated).toBe(true));
        expect(result.current.prefs).toEqual(DEFAULT_PREFS);
    });

    it("set atualiza só o rascunho (pré-visualização em tempo real) sem persistir ainda", async () => {
        const { result } = renderHook(() => useAccessibility(), { wrapper });
        await waitFor(() => expect(result.current.hydrated).toBe(true));

        act(() => result.current.set("highContrast", true));

        expect(result.current.draft.highContrast).toBe(true);
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("save persiste o rascunho em localStorage — funciona sem nenhuma conta", async () => {
        const { result } = renderHook(() => useAccessibility(), { wrapper });
        await waitFor(() => expect(result.current.hydrated).toBe(true));

        act(() => result.current.set("darkMode", true));
        act(() => result.current.save());

        expect(result.current.prefs.darkMode).toBe(true);
        const salvo = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as { darkMode?: boolean };
        expect(salvo.darkMode).toBe(true);
    });

    it("um provider novo (equivalente a recarregar a página) restaura o que foi salvo", async () => {
        const primeiro = renderHook(() => useAccessibility(), { wrapper });
        await waitFor(() => expect(primeiro.result.current.hydrated).toBe(true));
        act(() => primeiro.result.current.set("fontScale", 1.4));
        act(() => primeiro.result.current.save());

        const segundo = renderHook(() => useAccessibility(), { wrapper });
        await waitFor(() => expect(segundo.result.current.hydrated).toBe(true));
        expect(segundo.result.current.prefs.fontScale).toBe(1.4);
    });

    it("reset volta ao padrão e limpa o localStorage", async () => {
        const { result } = renderHook(() => useAccessibility(), { wrapper });
        await waitFor(() => expect(result.current.hydrated).toBe(true));

        act(() => result.current.set("highContrast", true));
        act(() => result.current.save());
        act(() => result.current.reset());

        expect(result.current.prefs).toEqual(DEFAULT_PREFS);
        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});
