/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockMinhas = jest.fn();

jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: { minhas: (...args: unknown[]) => mockMinhas(...args) },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { ProfileStackParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { MyJobsScreen } from "../MyJobsScreen";

const vaga = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "...",
  modalidade: "Remoto",
  status: "Aberta",
  totalCandidaturas: 3,
  ...sobrescreve,
});

const envelope = (vagas: unknown[], extra: Partial<Record<string, unknown>> = {}) => ({
  sucesso: true,
  total: vagas.length,
  pagina: 1,
  limite: 10,
  totalPaginas: vagas.length > 0 ? 1 : 0,
  vagas,
  ...extra,
});

const mockNavigate = jest.fn();
const navigationMock = { navigate: mockNavigate } as unknown as NativeStackScreenProps<ProfileStackParamList, "MyJobs">["navigation"];

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <MyJobsScreen navigation={navigationMock} route={{ key: "MyJobs", name: "MyJobs" }} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("MyJobsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra loading no primeiro carregamento, depois a lista com status e total de candidaturas", async () => {
    mockMinhas.mockResolvedValue(envelope([vaga()]));
    const { findByText } = await renderTela();

    expect(await findByText("Desenvolvedor Front-end")).toBeTruthy();
    expect(await findByText("Aberta")).toBeTruthy();
    expect(await findByText("3 candidaturas")).toBeTruthy();
    expect(mockMinhas).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  // Fase 26 (polish): puxar para atualizar — faltava aqui.
  it("puxar para atualizar refaz a MESMA página aberta", async () => {
    mockMinhas.mockResolvedValueOnce(envelope([vaga()], { pagina: 2, totalPaginas: 2, total: 11 }));
    const { getByTestId, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    let resolver: (valor: unknown) => void = () => {};
    mockMinhas.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    const scroll = getByTestId("minhas-vagas-scroll");
    await act(async () => {
      scroll.props.refreshControl.props.onRefresh();
    });

    expect(getByTestId("minhas-vagas-scroll").props.refreshControl.props.refreshing).toBe(true);
    expect(mockMinhas).toHaveBeenLastCalledWith({ page: 2, limit: 10 });

    await act(async () => {
      resolver(envelope([vaga({ titulo: "Vaga atualizada" })], { pagina: 2, totalPaginas: 2, total: 11 }));
    });

    expect(await findByText("Vaga atualizada")).toBeTruthy();
    expect(getByTestId("minhas-vagas-scroll").props.refreshControl.props.refreshing).toBe(false);
  });

  it("resposta vazia mostra o estado vazio, sem paginador", async () => {
    mockMinhas.mockResolvedValue(envelope([]));
    const { findByText, queryByText } = await renderTela();

    expect(await findByText("Nenhuma vaga publicada ainda")).toBeTruthy();
    expect(queryByText("Próxima página")).toBeNull();
  });

  it("toque em 'Nova vaga' navega para JobForm sem vagaId", async () => {
    mockMinhas.mockResolvedValue(envelope([]));
    const { getByRole } = await renderTela();

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Nova vaga" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("JobForm", {});
  });

  it("toque numa vaga navega para JobApplicants com vagaId e vagaTitulo", async () => {
    mockMinhas.mockResolvedValue(envelope([vaga()]));
    const { getByRole } = await renderTela();

    const item = await waitFor(() => getByRole("button", { name: /Desenvolvedor Front-end/ }));
    await act(async () => {
      fireEvent.press(item);
    });

    expect(mockNavigate).toHaveBeenCalledWith("JobApplicants", { vagaId: "v1", vagaTitulo: "Desenvolvedor Front-end" });
  });

  it("vaga pausada/encerrada mostra o selo certo", async () => {
    mockMinhas.mockResolvedValue(envelope([vaga({ id: "v2", status: "Pausada" }), vaga({ id: "v3", status: "Encerrada" })]));
    const { findByText } = await renderTela();

    expect(await findByText("Pausada")).toBeTruthy();
    expect(await findByText("Encerrada")).toBeTruthy();
  });

  it("com mais de uma página, 'Próxima página' busca a página 2", async () => {
    mockMinhas.mockResolvedValueOnce(envelope([vaga()], { totalPaginas: 2, total: 11 }));
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    mockMinhas.mockResolvedValueOnce(envelope([vaga({ id: "v2", titulo: "Analista de Dados" })], { pagina: 2, totalPaginas: 2, total: 11 }));
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Próxima página" }));
    });

    await waitFor(() => expect(mockMinhas).toHaveBeenLastCalledWith({ page: 2, limit: 10 }));
    expect(await findByText("Analista de Dados")).toBeTruthy();
  });

  it("falha no primeiro carregamento (ex.: empresa não aprovada) mostra a mensagem do backend em tela cheia", async () => {
    const erro = Object.assign(new Error("403"), {
      isAxiosError: true,
      response: { data: { mensagem: "Sua empresa está aguardando aprovação da equipe do ACESSO." } },
    });
    mockMinhas.mockRejectedValue(erro);
    const { findByText } = await renderTela();

    expect(await findByText("Não foi possível carregar suas vagas")).toBeTruthy();
    expect(await findByText("Sua empresa está aguardando aprovação da equipe do ACESSO.")).toBeTruthy();
  });
});
