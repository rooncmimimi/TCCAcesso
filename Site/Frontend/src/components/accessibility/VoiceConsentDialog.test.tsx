import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
// `vitest.setup.ts` já registra os matchers em tempo de execução, mas fica
// fora de `tsconfig.json`'s `include` (só cobre `src`) — sem este import
// aqui, `tsc --noEmit` não enxerga os tipos de `toBeInTheDocument` etc.
import "@testing-library/jest-dom/vitest";

import { VoiceConsentDialog } from "./VoiceConsentDialog";

/**
 * Etapa 5: corrige `VoiceConsentDialog` para decidir se pergunta de novo
 * usando `prefs.voiceConsent` (durável, sincronizado com a conta) em vez de
 * `SpeechContext.choice` (cache local, só de visitante). Sem essa correção,
 * um login numa conta que já respondeu, num dispositivo com localStorage
 * vazio (`choice === null`), perguntaria de novo — o primeiro teste abaixo
 * é o que comprova a correção.
 */

const useAccessibilityMock = vi.fn();
const useSpeechMock = vi.fn();
const useSessionMock = vi.fn();
// `vi.mock` é hoisted para o topo do arquivo — um mock cujo factory
// referencia a mock function diretamente (não por trás de uma arrow lazy
// como as de cima) precisa que ela também seja declarada via `vi.hoisted`,
// senão o factory roda antes do `const salvarMock = vi.fn()` existir.
const { salvarMock } = vi.hoisted(() => ({ salvarMock: vi.fn() }));

vi.mock("@/contexts/AccessibilityContext", () => ({
    useAccessibility: () => useAccessibilityMock(),
}));

vi.mock("@/contexts/SpeechContext", () => ({
    useSpeech: () => useSpeechMock(),
}));

// Etapa 6: `decidir()` agora também persiste a escolha na conta (ver
// VoiceConsentDialog.tsx) — sem este mock, `useSession` lança fora de um
// `SessionProvider` real.
vi.mock("@/contexts/SessionContext", () => ({
    useSession: () => useSessionMock(),
}));

vi.mock("@/services/acessibilidade.service", async () => {
    const real = await vi.importActual<typeof import("@/services/acessibilidade.service")>(
        "@/services/acessibilidade.service",
    );
    return { ...real, default: { ...real.default, salvar: salvarMock }, salvar: salvarMock };
});

function acessibilidadeFake(voiceConsent: boolean | null) {
    // Campos mínimos que `prefsParaApi` (chamado por `decidir` quando
    // logado — Etapa 6) precisa poder ler sem lançar; os testes aqui não
    // verificam esses valores específicos, só que a chamada acontece.
    return {
        hydrated: true,
        prefs: {
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

function speechFake(overrides: Partial<ReturnType<typeof speechFakeBase>> = {}) {
    return { ...speechFakeBase(), ...overrides };
}
function speechFakeBase() {
    return { supported: true, choice: null as "accepted" | "declined" | null, speak: vi.fn(), stop: vi.fn(), setChoice: vi.fn() };
}

beforeEach(() => {
    vi.clearAllMocks();
    salvarMock.mockResolvedValue({});
    useSessionMock.mockReturnValue({ autenticado: false });
});

// `vitest.config.ts` não usa `globals: true` — sem isto, o cleanup
// automático do Testing Library entre testes não é registrado sozinho, e
// diálogos de um teste anterior (o "Sim, ativar leitura" dele) ficam no DOM
// quando o teste seguinte consulta `screen.getByRole`, respondendo pela
// instância errada (mock errado) em vez da do teste atual.
afterEach(() => {
    cleanup();
});

describe("VoiceConsentDialog — fonte da verdade é prefs.voiceConsent (Etapa 5)", () => {
    it("não pergunta quando a conta já respondeu (voiceConsent !== null), mesmo com choice vazio", () => {
        useAccessibilityMock.mockReturnValue(acessibilidadeFake(true));
        const speech = speechFake({ choice: null });
        useSpeechMock.mockReturnValue(speech);

        render(<VoiceConsentDialog />);

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(speech.speak).not.toHaveBeenCalled();
    });

    it("pergunta quando ainda não respondeu (voiceConsent === null)", async () => {
        useAccessibilityMock.mockReturnValue(acessibilidadeFake(null));
        const speech = speechFake();
        useSpeechMock.mockReturnValue(speech);

        render(<VoiceConsentDialog />);

        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });
        expect(speech.speak).toHaveBeenCalled();
    });

    it("aceitar chama setChoice('accepted')", async () => {
        useAccessibilityMock.mockReturnValue(acessibilidadeFake(null));
        const speech = speechFake();
        useSpeechMock.mockReturnValue(speech);

        render(<VoiceConsentDialog />);
        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });

        fireEvent.click(screen.getByRole("button", { name: /sim, ativar leitura/i }));
        expect(speech.setChoice).toHaveBeenCalledWith("accepted");
    });

    it("recusar chama setChoice('declined')", async () => {
        useAccessibilityMock.mockReturnValue(acessibilidadeFake(null));
        const speech = speechFake();
        useSpeechMock.mockReturnValue(speech);

        render(<VoiceConsentDialog />);
        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });

        fireEvent.click(screen.getByRole("button", { name: /não, obrigado/i }));
        expect(speech.setChoice).toHaveBeenCalledWith("declined");
    });

    // Etapa 6: sem isto, a escolha ficava só em localStorage — `consentimentoVoz`
    // nunca chegava ao backend, e a pessoa era perguntada de novo em outro
    // dispositivo/navegador (o problema que este diálogo deveria evitar).
    it("logado: também persiste a escolha na conta via acessibilidadeService.salvar", async () => {
        useAccessibilityMock.mockReturnValue(acessibilidadeFake(null));
        useSpeechMock.mockReturnValue(speechFake());
        useSessionMock.mockReturnValue({ autenticado: true });

        render(<VoiceConsentDialog />);
        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });

        fireEvent.click(screen.getByRole("button", { name: /sim, ativar leitura/i }));
        await waitFor(() => expect(salvarMock).toHaveBeenCalledTimes(1));
        expect(salvarMock.mock.calls[0][0]).toMatchObject({ consentimentoVoz: true, leituraPorVoz: true });
    });

    it("visitante (não autenticado): não chama acessibilidadeService.salvar", async () => {
        useAccessibilityMock.mockReturnValue(acessibilidadeFake(null));
        useSpeechMock.mockReturnValue(speechFake());
        useSessionMock.mockReturnValue({ autenticado: false });

        render(<VoiceConsentDialog />);
        await waitFor(() => expect(screen.getByRole("alertdialog")).toBeInTheDocument(), { timeout: 2000 });

        fireEvent.click(screen.getByRole("button", { name: /sim, ativar leitura/i }));
        expect(salvarMock).not.toHaveBeenCalled();
    });
});
