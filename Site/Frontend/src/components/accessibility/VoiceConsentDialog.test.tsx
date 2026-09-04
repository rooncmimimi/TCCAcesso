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

vi.mock("@/contexts/AccessibilityContext", () => ({
    useAccessibility: () => useAccessibilityMock(),
}));

vi.mock("@/contexts/SpeechContext", () => ({
    useSpeech: () => useSpeechMock(),
}));

function acessibilidadeFake(voiceConsent: boolean | null) {
    return { hydrated: true, prefs: { voiceConsent } };
}

function speechFake(overrides: Partial<ReturnType<typeof speechFakeBase>> = {}) {
    return { ...speechFakeBase(), ...overrides };
}
function speechFakeBase() {
    return { supported: true, choice: null as "accepted" | "declined" | null, speak: vi.fn(), stop: vi.fn(), setChoice: vi.fn() };
}

beforeEach(() => {
    vi.clearAllMocks();
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
});
