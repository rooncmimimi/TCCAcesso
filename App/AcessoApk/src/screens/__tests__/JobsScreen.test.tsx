/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockListar = jest.fn();

jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: { listar: (...args: unknown[]) => mockListar(...args) },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList, AppTabParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { JobsScreen } from "../JobsScreen";

const vaga = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "...",
  modalidade: "Remoto",
  cidade: "São Paulo",
  estado: "SP",
  status: "Aberta",
  empresa: { id: "e1", nomeFantasia: "ACME" },
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
// Cast justificado (Fase 9, item 24): `JobsScreen` é a primeira tela do app
// que recebe `navigation` como PROP (via `CompositeScreenProps`, não
// `useNavigation()`) — testar isso exige simular só a superfície realmente
// usada (`navigate`), não implementar toda a interface de navegação real.
const navigationMock = {
  navigate: mockNavigate,
} as unknown as NativeStackScreenProps<AppStackParamList, "Tabs">["navigation"] &
  NativeStackScreenProps<AppTabParamList, "Jobs">["navigation"];

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        {/* @ts-expect-error -- route não é usado pela tela, só navigation; mock mínimo de propósito. */}
        <JobsScreen navigation={navigationMock} route={{ key: "Jobs", name: "Jobs" }} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("JobsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra loading no primeiro carregamento, depois a lista", async () => {
    mockListar.mockResolvedValue(envelope([vaga()]));
    const { findByText } = await renderTela();

    expect(await findByText("Desenvolvedor Front-end")).toBeTruthy();
    expect(await findByText("ACME")).toBeTruthy();
    expect(mockListar).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("resposta vazia (total=0) mostra o estado vazio, sem paginador", async () => {
    mockListar.mockResolvedValue(envelope([]));
    const { findByText, queryByText } = await renderTela();

    expect(await findByText("Nenhuma vaga encontrada")).toBeTruthy();
    expect(queryByText("Próxima página")).toBeNull();
  });

  it("toque num item navega para VagaDetail com o vagaId certo", async () => {
    mockListar.mockResolvedValue(envelope([vaga()]));
    const { getByRole } = await renderTela();

    const item = await waitFor(() => getByRole("button", { name: /Desenvolvedor Front-end/ }));
    await act(async () => {
      fireEvent.press(item);
    });

    expect(mockNavigate).toHaveBeenCalledWith("VagaDetail", { vagaId: "v1" });
  });

  it("com mais de uma página, 'Próxima página' busca a página 2 e desabilita 'Página anterior' na primeira página", async () => {
    mockListar.mockResolvedValueOnce(envelope([vaga()], { totalPaginas: 2, total: 11 }));
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    expect(getByRole("button", { name: "Página anterior" }).props.accessibilityState.disabled).toBe(true);

    mockListar.mockResolvedValueOnce(
      envelope([vaga({ id: "v2", titulo: "Analista de Dados" })], { pagina: 2, totalPaginas: 2, total: 11 }),
    );
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Próxima página" }));
    });

    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 2, limit: 10 }));
    expect(await findByText("Analista de Dados")).toBeTruthy();
  });

  it("na última página, 'Próxima página' fica desabilitado", async () => {
    mockListar.mockResolvedValue(envelope([vaga()], { pagina: 2, totalPaginas: 2, total: 11 }));
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    expect(getByRole("button", { name: "Próxima página" }).props.accessibilityState.disabled).toBe(true);
  });

  it("falha no primeiro carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("erro de rede"), { isAxiosError: true });
    mockListar.mockRejectedValue(erro);
    const { findByText } = await renderTela();

    expect(await findByText("Não foi possível carregar as vagas")).toBeTruthy();
    expect(await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.")).toBeTruthy();
  });

  it("falha ao trocar de página preserva a lista atual (não apaga nada)", async () => {
    mockListar.mockResolvedValueOnce(envelope([vaga()], { totalPaginas: 2, total: 11 }));
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListar.mockRejectedValueOnce(erro);
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Próxima página" }));
    });

    // A vaga da página 1 continua na tela — não sumiu por causa do erro.
    expect(await findByText("Desenvolvedor Front-end")).toBeTruthy();
    expect(
      await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
    ).toBeTruthy();
  });

  it("duplo toque em 'Próxima página' dispara só uma busca (o próprio botão desabilita)", async () => {
    mockListar.mockResolvedValueOnce(envelope([vaga()], { totalPaginas: 3, total: 21 }));
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    let resolver: (valor: unknown) => void = () => {};
    mockListar.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    const botao = getByRole("button", { name: "Próxima página" });
    await act(async () => {
      fireEvent.press(botao);
    });
    // segundo toque, já com a busca em voo: o botão já está desabilitado
    // (accessibilityState.disabled) e o RN nem chama onPress de novo.
    await act(async () => {
      fireEvent.press(botao);
    });

    await act(async () => {
      resolver(envelope([vaga({ id: "v2" })], { pagina: 2, totalPaginas: 3, total: 21 }));
    });

    expect(mockListar).toHaveBeenCalledTimes(2); // 1 da carga inicial + 1 da página 2 (não 3)
  });
});
