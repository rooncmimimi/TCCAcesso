import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../acessibilidade";
import { TemaProvider } from "../../tema";
import { AjudaScreen } from "../AjudaScreen";

const CHAVE_PREFERENCIAS_ACESSIBILIDADE = "acesso.accessibilityPreferences";

async function renderTela() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <AjudaScreen />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("AjudaScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("mostra as perguntas frequentes, com uma pergunta de cada seção", async () => {
    const { findByText } = await renderTela();

    expect(await findByText("Vagas")).toBeTruthy();
    expect(await findByText("Como eu me candidato a uma vaga?")).toBeTruthy();
    expect(await findByText("Perfil e currículo")).toBeTruthy();
    expect(await findByText("Feed e rede de conexões")).toBeTruthy();
    expect(await findByText("Mensagens e notificações")).toBeTruthy();
    expect(await findByText("Privacidade e segurança")).toBeTruthy();
    expect(await findByText("Acessibilidade")).toBeTruthy();
    expect(await findByText("Conta")).toBeTruthy();
  });

  it("não mostra texto provisório no lugar das perguntas", async () => {
    const { queryByText } = await renderTela();
    expect(queryByText("Aqui ficarão as respostas para as dúvidas mais comuns.")).toBeNull();
  });

  it("sem 'Leitura por voz' ativada (padrão), não mostra o botão de ouvir", async () => {
    const { queryByRole } = await renderTela();
    expect(queryByRole("button", { name: /Ouvir/ })).toBeNull();
  });

  it("com 'Leitura por voz' ativada, mostra o botão de ouvir as perguntas frequentes", async () => {
    await AsyncStorage.setItem(CHAVE_PREFERENCIAS_ACESSIBILIDADE, JSON.stringify({ voiceEnabled: true }));
    const { findByLabelText } = await renderTela();
    expect(await findByLabelText("Ouvir as perguntas frequentes em voz alta")).toBeTruthy();
  });
});
