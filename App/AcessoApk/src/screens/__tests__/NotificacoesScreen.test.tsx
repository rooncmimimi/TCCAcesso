/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockListar = jest.fn();
const mockContarNaoLidas = jest.fn();
const mockMarcarComoLida = jest.fn();
const mockMarcarTodasComoLidas = jest.fn();
const mockRemover = jest.fn();

jest.mock("../../notificacoes", () => ({
  ...jest.requireActual("../../notificacoes"),
  NotificacaoService: {
    listar: (...args: unknown[]) => mockListar(...args),
    contarNaoLidas: (...args: unknown[]) => mockContarNaoLidas(...args),
    marcarComoLida: (...args: unknown[]) => mockMarcarComoLida(...args),
    marcarTodasComoLidas: (...args: unknown[]) => mockMarcarTodasComoLidas(...args),
    remover: (...args: unknown[]) => mockRemover(...args),
  },
}));

const mockAceitarSolicitacao = jest.fn();
const mockRecusarSolicitacao = jest.fn();

jest.mock("../../seguidores", () => ({
  ...jest.requireActual("../../seguidores"),
  SeguidorService: {
    aceitarSolicitacao: (...args: unknown[]) => mockAceitarSolicitacao(...args),
    recusarSolicitacao: (...args: unknown[]) => mockRecusarSolicitacao(...args),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AcessibilidadeProvider } from "../../acessibilidade";
import type { AppStackParamList, AbasParamList } from "../../navigation/types";
import { TemaProvider } from "../../tema";
import { NotificacoesScreen } from "../NotificacoesScreen";

const notificacao = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "n1",
  usuarioId: "u1",
  tipo: "feed",
  titulo: "Nova curtida na sua publicação",
  descricao: "Beatriz Souza curtiu sua publicação.",
  lida: false,
  subtipo: "curtida_postagem",
  entidadeTipo: "postagem",
  entidadeId: "p1",
  atorId: "u2",
  ator: { id: "u2", nome: "Beatriz Souza", fotoPerfil: null },
  criadoEm: "2026-01-01T10:00:00.000Z",
  atualizadoEm: "2026-01-01T10:00:00.000Z",
  ...sobrescreve,
});

const envelope = (notificacoes: unknown[], extra: Partial<Record<string, unknown>> = {}) => ({
  sucesso: true,
  total: notificacoes.length,
  pagina: 1,
  limite: 15,
  totalPaginas: notificacoes.length > 0 ? 1 : 0,
  notificacoes,
  ...extra,
});

const mockNavigate = jest.fn();
const navigationMock = {
  navigate: mockNavigate,
} as unknown as NativeStackScreenProps<AppStackParamList, "Tabs">["navigation"] &
  NativeStackScreenProps<AbasParamList, "Notifications">["navigation"];

async function renderTela() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        {/* @ts-expect-error -- route não é usado pela tela, só navigation; mock mínimo de propósito. */}
        <NotificacoesScreen navigation={navigationMock} route={{ key: "Notifications", name: "Notifications" }} />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("NotificacoesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra loading no primeiro carregamento, depois a lista", async () => {
    mockListar.mockResolvedValue(envelope([notificacao()]));
    const { findByText } = await renderTela();

    expect(await findByText("Nova curtida na sua publicação")).toBeTruthy();
    expect(await findByText("Beatriz Souza curtiu sua publicação.")).toBeTruthy();
    expect(mockListar).toHaveBeenCalledWith({ page: 1, limit: 15 });
  });

  it("mostra o título 'Notificações' no topo da tela", async () => {
    mockListar.mockResolvedValue(envelope([]));
    const { findByText } = await renderTela();

    expect(await findByText("Notificações")).toBeTruthy();
  });

  it("avatar do ator renderiza as iniciais; sem ator, mostra o sino", async () => {
    mockListar.mockResolvedValue(
      envelope([notificacao(), notificacao({ id: "n2", ator: null, atorId: null, titulo: "Senha alterada", entidadeTipo: null })]),
    );
    const { findByText } = await renderTela();

    expect(await findByText("BS")).toBeTruthy();
    expect(await findByText("🔔")).toBeTruthy();
  });

  it("resposta vazia mostra o estado vazio", async () => {
    mockListar.mockResolvedValue(envelope([]));
    const { findByText } = await renderTela();

    expect(await findByText("Nenhuma notificação ainda")).toBeTruthy();
  });

  it("falha no primeiro carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListar.mockRejectedValue(erro);
    const { findByText } = await renderTela();

    expect(await findByText("Não foi possível carregar suas notificações")).toBeTruthy();
  });

  describe("tocar numa notificação", () => {
    it("entidadeTipo 'postagem' → marca como lida e navega para PostagemDetail", async () => {
      mockListar.mockResolvedValue(envelope([notificacao()]));
      mockMarcarComoLida.mockResolvedValue({ ...notificacao(), lida: true });
      const { getByRole } = await renderTela();

      const item = await waitFor(() => getByRole("button", { name: /Nova curtida na sua publicação/ }));
      await act(async () => {
        fireEvent.press(item);
      });

      expect(mockNavigate).toHaveBeenCalledWith("PostagemDetail", { postagemId: "p1" });
      await waitFor(() => expect(mockMarcarComoLida).toHaveBeenCalledWith("n1"));
    });

    it("entidadeTipo 'usuario' → navega para PublicProfile", async () => {
      mockListar.mockResolvedValue(
        envelope([notificacao({ titulo: "Você tem um novo seguidor", entidadeTipo: "usuario", entidadeId: "u2" })]),
      );
      mockMarcarComoLida.mockResolvedValue({});
      const { getByRole } = await renderTela();

      const item = await waitFor(() => getByRole("button", { name: /Você tem um novo seguidor/ }));
      await act(async () => {
        fireEvent.press(item);
      });

      expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u2" });
    });

    it("entidadeTipo 'vaga' → navega para VagaDetail", async () => {
      mockListar.mockResolvedValue(
        envelope([notificacao({ titulo: "Sua candidatura avançou", entidadeTipo: "vaga", entidadeId: "v1" })]),
      );
      mockMarcarComoLida.mockResolvedValue({});
      const { getByRole } = await renderTela();

      const item = await waitFor(() => getByRole("button", { name: /Sua candidatura avançou/ }));
      await act(async () => {
        fireEvent.press(item);
      });

      expect(mockNavigate).toHaveBeenCalledWith("VagaDetail", { vagaId: "v1" });
    });

    it("solicitação de seguimento pendente → toque no corpo navega para o perfil do ator (sem tela própria de 'solicitação')", async () => {
      mockListar.mockResolvedValue(
        envelope([
          notificacao({
            titulo: "Nova solicitação para seguir você",
            subtipo: "solicitacao_seguimento",
            entidadeTipo: "solicitacao_seguimento",
            entidadeId: "s1",
          }),
        ]),
      );
      mockMarcarComoLida.mockResolvedValue({});
      const { getByRole } = await renderTela();

      const item = await waitFor(() => getByRole("button", { name: /Nova solicitação para seguir você/ }));
      await act(async () => {
        fireEvent.press(item);
      });

      expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u2" });
    });

    it("entidadeTipo sem tela correspondente (ex.: 'conversa') → marca como lida, mas não navega", async () => {
      mockListar.mockResolvedValue(
        envelope([notificacao({ titulo: "Nova mensagem recebida", entidadeTipo: "conversa", entidadeId: "c1" })]),
      );
      mockMarcarComoLida.mockResolvedValue({});
      const { getByRole } = await renderTela();

      const item = await waitFor(() => getByRole("button", { name: /Nova mensagem recebida/ }));
      await act(async () => {
        fireEvent.press(item);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      await waitFor(() => expect(mockMarcarComoLida).toHaveBeenCalledWith("n1"));
    });

    it("notificação já lida: toque navega de novo, mas não chama marcarComoLida outra vez", async () => {
      mockListar.mockResolvedValue(envelope([notificacao({ lida: true })]));
      const { getByRole } = await renderTela();

      const item = await waitFor(() => getByRole("button", { name: /Nova curtida na sua publicação/ }));
      await act(async () => {
        fireEvent.press(item);
      });

      expect(mockNavigate).toHaveBeenCalledWith("PostagemDetail", { postagemId: "p1" });
      expect(mockMarcarComoLida).not.toHaveBeenCalled();
    });

    it("rótulo de acessibilidade prefixa 'Não lida.' quando ainda não lida", async () => {
      mockListar.mockResolvedValue(envelope([notificacao({ lida: false })]));
      const { getByRole } = await renderTela();

      expect(await waitFor(() => getByRole("button", { name: /^Não lida\. Nova curtida na sua publicação/ }))).toBeTruthy();
    });
  });

  describe("marcar todas como lidas", () => {
    it("só aparece quando há alguma não lida, e some depois de usado", async () => {
      mockListar.mockResolvedValue(envelope([notificacao({ lida: false })]));
      mockMarcarTodasComoLidas.mockResolvedValue(undefined);
      const { getByRole, queryByRole, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      const botao = getByRole("button", { name: "Marcar todas como lidas" });
      await act(async () => {
        fireEvent.press(botao);
      });

      expect(mockMarcarTodasComoLidas).toHaveBeenCalled();
      await waitFor(() => expect(queryByRole("button", { name: "Marcar todas como lidas" })).toBeNull());
    });

    it("todas já lidas: o botão nunca aparece", async () => {
      mockListar.mockResolvedValue(envelope([notificacao({ lida: true })]));
      const { queryByRole, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      expect(queryByRole("button", { name: "Marcar todas como lidas" })).toBeNull();
    });
  });

  describe("remover notificação", () => {
    it("toca em 'Remover' → chama o serviço e tira da lista", async () => {
      mockListar.mockResolvedValue(envelope([notificacao()]));
      mockRemover.mockResolvedValue(undefined);
      const { getByLabelText, queryByText, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      await act(async () => {
        fireEvent.press(getByLabelText("Remover notificação"));
      });

      expect(mockRemover).toHaveBeenCalledWith("n1");
      await waitFor(() => expect(queryByText("Nova curtida na sua publicação")).toBeNull());
      // Remover não deve também navegar (o Pressable de fora não deveria capturar o toque).
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("solicitação de seguimento — aceitar/recusar", () => {
    function notificacaoSolicitacao() {
      return notificacao({
        titulo: "Nova solicitação para seguir você",
        subtipo: "solicitacao_seguimento",
        entidadeTipo: "solicitacao_seguimento",
        entidadeId: "s1",
      });
    }

    it("aceitar chama SeguidorService.aceitarSolicitacao e mostra confirmação", async () => {
      mockListar.mockResolvedValue(envelope([notificacaoSolicitacao()]));
      mockAceitarSolicitacao.mockResolvedValue(undefined);
      mockMarcarComoLida.mockResolvedValue({});
      const { getByRole, findByText } = await renderTela();
      await findByText("Nova solicitação para seguir você");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Aceitar" }));
      });

      expect(mockAceitarSolicitacao).toHaveBeenCalledWith("s1");
      expect(await findByText("Solicitação aceita.")).toBeTruthy();
      // Os botões de ação somem depois de resolvida.
      expect(() => getByRole("button", { name: "Aceitar" })).toThrow();
    });

    it("recusar chama SeguidorService.recusarSolicitacao e mostra confirmação", async () => {
      mockListar.mockResolvedValue(envelope([notificacaoSolicitacao()]));
      mockRecusarSolicitacao.mockResolvedValue(undefined);
      mockMarcarComoLida.mockResolvedValue({});
      const { getByRole, findByText } = await renderTela();
      await findByText("Nova solicitação para seguir você");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Recusar" }));
      });

      expect(mockRecusarSolicitacao).toHaveBeenCalledWith("s1");
      expect(await findByText("Solicitação recusada.")).toBeTruthy();
    });

    it("erro ao aceitar mostra mensagem amigável e mantém os botões", async () => {
      mockListar.mockResolvedValue(envelope([notificacaoSolicitacao()]));
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockAceitarSolicitacao.mockRejectedValue(erro);
      const { getByRole, findByText } = await renderTela();
      await findByText("Nova solicitação para seguir você");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Aceitar" }));
      });

      expect(await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.")).toBeTruthy();
      expect(getByRole("button", { name: "Aceitar" })).toBeTruthy();
    });
  });

  describe("paginação incremental", () => {
    it("scroll até o fim (onEndReached) busca a próxima página e acumula", async () => {
      mockListar.mockResolvedValueOnce(envelope([notificacao()], { totalPaginas: 2, total: 16 }));
      const { getByTestId, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      mockListar.mockResolvedValueOnce(
        envelope([notificacao({ id: "n2", titulo: "Novo comentário" })], { pagina: 2, totalPaginas: 2, total: 16 }),
      );
      await act(async () => {
        fireEvent(getByTestId("notificacoes-lista"), "onEndReached");
      });

      await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 2, limit: 15 }));
      expect(await findByText("Novo comentário")).toBeTruthy();
    });

    it("múltiplos onEndReached seguidos disparam só 1 busca da próxima página", async () => {
      mockListar.mockResolvedValueOnce(envelope([notificacao()], { totalPaginas: 2, total: 16 }));
      const { getByTestId, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      let resolver: (valor: unknown) => void = () => {};
      mockListar.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

      const lista = getByTestId("notificacoes-lista");
      await act(async () => {
        fireEvent(lista, "onEndReached");
        fireEvent(lista, "onEndReached");
        fireEvent(lista, "onEndReached");
      });

      await act(async () => {
        resolver(envelope([notificacao({ id: "n2" })], { pagina: 2, totalPaginas: 2, total: 16 }));
      });

      expect(mockListar).toHaveBeenCalledTimes(2);
    });

    it("não busca além da última página", async () => {
      mockListar.mockResolvedValue(envelope([notificacao()], { pagina: 2, totalPaginas: 2, total: 16 }));
      const { getByTestId, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      await act(async () => {
        fireEvent(getByTestId("notificacoes-lista"), "onEndReached");
      });

      expect(mockListar).toHaveBeenCalledTimes(1);
    });

    it("deduplica por id entre páginas", async () => {
      mockListar.mockResolvedValueOnce(envelope([notificacao()], { totalPaginas: 2, total: 2 }));
      const { getByTestId, findAllByText, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      mockListar.mockResolvedValueOnce(envelope([notificacao()], { pagina: 2, totalPaginas: 2, total: 2 }));
      await act(async () => {
        fireEvent(getByTestId("notificacoes-lista"), "onEndReached");
      });

      await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 2, limit: 15 }));
      expect(await findAllByText("Nova curtida na sua publicação")).toHaveLength(1);
    });

    it("falha ao buscar a próxima página preserva a lista já carregada", async () => {
      mockListar.mockResolvedValueOnce(envelope([notificacao()], { totalPaginas: 2, total: 16 }));
      const { getByTestId, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockListar.mockRejectedValueOnce(erro);
      await act(async () => {
        fireEvent(getByTestId("notificacoes-lista"), "onEndReached");
      });

      expect(await findByText("Nova curtida na sua publicação")).toBeTruthy();
      expect(
        await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
      ).toBeTruthy();
    });
  });

  describe("pull-to-refresh", () => {
    it("puxar para atualizar refaz a página 1", async () => {
      mockListar.mockResolvedValueOnce(envelope([notificacao()]));
      const { getByTestId, findByText } = await renderTela();
      await findByText("Nova curtida na sua publicação");

      mockListar.mockResolvedValueOnce(envelope([notificacao({ id: "n2", titulo: "Nova publicação chegou" })]));
      // `RefreshControl` é um componente nativo: `fireEvent` não alcança o
      // native event "refresh" dele via testID neste renderer de testes;
      // chamar `onRefresh` direto (a mesma função que o gesto de puxar
      // dispara de verdade) testa o comportamento real sem depender de
      // simular o gesto nativo em si.
      const lista = getByTestId("notificacoes-lista");
      await act(async () => {
        lista.props.refreshControl.props.onRefresh();
      });

      await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 1, limit: 15 }));
      expect(await findByText("Nova publicação chegou")).toBeTruthy();
    });
  });
});
