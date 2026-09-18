import { clienteApi, limparSessao, obterRefreshToken, definirSessao } from "../services/api/cliente";
import { limparTokens, salvarTokens } from "../armazenamento/armazenamentoSeguro";
import type {
  UsuarioAutenticado,
  CadastroCandidatoDados,
  CadastroEmpresaDados,
  CadastroResposta,
  Credenciais,
  LoginResposta,
  SessaoAtiva,
} from "./types";

/**
 * Grava a sessão em memória e no SecureStore quando a resposta traz token; o cadastro também pode
 * devolver sessão quando o backend não exige confirmação de e-mail.
 */
async function gravarSessaoSeHouver(data: LoginResposta | CadastroResposta): Promise<void> {
  if ("token" in data) {
    definirSessao({ accessToken: data.token, refreshToken: data.refreshToken });
    await salvarTokens(data.token, data.refreshToken);
  }
}

/**
 * Chamadas às rotas `/auth` do backend (`Site/Backend/src/routes/autenticacaoRoutes.js`). Caminhos,
 * corpos e respostas seguem exatamente o contrato da API.
 */
export const AutenticacaoService = {
  /** `POST /auth/login`. Em sucesso, já grava a sessão (memória + disco). */
  async entrar(credenciais: Credenciais): Promise<LoginResposta> {
    const { data } = await clienteApi.post<LoginResposta>("/auth/login", credenciais);
    await gravarSessaoSeHouver(data);
    return data;
  },

  /**
   * `POST /auth/register/candidato`. Com o provedor de e-mail configurado, a resposta é
   * `{ pendenteVerificacaoEmail, email }`, sem sessão; sem provedor, vem com token e é tratada como
   * no login.
   */
  async cadastrarCandidato(dados: CadastroCandidatoDados): Promise<CadastroResposta> {
    const { data } = await clienteApi.post<CadastroResposta>("/auth/register/candidato", dados);
    await gravarSessaoSeHouver(data);
    return data;
  },

  /** `POST /auth/register/empresa`: mesmo comportamento de `cadastrarCandidato`. */
  async cadastrarEmpresa(dados: CadastroEmpresaDados): Promise<CadastroResposta> {
    const { data } = await clienteApi.post<CadastroResposta>("/auth/register/empresa", dados);
    await gravarSessaoSeHouver(data);
    return data;
  },

  /**
   * `POST /auth/cadastro/confirmar-email`. Nunca devolve sessão (o usuário
   * ainda precisa fazer login depois de confirmar): só a mensagem de
   * sucesso do backend, que já é apropriada para mostrar direto na tela.
   */
  async confirmarCadastro(email: string, codigo: string): Promise<{ mensagem: string }> {
    const { data } = await clienteApi.post<{ sucesso: true; mensagem: string }>("/auth/cadastro/confirmar-email", {
      email,
      codigo,
    });
    return data;
  },

  /** `GET /auth/me`: usuário autenticado atual. Exige Authorization (o `clienteApi` cuida disso). */
  async obterUsuarioAtual(): Promise<UsuarioAutenticado> {
    const { data } = await clienteApi.get<{ sucesso: true; usuario: UsuarioAutenticado }>("/auth/me");
    return data.usuario;
  },

  /**
   * `POST /auth/logout`. Nunca rejeita: a sessão local é limpa mesmo se o servidor estiver fora do
   * ar, para ninguém ficar preso a uma sessão por falha de rede.
   */
  async sair(): Promise<void> {
    const refreshToken = obterRefreshToken();

    if (refreshToken) {
      try {
        await clienteApi.post("/auth/logout", { refreshToken });
      } catch {
        // Falha ao avisar o backend não impede a saída (ver acima).
      }
    }

    limparSessao();
    await limparTokens();
  },

  /** `POST /auth/senha/esqueci`. Resposta do backend é sempre genérica (não revela se a conta existe). */
  async esqueciSenha(email: string): Promise<{ mensagem?: string }> {
    const { data } = await clienteApi.post<{ sucesso: boolean; mensagem?: string }>("/auth/senha/esqueci", { email });
    return data;
  },

  /** `POST /auth/senha/redefinir`. */
  async redefinirSenha(payload: { email: string; codigo: string; novaSenha: string }): Promise<void> {
    await clienteApi.post("/auth/senha/redefinir", payload);
  },

  /** `POST /auth/cadastro/reenviar-confirmacao`. */
  async reenviarConfirmacao(email: string): Promise<void> {
    await clienteApi.post("/auth/cadastro/reenviar-confirmacao", { email });
  },

  /**
   * `PATCH /auth/senha`. Encerra a sessão em todos os aparelhos: o backend revoga as sessões
   * (`SessaoService.revogarTodos`), apaga os tokens de push da conta e passa a recusar todo token de
   * acesso emitido antes da troca — inclusive o deste aparelho, já na requisição seguinte. Quem
   * chama deve sair da conta em seguida (`SecaoSenha`).
   */
  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    await clienteApi.patch("/auth/senha", { senhaAtual, novaSenha });
  },

  /**
   * `POST /auth/conta/pausar`, com a senha atual como confirmação. O backend revoga todas as
   * sessões; quem chama deve chamar `sair()` do `useAutenticacao` em seguida, porque este serviço
   * não mexe na sessão local.
   */
  async pausarConta(senhaAtual: string): Promise<void> {
    await clienteApi.post("/auth/conta/pausar", { senhaAtual });
  },

  /**
   * `DELETE /auth/conta`: exclusão definitiva, com a senha atual. Assim como em `pausarConta`, quem
   * chama deve chamar `sair()` depois.
   */
  async excluirConta(senhaAtual: string): Promise<void> {
    await clienteApi.delete("/auth/conta", { data: { senhaAtual } });
  },

  /** `POST /auth/email/solicitar`: exige senha atual; envia um código de 6 dígitos para o e-mail novo (não o atual). */
  async solicitarTrocaEmail(senhaAtual: string, novoEmail: string): Promise<void> {
    await clienteApi.post("/auth/email/solicitar", { senhaAtual, novoEmail });
  },

  /** `POST /auth/email/confirmar`: devolve o `usuario` já com o e-mail novo, para a tela atualizar sem precisar recarregar `/auth/me`. */
  async confirmarTrocaEmail(codigo: string): Promise<UsuarioAutenticado> {
    const { data } = await clienteApi.post<{ sucesso: true; mensagem: string; usuario: UsuarioAutenticado }>(
      "/auth/email/confirmar",
      { codigo },
    );
    return data.usuario;
  },

  /**
   * `POST /auth/sessoes`. É POST porque o backend precisa do refresh token atual no corpo para
   * marcar qual sessão é a deste aparelho; o token sai da memória, sem a tela precisar conhecê-lo.
   */
  async listarSessoes(): Promise<SessaoAtiva[]> {
    const { data } = await clienteApi.post<{ sucesso: true; sessoes: SessaoAtiva[] }>("/auth/sessoes", {
      refreshToken: obterRefreshToken(),
    });
    return data.sessoes;
  },

  /**
   * `DELETE /auth/sessoes/:id`: encerra outra sessão. A tela não oferece essa opção para a sessão
   * marcada como `atual`.
   */
  async revogarSessao(id: string): Promise<void> {
    await clienteApi.delete(`/auth/sessoes/${id}`);
  },

  /** `POST /auth/sessoes/encerrar-outras`: envia o refresh token atual, que é a sessão que o backend preserva. */
  async revogarOutrasSessoes(): Promise<void> {
    await clienteApi.post("/auth/sessoes/encerrar-outras", { refreshToken: obterRefreshToken() });
  },
};
