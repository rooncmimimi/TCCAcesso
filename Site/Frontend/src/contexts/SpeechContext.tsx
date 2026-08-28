import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccessibility, VOICE_CHOICE_KEY } from "@/contexts/AccessibilityContext";

type VoiceChoice = "accepted" | "declined" | null;

type Ctx = {
  supported: boolean;
  speaking: boolean;
  /** Preferência salva do usuário sobre a leitura por voz. */
  choice: VoiceChoice;
  askedThisSession: boolean;
  speak: (text: string, opts?: { interrupt?: boolean }) => void;
  stop: () => void;
  setChoice: (choice: Exclude<VoiceChoice, null>) => void;
  clearChoice: () => void;
};

const SpeechContext = createContext<Ctx | null>(null);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const { prefs, save } = useAccessibility();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [choice, setChoiceState] = useState<VoiceChoice>(null);
  const [askedThisSession, setAsked] = useState(false);
  const rateRef = useRef(prefs.speechRate);
  const prefsRef = useRef(prefs);

  rateRef.current = prefs.speechRate;
  prefsRef.current = prefs;

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    try {
      const stored = window.localStorage.getItem(VOICE_CHOICE_KEY) as VoiceChoice;
      if (stored === "accepted" || stored === "declined") {
        setChoiceState(stored);
        setAsked(true);
      }
    } catch {
      /* noop */
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback<Ctx["speak"]>((text, opts) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (opts?.interrupt !== false) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(trimmed);
    utter.lang = "pt-BR";
    utter.rate = rateRef.current;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);

  const setChoice = useCallback<Ctx["setChoice"]>(
    (next) => {
      setChoiceState(next);
      setAsked(true);
      try {
        window.localStorage.setItem(VOICE_CHOICE_KEY, next);
      } catch {
        /* noop */
      }
      // Persiste imediatamente a decisão do primeiro acesso (sem esperar re-render).
      save({ ...prefsRef.current, screenReader: next === "accepted" });
      if (next === "declined") stop();
    },
    [save, stop],
  );

  const clearChoice = useCallback(() => {
    setChoiceState(null);
    setAsked(false);
    try {
      window.localStorage.removeItem(VOICE_CHOICE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => stop, [stop]);

  const value = useMemo<Ctx>(
    () => ({ supported, speaking, choice, askedThisSession, speak, stop, setChoice, clearChoice }),
    [supported, speaking, choice, askedThisSession, speak, stop, setChoice, clearChoice],
  );

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) throw new Error("useSpeech precisa estar dentro de SpeechProvider");
  return ctx;
}

/**
 * Lê em voz alta o conteúdo focado/apontado quando o leitor de voz está ativo.
 *
 * Também anuncia toasts (sucesso/erro de ações como publicar, curtir,
 * candidatar-se, enviar mensagem) assim que aparecem — sem isso, um toast
 * só seria percebido por quem usa um leitor de tela nativo (o
 * `aria-live="polite"` do `sonner` já é lido por eles), nunca por quem
 * depende só da leitura por voz própria do ACESSO, que hoje só reage a
 * foco. Reaproveita o texto que o próprio toast já usa (`toast.success(...)`
 * em toda a base já escreve frases completas, ex.: "Vaga publicada com
 * sucesso.") — não inventa um texto novo.
 */
export function useAutoSpeech() {
  const { prefs } = useAccessibility();
  const { speak, stop } = useSpeech();

  useEffect(() => {
    if (!prefs.screenReader) return;

    const readFrom = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return;
      const el = target.closest<HTMLElement>(
        "[data-speak], a, button, [role='button'], h1, h2, h3, li, p, label, input, textarea",
      );
      if (!el) return;
      const text =
        el.dataset.speak ||
        el.getAttribute("aria-label") ||
        (el as HTMLInputElement).placeholder ||
        el.innerText;
      if (text) speak(text.slice(0, 400));
    };

    const onFocus = (e: FocusEvent) => readFrom(e.target);
    document.addEventListener("focusin", onFocus);

    // Observa a região de toasts do sonner e fala cada novo toast — sem
    // interromper uma fala em andamento (duas ações rápidas em sequência
    // não devem cortar o anúncio uma da outra).
    const observadorToast = new MutationObserver((mutacoes) => {
      for (const mutacao of mutacoes) {
        mutacao.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          const texto = node.innerText?.trim();
          if (texto) speak(texto.slice(0, 400), { interrupt: false });
        });
      }
    });

    const iniciarObservacaoToast = () => {
      const regiao = document.querySelector("[data-sonner-toaster]");
      if (regiao) {
        observadorToast.observe(regiao, { childList: true, subtree: true });
        return true;
      }
      return false;
    };

    // O <Toaster/> monta no primeiro render do app inteiro — tenta de
    // novo em vez de assumir que já existe no momento deste efeito.
    let idTentativa: number | undefined;
    if (!iniciarObservacaoToast()) {
      idTentativa = window.setInterval(() => {
        if (iniciarObservacaoToast() && idTentativa !== undefined) {
          window.clearInterval(idTentativa);
        }
      }, 300);
    }

    return () => {
      document.removeEventListener("focusin", onFocus);
      observadorToast.disconnect();
      if (idTentativa !== undefined) window.clearInterval(idTentativa);
      stop();
    };
  }, [prefs.screenReader, speak, stop]);
}
