import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_ACCESSIBILITY_PREFERENCES } from "../accessibilityDefaults";
import { getStoredPreferences, savePreferences } from "../accessibilityStorage";

describe("accessibilityStorage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("sem nada salvo, devolve null (o chamador cai para os padrões)", async () => {
    await expect(getStoredPreferences()).resolves.toBeNull();
  });

  it("salva e recupera as preferências (o mesmo objeto volta)", async () => {
    const preferencias = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, highContrast: true, fontScale: "large" as const };

    await savePreferences(preferencias);

    await expect(getStoredPreferences()).resolves.toEqual(preferencias);
  });

  it("recarregar depois de salvar preserva a preferência (fechar e abrir o app)", async () => {
    await savePreferences({ ...DEFAULT_ACCESSIBILITY_PREFERENCES, reduceMotion: true });

    // "Reabrir o app" = uma nova leitura independente da anterior.
    const lidas = await getStoredPreferences();

    expect(lidas?.reduceMotion).toBe(true);
  });

  it("um valor salvo que não é JSON válido não derruba a leitura — devolve null", async () => {
    await AsyncStorage.setItem("acesso.accessibilityPreferences", "{ isto não é json");

    await expect(getStoredPreferences()).resolves.toBeNull();
  });

  it("uma falha do AsyncStorage ao ler não lança — devolve null", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("armazenamento indisponível"));

    await expect(getStoredPreferences()).resolves.toBeNull();
  });

  it("uma falha do AsyncStorage ao salvar não lança", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("armazenamento indisponível"));

    await expect(savePreferences(DEFAULT_ACCESSIBILITY_PREFERENCES)).resolves.toBeUndefined();
  });
});
