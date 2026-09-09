/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn(), put: jest.fn() },
  setSession: jest.fn(),
  clearSession: jest.fn(),
  getRefreshToken: jest.fn(),
  refreshSession: jest.fn(),
}));

jest.mock("../../storage/secureStorage", () => ({
  saveTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

import { apiClient, clearSession, getRefreshToken, refreshSession, setSession } from "../../services/api/client";
import { clearTokens, saveTokens } from "../../storage/secureStorage";
import { AuthService } from "../AuthService";

const usuarioCandidato = { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" as const };

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("em sucesso, chama POST /auth/login e guarda os tokens", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, token: "tok", refreshToken: "ref", usuario: usuarioCandidato },
      });

      const resposta = await AuthService.login({ email: "ana@exemplo.com", senha: "123456" });

      expect(apiClient.post).toHaveBeenCalledWith("/auth/login", { email: "ana@exemplo.com", senha: "123456" });
      expect(setSession).toHaveBeenCalledWith({ accessToken: "tok", refreshToken: "ref" });
      expect(saveTokens).toHaveBeenCalledWith("tok", "ref");
      expect("token" in resposta && resposta.usuario.email).toBe("ana@exemplo.com");
    });

    it("nunca guarda a senha em nenhum lugar — só os tokens retornados pela API", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, token: "tok", refreshToken: "ref", usuario: usuarioCandidato },
      });

      await AuthService.login({ email: "ana@exemplo.com", senha: "segredo-super-secreto" });

      expect(saveTokens).toHaveBeenCalledWith("tok", "ref");
      expect(saveTokens).not.toHaveBeenCalledWith(expect.stringContaining("segredo"), expect.anything());
    });

    it("com e-mail não verificado (200 + flag), não guarda nenhum token", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" },
      });

      const resposta = await AuthService.login({ email: "ana@exemplo.com", senha: "123456" });

      expect(setSession).not.toHaveBeenCalled();
      expect(saveTokens).not.toHaveBeenCalled();
      expect(resposta).toEqual({ sucesso: true, emailNaoVerificado: true, email: "ana@exemplo.com" });
    });

    it("em erro (ex.: credenciais inválidas), propaga o erro sem guardar nada", async () => {
      const erro = Object.assign(new Error("401"), { isAxiosError: true });
      (apiClient.post as jest.Mock).mockRejectedValue(erro);

      await expect(AuthService.login({ email: "ana@exemplo.com", senha: "errada" })).rejects.toBe(erro);
      expect(setSession).not.toHaveBeenCalled();
      expect(saveTokens).not.toHaveBeenCalled();
    });
  });

  describe("registerCandidato", () => {
    it("quando o backend exige confirmação de e-mail (caso real, confirmado ao vivo na Fase 10), não guarda nenhum token", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, pendenteVerificacaoEmail: true, email: "novo@exemplo.com" },
      });

      const resposta = await AuthService.registerCandidato({
        nome: "Ana",
        email: "novo@exemplo.com",
        senha: "SenhaForte#1",
      });

      expect(apiClient.post).toHaveBeenCalledWith("/auth/register/candidato", {
        nome: "Ana",
        email: "novo@exemplo.com",
        senha: "SenhaForte#1",
      });
      expect(setSession).not.toHaveBeenCalled();
      expect(saveTokens).not.toHaveBeenCalled();
      expect(resposta).toEqual({ sucesso: true, pendenteVerificacaoEmail: true, email: "novo@exemplo.com" });
    });

    it("quando o backend devolve sessão direto (provedor de e-mail indisponível), grava os tokens", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, token: "tok", refreshToken: "ref", usuario: usuarioCandidato },
      });

      await AuthService.registerCandidato({ nome: "Ana", email: "ana@exemplo.com", senha: "SenhaForte#1" });

      expect(setSession).toHaveBeenCalledWith({ accessToken: "tok", refreshToken: "ref" });
      expect(saveTokens).toHaveBeenCalledWith("tok", "ref");
    });

    it("em erro (ex.: 409 e-mail já cadastrado), propaga o erro sem guardar nada", async () => {
      const erro = Object.assign(new Error("409"), { isAxiosError: true });
      (apiClient.post as jest.Mock).mockRejectedValue(erro);

      await expect(
        AuthService.registerCandidato({ nome: "Ana", email: "ana@exemplo.com", senha: "SenhaForte#1" }),
      ).rejects.toBe(erro);
      expect(setSession).not.toHaveBeenCalled();
      expect(saveTokens).not.toHaveBeenCalled();
    });
  });

  describe("registerEmpresa", () => {
    it("chama POST /auth/register/empresa com o payload completo", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, pendenteVerificacaoEmail: true, email: "empresa@exemplo.com" },
      });

      await AuthService.registerEmpresa({
        nome: "Fulano",
        email: "empresa@exemplo.com",
        senha: "SenhaForte#1",
        cnpj: "12345678901234",
        razaoSocial: "ACME Ltda",
      });

      expect(apiClient.post).toHaveBeenCalledWith("/auth/register/empresa", {
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
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, mensagem: "E-mail confirmado com sucesso. Você já pode fazer login." },
      });

      const resposta = await AuthService.confirmarCadastro("ana@exemplo.com", "123456");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/cadastro/confirmar-email", {
        email: "ana@exemplo.com",
        codigo: "123456",
      });
      expect(resposta).toEqual({ sucesso: true, mensagem: "E-mail confirmado com sucesso. Você já pode fazer login." });
    });

    it("em erro (código inválido/expirado), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("400"), { isAxiosError: true });
      (apiClient.post as jest.Mock).mockRejectedValue(erro);

      await expect(AuthService.confirmarCadastro("ana@exemplo.com", "000000")).rejects.toBe(erro);
    });
  });

  describe("me", () => {
    it("GET /auth/me devolve o usuário", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, usuario: usuarioCandidato } });
      await expect(AuthService.me()).resolves.toEqual(usuarioCandidato);
      expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
    });
  });

  describe("logout", () => {
    it("informa o backend com o refresh token atual e limpa a sessão local", async () => {
      (getRefreshToken as jest.Mock).mockReturnValue("ref-atual");
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await AuthService.logout();

      expect(apiClient.post).toHaveBeenCalledWith("/auth/logout", { refreshToken: "ref-atual" });
      expect(clearSession).toHaveBeenCalled();
      expect(clearTokens).toHaveBeenCalled();
    });

    it("limpa a sessão local mesmo se o backend estiver indisponível (nunca rejeita)", async () => {
      (getRefreshToken as jest.Mock).mockReturnValue("ref-atual");
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(AuthService.logout()).resolves.toBeUndefined();
      expect(clearSession).toHaveBeenCalled();
      expect(clearTokens).toHaveBeenCalled();
    });

    it("sem refresh token guardado, não chama o backend mas limpa o estado local mesmo assim", async () => {
      (getRefreshToken as jest.Mock).mockReturnValue(null);

      await AuthService.logout();

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(clearSession).toHaveBeenCalled();
      expect(clearTokens).toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("delega para o mecanismo de renovação do cliente HTTP", async () => {
      (refreshSession as jest.Mock).mockResolvedValue("novo-token");
      await expect(AuthService.refresh()).resolves.toBe("novo-token");
    });

    it("refresh inválido: devolve null sem lançar", async () => {
      (refreshSession as jest.Mock).mockResolvedValue(null);
      await expect(AuthService.refresh()).resolves.toBeNull();
    });
  });

  describe("gestão de conta (Fase 15)", () => {
    it("alterarSenha: chama PATCH /auth/senha com senhaAtual/novaSenha", async () => {
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "Senha alterada com sucesso." } });

      await AuthService.alterarSenha("SenhaAntiga#1", "SenhaNova#1");

      expect(apiClient.patch).toHaveBeenCalledWith("/auth/senha", { senhaAtual: "SenhaAntiga#1", novaSenha: "SenhaNova#1" });
    });

    it("alterarSenha: em erro (ex.: senha atual incorreta), propaga sem engolir", async () => {
      const erro = Object.assign(new Error("401"), { isAxiosError: true });
      (apiClient.patch as jest.Mock).mockRejectedValue(erro);

      await expect(AuthService.alterarSenha("errada", "SenhaNova#1")).rejects.toBe(erro);
    });

    it("pausarConta: chama POST /auth/conta/pausar com senhaAtual", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AuthService.pausarConta("SenhaAtual#1");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/conta/pausar", { senhaAtual: "SenhaAtual#1" });
    });

    it("excluirConta: chama DELETE /auth/conta com senhaAtual no corpo", async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AuthService.excluirConta("SenhaAtual#1");

      expect(apiClient.delete).toHaveBeenCalledWith("/auth/conta", { data: { senhaAtual: "SenhaAtual#1" } });
    });

    it("solicitarTrocaEmail: chama POST /auth/email/solicitar com senhaAtual/novoEmail", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AuthService.solicitarTrocaEmail("SenhaAtual#1", "novo@exemplo.com");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/email/solicitar", { senhaAtual: "SenhaAtual#1", novoEmail: "novo@exemplo.com" });
    });

    it("confirmarTrocaEmail: chama POST /auth/email/confirmar e devolve o usuário já com o e-mail novo", async () => {
      const usuarioAtualizado = { ...usuarioCandidato, email: "novo@exemplo.com" };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "ok", usuario: usuarioAtualizado } });

      await expect(AuthService.confirmarTrocaEmail("123456")).resolves.toEqual(usuarioAtualizado);
      expect(apiClient.post).toHaveBeenCalledWith("/auth/email/confirmar", { codigo: "123456" });
    });

    it("listarSessoes: chama POST /auth/sessoes enviando o refresh token atual, devolve a lista", async () => {
      (getRefreshToken as jest.Mock).mockReturnValue("ref-atual");
      const sessoes = [{ id: "s1", userAgent: "Android", ip: "1.2.3.4", criadoEm: "x", expiraEm: "y", atual: true }];
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, sessoes } });

      await expect(AuthService.listarSessoes()).resolves.toEqual(sessoes);
      expect(apiClient.post).toHaveBeenCalledWith("/auth/sessoes", { refreshToken: "ref-atual" });
    });

    it("revogarSessao: chama DELETE /auth/sessoes/:id", async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AuthService.revogarSessao("s2");

      expect(apiClient.delete).toHaveBeenCalledWith("/auth/sessoes/s2");
    });

    it("revogarOutrasSessoes: chama POST /auth/sessoes/encerrar-outras com o refresh token atual", async () => {
      (getRefreshToken as jest.Mock).mockReturnValue("ref-atual");
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await AuthService.revogarOutrasSessoes();

      expect(apiClient.post).toHaveBeenCalledWith("/auth/sessoes/encerrar-outras", { refreshToken: "ref-atual" });
    });
  });
});
