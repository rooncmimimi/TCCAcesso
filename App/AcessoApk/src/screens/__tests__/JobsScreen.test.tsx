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

  // Redesign visual, item 12 — mesmo gap de título de página já corrigido
  // em `MessagesScreen`/`NotificationsScreen`; aqui o título vem com um
  // subtítulo (contagem), então também cobre o singular.
  it("mostra o título 'Vagas' com a contagem no singular", async () => {
    mockListar.mockResolvedValue(envelope([vaga()]));
    const { findByText } = await renderTela();

    expect(await findByText("Vagas")).toBeTruthy();
    expect(await findByText("1 oportunidade encontrada")).toBeTruthy();
  });

  it("com mais de uma vaga, a contagem do título vai para o plural", async () => {
    mockListar.mockResolvedValue(envelope([vaga({ id: "v1" }), vaga({ id: "v2", titulo: "Analista" })]));
    const { findByText } = await renderTela();

    expect(await findByText("2 oportunidades encontradas")).toBeTruthy();
  });

  // Fase 26 (polish): puxar para atualizar — faltava aqui (e em `HomeScreen.tsx`).
  it("puxar para atualizar refaz a MESMA página aberta, não pula pra página 1", async () => {
    mockListar.mockResolvedValueOnce(envelope([vaga()], { pagina: 2, totalPaginas: 2, total: 11 }));
    const { getByTestId, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    let resolver: (valor: unknown) => void = () => {};
    mockListar.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    const lista = getByTestId("vagas-lista");
    await act(async () => {
      lista.props.refreshControl.props.onRefresh();
    });

    expect(lista.props.refreshControl.props.refreshing).toBe(true);
    expect(mockListar).toHaveBeenLastCalledWith({ page: 2, limit: 10 });

    await act(async () => {
      resolver(envelope([vaga({ titulo: "Vaga atualizada" })], { pagina: 2, totalPaginas: 2, total: 11 }));
    });

    expect(await findByText("Vaga atualizada")).toBeTruthy();
    expect(getByTestId("vagas-lista").props.refreshControl.props.refreshing).toBe(false);
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

  // Fase R1 (recomendada): filtros e busca de vagas.
  describe("filtros e busca (Fase R1)", () => {
    it("buscar por texto volta pra página 1 com `search`", async () => {
      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      const { findByText, getByPlaceholderText, getByRole } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("Buscar por título, descrição..."), "analista");
      });
      mockListar.mockResolvedValueOnce(envelope([vaga({ id: "v2", titulo: "Analista de Dados" })]));
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Buscar" }));
      });

      expect(mockListar).toHaveBeenLastCalledWith({ page: 1, limit: 10, search: "analista" });
      expect(await findByText("Analista de Dados")).toBeTruthy();
    });

    it("botão 'Filtros' sem filtro nenhum não tem selo de contagem", async () => {
      mockListar.mockResolvedValue(envelope([vaga()]));
      const { findByText, getByRole } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      expect(getByRole("button", { name: "Filtros" })).toBeTruthy();
    });

    it("aplicar cidade + modalidade no modal busca com os dois parâmetros e mostra o selo (2)", async () => {
      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      const { findByText, getByRole, getByLabelText, getByPlaceholderText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Filtros" }));
      });
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("Ex.: São Paulo"), "Campinas");
      });
      await act(async () => {
        fireEvent.press(getByLabelText("Remoto"));
      });

      mockListar.mockResolvedValueOnce(envelope([vaga({ id: "v2", cidade: "Campinas" })]));
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Aplicar filtros" }));
      });

      expect(mockListar).toHaveBeenLastCalledWith({ page: 1, limit: 10, cidade: "Campinas", modalidade: "Remoto" });
      expect(await findByText("Filtros (2)")).toBeTruthy();
    });

    it("selecionar mais de um recurso de acessibilidade envia a lista inteira", async () => {
      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      const { findByText, getByRole, getByLabelText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Filtros" }));
      });
      await act(async () => {
        fireEvent.press(getByLabelText("Intérprete de Libras"));
      });
      await act(async () => {
        fireEvent.press(getByLabelText("Ambiente físico acessível"));
      });

      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Aplicar filtros" }));
      });

      expect(mockListar).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        recursosAcessibilidade: ["interprete_libras", "ambiente_fisico_acessivel"],
      });
    });

    it("'Fechar' descarta o rascunho sem aplicar nada", async () => {
      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      const { findByText, getByRole, getByPlaceholderText, queryByPlaceholderText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Filtros" }));
      });
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("Ex.: São Paulo"), "Recife");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Fechar filtros" }));
      });

      expect(queryByPlaceholderText("Ex.: São Paulo")).toBeNull(); // modal fechou
      expect(mockListar).toHaveBeenCalledTimes(1); // só a carga inicial — nada foi aplicado
      expect(getByRole("button", { name: "Filtros" })).toBeTruthy(); // sem selo, nada ficou ativo
    });

    it("'Limpar filtros' zera busca e filtros e refaz a consulta sem nenhum parâmetro extra", async () => {
      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      const { findByText, getByRole, getByPlaceholderText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("Buscar por título, descrição..."), "algo");
      });
      mockListar.mockResolvedValueOnce(envelope([vaga({ titulo: "Filtrado" })]));
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Buscar" }));
      });
      await findByText("Filtrado");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Filtros" }));
      });
      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Limpar filtros" }));
      });

      expect(mockListar).toHaveBeenLastCalledWith({ page: 1, limit: 10 });
      expect(getByPlaceholderText("Buscar por título, descrição...").props.value).toBe("");
    });

    it("nenhum resultado com filtro ativo mostra mensagem específica e permite limpar direto do estado vazio", async () => {
      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      const { findByText, getByRole, getByPlaceholderText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText("Buscar por título, descrição..."), "inexistente");
      });
      mockListar.mockResolvedValueOnce(envelope([]));
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Buscar" }));
      });

      expect(await findByText("Nenhuma vaga corresponde à busca ou aos filtros atuais.")).toBeTruthy();

      mockListar.mockResolvedValueOnce(envelope([vaga()]));
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Limpar filtros" }));
      });

      expect(mockListar).toHaveBeenLastCalledWith({ page: 1, limit: 10 });
      expect(await findByText("Desenvolvedor Front-end")).toBeTruthy();
    });
  });
});
