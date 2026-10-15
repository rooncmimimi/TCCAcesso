import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { AcessibilidadeProvider } from "@/contexts/AcessibilidadeProvider";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { SessaoProvider } from "@/contexts/SessaoProvider";
import { useSessao } from "@/hooks/useSessao";
import autenticacaoService from "@/services/autenticacao.service";
import acessibilidadeService from "@/services/acessibilidade.service";
import { CHAVE_ACCESS_TOKEN, CHAVE_REFRESH_TOKEN } from "@/services/api";
import type { RespostaLogin, Usuario } from "@/types";

/**
 * Login e cadastro sincronizam as preferências de acessibilidade com a conta (buscam no login,
 * enviam no cadastro), sem nunca impedir a autenticação. `acessibilidadeService` é espionado com
 * `vi.spyOn`, e não com `vi.mock` do módulo, para `preferenciasDaApi` e `preferenciasParaApi`
 * continuarem reais; só as chamadas de rede (`obter` e `salvar`) são substituídas.
 */

vi.mock("@/services/autenticacao.service", () => ({
    default: {
        entrar: vi.fn(),
        registrarCandidato: vi.fn(),
        registrarEmpresa: vi.fn(),
        sair: vi.fn(),
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
        <AcessibilidadeProvider>
            <SessaoProvider>{children}</SessaoProvider>
        </AcessibilidadeProvider>
    );
}

function renderSessaoEAcessibilidade() {
    return renderHook(() => ({ sessao: useSessao(), acessibilidade: useAcessibilidade() }), { wrapper });
}

beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("SessaoContext — sincronização de acessibilidade no login", () => {
    it("puxa as preferências da conta e sobrescreve o que estava só local", async () => {
        vi.mocked(autenticacaoService.entrar).mockResolvedValue(respostaLoginFake());
        vi.spyOn(acessibilidadeService, "obter").mockResolvedValue({ altoContraste: true, escalaFonte: 120 });

        const { result } = renderSessaoEAcessibilidade();

        await act(async () => {
            await result.current.sessao.entrar({ email: "ana@teste.dev", senha: "Senha@123" });
        });

        await waitFor(() => {
            expect(result.current.acessibilidade.preferencias.highContrast).toBe(true);
            expect(result.current.acessibilidade.preferencias.fontScale).toBeCloseTo(1.2);
        });
    });

    it("falha ao sincronizar não impede nem invalida o login em si", async () => {
        vi.mocked(autenticacaoService.entrar).mockResolvedValue(respostaLoginFake());
        vi.spyOn(acessibilidadeService, "obter").mockRejectedValue(new Error("rede fora do ar"));

        const { result } = renderSessaoEAcessibilidade();

        const usuarioRetornado = await act(async () =>
            result.current.sessao.entrar({ email: "ana@teste.dev", senha: "Senha@123" }),
        );

        expect((usuarioRetornado as Usuario).id).toBe("user-1");
        expect(result.current.sessao.usuario?.id).toBe("user-1");
        await waitFor(() => expect(console.error).toHaveBeenCalled());
    });
});

describe("SessaoContext — sincronização de acessibilidade no cadastro", () => {
    it("empurra as preferências locais (escolhidas como visitante) para a conta recém-criada", async () => {
        vi.mocked(autenticacaoService.registrarCandidato).mockResolvedValue(respostaLoginFake());
        const salvarSpy = vi.spyOn(acessibilidadeService, "salvar").mockResolvedValue({});

        const { result } = renderSessaoEAcessibilidade();

        // Dois `act()` separados: `salvar()` sem argumento lê `rascunhoRef.current`, que só é
        // atualizado no render seguinte ao `definir()` (`AcessibilidadeProvider.tsx`). No mesmo
        // `act()`, `salvar()` gravaria o rascunho antigo.
        act(() => {
            result.current.acessibilidade.definir("darkMode", true);
        });
        act(() => {
            result.current.acessibilidade.salvar();
        });

        await act(async () => {
            await result.current.sessao.registrarCandidato({ nome: "Ana" });
        });

        await waitFor(() => expect(salvarSpy).toHaveBeenCalledTimes(1));
        expect(salvarSpy.mock.calls[0][0]).toMatchObject({ tema: "escuro" });
    });

    it("falha ao sincronizar não impede nem invalida o cadastro em si", async () => {
        vi.mocked(autenticacaoService.registrarEmpresa).mockResolvedValue(respostaLoginFake());
        vi.spyOn(acessibilidadeService, "salvar").mockRejectedValue(new Error("backend indisponível"));

        const { result } = renderSessaoEAcessibilidade();

        const usuarioRetornado = await act(async () => result.current.sessao.registrarEmpresa({ nome: "Ana" }));

        expect((usuarioRetornado as Usuario).id).toBe("user-1");
        expect(result.current.sessao.usuario?.id).toBe("user-1");
        await waitFor(() => expect(console.error).toHaveBeenCalled());
    });
});

describe("SessaoContext — iniciarSessao (o único depois de autenticar, do login por senha e do Google)", () => {
  /** Como o backend responde: o usuário vem crua, com `tipoUsuario` (nunca `tipo`). */
  function respostaCrua(extra: Record<string, unknown> = {}) {
    return {
      usuario: { id: "u9", nome: "Ana", email: "ana@teste.dev", tipoUsuario: "administrador", ativo: true, ...extra },
      token: "token-de-acesso",
      refreshToken: "token-de-renovacao",
    } as unknown as RespostaLogin;
  }

  it("guarda os dois tokens e deixa o usuário na sessão", async () => {
    vi.spyOn(acessibilidadeService, "obter").mockResolvedValue({});
    const { result } = renderSessaoEAcessibilidade();

    await act(async () => {
      await result.current.sessao.iniciarSessao(respostaCrua());
    });

    expect(window.localStorage.getItem(CHAVE_ACCESS_TOKEN)).toBe("token-de-acesso");
    expect(window.localStorage.getItem(CHAVE_REFRESH_TOKEN)).toBe("token-de-renovacao");
    expect(result.current.sessao.usuario?.id).toBe("u9");
    expect(result.current.sessao.autenticado).toBe(true);
  });

  it("normaliza o usuário: `tipo` sai de `tipoUsuario`, que é o que o servidor manda (achado 5)", async () => {
    vi.spyOn(acessibilidadeService, "obter").mockResolvedValue({});
    const { result } = renderSessaoEAcessibilidade();

    const usuario = await act(async () => result.current.sessao.iniciarSessao(respostaCrua()));

    expect((usuario as { tipo: string }).tipo).toBe("administrador");
    expect(result.current.sessao.usuario?.tipo).toBe("administrador");
  });

  it("aplica as preferências de acessibilidade da conta, como o login por senha (achado 6)", async () => {
    vi.spyOn(acessibilidadeService, "obter").mockResolvedValue({ altoContraste: true, escalaFonte: 120 });
    const { result } = renderSessaoEAcessibilidade();

    await act(async () => {
      await result.current.sessao.iniciarSessao(respostaCrua());
    });

    await waitFor(() => {
      expect(result.current.acessibilidade.preferencias.highContrast).toBe(true);
      expect(result.current.acessibilidade.preferencias.fontScale).toBeCloseTo(1.2);
    });
  });

  it("devolve a conta pausada sem criar sessão nem mexer nos tokens", async () => {
    const obter = vi.spyOn(acessibilidadeService, "obter").mockResolvedValue({});
    const { result } = renderSessaoEAcessibilidade();

    const resposta = await act(async () => result.current.sessao.iniciarSessao({ contaPausada: true }));

    expect(resposta).toEqual({ contaPausada: true });
    expect(result.current.sessao.usuario).toBeNull();
    expect(window.localStorage.getItem(CHAVE_ACCESS_TOKEN)).toBeNull();
    expect(obter).not.toHaveBeenCalled();
  });

  it("devolve o e-mail por confirmar sem criar sessão", async () => {
    const { result } = renderSessaoEAcessibilidade();

    const resposta = await act(async () =>
      result.current.sessao.iniciarSessao({ emailNaoVerificado: true, email: "rh@empresa.com" }),
    );

    expect(resposta).toEqual({ emailNaoVerificado: true, email: "rh@empresa.com" });
    expect(result.current.sessao.autenticado).toBe(false);
  });

  it("o login por senha passa pela mesma rotina", async () => {
    vi.mocked(autenticacaoService.entrar).mockResolvedValue(respostaCrua() );
    vi.spyOn(acessibilidadeService, "obter").mockResolvedValue({});
    const { result } = renderSessaoEAcessibilidade();

    const usuario = await act(async () => result.current.sessao.entrar({ email: "ana@teste.dev", senha: "Senha@123" }));

    expect((usuario as { tipo: string }).tipo).toBe("administrador");
    expect(window.localStorage.getItem(CHAVE_ACCESS_TOKEN)).toBe("token-de-acesso");
  });
});
