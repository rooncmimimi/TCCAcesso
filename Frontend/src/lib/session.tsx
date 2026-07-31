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
 * Sessão local (mock) — o backend Express do ACESSO ainda não está conectado
 * ao frontend. Substituir por chamadas a `${VITE_API_URL}/auth` mantendo esta
 * mesma interface.
 */
export type SessionUser = {
  nome: string;
  email: string;
  tipo: "candidato" | "empresa";
  titulo: string;
  cidade: string;
  onboarded: boolean;
};

type Ctx = {
  user: SessionUser | null;
  hydrated: boolean;
  signIn: (user: SessionUser) => void;
  signOut: () => void;
  update: (patch: Partial<SessionUser>) => void;
};

const KEY = "acesso:session";
const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw) as SessionUser);
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: SessionUser | null) => {
    setUser(next);
    try {
      if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
      else window.localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      hydrated,
      signIn: (u) => persist(u),
      signOut: () => persist(null),
      update: (patch) => persist(user ? { ...user, ...patch } : null),
    }),
    [user, hydrated, persist],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession precisa estar dentro de SessionProvider");
  return ctx;
}

export function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
