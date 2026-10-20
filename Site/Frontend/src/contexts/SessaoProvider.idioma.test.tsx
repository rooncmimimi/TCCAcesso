import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { AcessibilidadeProvider } from "@/contexts/AcessibilidadeProvider";
import { SessaoProvider } from "@/contexts/SessaoProvider";
import { useSessao } from "@/hooks/useSessao";
import autenticacaoService from "@/services/autenticacao.service";
import { CHAVE_ACCESS_TOKEN } from "@/services/api";
import { definirIdioma, obterIdioma } from "@/i18n";
import type { Usuario } from "@/types";

/**
 * O idioma da conta e o da interface andam juntos: entrar ou recarregar a página adota o idioma
 * salvo na conta (sem devolvê-lo ao servidor), e escolher outro idioma logado grava na conta.
 */

vi.mock("@/services/autenticacao.service", () => ({
    default: {
        entrar: vi.fn(),
        registrarCandidato: vi.fn(),
        registrarEmpresa: vi.fn(),
        sair: vi.fn(),
        perfilAtual: vi.fn(),
        alterarIdioma: vi.fn(),
    },
}));

vi.mock("@/services/socket", () => ({
    conectarSocket: vi.fn(),
    desconectarSocket: vi.fn(),
}));

vi.mock("@/services/acessibilidade.service", async (importarOriginal) => ({
    ...(await importarOriginal<typeof import("@/services/acessibilidade.service")>()),
    default: { obter: vi.fn(async () => ({})), salvar: vi.fn(async () => ({})) },
}));

function usuarioFake(idioma?: Usuario["idioma"]): Usuario {
    return { id: "user-1", nome: "Ana", email: "ana@teste.dev", tipo: "candidato", tipoUsuario: "candidato", ativo: true, idioma };
}

function wrapper({ children }: { children: ReactNode }) {
    return (
        <AcessibilidadeProvider>
            <SessaoProvider>{children}</SessaoProvider>
        </AcessibilidadeProvider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    definirIdioma("pt", "conta");
    vi.mocked(autenticacaoService.alterarIdioma).mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    // Sem `globals`, o Testing Library não desmonta sozinho: um provider esquecido de outro teste
    // continuaria assinando as trocas de idioma e gravando na conta.
    cleanup();
    definirIdioma("pt", "conta");
    vi.restoreAllMocks();
});

describe("SessaoProvider — idioma da conta", () => {
    it("ao entrar, adota o idioma salvo na conta e não o devolve ao servidor", async () => {
        vi.mocked(autenticacaoService.entrar).mockResolvedValue({
            usuario: usuarioFake("en"),
            token: "t",
            refreshToken: "r",
        });
        window.localStorage.setItem(CHAVE_ACCESS_TOKEN, "t");

        const { result } = renderHook(() => useSessao(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        await act(async () => {
            await result.current.entrar({ email: "ana@teste.dev", senha: "Senha@123" });
        });

        expect(obterIdioma()).toBe("en");
        expect(autenticacaoService.alterarIdioma).not.toHaveBeenCalled();
    });

    it("ao recarregar a página com sessão salva, adota o idioma da conta", async () => {
        window.localStorage.setItem(CHAVE_ACCESS_TOKEN, "t");
        vi.mocked(autenticacaoService.perfilAtual).mockResolvedValue(usuarioFake("es"));

        const { result } = renderHook(() => useSessao(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        expect(obterIdioma()).toBe("es");
        expect(window.localStorage.getItem("acesso:idioma")).toBe("es");
        expect(autenticacaoService.alterarIdioma).not.toHaveBeenCalled();
    });

    it("conta antiga sem idioma não muda o que a pessoa já escolheu no navegador", async () => {
        definirIdioma("en", "conta");
        window.localStorage.setItem(CHAVE_ACCESS_TOKEN, "t");
        vi.mocked(autenticacaoService.perfilAtual).mockResolvedValue(usuarioFake(undefined));

        const { result } = renderHook(() => useSessao(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        expect(obterIdioma()).toBe("en");
    });

    it("escolher outro idioma logado grava na conta", async () => {
        window.localStorage.setItem(CHAVE_ACCESS_TOKEN, "t");
        vi.mocked(autenticacaoService.perfilAtual).mockResolvedValue(usuarioFake("pt"));

        const { result } = renderHook(() => useSessao(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        act(() => definirIdioma("es"));

        await waitFor(() => expect(autenticacaoService.alterarIdioma).toHaveBeenCalledWith("es"));
        expect(autenticacaoService.alterarIdioma).toHaveBeenCalledTimes(1);
    });

    it("sem sessão, escolher o idioma só vale no navegador", async () => {
        const { result } = renderHook(() => useSessao(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        act(() => definirIdioma("en"));

        expect(obterIdioma()).toBe("en");
        expect(autenticacaoService.alterarIdioma).not.toHaveBeenCalled();
    });

    it("falha ao gravar na conta não atrapalha a troca na tela", async () => {
        window.localStorage.setItem(CHAVE_ACCESS_TOKEN, "t");
        vi.mocked(autenticacaoService.perfilAtual).mockResolvedValue(usuarioFake("pt"));
        vi.mocked(autenticacaoService.alterarIdioma).mockRejectedValue(new Error("rede"));

        const { result } = renderHook(() => useSessao(), { wrapper });
        await waitFor(() => expect(result.current.inicializado).toBe(true));

        act(() => definirIdioma("en"));

        await waitFor(() => expect(autenticacaoService.alterarIdioma).toHaveBeenCalled());
        expect(obterIdioma()).toBe("en");
    });
});
