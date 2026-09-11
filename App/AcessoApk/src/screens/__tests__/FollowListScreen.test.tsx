/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockListarSeguidores = jest.fn();
const mockListarSeguindo = jest.fn();

jest.mock("../../seguidores", () => ({
  ...jest.requireActual("../../seguidores"),
  SeguidorService: {
    listarSeguidores: (...a: unknown[]) => mockListarSeguidores(...a),
    listarSeguindo: (...a: unknown[]) => mockListarSeguindo(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { FollowListScreen } from "../FollowListScreen";

const mockPush = jest.fn();
const navigationMock = { push: mockPush } as unknown as NativeStackScreenProps<AppStackParamList, "FollowList">["navigation"];

async function renderTela(modo: "seguidores" | "seguindo" = "seguidores") {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <FollowListScreen
          navigation={navigationMock}
          route={{ key: "FollowList", name: "FollowList", params: { usuarioId: "u1", modo } }}
        />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

const envelopeSeguidores = (itens: unknown[], extra: Partial<Record<string, unknown>> = {}) => ({
  sucesso: true,
  total: itens.length,
  pagina: 1,
  limite: 20,
  totalPaginas: itens.length > 0 ? 1 : 0,
  seguidores: itens,
  ...extra,
});

describe("FollowListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("modo 'seguidores': chama listarSeguidores e mostra a lista", async () => {
    mockListarSeguidores.mockResolvedValue(envelopeSeguidores([{ id: "u2", nome: "Bia", tipoUsuario: "candidato" }]));
    const { findByText } = await renderTela("seguidores");

    expect(await findByText("Bia")).toBeTruthy();
    expect(mockListarSeguidores).toHaveBeenCalledWith("u1", { page: 1, limit: 20 });
    expect(mockListarSeguindo).not.toHaveBeenCalled();
  });

  // Fase 26 (polish): puxar para atualizar — faltava aqui.
  it("puxar para atualizar refaz a MESMA página aberta", async () => {
    mockListarSeguidores.mockResolvedValueOnce(
      envelopeSeguidores([{ id: "u2", nome: "Bia", tipoUsuario: "candidato" }], { pagina: 2, totalPaginas: 2, total: 21 }),
    );
    const { getByTestId, findByText } = await renderTela("seguidores");
    await findByText("Bia");

    let resolver: (valor: unknown) => void = () => {};
    mockListarSeguidores.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    const lista = getByTestId("follow-lista");
    await act(async () => {
      lista.props.refreshControl.props.onRefresh();
    });

    expect(getByTestId("follow-lista").props.refreshControl.props.refreshing).toBe(true);
    expect(mockListarSeguidores).toHaveBeenLastCalledWith("u1", { page: 2, limit: 20 });

    await act(async () => {
      resolver(envelopeSeguidores([{ id: "u2", nome: "Bia Atualizada", tipoUsuario: "candidato" }], { pagina: 2, totalPaginas: 2, total: 21 }));
    });

    expect(await findByText("Bia Atualizada")).toBeTruthy();
    expect(getByTestId("follow-lista").props.refreshControl.props.refreshing).toBe(false);
  });

  it("modo 'seguindo': chama listarSeguindo", async () => {
    mockListarSeguindo.mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 20, totalPaginas: 0, seguindo: [] });
    await renderTela("seguindo");

    expect(mockListarSeguindo).toHaveBeenCalledWith("u1", { page: 1, limit: 20 });
    expect(mockListarSeguidores).not.toHaveBeenCalled();
  });

  it("lista vazia (seguidores) mostra a mensagem certa", async () => {
    mockListarSeguidores.mockResolvedValue(envelopeSeguidores([]));
    const { findByText } = await renderTela("seguidores");

    expect(await findByText("Ninguém segue este perfil ainda.")).toBeTruthy();
  });

  it("lista vazia (seguindo) mostra a mensagem certa", async () => {
    mockListarSeguindo.mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 20, totalPaginas: 0, seguindo: [] });
    const { findByText } = await renderTela("seguindo");

    expect(await findByText("Este perfil ainda não segue ninguém.")).toBeTruthy();
  });

  it("tocar num item empilha (push) o perfil público dele", async () => {
    mockListarSeguidores.mockResolvedValue(envelopeSeguidores([{ id: "u2", nome: "Bia", tipoUsuario: "candidato" }]));
    const { getByRole } = await renderTela("seguidores");

    const item = await waitFor(() => getByRole("button", { name: "Abrir perfil de Bia" }));
    await act(async () => {
      fireEvent.press(item);
    });

    expect(mockPush).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u2" });
  });

  it("falha no primeiro carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListarSeguidores.mockRejectedValueOnce(erro);
    const { findByText, getByRole } = await renderTela("seguidores");

    expect(
      await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
    ).toBeTruthy();

    mockListarSeguidores.mockResolvedValueOnce(envelopeSeguidores([{ id: "u2", nome: "Bia", tipoUsuario: "candidato" }]));
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Bia")).toBeTruthy();
  });

  it("com mais de uma página, 'Próxima página' busca a página 2", async () => {
    mockListarSeguidores.mockResolvedValueOnce(
      envelopeSeguidores([{ id: "u2", nome: "Bia", tipoUsuario: "candidato" }], { totalPaginas: 2, total: 25 }),
    );
    const { getByRole, findByText } = await renderTela("seguidores");
    await findByText("Bia");

    mockListarSeguidores.mockResolvedValueOnce(
      envelopeSeguidores([{ id: "u3", nome: "Caio", tipoUsuario: "candidato" }], { pagina: 2, totalPaginas: 2, total: 25 }),
    );
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Próxima página" }));
    });

    expect(await findByText("Caio")).toBeTruthy();
    expect(mockListarSeguidores).toHaveBeenLastCalledWith("u1", { page: 2, limit: 20 });
  });
});
