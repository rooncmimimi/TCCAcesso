import api, { setTokens, clearTokens } from "./api";
import type { CredenciaisLogin, RespostaLogin, Usuario } from "@/types";

/** Serviço de autenticação — espelha as rotas `/auth` do backend Express. */
export const authService = {
  async login(credenciais: CredenciaisLogin): Promise<RespostaLogin> {
    const { data } = await api.post<RespostaLogin>("/auth/login", credenciais);
    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async registrarCandidato(payload: Record<string, unknown>): Promise<RespostaLogin> {
    const { data } = await api.post<RespostaLogin>("/auth/register/candidato", payload);
    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async registrarEmpresa(payload: Record<string, unknown>): Promise<RespostaLogin> {
    const { data } = await api.post<RespostaLogin>("/auth/register/empresa", payload);
    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async perfilAtual(): Promise<Usuario> {
    const { data } = await api.get<{ usuario: Usuario }>("/auth/me");
    return data.usuario;
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = window.localStorage.getItem("acesso:refreshToken");
      await api.post("/auth/logout", { refreshToken });
    } finally {
      clearTokens();
    }
  },

  /** Solicita o envio de um código de recuperação de senha por e-mail. */
  async esqueciSenha(email: string): Promise<void> {
    await api.post("/auth/senha/esqueci", { email });
  },

  /** Redefine a senha usando o código de 6 dígitos recebido por e-mail. */
  async redefinirSenha(payload: { email: string; codigo: string; novaSenha: string }): Promise<void> {
    await api.post("/auth/senha/redefinir", payload);
  },
};

export default authService;
