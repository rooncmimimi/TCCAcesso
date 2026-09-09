import { apiClient, clearSession, getRefreshToken, refreshSession, setSession } from "../services/api/client";
import { clearTokens, saveTokens } from "../storage/secureStorage";
import type {
  AuthUser,
  CadastroCandidatoDados,
  CadastroEmpresaDados,
  CadastroResposta,
  Credenciais,
  LoginResposta,
  SessaoAtiva,
} from "./types";

/** Grava a sessão (memória + disco) quando a resposta já vem com token — mesma lógica que `login` já tinha, reaproveitada também pelo cadastro (Fase 11), que pode devolver sessão direto quando o backend não exige confirmação de e-mail. */
async function gravarSessaoSeHouver(data: LoginResposta | CadastroResposta): Promise<void> {
  if ("token" in data) {
    setSession({ accessToken: data.token, refreshToken: data.refreshToken });
    await saveTokens(data.token, data.refreshToken);
  }
}

/**
 * Única camada que conhece os endpoints reais de autenticação
 * (`Site/Backend/src/routes/authRoutes.js`, confirmado por auditoria). Todo
 * path, payload e formato de resposta aqui é literal ao que o backend
 * realmente expõe hoje — nada foi presumido.
 */
export const AuthService = {
  /** `POST /auth/login`. Em sucesso, já grava a sessão (memória + disco). */
  async login(credenciais: Credenciais): Promise<LoginResposta> {
    const { data } = await apiClient.post<LoginResposta>("/auth/login", credenciais);
    await gravarSessaoSeHouver(data);
    return data;
  },

  /**
   * `POST /auth/register/candidato` — confirmado ao vivo (Fase 10) que hoje
   * o provedor de e-mail está configurado, então a resposta real é
   * `{pendenteVerificacaoEmail:true, email}` (sem sessão ainda). Mesmo assim
   * trata o caso `{token,...}` (provedor indisponível) exatamente como o
   * `login` trata — mesmo formato de resposta, mesma ação.
   */
  async registerCandidato(dados: CadastroCandidatoDados): Promise<CadastroResposta> {
    const { data } = await apiClient.post<CadastroResposta>("/auth/register/candidato", dados);
    await gravarSessaoSeHouver(data);
    return data;
  },

  /** `POST /auth/register/empresa` — mesmo comportamento de `registerCandidato`. */
  async registerEmpresa(dados: CadastroEmpresaDados): Promise<CadastroResposta> {
    const { data } = await apiClient.post<CadastroResposta>("/auth/register/empresa", dados);
    await gravarSessaoSeHouver(data);
    return data;
  },

  /**
   * `POST /auth/cadastro/confirmar-email`. Nunca devolve sessão (o usuário
   * ainda precisa fazer login depois de confirmar) — só a mensagem de
   * sucesso do backend, que já é apropriada para mostrar direto na tela.
   */
  async confirmarCadastro(email: string, codigo: string): Promise<{ mensagem: string }> {
    const { data } = await apiClient.post<{ sucesso: true; mensagem: string }>("/auth/cadastro/confirmar-email", {
      email,
      codigo,
    });
    return data;
  },

  /** `GET /auth/me` — usuário autenticado atual. Exige Authorization (o `apiClient` cuida disso). */
  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<{ sucesso: true; usuario: AuthUser }>("/auth/me");
    return data.usuario;
  },

  /**
   * `POST /auth/logout`. Best-effort: se o servidor estiver fora do ar, o
   * usuário não deve ficar preso à sessão local por causa disso (decisão do
   * item 24 da Fase 3, documentada no relatório final) — por isso esta
   * função NUNCA rejeita: a sessão local é sempre limpa, e uma falha ao
   * avisar o backend é silenciosamente ignorada (não há nada que o chamador
   * possa fazer a respeito).
   */
  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      try {
        await apiClient.post("/auth/logout", { refreshToken });
      } catch {
        // Best-effort — ver comentário acima.
      }
    }

    clearSession();
    await clearTokens();
  },

  /**
   * Delega para o mesmo mecanismo de renovação usado pelo interceptor do
   * `apiClient` (protegido contra chamadas concorrentes — ver
   * `services/api/client.ts`). Exposto aqui só para o caso de uma tela
   * futura precisar renovar explicitamente; nenhuma tela desta fase chama
   * isto diretamente.
   */
  async refresh(): Promise<string | null> {
    return refreshSession();
  },

  /** `POST /auth/senha/esqueci`. Resposta do backend é sempre genérica (não revela se a conta existe). */
  async esqueciSenha(email: string): Promise<{ mensagem?: string }> {
    const { data } = await apiClient.post<{ sucesso: boolean; mensagem?: string }>("/auth/senha/esqueci", { email });
    return data;
  },

  /** `POST /auth/senha/redefinir`. */
  async redefinirSenha(payload: { email: string; codigo: string; novaSenha: string }): Promise<void> {
    await apiClient.post("/auth/senha/redefinir", payload);
  },

  /** `POST /auth/cadastro/reenviar-confirmacao`. */
  async reenviarConfirmacao(email: string): Promise<void> {
    await apiClient.post("/auth/cadastro/reenviar-confirmacao", { email });
  },

  /**
   * `PATCH /auth/senha`. O backend já revoga todas as OUTRAS sessões ao
   * trocar a senha (`RefreshTokenService.revogarTodos`) — a sessão atual
   * continua válida (o token de acesso em memória não muda), então não é
   * necessário chamar `logout()` depois disto.
   */
  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    await apiClient.patch("/auth/senha", { senhaAtual, novaSenha });
  },

  /**
   * `POST /auth/conta/pausar` — exige senha atual (confirmação explícita,
   * Fase 15). O backend já revoga todas as sessões ao pausar; quem chama
   * isto deve chamar `useAuth().logout()` logo em seguida para atualizar o
   * estado local (esta função só fala com o backend, nunca mexe em sessão
   * local sozinha — mesma separação de responsabilidade do resto do app).
   */
  async pausarConta(senhaAtual: string): Promise<void> {
    await apiClient.post("/auth/conta/pausar", { senhaAtual });
  },

  /** `DELETE /auth/conta` — exclusão definitiva, exige senha atual. Mesma observação de `pausarConta`: quem chama isto deve chamar `logout()` depois. */
  async excluirConta(senhaAtual: string): Promise<void> {
    await apiClient.delete("/auth/conta", { data: { senhaAtual } });
  },

  /** `POST /auth/email/solicitar` — exige senha atual; envia um código de 6 dígitos para o e-mail NOVO (não o atual). */
  async solicitarTrocaEmail(senhaAtual: string, novoEmail: string): Promise<void> {
    await apiClient.post("/auth/email/solicitar", { senhaAtual, novoEmail });
  },

  /** `POST /auth/email/confirmar` — devolve o `usuario` já com o e-mail novo, para a tela atualizar sem precisar recarregar `/auth/me`. */
  async confirmarTrocaEmail(codigo: string): Promise<AuthUser> {
    const { data } = await apiClient.post<{ sucesso: true; mensagem: string; usuario: AuthUser }>(
      "/auth/email/confirmar",
      { codigo },
    );
    return data.usuario;
  },

  /**
   * `POST /auth/sessoes` (é POST, não GET — o backend precisa do
   * `refreshToken` atual no corpo para marcar qual sessão é a `atual`;
   * confirmado por auditoria, não é um erro de verbo). Envia o refresh
   * token em memória automaticamente — nenhuma tela precisa conhecê-lo.
   */
  async listarSessoes(): Promise<SessaoAtiva[]> {
    const { data } = await apiClient.post<{ sucesso: true; sessoes: SessaoAtiva[] }>("/auth/sessoes", {
      refreshToken: getRefreshToken(),
    });
    return data.sessoes;
  },

  /** `DELETE /auth/sessoes/:id` — encerra uma sessão específica (não a atual: a lista já marca `atual`, a tela nunca oferece encerrar essa). */
  async revogarSessao(id: string): Promise<void> {
    await apiClient.delete(`/auth/sessoes/${id}`);
  },

  /** `POST /auth/sessoes/encerrar-outras` — mesmo motivo de `listarSessoes` para enviar o refresh token atual (é o que o backend preserva). */
  async revogarOutrasSessoes(): Promise<void> {
    await apiClient.post("/auth/sessoes/encerrar-outras", { refreshToken: getRefreshToken() });
  },
};
