import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/**
 * Protege o lado frontend da correção de segurança da Etapa 1: depois que o
 * backend parou de incluir o objeto completo da postagem no evento
 * `feed:postagem` (ver `PostagemService.test.js`), este hook não pode mais
 * gravar conteúdo arbitrário recebido do broadcast diretamente no cache do
 * React Query — só pode sinalizar e deixar o REST (que aplica autorização)
 * repovoar o cache. Uma regressão como `setQueryData(key, dados.postagem)`
 * faz o primeiro teste abaixo falhar.
 */

const { handlers } = vi.hoisted(() => ({
    handlers: new Map<string, (dados: unknown) => void>(),
}));

vi.mock("@/services/socket", () => ({
    ouvirEvento: vi.fn((evento: string, handler: (dados: unknown) => void) => {
        handlers.set(evento, handler);
        return () => handlers.delete(evento);
    }),
}));

const { useFeedTempoReal } = await import("./hooks");

function dispararEvento(evento: string, dados: unknown) {
    const handler = handlers.get(evento);
    if (!handler) throw new Error(`nenhum handler registrado para "${evento}"`);
    handler(dados);
}

function criarWrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
}

describe("useFeedTempoReal", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        handlers.clear();
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    });

    it("postagem atualizada: invalida as queries certas e nunca escreve conteúdo do broadcast no cache", () => {
        // Arrange
        const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
        const setQueriesDataSpy = vi.spyOn(queryClient, "setQueriesData");
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        renderHook(() => useFeedTempoReal(), { wrapper: criarWrapper(queryClient) });

        // Act — mesmo payload que o backend corrigido emite: só id + flag, sem `postagem`
        dispararEvento("feed:postagem", { id: "postagem-123", atualizada: true });

        // Assert
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["postagens"] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["postagem", "postagem-123"] });
        expect(setQueryDataSpy).not.toHaveBeenCalled();
        expect(setQueriesDataSpy).not.toHaveBeenCalled();
    });

    it("nova postagem: só marca o feed como desatualizado, sem interromper quem já está lendo", () => {
        // Arrange
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        renderHook(() => useFeedTempoReal(), { wrapper: criarWrapper(queryClient) });

        // Act
        dispararEvento("feed:postagem", { id: "postagem-999", criada: true });

        // Assert
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["postagens"], refetchType: "none" });
    });

    it("postagem removida: limpa o cache só pelo id recebido", () => {
        // Arrange
        const removeSpy = vi.spyOn(queryClient, "removeQueries");
        renderHook(() => useFeedTempoReal(), { wrapper: criarWrapper(queryClient) });

        // Act
        dispararEvento("feed:postagem", { id: "postagem-1", removida: true });

        // Assert
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: ["postagem", "postagem-1"] });
    });
});
