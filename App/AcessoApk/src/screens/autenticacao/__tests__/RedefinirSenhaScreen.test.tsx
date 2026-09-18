/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockRedefinirSenha = jest.fn();
const mockAnnounce = jest.fn();

jest.mock("../../../autenticacao", () => ({
  AutenticacaoService: {
    redefinirSenha: (...args: unknown[]) => mockRedefinirSenha(...args),
  },
}));

// Preserva o `AcessibilidadeProvider`/`useAcessibilidade` reais (o
// `TemaProvider` depende deles) e troca só `anunciarParaLeitorDeTela` por
// um espião: mockar o módulo inteiro sem isso quebraria a árvore de
// providers que a própria tela precisa para renderizar.
jest.mock("../../../acessibilidade", () => ({
  ...jest.requireActual("../../../acessibilidade"),
  anunciarParaLeitorDeTela: (...args: unknown[]) => mockAnnounce(...args),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../../acessibilidade";
import { TemaProvider } from "../../../tema";
import { RedefinirSenhaScreen } from "../RedefinirSenhaScreen";

async function renderTela() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <RedefinirSenhaScreen emailInicial="ana@exemplo.com" onVoltar={jest.fn()} onConcluido={jest.fn()} />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

/**
 * Cobre o anúncio da troca do formulário pelo card de sucesso; não é uma suíte completa da tela.
 */
describe("RedefinirSenhaScreen — acessibilidade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ao redefinir a senha com sucesso, anuncia a mudança de tela via anunciarParaLeitorDeTela", async () => {
    mockRedefinirSenha.mockResolvedValue(undefined);
    const { getByLabelText, getByRole, findByText } = await renderTela();

    await act(async () => {
      fireEvent.changeText(getByLabelText("Código"), "123456");
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Nova senha"), "SenhaForte#1");
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Confirmar nova senha"), "SenhaForte#1");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Redefinir senha" }));
    });

    expect(await findByText("Senha redefinida")).toBeTruthy();
    expect(mockAnnounce).toHaveBeenCalledWith("Senha redefinida com sucesso.");
  });
});
