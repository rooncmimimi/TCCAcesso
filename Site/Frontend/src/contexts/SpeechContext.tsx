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

/**
 * Arquitetura da leitura por voz (Fase 9, Blocos 7 e 8).
 *
 * TRÊS conceitos, cada um com um único dono — nunca misturar:
 *
 * 1. `prefs.screenReader` (de `AccessibilityContext`) — a ÚNICA fonte de
 *    verdade sobre a leitura por voz estar ativa AGORA. `true` = voz
 *    ativa, `false` = voz desativada. TODO código que decide se fala algo
 *    (aqui, em `useAutoSpeech`, ou em qualquer componente) deve checar
 *    `prefs.screenReader`, nunca `choice` nem `voiceConsent`. O usuário
 *    pode ligar/desligar isso livremente em Configurações a qualquer
 *    momento, sem que isso afete o consentimento já dado.
 *
 * 2. `prefs.voiceConsent` (Bloco 8) — o registro DURÁVEL de "o usuário já
 *    respondeu a pergunta de consentimento?", sincronizado com o backend
 *    (`consentimentoVoz`) assim que há conta autenticada. `null` = nunca
 *    respondeu; `true`/`false` = já respondeu (aceitou/recusou). Depois de
 *    respondido, continua com esse valor MESMO que `screenReader` mude
 *    depois — os dois só coincidem no instante da decisão inicial.
 *
 * 3. `choice` (abaixo, só neste contexto) — cache local, restrito ao
 *    visitante ANÔNIMO (antes de existir conta): a mesma resposta que vai
 *    virar `voiceConsent`, guardada em localStorage porque ainda não há
 *    onde persistir no backend. Some de relevância assim que a conta
 *    existe (o backend passa a mandar `voiceConsent`). `setChoice` sempre
 *    grava os três juntos (`choice` + `screenReader` + `voiceConsent`) no
 *    mesmo instante — nunca controla a voz sozinho, só decide se
 *    `VoiceConsentDialog` deve aparecer de novo (`choice !== null`).
 */
type VoiceChoice = "accepted" | "declined" | null;

type Ctx = {
  supported: boolean;
  speaking: boolean;
  /** Registro de "já perguntou?" do primeiro acesso — NÃO usar para decidir se a voz está ativa (use `prefs.screenReader`). */
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
      // Persiste imediatamente a decisão do primeiro acesso (sem esperar
      // re-render). `voiceConsent` (Fase 9, Bloco 8) registra a RESPOSTA em
      // si (nunca mais perguntar) — `screenReader` é a preferência efetiva
      // que o usuário pode religar/desligar livremente depois, sem que
      // isso desfaça o consentimento já dado. Os dois começam iguais aqui
      // porque é o mesmo instante da decisão, mas são conceitos distintos
      // a partir de agora (ver `AccessibilityPrefs.voiceConsent`).
      save({ ...prefsRef.current, screenReader: next === "accepted", voiceConsent: next === "accepted" });
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
      // Fase 9, Bloco 7 — bug real encontrado ao testar no navegador: no
      // sonner v2 (instalado neste projeto), `[data-sonner-toaster]` só
      // existe no DOM enquanto há pelo menos um toast visível (o `<ol>`
      // correspondente literalmente desmonta quando a lista de toasts
      // esvazia — `if (!filteredToasts.length) return null;` no código do
      // sonner) e é recriado do zero a cada novo ciclo. Como resultado,
      // observar esse elemento nunca funcionava de verdade: na primeira
      // vez que este efeito rodava não havia nenhum toast ainda, então o
      // seletor nunca encontrava nada — e mesmo que a re-tentativa
      // acertasse a janela de um toast já visível, o observer ficava
      // "grudado" naquele `<ol>` específico, que era destruído no ciclo
      // seguinte, sem nunca reconectar. Resultado prático: NENHUM toast
      // era lido automaticamente, nunca — os únicos anúncios de toast que
      // o usuário ouvia vinham das chamadas manuais de `speak()`
      // (removidas neste bloco por parecerem duplicadas do observer, que
      // na real nunca chegava a duplicar nada).
      //
      // Corrigido observando o `<section aria-live="polite">` que o
      // sonner sempre mantém montado (é o wrapper fixo do `<Toaster/>`,
      // existe mesmo sem nenhum toast ativo) — com `subtree: true`,
      // qualquer novo toast adicionado em qualquer profundidade dentro
      // dele é capturado, inclusive quando o `<ol>` interno é recriado.
      const regiao = document.querySelector('section[aria-live="polite"]');
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
