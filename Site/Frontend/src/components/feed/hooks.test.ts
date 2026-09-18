import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/**
 * O evento `feed:postagem` traz só o `id` e um marcador, nunca a postagem (ver
 * `PostagemService.test.js` no backend). Este hook não pode gravar no cache do React Query o que
 * chega pelo broadcast: só sinaliza e deixa a API REST, que aplica a autorização, repovoar o cache.
 * Uma regressão como `setQueryData(key, dados.postagem)` faz o primeiro teste abaixo falhar.
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
        const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
        const setQueriesDataSpy = vi.spyOn(queryClient, "setQueriesData");
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        renderHook(() => useFeedTempoReal(), { wrapper: criarWrapper(queryClient) });

        // Mesmo payload que o backend emite: só id e marcador, sem `postagem`.
        dispararEvento("feed:postagem", { id: "postagem-123", atualizada: true });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["postagens"] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["postagem", "postagem-123"] });
        expect(setQueryDataSpy).not.toHaveBeenCalled();
        expect(setQueriesDataSpy).not.toHaveBeenCalled();
    });

    it("nova postagem: só marca o feed como desatualizado, sem interromper quem já está lendo", () => {
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
        renderHook(() => useFeedTempoReal(), { wrapper: criarWrapper(queryClient) });

        dispararEvento("feed:postagem", { id: "postagem-999", criada: true });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["postagens"], refetchType: "none" });
    });

    it("postagem removida: limpa o cache só pelo id recebido", () => {
        const removeSpy = vi.spyOn(queryClient, "removeQueries");
        renderHook(() => useFeedTempoReal(), { wrapper: criarWrapper(queryClient) });

        dispararEvento("feed:postagem", { id: "postagem-1", removida: true });

        expect(removeSpy).toHaveBeenCalledWith({ queryKey: ["postagem", "postagem-1"] });
    });
});
