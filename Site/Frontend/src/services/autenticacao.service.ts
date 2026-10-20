import { obterIdioma, type Idioma } from "@/i18n";
import clienteApi, { definirTokens, limparTokens, obterRefreshToken } from "./api";
import type {
  CredenciaisLogin,
  RespostaCadastroPendenteVerificacao,
  RespostaLogin,
  RespostaLoginContaPausada,
  RespostaLoginEmailNaoVerificado,
  SessaoAtiva,
  Usuario,
} from "@/types";

/** Serviço de autenticação: espelha as rotas `/auth` do backend Express. */
export const autenticacaoService = {
  /** Se a conta estiver pausada e `confirmarReativacao` não foi enviado, retorna `{ contaPausada: true }`.
   *  Se o e-mail do cadastro ainda não foi confirmado, retorna `{ emailNaoVerificado: true, email }`. */
  async entrar(
    credenciais: CredenciaisLogin,
  ): Promise<RespostaLogin | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado> {
    const { data } = await clienteApi.post<RespostaLogin | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado>(
      "/auth/login",
      credenciais,
    );
    if ("token" in data) {
      definirTokens(data.token, data.refreshToken);
    }
    return data;
  },

  /** Se a confirmação de e-mail estiver ativa, retorna `{ pendenteVerificacaoEmail: true, email }` sem criar sessão. */
  async registrarCandidato(
    payload: Record<string, unknown>,
  ): Promise<RespostaLogin | RespostaCadastroPendenteVerificacao> {
    const { data } = await clienteApi.post<RespostaLogin | RespostaCadastroPendenteVerificacao>(
      "/auth/register/candidato",
      // A conta nasce no idioma em que a pessoa está vendo o cadastro.
      { idioma: obterIdioma(), ...payload },
    );
    if ("token" in data) {
      definirTokens(data.token, data.refreshToken);
    }
    return data;
  },

  async registrarEmpresa(
    payload: Record<string, unknown>,
  ): Promise<RespostaLogin | RespostaCadastroPendenteVerificacao> {
    const { data } = await clienteApi.post<RespostaLogin | RespostaCadastroPendenteVerificacao>(
      "/auth/register/empresa",
      { idioma: obterIdioma(), ...payload },
    );
    if ("token" in data) {
      definirTokens(data.token, data.refreshToken);
    }
    return data;
  },

  /** Confirma o e-mail de um cadastro recém-criado usando o código de 6 dígitos recebido por e-mail. */
  async confirmarCadastro(email: string, codigo: string): Promise<void> {
    await clienteApi.post("/auth/cadastro/confirmar-email", { email, codigo });
  },

  /** Reenvia o e-mail de confirmação de cadastro (resposta sempre genérica, não revela se a conta existe). */
  async reenviarConfirmacaoCadastro(email: string): Promise<void> {
    await clienteApi.post("/auth/cadastro/reenviar-confirmacao", { email });
  },

  async perfilAtual(): Promise<Usuario> {
    const { data } = await clienteApi.get<{ usuario: Usuario }>("/auth/me");
    return data.usuario;
  },

  /**
   * Marca o cadastro como terminado, na última etapa do wizard. Enquanto não for chamada,
   * `cadastroConcluidoEm` fica nula e o login oferece retomar o cadastro.
   */
  async concluirCadastro(): Promise<Usuario> {
    const { data } = await clienteApi.post<{ usuario: Usuario }>("/auth/cadastro/concluir");
    return data.usuario;
  },

  /**
   * Guarda na conta o idioma da interface, para os e-mails e avisos que o servidor envia por conta
   * própria e para os outros aparelhos da pessoa. Chamada só quando ela escolhe o idioma.
   */
  async alterarIdioma(idioma: Idioma): Promise<void> {
    await clienteApi.patch("/auth/idioma", { idioma });
  },

  async sair(): Promise<void> {
    try {
      const refreshToken = obterRefreshToken();
      await clienteApi.post("/auth/logout", { refreshToken });
    } finally {
      limparTokens();
    }
  },

  /**
   * Troca a senha do usuário autenticado. O backend revoga todas as sessões da conta, inclusive a
   * atual, por isso a tela sai da conta em seguida.
   */
  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    await clienteApi.patch("/auth/senha", { senhaAtual, novaSenha });
  },

  /** Solicita o envio de um código de recuperação de senha por e-mail. */
  async esqueciSenha(email: string): Promise<void> {
    await clienteApi.post("/auth/senha/esqueci", { email });
  },

  /**
   * Redefine a senha. O backend aceita dois formatos:
   * - `{ token, novaSenha }`, com o token do link enviado por e-mail (usado pelo Site);
   * - `{ email, codigo, novaSenha }`, com o código de 6 dígitos (usado pelo app).
   */
  async redefinirSenha(
    payload: { token: string; novaSenha: string } | { email: string; codigo: string; novaSenha: string },
  ): Promise<void> {
    await clienteApi.post("/auth/senha/redefinir", payload);
  },

  /* Sessões ativas */

  async listarSessoes(): Promise<SessaoAtiva[]> {
    const refreshToken = obterRefreshToken();
    const { data } = await clienteApi.post<{ sessoes: SessaoAtiva[] }>("/auth/sessoes", { refreshToken });
    return data.sessoes ?? [];
  },

  async encerrarSessao(id: string): Promise<void> {
    await clienteApi.delete(`/auth/sessoes/${id}`);
  },

  /** Encerra todas as sessões, exceto a que está sendo usada agora. */
  async encerrarOutrasSessoes(): Promise<void> {
    const refreshToken = obterRefreshToken();
    await clienteApi.post("/auth/sessoes/encerrar-outras", { refreshToken });
  },

  /* Conta: pausar, excluir e trocar e-mail */

  async pausarConta(senhaAtual: string): Promise<void> {
    await clienteApi.post("/auth/conta/pausar", { senhaAtual });
  },

  async excluirConta(senhaAtual: string): Promise<void> {
    await clienteApi.delete("/auth/conta", { data: { senhaAtual } });
  },

  async solicitarTrocaEmail(senhaAtual: string, novoEmail: string): Promise<void> {
    await clienteApi.post("/auth/email/solicitar", { senhaAtual, novoEmail });
  },

  async confirmarTrocaEmail(codigo: string): Promise<Usuario> {
    const { data } = await clienteApi.post<{ usuario: Usuario }>("/auth/email/confirmar", { codigo });
    return data.usuario;
  },
};

export default autenticacaoService;
