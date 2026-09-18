/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/cliente", () => ({
  clienteApi: { post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn(), put: jest.fn() },
  definirSessao: jest.fn(),
  limparSessao: jest.fn(),
  obterRefreshToken: jest.fn(),
}));

jest.mock("../../armazenamento/armazenamentoSeguro", () => ({
  salvarTokens: jest.fn(),
  limparTokens: jest.fn(),
}));

import { clienteApi, limparSessao, obterRefreshToken, definirSessao } from "../../services/api/cliente";
import { limparTokens, salvarTokens } from "../../armazenamento/armazenamentoSeguro";
import { AutenticacaoService } from "../AutenticacaoService";

const usuarioCandidato = { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" as const };

describe("AutenticacaoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("em sucesso, chama POST /auth/login e guarda os tokens", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, token: "tok", refreshToken: "ref", usuario: usuarioCandidato },
      });

      const resposta = await AutenticacaoService.entrar({ email: "ana@exemplo.com", senha: "123456" });

      expect(clienteApi.post).toHaveBeenCalledWith("/auth/login", { email: "ana@exemplo.com", senha: "123456" });
      expect(definirSessao).toHaveBeenCalledWith({ accessToken: "tok", refreshToken: "ref" });
      expect(salvarTokens).toHaveBeenCalledWith("tok", "ref");
      expect("token" in resposta && resposta.usuario.email).toBe("ana@exemplo.com");
    });

    it("nunca guarda a senha em nenhum lugar — só os tokens retornados pela API", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, token: "tok", refreshToken: "ref", usuario: usuarioCandidato },
      });

      await AutenticacaoService.entrar({ email: "ana@exemplo.com", senha: "segredo-super-secreto" });

      expect(salvarTokens).toHaveBeenCalledWith("tok", "ref");
      expect(salvarTokens).not.toHaveBeenCalledWith(expect.stringContaining("segredo"), expect.anything());
    });

    it("com e-mail não verificado (200 + flag), não guarda nenhum token", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" },
      });

      const resposta = await AutenticacaoService.entrar({ email: "ana@exemplo.com", senha: "123456" });

      expect(definirSessao).not.toHaveBeenCalled();
      expect(salvarTokens).not.toHaveBeenCalled();
      expect(resposta).toEqual({ sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" });
    });

    it("em erro (ex.: credenciais inválidas), propaga o erro sem guardar nada", async () => {
      const erro = Object.assign(new Error("401"), { isAxiosError: true });
      (clienteApi.post as jest.Mock).mockRejectedValue(erro);

      await expect(AutenticacaoService.entrar({ email: "ana@exemplo.com", senha: "errada" })).rejects.toBe(erro);
      expect(definirSessao).not.toHaveBeenCalled();
      expect(salvarTokens).not.toHaveBeenCalled();
    });
  });

  describe("cadastrarCandidato", () => {
    it("quando o backend exige confirmação de e-mail, não guarda nenhum token", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, pendenteVerificacaoEmail: true, email: "novo@exemplo.com" },
      });

      const resposta = await AutenticacaoService.cadastrarCandidato({
        nome: "Ana",
        email: "novo@exemplo.com",
        senha: "SenhaForte#1",
      });

      expect(clienteApi.post).toHaveBeenCalledWith("/auth/register/candidato", {
        nome: "Ana",
        email: "novo@exemplo.com",
        senha: "SenhaForte#1",
      });
      expect(definirSessao).not.toHaveBeenCalled();
      expect(salvarTokens).not.toHaveBeenCalled();
      expect(resposta).toEqual({ sucesso: true, pendenteVerificacaoEmail: true, email: "novo@exemplo.com" });
    });

    it("quando o backend devolve sessão direto (provedor de e-mail indisponível), grava os tokens", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, token: "tok", refreshToken: "ref", usuario: usuarioCandidato },
      });

      await AutenticacaoService.cadastrarCandidato({ nome: "Ana", email: "ana@exemplo.com", senha: "SenhaForte#1" });

      expect(definirSessao).toHaveBeenCalledWith({ accessToken: "tok", refreshToken: "ref" });
      expect(salvarTokens).toHaveBeenCalledWith("tok", "ref");
    });

    it("em erro (ex.: 409 e-mail já cadastrado), propaga o erro sem guardar nada", async () => {
      const erro = Object.assign(new Error("409"), { isAxiosError: true });
      (clienteApi.post as jest.Mock).mockRejectedValue(erro);

      await expect(
        AutenticacaoService.cadastrarCandidato({ nome: "Ana", email: "ana@exemplo.com", senha: "SenhaForte#1" }),
      ).rejects.toBe(erro);
      expect(definirSessao).not.toHaveBeenCalled();
      expect(salvarTokens).not.toHaveBeenCalled();
    });
  });

  describe("cadastrarEmpresa", () => {
    it("chama POST /auth/register/empresa com o payload completo", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, pendenteVerificacaoEmail: true, email: "empresa@exemplo.com" },
      });

      await AutenticacaoService.cadastrarEmpresa({
        nome: "Fulano",
        email: "empresa@exemplo.com",
        senha: "SenhaForte#1",
        cnpj: "12345678901234",
        razaoSocial: "ACME Ltda",
      });

      expect(clienteApi.post).toHaveBeenCalledWith("/auth/register/empresa", {
        nome: "Fulano",
        email: "empresa@exemplo.com",
        senha: "SenhaForte#1",
        cnpj: "12345678901234",
        razaoSocial: "ACME Ltda",
      });
    });
  });

  describe("confirmarCadastro", () => {
    it("chama POST /auth/cadastro/confirmar-email e devolve a mensagem do backend", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, mensagem: "E-mail confirmado com sucesso. Você já pode fazer login." },
      });

      const resposta = await AutenticacaoService.confirmarCadastro("ana@exemplo.com", "123456");

      expect(clienteApi.post).toHaveBeenCalledWith("/auth/cadastro/confirmar-email", {
        email: "ana@exemplo.com",
        codigo: "123456",
      });
      expect(resposta).toEqual({ sucesso: true, mensagem: "E-mail confirmado com sucesso. Você já pode fazer login." });
    });

    it("em erro (código inválido/expirado), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("400"), { isAxiosError: true });
      (clienteApi.post as jest.Mock).mockRejectedValue(erro);

      await expect(AutenticacaoService.confirmarCadastro("ana@exemplo.com", "000000")).rejects.toBe(erro);
    });
  });

  describe("me", () => {
    it("GET /auth/me devolve o usuário", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, usuario: usuarioCandidato } });
      await expect(AutenticacaoService.obterUsuarioAtual()).resolves.toEqual(usuarioCandidato);
      expect(clienteApi.get).toHaveBeenCalledWith("/auth/me");
    });
  });

  describe("logout", () => {
    it("informa o backend com o refresh token atual e limpa a sessão local", async () => {
      (obterRefreshToken as jest.Mock).mockReturnValue("ref-atual");
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: {} });

      await AutenticacaoService.sair();

      expect(clienteApi.post).toHaveBeenCalledWith("/auth/logout", { refreshToken: "ref-atual" });
      expect(limparSessao).toHaveBeenCalled();
      expect(limparTokens).toHaveBeenCalled();
    });

    it("limpa a sessão local mesmo se o backend estiver indisponível (nunca rejeita)", async () => {
      (obterRefreshToken as jest.Mock).mockReturnValue("ref-atual");
      (clienteApi.post as jest.Mock).mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(AutenticacaoService.sair()).resolves.toBeUndefined();
      expect(limparSessao).toHaveBeenCalled();
      expect(limparTokens).toHaveBeenCalled();
    });

    it("sem refresh token guardado, não chama o backend mas limpa o estado local mesmo assim", async () => {
      (obterRefreshToken as jest.Mock).mockReturnValue(null);

      await AutenticacaoService.sair();

      expect(clienteApi.post).not.toHaveBeenCalled();
      expect(limparSessao).toHaveBeenCalled();
      expect(limparTokens).toHaveBeenCalled();
    });
  });


  describe("gestão de conta", () => {
    it("alterarSenha: chama PATCH /auth/senha com senhaAtual/novaSenha", async () => {
      (clienteApi.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "Senha alterada com sucesso." } });

      await AutenticacaoService.alterarSenha("SenhaAntiga#1", "SenhaNova#1");

      expect(clienteApi.patch).toHaveBeenCalledWith("/auth/senha", { senhaAtual: "SenhaAntiga#1", novaSenha: "SenhaNova#1" });
    });

    it("alterarSenha: em erro (ex.: senha atual incorreta), propaga sem engolir", async () => {
      const erro = Object.assign(new Error("401"), { isAxiosError: true });
      (clienteApi.patch as jest.Mock).mockRejectedValue(erro);

      await expect(AutenticacaoService.alterarSenha("errada", "SenhaNova#1")).rejects.toBe(erro);
    });

    it("pausarConta: chama POST /auth/conta/pausar com senhaAtual", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AutenticacaoService.pausarConta("SenhaAtual#1");

      expect(clienteApi.post).toHaveBeenCalledWith("/auth/conta/pausar", { senhaAtual: "SenhaAtual#1" });
    });

    it("excluirConta: chama DELETE /auth/conta com senhaAtual no corpo", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AutenticacaoService.excluirConta("SenhaAtual#1");

      expect(clienteApi.delete).toHaveBeenCalledWith("/auth/conta", { data: { senhaAtual: "SenhaAtual#1" } });
    });

    it("solicitarTrocaEmail: chama POST /auth/email/solicitar com senhaAtual/novoEmail", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AutenticacaoService.solicitarTrocaEmail("SenhaAtual#1", "novo@exemplo.com");

      expect(clienteApi.post).toHaveBeenCalledWith("/auth/email/solicitar", { senhaAtual: "SenhaAtual#1", novoEmail: "novo@exemplo.com" });
    });

    it("confirmarTrocaEmail: chama POST /auth/email/confirmar e devolve o usuário já com o e-mail novo", async () => {
      const usuarioAtualizado = { ...usuarioCandidato, email: "novo@exemplo.com" };
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "ok", usuario: usuarioAtualizado } });

      await expect(AutenticacaoService.confirmarTrocaEmail("123456")).resolves.toEqual(usuarioAtualizado);
      expect(clienteApi.post).toHaveBeenCalledWith("/auth/email/confirmar", { codigo: "123456" });
    });

    it("listarSessoes: chama POST /auth/sessoes enviando o refresh token atual, devolve a lista", async () => {
      (obterRefreshToken as jest.Mock).mockReturnValue("ref-atual");
      const sessoes = [{ id: "s1", userAgent: "Android", ip: "1.2.3.4", criadoEm: "x", expiraEm: "y", atual: true }];
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, sessoes } });

      await expect(AutenticacaoService.listarSessoes()).resolves.toEqual(sessoes);
      expect(clienteApi.post).toHaveBeenCalledWith("/auth/sessoes", { refreshToken: "ref-atual" });
    });

    it("revogarSessao: chama DELETE /auth/sessoes/:id", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AutenticacaoService.revogarSessao("s2");

      expect(clienteApi.delete).toHaveBeenCalledWith("/auth/sessoes/s2");
    });

    it("revogarOutrasSessoes: chama POST /auth/sessoes/encerrar-outras com o refresh token atual", async () => {
      (obterRefreshToken as jest.Mock).mockReturnValue("ref-atual");
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AutenticacaoService.revogarOutrasSessoes();

      expect(clienteApi.post).toHaveBeenCalledWith("/auth/sessoes/encerrar-outras", { refreshToken: "ref-atual" });
    });
  });
});
