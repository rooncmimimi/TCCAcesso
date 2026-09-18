import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
// `vitest.setup.ts` já registra os matchers em tempo de execução, mas fica fora do `include` do
// `tsconfig.json` (que só cobre `src`); sem este import, `tsc --noEmit` não enxerga os tipos de
// `toBeInTheDocument` e afins.
import "@testing-library/jest-dom/vitest";

import { ConsentimentoVozDialog } from "./ConsentimentoVozDialog";

/**
 * O `ConsentimentoVozDialog` decide se pergunta de novo por `preferencias.voiceConsent` (salvo na
 * conta), e não por `escolha` (cópia local de visitante). Assim, entrar numa conta que já
 * respondeu, num navegador com localStorage vazio, não pergunta de novo; o primeiro teste abaixo
 * cobre isso.
 */

const useAcessibilidadeMock = vi.fn();
const useVozMock = vi.fn();
const useSessaoMock = vi.fn();
// `vi.mock` é hoisted para o topo do arquivo: um mock cujo factory
// referencia a mock function diretamente (não por trás de uma arrow lazy
// como as de cima) precisa que ela também seja declarada via `vi.hoisted`,
// senão o factory roda antes do `const salvarMock = vi.fn()` existir.
const { salvarMock } = vi.hoisted(() => ({ salvarMock: vi.fn() }));

vi.mock("@/hooks/useAcessibilidade", () => ({
    useAcessibilidade: () => useAcessibilidadeMock(),
}));

vi.mock("@/hooks/useVoz", () => ({
    useVoz: () => useVozMock(),
}));

// `decidir()` também salva a escolha na conta (ver `ConsentimentoVozDialog.tsx`); sem este mock,
// `useSessao` lançaria fora de um `SessaoProvider` real.
vi.mock("@/hooks/useSessao", () => ({
    useSessao: () => useSessaoMock(),
}));

vi.mock("@/services/acessibilidade.service", async () => {
    const real = await vi.importActual<typeof import("@/services/acessibilidade.service")>(
        "@/services/acessibilidade.service",
    );
    return { ...real, default: { ...real.default, salvar: salvarMock }, salvar: salvarMock };
});

function acessibilidadeFake(voiceConsent: boolean | null) {
    // Campos mínimos que `preferenciasParaApi`, chamada por `decidir` com sessão, lê sem lançar; os
    // testes não conferem esses valores, só que a chamada acontece.
    return {
        inicializado: true,
        preferencias: {
            voiceConsent,
            darkMode: false,
            highContrast: false,
            dyslexiaFont: false,
            fontScale: 1,
            letterSpacing: 0,
            lineHeight: 1.6,
            reduceMotion: false,
            screenReader: false,
            speechRate: 1,
            vlibras: true,
            focusHighlight: true,
        },
    };
}

function vozFake(overrides: Partial<ReturnType<typeof vozFakeBase>> = {}) {
    return { ...vozFakeBase(), ...overrides };
}
function vozFakeBase() {
    return { suportado: true, escolha: null as "accepted" | "declined" | null, falar: vi.fn(), parar: vi.fn(), definirEscolha: vi.fn() };
}

beforeEach(() => {
    vi.clearAllMocks();
    salvarMock.mockResolvedValue({});
    useSessaoMock.mockReturnValue({ autenticado: false });
});

// `vitest.config.ts` não usa `globals: true`; sem isto, o cleanup
// automático do Testing Library entre testes não é registrado sozinho, e
// diálogos de um teste anterior (o "Sim, ativar leitura" dele) ficam no DOM
// quando o teste seguinte consulta `screen.getByRole`, respondendo pela
// instância errada (mock errado) em vez da do teste atual.
afterEach(() => {
    cleanup();
});

describe("ConsentimentoVozDialog — fonte da verdade é preferencias.voiceConsent", () => {
    it("não pergunta quando a conta já respondeu (voiceConsent !== null), mesmo com a escolha local vazia", () => {
        useAcessibilidadeMock.mockReturnValue(acessibilidadeFake(true));
        const voz = vozFake({ escolha: null });
        useVozMock.mockReturnValue(voz);

        render(<ConsentimentoVozDialog />);

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(voz.falar).not.toHaveBeenCalled();
    });

    it("pergunta quando ainda não respondeu (voiceConsent === null)", async () => {
        useAcessibilidadeMock.mockReturnValue(acessibilidadeFake(null));
        const voz = vozFake();
        useVozMock.mockReturnValue(voz);

        render(<ConsentimentoVozDialog />);

        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });
        expect(voz.falar).toHaveBeenCalled();
    });

    it("aceitar chama definirEscolha('accepted')", async () => {
        useAcessibilidadeMock.mockReturnValue(acessibilidadeFake(null));
        const voz = vozFake();
        useVozMock.mockReturnValue(voz);

        render(<ConsentimentoVozDialog />);
        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });

        fireEvent.click(screen.getByRole("button", { name: /sim, ativar leitura/i }));
        expect(voz.definirEscolha).toHaveBeenCalledWith("accepted");
    });

    it("recusar chama definirEscolha('declined')", async () => {
        useAcessibilidadeMock.mockReturnValue(acessibilidadeFake(null));
        const voz = vozFake();
        useVozMock.mockReturnValue(voz);

        render(<ConsentimentoVozDialog />);
        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });

        fireEvent.click(screen.getByRole("button", { name: /não, obrigado/i }));
        expect(voz.definirEscolha).toHaveBeenCalledWith("declined");
    });

    // Sem isto, `consentimentoVoz` não chegaria ao backend, e a pessoa seria perguntada de novo em
    // outro dispositivo ou navegador.
    it("logado: também persiste a escolha na conta via acessibilidadeService.salvar", async () => {
        useAcessibilidadeMock.mockReturnValue(acessibilidadeFake(null));
        useVozMock.mockReturnValue(vozFake());
        useSessaoMock.mockReturnValue({ autenticado: true });

        render(<ConsentimentoVozDialog />);
        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });

        fireEvent.click(screen.getByRole("button", { name: /sim, ativar leitura/i }));
        await waitFor(() => expect(salvarMock).toHaveBeenCalledTimes(1));
        expect(salvarMock.mock.calls[0][0]).toMatchObject({ consentimentoVoz: true, leituraPorVoz: true });
    });

    it("visitante (não autenticado): não chama acessibilidadeService.salvar", async () => {
        useAcessibilidadeMock.mockReturnValue(acessibilidadeFake(null));
        useVozMock.mockReturnValue(vozFake());
        useSessaoMock.mockReturnValue({ autenticado: false });

        render(<ConsentimentoVozDialog />);
        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });

        fireEvent.click(screen.getByRole("button", { name: /sim, ativar leitura/i }));
        expect(salvarMock).not.toHaveBeenCalled();
    });
});
