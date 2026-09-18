import AsyncStorage from "@react-native-async-storage/async-storage";

import { PREFERENCIAS_ACESSIBILIDADE_PADRAO } from "../preferenciasPadrao";
import { obterPreferenciasSalvas, salvarPreferencias } from "../armazenamentoAcessibilidade";

describe("armazenamentoAcessibilidade", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("sem nada salvo, devolve null (o chamador cai para os padrões)", async () => {
    await expect(obterPreferenciasSalvas()).resolves.toBeNull();
  });

  it("salva e recupera as preferências (o mesmo objeto volta)", async () => {
    const preferencias = { ...PREFERENCIAS_ACESSIBILIDADE_PADRAO, highContrast: true, fontScale: "large" as const };

    await salvarPreferencias(preferencias);

    await expect(obterPreferenciasSalvas()).resolves.toEqual(preferencias);
  });

  it("recarregar depois de salvar preserva a preferência (fechar e abrir o app)", async () => {
    await salvarPreferencias({ ...PREFERENCIAS_ACESSIBILIDADE_PADRAO, reduceMotion: true });

    // "Reabrir o app" = uma nova leitura independente da anterior.
    const lidas = await obterPreferenciasSalvas();

    expect(lidas?.reduceMotion).toBe(true);
  });

  it("um valor salvo que não é JSON válido não derruba a leitura — devolve null", async () => {
    await AsyncStorage.setItem("acesso.accessibilityPreferences", "{ isto não é json");

    await expect(obterPreferenciasSalvas()).resolves.toBeNull();
  });

  it("uma falha do AsyncStorage ao ler não lança — devolve null", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("armazenamento indisponível"));

    await expect(obterPreferenciasSalvas()).resolves.toBeNull();
  });

  it("uma falha do AsyncStorage ao salvar não lança", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("armazenamento indisponível"));

    await expect(salvarPreferencias(PREFERENCIAS_ACESSIBILIDADE_PADRAO)).resolves.toBeUndefined();
  });
});
