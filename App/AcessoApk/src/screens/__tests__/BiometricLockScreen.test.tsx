/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockDesbloquear = jest.fn();
const mockLogout = jest.fn();
const mockAnnounce = jest.fn();

jest.mock("../../seguranca", () => ({
  useSeguranca: () => ({ desbloquear: mockDesbloquear }),
}));

jest.mock("../../auth", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

jest.mock("../../accessibility", () => ({
  ...jest.requireActual("../../accessibility"),
  announceForAccessibility: (...a: unknown[]) => mockAnnounce(...a),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { BiometricLockScreen } from "../BiometricLockScreen";

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <BiometricLockScreen />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("BiometricLockScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ao montar, já tenta desbloquear sozinha (sem exigir toque)", async () => {
    mockDesbloquear.mockResolvedValue({ success: true });
    await renderTela();

    await waitFor(() => expect(mockDesbloquear).toHaveBeenCalledTimes(1));
  });

  it("sucesso: anuncia 'Desbloqueado.' e não mostra nenhum erro", async () => {
    mockDesbloquear.mockResolvedValue({ success: true });
    const { queryByRole } = await renderTela();

    await waitFor(() => expect(mockAnnounce).toHaveBeenCalledWith("Desbloqueado."));
    expect(queryByRole("alert")).toBeNull();
  });

  it("cancelamento do usuário (user_cancel) não mostra nenhuma mensagem de erro", async () => {
    mockDesbloquear.mockResolvedValue({ success: false, error: "user_cancel" });
    const { queryByRole } = await renderTela();

    await waitFor(() => expect(mockDesbloquear).toHaveBeenCalled());
    expect(queryByRole("alert")).toBeNull();
  });

  it("lockout mostra uma mensagem explicando o motivo", async () => {
    mockDesbloquear.mockResolvedValue({ success: false, error: "lockout" });
    const { findByText } = await renderTela();

    expect(await findByText(/Muitas tentativas/)).toBeTruthy();
  });

  it("tocar em 'Desbloquear' chama desbloquear() de novo", async () => {
    mockDesbloquear.mockResolvedValue({ success: false, error: "authentication_failed" });
    const { getByRole } = await renderTela();

    await waitFor(() => expect(mockDesbloquear).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Desbloquear" }));
    });

    expect(mockDesbloquear).toHaveBeenCalledTimes(2);
  });

  it("'Sair' sempre disponível — chama logout mesmo sem nunca ter tentado desbloquear com sucesso", async () => {
    mockDesbloquear.mockResolvedValue({ success: false, error: "not_enrolled" });
    const { getByRole } = await renderTela();
    await waitFor(() => expect(mockDesbloquear).toHaveBeenCalled());

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Sair" }));
    });

    expect(mockLogout).toHaveBeenCalled();
  });
});
