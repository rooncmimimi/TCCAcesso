/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockListarBloqueados = jest.fn();
const mockDesbloquear = jest.fn();

jest.mock("../../moderacao", () => ({
  ...jest.requireActual("../../moderacao"),
  ModeracaoService: {
    listarBloqueados: (...a: unknown[]) => mockListarBloqueados(...a),
    desbloquear: (...a: unknown[]) => mockDesbloquear(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { BlockedUsersScreen } from "../BlockedUsersScreen";

const usuario = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "u2",
  nome: "Beatriz Souza",
  fotoPerfil: null,
  tipoUsuario: "candidato",
  ...sobrescreve,
});

const envelope = (bloqueados: unknown[], extra: Partial<Record<string, unknown>> = {}) => ({
  sucesso: true,
  total: bloqueados.length,
  pagina: 1,
  limite: 20,
  totalPaginas: bloqueados.length > 0 ? 1 : 0,
  bloqueados,
  ...extra,
});

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <BlockedUsersScreen />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("BlockedUsersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra loading no primeiro carregamento, depois a lista", async () => {
    mockListarBloqueados.mockResolvedValue(envelope([usuario()]));
    const { findByText } = await renderTela();

    expect(await findByText("Beatriz Souza")).toBeTruthy();
    expect(mockListarBloqueados).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  // Fase 26 (polish): a lista inteira era um `View` fixo sem `ScrollView`
  // nenhum por baixo — corrigido pra um `ScrollView` com puxar-para-atualizar.
  it("puxar para atualizar refaz a MESMA página aberta", async () => {
    mockListarBloqueados.mockResolvedValueOnce(envelope([usuario()], { pagina: 2, totalPaginas: 2, total: 21 }));
    const { getByTestId, findByText } = await renderTela();
    await findByText("Beatriz Souza");

    let resolver: (valor: unknown) => void = () => {};
    mockListarBloqueados.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    const scroll = getByTestId("bloqueados-scroll");
    await act(async () => {
      scroll.props.refreshControl.props.onRefresh();
    });

    expect(getByTestId("bloqueados-scroll").props.refreshControl.props.refreshing).toBe(true);
    expect(mockListarBloqueados).toHaveBeenLastCalledWith({ page: 2, limit: 20 });

    await act(async () => {
      resolver(envelope([usuario({ nome: "Carlos Atualizado" })], { pagina: 2, totalPaginas: 2, total: 21 }));
    });

    expect(await findByText("Carlos Atualizado")).toBeTruthy();
    expect(getByTestId("bloqueados-scroll").props.refreshControl.props.refreshing).toBe(false);
  });

  it("resposta vazia mostra o estado vazio, sem paginador", async () => {
    mockListarBloqueados.mockResolvedValue(envelope([]));
    const { findByText, queryByText } = await renderTela();

    expect(await findByText("Você não bloqueou ninguém ainda.")).toBeTruthy();
    expect(queryByText("Próxima página")).toBeNull();
  });

  it("toque em 'Desbloquear' chama o serviço e tira da lista", async () => {
    mockListarBloqueados.mockResolvedValue(envelope([usuario()]));
    mockDesbloquear.mockResolvedValue(false);
    const { getByRole, findByText, queryByText } = await renderTela();
    await findByText("Beatriz Souza");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Desbloquear" }));
    });

    expect(mockDesbloquear).toHaveBeenCalledWith("u2");
    await waitFor(() => expect(queryByText("Beatriz Souza")).toBeNull());
  });

  it("erro ao desbloquear mostra mensagem amigável, sem tirar da lista", async () => {
    mockListarBloqueados.mockResolvedValue(envelope([usuario()]));
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockDesbloquear.mockRejectedValue(erro);
    const { getByRole, findByText } = await renderTela();
    await findByText("Beatriz Souza");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Desbloquear" }));
    });

    expect(
      await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
    ).toBeTruthy();
    expect(await findByText("Beatriz Souza")).toBeTruthy();
  });

  it("falha no primeiro carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListarBloqueados.mockRejectedValueOnce(erro);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar seus bloqueios")).toBeTruthy();

    mockListarBloqueados.mockResolvedValueOnce(envelope([usuario()]));
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Beatriz Souza")).toBeTruthy();
  });

  it("com mais de uma página, 'Próxima página' busca a página 2", async () => {
    mockListarBloqueados.mockResolvedValueOnce(envelope([usuario()], { totalPaginas: 2, total: 21 }));
    const { getByRole, findByText } = await renderTela();
    await findByText("Beatriz Souza");

    mockListarBloqueados.mockResolvedValueOnce(envelope([usuario({ id: "u3", nome: "Carlos Lima" })], { pagina: 2, totalPaginas: 2, total: 21 }));
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Próxima página" }));
    });

    await waitFor(() => expect(mockListarBloqueados).toHaveBeenLastCalledWith({ page: 2, limit: 20 }));
    expect(await findByText("Carlos Lima")).toBeTruthy();
  });
});
