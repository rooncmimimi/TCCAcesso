import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { AccessibilityProvider, useAccessibility } from "@/contexts/AccessibilityContext";
import { SessionProvider, useSession } from "@/contexts/SessionContext";
import authService from "@/services/auth.service";
import acessibilidadeService from "@/services/acessibilidade.service";
import type { RespostaLogin, Usuario } from "@/types";

/**
 * Etapa 5: login e cadastro passam a sincronizar as preferências de
 * acessibilidade com a conta (puxa no login, empurra no cadastro) — mas
 * essa sincronização é estritamente best-effort. `acessibilidadeService` é
 * espionado com `vi.spyOn` (não `vi.mock` do módulo inteiro) de propósito:
 * assim `prefsDaApi`/`prefsParaApi`, usados de verdade dentro do
 * `SessionContext`, continuam sendo os reais — só as chamadas de rede
 * (`obter`/`salvar`) são substituídas.
 */

vi.mock("@/services/auth.service", () => ({
    default: {
        login: vi.fn(),
        registrarCandidato: vi.fn(),
        registrarEmpresa: vi.fn(),
        logout: vi.fn(),
        perfilAtual: vi.fn(),
    },
}));

vi.mock("@/services/socket", () => ({
    conectarSocket: vi.fn(),
    desconectarSocket: vi.fn(),
}));

function usuarioFake(id = "user-1"): Usuario {
    return { id, nome: "Ana", email: "ana@teste.dev", tipo: "candidato", tipoUsuario: "candidato", ativo: true };
}

function respostaLoginFake(): RespostaLogin {
    return { usuario: usuarioFake(), token: "token-fake", refreshToken: "refresh-fake" };
}

function wrapper({ children }: { children: ReactNode }) {
    return (
        <AccessibilityProvider>
            <SessionProvider>{children}</SessionProvider>
        </AccessibilityProvider>
    );
}

function renderSessaoEAcessibilidade() {
    return renderHook(() => ({ sessao: useSession(), acessibilidade: useAccessibility() }), { wrapper });
}

beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("SessionContext — sincronização de acessibilidade no login (Etapa 5)", () => {
    it("puxa as preferências da conta e sobrescreve o que estava só local", async () => {
        vi.mocked(authService.login).mockResolvedValue(respostaLoginFake());
        vi.spyOn(acessibilidadeService, "obter").mockResolvedValue({ altoContraste: true, escalaFonte: 120 });

        const { result } = renderSessaoEAcessibilidade();

        await act(async () => {
            await result.current.sessao.login({ email: "ana@teste.dev", senha: "Senha@123" });
        });

        await waitFor(() => {
            expect(result.current.acessibilidade.prefs.highContrast).toBe(true);
            expect(result.current.acessibilidade.prefs.fontScale).toBeCloseTo(1.2);
        });
    });

    it("falha ao sincronizar não impede nem invalida o login em si", async () => {
        vi.mocked(authService.login).mockResolvedValue(respostaLoginFake());
        vi.spyOn(acessibilidadeService, "obter").mockRejectedValue(new Error("rede fora do ar"));

        const { result } = renderSessaoEAcessibilidade();

        const usuarioRetornado = await act(async () =>
            result.current.sessao.login({ email: "ana@teste.dev", senha: "Senha@123" }),
        );

        expect((usuarioRetornado as Usuario).id).toBe("user-1");
        expect(result.current.sessao.user?.id).toBe("user-1");
        await waitFor(() => expect(console.error).toHaveBeenCalled());
    });
});

describe("SessionContext — sincronização de acessibilidade no cadastro (Etapa 5)", () => {
    it("empurra as preferências locais (escolhidas como visitante) para a conta recém-criada", async () => {
        vi.mocked(authService.registrarCandidato).mockResolvedValue(respostaLoginFake());
        const salvarSpy = vi.spyOn(acessibilidadeService, "salvar").mockResolvedValue({});

        const { result } = renderSessaoEAcessibilidade();

        // Dois `act()` separados de propósito: `save()` (sem argumento) lê
        // `draftRef.current`, que só é atualizado durante o RENDER seguinte
        // ao `set()` (`AccessibilityContext.tsx`) — combinar os dois no
        // mesmo `act()` chamaria `save()` antes desse re-render acontecer,
        // salvando o rascunho antigo.
        act(() => {
            result.current.acessibilidade.set("darkMode", true);
        });
        act(() => {
            result.current.acessibilidade.save();
        });

        await act(async () => {
            await result.current.sessao.registrarCandidato({ nome: "Ana" });
        });

        await waitFor(() => expect(salvarSpy).toHaveBeenCalledTimes(1));
        expect(salvarSpy.mock.calls[0][0]).toMatchObject({ tema: "escuro" });
    });

    it("falha ao sincronizar não impede nem invalida o cadastro em si", async () => {
        vi.mocked(authService.registrarEmpresa).mockResolvedValue(respostaLoginFake());
        vi.spyOn(acessibilidadeService, "salvar").mockRejectedValue(new Error("backend indisponível"));

        const { result } = renderSessaoEAcessibilidade();

        const usuarioRetornado = await act(async () => result.current.sessao.registrarEmpresa({ nome: "Ana" }));

        expect((usuarioRetornado as Usuario).id).toBe("user-1");
        expect(result.current.sessao.user?.id).toBe("user-1");
        await waitFor(() => expect(console.error).toHaveBeenCalled());
    });
});
