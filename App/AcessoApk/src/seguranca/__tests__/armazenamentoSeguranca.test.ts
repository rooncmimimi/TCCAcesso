import AsyncStorage from "@react-native-async-storage/async-storage";

import { obterBloqueioBiometricoAtivo, definirBloqueioBiometricoAtivo } from "../armazenamentoSeguranca";

describe("armazenamentoSeguranca", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("sem nada salvo, devolve false (padrão mais seguro: nunca trava ninguém sozinha)", async () => {
    await expect(obterBloqueioBiometricoAtivo()).resolves.toBe(false);
  });

  it("salva true e recupera true", async () => {
    await definirBloqueioBiometricoAtivo(true);
    await expect(obterBloqueioBiometricoAtivo()).resolves.toBe(true);
  });

  it("salva true e depois false — a leitura reflete o último valor salvo", async () => {
    await definirBloqueioBiometricoAtivo(true);
    await definirBloqueioBiometricoAtivo(false);
    await expect(obterBloqueioBiometricoAtivo()).resolves.toBe(false);
  });

  it("um valor salvo que não é JSON válido não derruba a leitura — devolve false", async () => {
    await AsyncStorage.setItem("acesso.segurancaPreferences", "{ isto não é json");
    await expect(obterBloqueioBiometricoAtivo()).resolves.toBe(false);
  });

  it("uma falha do AsyncStorage ao ler não lança — devolve false", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("armazenamento indisponível"));
    await expect(obterBloqueioBiometricoAtivo()).resolves.toBe(false);
  });

  it("uma falha do AsyncStorage ao salvar não lança", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("armazenamento indisponível"));
    await expect(definirBloqueioBiometricoAtivo(true)).resolves.toBeUndefined();
  });
});
