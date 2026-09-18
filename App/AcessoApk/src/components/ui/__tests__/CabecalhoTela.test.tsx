import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { CabecalhoTela } from "../CabecalhoTela";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>{ui}</TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("CabecalhoTela", () => {
  // O título precisa de `accessibilityRole="header"` para entrar na navegação por cabeçalhos do
  // TalkBack e do VoiceOver nas abas que usam este componente (Feed, Vagas, Mensagens e
  // Notificações).
  it("expõe o título como cabeçalho (accessibilityRole) para navegação por leitor de tela", async () => {
    const { getByText } = await renderWithTheme(<CabecalhoTela titulo="Vagas" />);
    expect(getByText("Vagas").props.accessibilityRole).toBe("header");
  });

  it("mostra o subtítulo quando informado, sem virar cabeçalho", async () => {
    const { getByText } = await renderWithTheme(<CabecalhoTela titulo="Vagas" subtitulo="3 oportunidades" />);
    expect(getByText("3 oportunidades")).toBeTruthy();
    expect(getByText("3 oportunidades").props.accessibilityRole).not.toBe("header");
  });

  it("renderiza a ação à direita quando informada", async () => {
    const { getByText } = await renderWithTheme(
      <CabecalhoTela titulo="Notificações" acao={<Text>Marcar todas como lidas</Text>} />,
    );
    expect(getByText("Marcar todas como lidas")).toBeTruthy();
  });
});
