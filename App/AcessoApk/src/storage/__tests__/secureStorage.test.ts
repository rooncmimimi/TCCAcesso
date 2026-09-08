import * as SecureStore from "expo-secure-store";

import { clearTokens, getTokens, saveTokens } from "../secureStorage";

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("secureStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("salva os dois tokens, cada um com sua própria chave", async () => {
    await saveTokens("access-123", "refresh-456");

    expect(mockedStore.setItemAsync).toHaveBeenCalledWith(expect.stringContaining("accessToken"), "access-123");
    expect(mockedStore.setItemAsync).toHaveBeenCalledWith(expect.stringContaining("refreshToken"), "refresh-456");
  });

  it("as chaves usadas não contêm ':' (o SecureStore não aceita esse caractere)", async () => {
    await saveTokens("a", "b");
    for (const chamada of mockedStore.setItemAsync.mock.calls) {
      expect(chamada[0]).toMatch(/^[\w.-]+$/);
    }
  });

  it("recupera os tokens salvos", async () => {
    mockedStore.getItemAsync.mockImplementation(async (chave) =>
      chave.includes("accessToken") ? "access-123" : "refresh-456",
    );

    await expect(getTokens()).resolves.toEqual({ accessToken: "access-123", refreshToken: "refresh-456" });
  });

  it("retorna null se qualquer um dos dois tokens não existir (sessão parcial não é sessão válida)", async () => {
    mockedStore.getItemAsync.mockResolvedValueOnce("access-123").mockResolvedValueOnce(null);
    await expect(getTokens()).resolves.toBeNull();
  });

  it("remove os dois tokens", async () => {
    await clearTokens();
    expect(mockedStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
