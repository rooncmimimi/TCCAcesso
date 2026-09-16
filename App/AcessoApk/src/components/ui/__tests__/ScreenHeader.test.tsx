import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { ScreenHeader } from "../ScreenHeader";

async function renderWithTheme(ui: React.ReactElement) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("ScreenHeader", () => {
  // Fase 10.1 (auditoria final) — achado real: o título não tinha
  // `accessibilityRole="header"`, diferente de todo outro título de seção
  // do app; sem isto, ficava fora da navegação por cabeçalhos do
  // TalkBack/VoiceOver nas 4 abas que usam este componente (Feed, Vagas,
  // Mensagens, Notificações).
  it("expõe o título como cabeçalho (accessibilityRole) para navegação por leitor de tela", async () => {
    const { getByText } = await renderWithTheme(<ScreenHeader title="Vagas" />);
    expect(getByText("Vagas").props.accessibilityRole).toBe("header");
  });

  it("mostra o subtítulo quando informado, sem virar cabeçalho", async () => {
    const { getByText } = await renderWithTheme(<ScreenHeader title="Vagas" subtitle="3 oportunidades" />);
    expect(getByText("3 oportunidades")).toBeTruthy();
    expect(getByText("3 oportunidades").props.accessibilityRole).not.toBe("header");
  });

  it("renderiza a ação à direita quando informada", async () => {
    const { getByText } = await renderWithTheme(
      <ScreenHeader title="Notificações" action={<Text>Marcar todas como lidas</Text>} />,
    );
    expect(getByText("Marcar todas como lidas")).toBeTruthy();
  });
});
