import api, { setStoredToken } from "./api";
import type { CredenciaisLogin, RespostaLogin, Usuario } from "@/types";

/**
 * Serviço de autenticação — espelha as rotas `/auth` do backend.
 */
export const authService = {
  async login(credenciais: CredenciaisLogin): Promise<RespostaLogin> {
    const { data } = await api.post<RespostaLogin>("/auth/login", credenciais);
    setStoredToken(data.token);
    return data;
  },

  async registrarCandidato(payload: Record<string, unknown>): Promise<RespostaLogin> {
    const { data } = await api.post<RespostaLogin>("/auth/register/candidato", payload);
    setStoredToken(data.token);
    return data;
  },

  async registrarEmpresa(payload: Record<string, unknown>): Promise<RespostaLogin> {
    const { data } = await api.post<RespostaLogin>("/auth/register/empresa", payload);
    setStoredToken(data.token);
    return data;
  },

  async perfilAtual(): Promise<Usuario> {
    const { data } = await api.get<{ dados: Usuario }>("/auth/me");
    return data.dados;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      setStoredToken(null);
    }
  },
};

export default authService;
