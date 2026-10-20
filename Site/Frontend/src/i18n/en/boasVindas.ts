import type { Dicionario } from "../dicionario";

export const boasVindas: Dicionario["boasVindas"] = {
  meta: {
    titulo: "Set up your accessibility — ACESSO",
    descricao: "First visit: adjust contrast, font, voice and Libras and see every change in real time before saving.",
  },
  passo: "Step 1 of 1",
  boasVindasNome: (nome) => `Welcome, ${nome}!`,
  boasVindas: "Welcome to ACESSO!",
  texto:
    "Adjust how you want to see, hear and navigate. Everything changes instantly — try freely and save only when it feels right. You can change it later from your profile menu.",
  salvarEIr: "Save and go to the feed",
  pular: "Skip for now",
  erroSalvar: "We couldn't save to your account. Your preferences were saved on this device.",
  salvo: "Preferences saved to your account.",
};
