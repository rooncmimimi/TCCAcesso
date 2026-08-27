import api, { setTokens, clearTokens, getRefreshToken } from "./api";
import type {
  AtivacaoDoisFatores,
  CredenciaisLogin,
  RespostaLogin,
  RespostaLoginContaPausada,
  RespostaLoginPendente2FA,
  SessaoAtiva,
  StatusDoisFatores,
  Usuario,
} from "@/types";

/** Serviço de autenticação — espelha as rotas `/auth` do backend Express. */
export const authService = {
  /** Se a conta tem 2FA ativado e `codigoTotp` não foi enviado, retorna `{ requerDoisFatores: true }` sem criar sessão.
   *  Se a conta estiver pausada e `confirmarReativacao` não foi enviado, retorna `{ contaPausada: true }`. */
  async login(
    credenciais: CredenciaisLogin,
  ): Promise<RespostaLogin | RespostaLoginPendente2FA | RespostaLoginContaPausada> {
    const { data } = await api.post<RespostaLogin | RespostaLoginPendente2FA | RespostaLoginContaPausada>(
      "/auth/login",
      credenciais,
    );
    if ("token" in data) {
      setTokens(data.token, data.refreshToken);
    }
    return data;
  },

  async registrarCandidato(payload: Record<string, unknown>): Promise<RespostaLogin> {
    const { data } = await api.post<RespostaLogin>("/auth/register/candidato", payload);
    setTokens(data.token, data.refreshToken);
    return data;
  },

  async registrarEmpresa(payload: Record<string, unknown>): Promise<RespostaLogin> {
    const { data } = await api.post<RespostaLogin>("/auth/register/empresa", payload);
    setTokens(data.token, data.refreshToken);
    return data;
  },

  async perfilAtual(): Promise<Usuario> {
    const { data } = await api.get<{ usuario: Usuario }>("/auth/me");
    return data.usuario;
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = getRefreshToken();
      await api.post("/auth/logout", { refreshToken });
    } finally {
      clearTokens();
    }
  },

  /** Troca a senha do usuário autenticado. Encerra as outras sessões no backend. */
  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    await api.patch("/auth/senha", { senhaAtual, novaSenha });
  },

  /** Solicita o envio de um código de recuperação de senha por e-mail. */
  async esqueciSenha(email: string): Promise<void> {
    await api.post("/auth/senha/esqueci", { email });
  },

  /** Redefine a senha usando o código de 6 dígitos recebido por e-mail. */
  async redefinirSenha(payload: { email: string; codigo: string; novaSenha: string }): Promise<void> {
    await api.post("/auth/senha/redefinir", payload);
  },

  /* -------- Autenticação de dois fatores (2FA) -------- */

  async status2FA(): Promise<StatusDoisFatores> {
    const { data } = await api.get<{ sucesso: boolean } & StatusDoisFatores>("/auth/2fa/status");
    return { ativado: data.ativado, metodo: data.metodo, ativadoEm: data.ativadoEm };
  },

  /** Inicia a ativação: confirma a senha atual e gera um novo segredo (ainda não ativado). */
  async iniciar2FA(senhaAtual: string): Promise<AtivacaoDoisFatores> {
    const { data } = await api.post<{ sucesso: boolean } & AtivacaoDoisFatores>("/auth/2fa/iniciar", {
      senhaAtual,
    });
    return { segredo: data.segredo, uri: data.uri, qrCodeDataUrl: data.qrCodeDataUrl };
  },

  /** Confirma a ativação com o código gerado pelo app autenticador. */
  async confirmar2FA(codigo: string): Promise<void> {
    await api.post("/auth/2fa/confirmar", { codigo });
  },

  async desativar2FA(senhaAtual: string): Promise<void> {
    await api.post("/auth/2fa/desativar", { senhaAtual });
  },

  /* -------- Sessões ativas -------- */

  async listarSessoes(): Promise<SessaoAtiva[]> {
    const refreshToken = getRefreshToken();
    const { data } = await api.post<{ sessoes: SessaoAtiva[] }>("/auth/sessoes", { refreshToken });
    return data.sessoes ?? [];
  },

  async encerrarSessao(id: string): Promise<void> {
    await api.delete(`/auth/sessoes/${id}`);
  },

  /** Encerra todas as sessões, exceto a que está sendo usada agora. */
  async encerrarOutrasSessoes(): Promise<void> {
    const refreshToken = getRefreshToken();
    await api.post("/auth/sessoes/encerrar-outras", { refreshToken });
  },

  /* -------- Conta: pausar, excluir, trocar e-mail -------- */

  async pausarConta(senhaAtual: string): Promise<void> {
    await api.post("/auth/conta/pausar", { senhaAtual });
  },

  async excluirConta(senhaAtual: string): Promise<void> {
    await api.delete("/auth/conta", { data: { senhaAtual } });
  },

  async solicitarTrocaEmail(senhaAtual: string, novoEmail: string): Promise<void> {
    await api.post("/auth/email/solicitar", { senhaAtual, novoEmail });
  },

  async confirmarTrocaEmail(codigo: string): Promise<Usuario> {
    const { data } = await api.post<{ usuario: Usuario }>("/auth/email/confirmar", { codigo });
    return data.usuario;
  },
};

export default authService;
