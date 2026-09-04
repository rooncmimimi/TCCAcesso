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

import { toast } from "sonner";

import authService from "@/services/auth.service";
import { aoExpirarSessao, clearTokens, getAccessToken } from "@/services/api";
import { conectarSocket, desconectarSocket } from "@/services/socket";
import acessibilidadeService, { prefsDaApi, prefsParaApi } from "@/services/acessibilidade.service";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import type {
  CredenciaisLogin,
  RespostaCadastroPendenteVerificacao,
  RespostaLoginContaPausada,
  RespostaLoginEmailNaoVerificado,
  RespostaLoginPendente2FA,
  TipoUsuario,
  Usuario,
} from "@/types";

/**
 * Sessão real da aplicação: autenticação JWT contra o backend Express.
 * Os tokens ficam em `localStorage` (ver `services/api.ts`, que também
 * renova automaticamente o access token expirado).
 */
export type SessionUser = Usuario & {
  tipo: TipoUsuario;
  titulo?: string | null;
  cidade?: string | null;
  onboarded?: boolean;
};

type Ctx = {
  user: SessionUser | null;
  hydrated: boolean;
  carregando: boolean;
  autenticado: boolean;
  /** Retorna `{ requerDoisFatores: true }`, `{ contaPausada: true }` ou `{ emailNaoVerificado: true, email }` (sem criar sessão) quando o login precisa de uma etapa extra. */
  login: (
    credenciais: CredenciaisLogin,
  ) => Promise<SessionUser | RespostaLoginPendente2FA | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado>;
  /** Retorna `{ pendenteVerificacaoEmail: true, email }` (sem criar sessão) quando o cadastro exige confirmação de e-mail. */
  registrarCandidato: (
    payload: Record<string, unknown>,
  ) => Promise<SessionUser | RespostaCadastroPendenteVerificacao>;
  registrarEmpresa: (
    payload: Record<string, unknown>,
  ) => Promise<SessionUser | RespostaCadastroPendenteVerificacao>;
  signOut: () => Promise<void>;
  update: (patch: Partial<SessionUser>) => void;
  recarregar: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

function normalizar(usuario: Usuario | (Usuario & Record<string, unknown>)): SessionUser {
  const bruto = usuario as Usuario & Record<string, unknown>;
  return {
    ...bruto,
    tipo: (bruto.tipo ?? (bruto.tipoUsuario as TipoUsuario) ?? "candidato") as TipoUsuario,
    titulo: (bruto.titulo as string | null) ?? null,
    cidade: (bruto.cidade as string | null) ?? null,
    onboarded: Boolean(bruto.onboarded ?? true),
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const { prefs, save } = useAccessibility();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const carregarPerfil = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      setCarregando(true);
      const usuario = await authService.perfilAtual();
      setUser(normalizar(usuario));
      conectarSocket();
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarPerfil().finally(() => setHydrated(true));
  }, [carregarPerfil]);

  useEffect(() => {
    // Fase 9: `motivo` só vem preenchido quando o encerramento é por
    // bloqueio administrativo (ver services/api.ts) — nesse caso mostra a
    // mensagem real do backend em vez do encerramento silencioso de
    // sempre, que faria parecer só uma sessão expirada.
    return aoExpirarSessao((motivo) => {
      desconectarSocket();
      setUser(null);
      if (motivo) {
        toast.error(motivo, { duration: 10_000 });
      }
    });
  }, []);

  const aposAutenticar = useCallback((usuario: Usuario) => {
    const normalizado = normalizar(usuario);
    setUser(normalizado);
    conectarSocket();
    return normalizado;
  }, []);

  // Sincronização de acessibilidade no login/cadastro (Etapa 5). Best-effort
  // por design: chamada depois que `aposAutenticar` já confirmou a sessão, e
  // qualquer falha aqui só é logada — nunca impede nem invalida o
  // login/cadastro, que já terminaram com sucesso antes desta chamada.
  const sincronizarNoLogin = useCallback(async () => {
    try {
      const dto = await acessibilidadeService.obter();
      const parcial = prefsDaApi(dto);
      // A conta é a fonte de verdade no login — sobrescreve o que estava
      // só localmente (ex.: outro dispositivo, ou um visitante que usou
      // este navegador antes de logar em outra conta).
      save({ ...prefsRef.current, ...parcial });
    } catch (erro) {
      console.error("Falha ao sincronizar preferências de acessibilidade no login:", erro);
    }
  }, [save]);

  const sincronizarNoCadastro = useCallback(async () => {
    try {
      // A escolha feita como visitante, imediatamente antes do cadastro,
      // prevalece — empurra o estado local para a conta recém-criada.
      await acessibilidadeService.salvar(prefsParaApi(prefsRef.current));
    } catch (erro) {
      console.error("Falha ao sincronizar preferências de acessibilidade no cadastro:", erro);
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      hydrated,
      carregando,
      autenticado: Boolean(user),
      login: async (credenciais) => {
        const resposta = await authService.login(credenciais);
        if ("requerDoisFatores" in resposta || "contaPausada" in resposta || "emailNaoVerificado" in resposta) {
          return resposta;
        }
        const normalizado = aposAutenticar(resposta.usuario);
        void sincronizarNoLogin();
        return normalizado;
      },
      registrarCandidato: async (payload) => {
        const resposta = await authService.registrarCandidato(payload);
        if ("pendenteVerificacaoEmail" in resposta) return resposta;
        const normalizado = aposAutenticar(resposta.usuario);
        void sincronizarNoCadastro();
        return normalizado;
      },
      registrarEmpresa: async (payload) => {
        const resposta = await authService.registrarEmpresa(payload);
        if ("pendenteVerificacaoEmail" in resposta) return resposta;
        const normalizado = aposAutenticar(resposta.usuario);
        void sincronizarNoCadastro();
        return normalizado;
      },
      signOut: async () => {
        try {
          await authService.logout();
        } finally {
          desconectarSocket();
          setUser(null);
        }
      },
      update: (patch) => setUser((atual) => (atual ? { ...atual, ...patch } : atual)),
      recarregar: carregarPerfil,
    }),
    [user, hydrated, carregando, aposAutenticar, carregarPerfil, sincronizarNoLogin, sincronizarNoCadastro],
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
