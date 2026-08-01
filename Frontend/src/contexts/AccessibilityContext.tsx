import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Preferências de acessibilidade do ACESSO.
 *
 * Persistência:
 * - Visitante (sem login): localStorage.
 * - Autenticado: localStorage + backend (ver `syncStatus` / `saveToAccount`).
 */
export type AccessibilityPrefs = {
  highContrast: boolean;
  darkMode: boolean;
  fontScale: number; // 0.875 – 1.6
  letterSpacing: number; // em
  lineHeight: number;
  dyslexiaFont: boolean;
  bigCursor: boolean;
  reduceMotion: boolean;
  focusHighlight: boolean;
  keyboardNav: boolean;
  screenReader: boolean; // leitura por voz automática
  speechRate: number;
  vlibras: boolean;
};

export const DEFAULT_PREFS: AccessibilityPrefs = {
  highContrast: false,
  darkMode: false,
  fontScale: 1,
  letterSpacing: 0,
  lineHeight: 1.6,
  dyslexiaFont: false,
  bigCursor: false,
  reduceMotion: false,
  focusHighlight: true,
  keyboardNav: true,
  screenReader: false,
  speechRate: 1,
  vlibras: true,
};

const STORAGE_KEY = "acesso:a11y-prefs";
export const VOICE_CHOICE_KEY = "acesso:voice-choice";

type Ctx = {
  prefs: AccessibilityPrefs;
  draft: AccessibilityPrefs;
  hydrated: boolean;
  dirty: boolean;
  /** Atualiza em tempo real (pré-visualização imediata, sem salvar). */
  set: <K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => void;
  /** Confirma as preferências (localStorage + conta, quando autenticado). */
  save: () => void;
  /** Descarta a pré-visualização e volta ao último estado salvo. */
  discard: () => void;
  reset: () => void;
};

const AccessibilityContext = createContext<Ctx | null>(null);

function readStored(): AccessibilityPrefs | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AccessibilityPrefs>) };
  } catch {
    return null;
  }
}

function applyToDocument(p: AccessibilityPrefs) {
  const root = document.documentElement;
  root.classList.toggle("dark", p.darkMode);
  root.classList.toggle("a11y-contrast", p.highContrast);
  root.classList.toggle("a11y-dyslexia", p.dyslexiaFont);
  root.classList.toggle("a11y-big-cursor", p.bigCursor);
  root.classList.toggle("a11y-reduce-motion", p.reduceMotion);
  root.classList.toggle("a11y-focus", p.focusHighlight);
  root.style.setProperty("--a11y-font-scale", String(p.fontScale));
  root.style.setProperty("--a11y-letter-spacing", `${p.letterSpacing}em`);
  root.style.setProperty("--a11y-line-height", String(p.lineHeight));
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<AccessibilityPrefs>(DEFAULT_PREFS);
  const [draft, setDraft] = useState<AccessibilityPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored() ?? DEFAULT_PREFS;
    setSaved(stored);
    setDraft(stored);
    setHydrated(true);
  }, []);

  // Pré-visualização em tempo real: o rascunho é sempre o que está na tela.
  useEffect(() => {
    if (!hydrated) return;
    applyToDocument(draft);
  }, [draft, hydrated]);

  const set = useCallback<Ctx["set"]>((key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(() => {
    setSaved(draft);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignora quota/privacidade */
    }
  }, [draft]);

  const discard = useCallback(() => setDraft(saved), [saved]);

  const reset = useCallback(() => {
    setDraft(DEFAULT_PREFS);
    setSaved(DEFAULT_PREFS);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(VOICE_CHOICE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      prefs: draft,
      draft,
      hydrated,
      dirty: JSON.stringify(draft) !== JSON.stringify(saved),
      set,
      save,
      discard,
      reset,
    }),
    [draft, saved, hydrated, set, save, discard, reset],
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility precisa estar dentro de AccessibilityProvider");
  return ctx;
}
