/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockDenunciar = jest.fn();
const mockAnnounce = jest.fn();

jest.mock("../../moderacao", () => ({
  ...jest.requireActual("../../moderacao"),
  ModeracaoService: { denunciar: (...a: unknown[]) => mockDenunciar(...a) },
}));

jest.mock("../../accessibility", () => ({
  ...jest.requireActual("../../accessibility"),
  announceForAccessibility: (...a: unknown[]) => mockAnnounce(...a),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { ReportScreen } from "../ReportScreen";

const mockGoBack = jest.fn();
const navigationMock = { goBack: mockGoBack } as unknown as NativeStackScreenProps<AppStackParamList, "Report">["navigation"];

async function renderTela(paramsExtra: Partial<Record<string, unknown>> = {}) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <ReportScreen
          navigation={navigationMock}
          route={{ key: "Report", name: "Report", params: { entidadeTipo: "postagem", entidadeId: "p1", ...paramsExtra } }}
        />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("ReportScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra o alvo quando tituloAlvo é informado", async () => {
    const { findByText } = await renderTela({ tituloAlvo: "Minha publicação" });

    expect(await findByText("Você está denunciando: Minha publicação")).toBeTruthy();
  });

  it("botão 'Enviar denúncia' começa desabilitado (nenhum motivo escolhido)", async () => {
    const { getByRole } = await renderTela();

    expect(getByRole("button", { name: "Enviar denúncia" }).props.accessibilityState.disabled).toBe(true);
  });

  it("escolher um motivo habilita o botão; sucesso chama denunciar com entidadeTipo/entidadeId/motivo corretos, anuncia e volta", async () => {
    mockDenunciar.mockResolvedValue({ id: "d1", status: "pendente" });
    const { getByLabelText, getByRole } = await renderTela();

    await act(async () => {
      fireEvent.press(getByLabelText("Spam"));
    });
    expect(getByRole("button", { name: "Enviar denúncia" }).props.accessibilityState.disabled).toBe(false);

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Enviar denúncia" }));
    });

    expect(mockDenunciar).toHaveBeenCalledWith({ entidadeTipo: "postagem", entidadeId: "p1", motivo: "spam", descricao: undefined });
    expect(mockAnnounce).toHaveBeenCalledWith("Denúncia enviada. Nossa equipe vai analisar.");
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("envia a descrição junto quando preenchida", async () => {
    mockDenunciar.mockResolvedValue({ id: "d1", status: "pendente" });
    const { getByLabelText, getByRole } = await renderTela();

    await act(async () => {
      fireEvent.press(getByLabelText("Assédio"));
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Descrição (opcional)"), "Aconteceu isto...");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Enviar denúncia" }));
    });

    expect(mockDenunciar).toHaveBeenCalledWith({ entidadeTipo: "postagem", entidadeId: "p1", motivo: "assedio", descricao: "Aconteceu isto..." });
  });

  it("trocar de motivo troca qual opção fica marcada (só uma por vez)", async () => {
    const { getByLabelText } = await renderTela();

    await act(async () => {
      fireEvent.press(getByLabelText("Spam"));
    });
    expect(getByLabelText("Spam").props.accessibilityState.checked).toBe(true);

    await act(async () => {
      fireEvent.press(getByLabelText("Fraude ou golpe"));
    });
    expect(getByLabelText("Fraude ou golpe").props.accessibilityState.checked).toBe(true);
    expect(getByLabelText("Spam").props.accessibilityState.checked).toBe(false);
  });

  it("erro ao enviar (ex.: denúncia duplicada → 409) mostra mensagem amigável, sem voltar", async () => {
    const erro = Object.assign(new Error("409"), {
      isAxiosError: true,
      response: { data: { mensagem: "Você já denunciou isso e a denúncia ainda está em análise." } },
    });
    mockDenunciar.mockRejectedValue(erro);
    const { getByLabelText, getByRole, findByText } = await renderTela();

    await act(async () => {
      fireEvent.press(getByLabelText("Spam"));
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Enviar denúncia" }));
    });

    expect(await findByText("Você já denunciou isso e a denúncia ainda está em análise.")).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
