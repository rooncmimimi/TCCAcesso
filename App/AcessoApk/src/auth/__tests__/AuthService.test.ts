/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
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
});
