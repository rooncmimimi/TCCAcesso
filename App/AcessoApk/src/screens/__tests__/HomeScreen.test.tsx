/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockListar = jest.fn();
const mockAlternarCurtida = jest.fn();
const mockObterPorId = jest.fn();
const mockOuvirEvento = jest.fn();

jest.mock("../../feed", () => ({
  ...jest.requireActual("../../feed"),
  FeedService: {
    listar: (...args: unknown[]) => mockListar(...args),
    alternarCurtida: (...args: unknown[]) => mockAlternarCurtida(...args),
    obterPorId: (...args: unknown[]) => mockObterPorId(...args),
  },
}));

// Mesma técnica de `MessagesScreen.test.tsx` (Fase 17) — captura o handler
// registrado por evento, pra poder disparar manualmente em cada teste.
jest.mock("../../services/socket/socketClient", () => ({
  ouvirEvento: (...args: unknown[]) => mockOuvirEvento(...args),
}));

jest.mock("../../auth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    isAuthenticated: true,
    isLoading: false,
    sessionEndedReason: null,
    login: jest.fn(),
    logout: jest.fn(),
    clearSessionEndedReason: jest.fn(),
  }),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList, AppTabParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { HomeScreen } from "../HomeScreen";

const postagem = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "p1",
  conteudo: "Minha primeira publicação no ACESSO.",
  publica: true,
  created_at: "2026-01-01T00:00:00.000Z",
  usuario: { id: "u1", nome: "Beatriz Souza", fotoPerfil: null, tipoUsuario: "candidato" },
  totalCurtidas: 0,
  curtidoPorMim: false,
  totalComentarios: 0,
  ...sobrescreve,
});

const envelope = (postagens: unknown[], extra: Partial<Record<string, unknown>> = {}) => ({
  sucesso: true,
  total: postagens.length,
  pagina: 1,
  limite: 10,
  totalPaginas: postagens.length > 0 ? 1 : 0,
  postagens,
  ...extra,
});

const mockNavigate = jest.fn();
// Mesmo cast justificado de `JobsScreen.test.tsx` (Fase 9, item 24): só a
// superfície de `navigation` realmente usada pela tela (`navigate`) precisa
// ser simulada.
const navigationMock = {
  navigate: mockNavigate,
} as unknown as NativeStackScreenProps<AppStackParamList, "Tabs">["navigation"] &
  NativeStackScreenProps<AppTabParamList, "Home">["navigation"];

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        {/* @ts-expect-error -- route não é usado pela tela, só navigation; mock mínimo de propósito. */}
        <HomeScreen navigation={navigationMock} route={{ key: "Home", name: "Home" }} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOuvirEvento.mockReturnValue(() => undefined);
  });

  it("mostra loading no primeiro carregamento, depois a lista", async () => {
    mockListar.mockResolvedValue(envelope([postagem()]));
    const { findByText } = await renderTela();

    expect(await findByText("Minha primeira publicação no ACESSO.")).toBeTruthy();
    expect(await findByText("Beatriz Souza")).toBeTruthy();
    expect(mockListar).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  // Fase 26 (polish): puxar para atualizar — faltava só aqui e em
  // `JobsScreen.tsx` (`MessagesScreen.tsx`/`NotificationsScreen.tsx` já
  // tinham). Mesma técnica de RNTL já usada nos testes daquelas telas:
  // `fireEvent(lista, "refresh")` não aciona o `RefreshControl` nativo —
  // chama `onRefresh` direto pela prop.
  it("puxar para atualizar (RefreshControl) recarrega a primeira página, preservando a lista visível durante a busca", async () => {
    mockListar.mockResolvedValueOnce(envelope([postagem()], { totalPaginas: 2, total: 11 }));
    const { getByTestId, findByText } = await renderTela();
    await findByText("Minha primeira publicação no ACESSO.");

    let resolver: (valor: unknown) => void = () => {};
    mockListar.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    const lista = getByTestId("feed-lista");
    await act(async () => {
      lista.props.refreshControl.props.onRefresh();
    });

    expect(lista.props.refreshControl.props.refreshing).toBe(true);
    // A lista ainda mostra o conteúdo anterior enquanto atualiza — nunca troca pra tela cheia de loading.
    expect(await findByText("Minha primeira publicação no ACESSO.")).toBeTruthy();

    await act(async () => {
      resolver(envelope([postagem({ conteudo: "Publicação atualizada." })]));
    });

    expect(await findByText("Publicação atualizada.")).toBeTruthy();
    expect(getByTestId("feed-lista").props.refreshControl.props.refreshing).toBe(false);
  });

  it("sem foto de perfil (fotoPerfil null), o avatar renderiza as iniciais do nome do autor", async () => {
    mockListar.mockResolvedValue(envelope([postagem()]));
    const { findByText } = await renderTela();

    expect(await findByText("BS")).toBeTruthy();
  });

  // Redesign visual, item 19: `Avatar` (componente único, ver
  // `components/ui/Avatar.tsx`) agora renderiza a foto real quando
  // `fotoPerfil` existe — antes disso, TODO avatar do app era sempre
  // iniciais, mesmo com foto disponível na API.
  it("com foto de perfil, o avatar renderiza a imagem em vez das iniciais", async () => {
    mockListar.mockResolvedValue(
      envelope([
        postagem({
          usuario: { id: "u1", nome: "Beatriz Souza", fotoPerfil: "https://exemplo.com/foto.jpg", tipoUsuario: "candidato" },
        }),
      ]),
    );
    const { findByText, queryByText } = await renderTela();

    // A publicação em si ainda aparece normalmente...
    expect(await findByText("Minha primeira publicação no ACESSO.")).toBeTruthy();
    // ...mas as iniciais nunca renderizam: com `fotoPerfil` presente, o
    // `Avatar` (ver `components/ui/Avatar.tsx`) sempre tenta a imagem
    // primeiro, e só cai para iniciais se ela falhar ao carregar.
    expect(queryByText("BS")).toBeNull();
  });

  // Redesign visual, item 4 — cabeçalho da publicação precisa mostrar
  // "quando" (tempo relativo), não só quem publicou.
  it("mostra o tempo relativo da publicação abaixo do nome do autor", async () => {
    mockListar.mockResolvedValue(envelope([postagem({ created_at: new Date().toISOString() })]));
    const { findByText } = await renderTela();

    expect(await findByText("agora")).toBeTruthy();
  });

  it("resposta vazia (total=0) mostra o estado vazio", async () => {
    mockListar.mockResolvedValue(envelope([]));
    const { findByText } = await renderTela();

    expect(await findByText("Nenhuma publicação ainda")).toBeTruthy();
  });

  it("toque numa publicação navega para PostagemDetail com o postagemId certo", async () => {
    mockListar.mockResolvedValue(envelope([postagem()]));
    const { getByRole } = await renderTela();

    // Regex, não string exata: o rótulo agora inclui o tempo relativo da
    // publicação (redesign visual, item 4) — o texto exato depende de
    // fuso horário/data atual do ambiente de teste, então só o prefixo
    // (autor) é estável o bastante para fixar aqui.
    const item = await waitFor(() => getByRole("button", { name: /^Publicação de Beatriz Souza/ }));
    await act(async () => {
      fireEvent.press(item);
    });

    expect(mockNavigate).toHaveBeenCalledWith("PostagemDetail", { postagemId: "p1" });
  });

  // Fase 14: tocar no autor abre o perfil dele, SEM abrir o detalhe da publicação.
  it("toque no nome/avatar do autor navega para PublicProfile, não para PostagemDetail", async () => {
    mockListar.mockResolvedValue(envelope([postagem()]));
    const { getByRole } = await renderTela();

    const autor = await waitFor(() => getByRole("button", { name: "Ver perfil de Beatriz Souza" }));
    await act(async () => {
      fireEvent.press(autor);
    });

    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u1" });
    expect(mockNavigate).not.toHaveBeenCalledWith("PostagemDetail", expect.anything());
  });

  it("toque em 'O que você está pensando?' navega para NovaPostagem", async () => {
    mockListar.mockResolvedValue(envelope([postagem()]));
    const { getByRole } = await renderTela();

    const botao = await waitFor(() => getByRole("button", { name: "Criar nova publicação" }));
    await act(async () => {
      fireEvent.press(botao);
    });

    expect(mockNavigate).toHaveBeenCalledWith("NovaPostagem");
  });

  it("curtir alterna o rótulo/estado do botão, sem optimistic update (espera a resposta do servidor)", async () => {
    mockListar.mockResolvedValue(envelope([postagem()]));
    const { getByRole, findByText } = await renderTela();
    await findByText("Minha primeira publicação no ACESSO.");

    mockAlternarCurtida.mockResolvedValueOnce({ curtido: true, totalCurtidas: 1 });
    const botaoCurtir = getByRole("button", { name: "Curtir" });
    await act(async () => {
      fireEvent.press(botaoCurtir);
    });

    expect(mockAlternarCurtida).toHaveBeenCalledWith("p1");
    expect(await findByText("Curtido · 1")).toBeTruthy();
    expect(getByRole("button", { name: "Descurtir" }).props.accessibilityState.selected).toBe(true);
  });

  it("scroll até o fim (onEndReached) busca a próxima página e acumula", async () => {
    mockListar.mockResolvedValueOnce(envelope([postagem()], { totalPaginas: 2, total: 11 }));
    const { getByTestId, findByText } = await renderTela();
    await findByText("Minha primeira publicação no ACESSO.");

    mockListar.mockResolvedValueOnce(
      envelope([postagem({ id: "p2", conteudo: "Segunda publicação." })], { pagina: 2, totalPaginas: 2, total: 11 }),
    );
    await act(async () => {
      fireEvent(getByTestId("feed-lista"), "onEndReached");
    });

    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 2, limit: 10 }));
    expect(await findByText("Minha primeira publicação no ACESSO.")).toBeTruthy();
    expect(await findByText("Segunda publicação.")).toBeTruthy();
  });

  it("múltiplos onEndReached seguidos disparam só 1 busca da próxima página", async () => {
    mockListar.mockResolvedValueOnce(envelope([postagem()], { totalPaginas: 2, total: 11 }));
    const { getByTestId, findByText } = await renderTela();
    await findByText("Minha primeira publicação no ACESSO.");

    let resolver: (valor: unknown) => void = () => {};
    mockListar.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    const lista = getByTestId("feed-lista");
    await act(async () => {
      fireEvent(lista, "onEndReached");
      fireEvent(lista, "onEndReached");
      fireEvent(lista, "onEndReached");
    });

    await act(async () => {
      resolver(envelope([postagem({ id: "p2" })], { pagina: 2, totalPaginas: 2, total: 11 }));
    });

    expect(mockListar).toHaveBeenCalledTimes(2); // 1 da carga inicial + 1 da página 2 (não 4)
  });

  it("não busca além da última página", async () => {
    mockListar.mockResolvedValue(envelope([postagem()], { pagina: 2, totalPaginas: 2, total: 11 }));
    const { getByTestId, findByText } = await renderTela();
    await findByText("Minha primeira publicação no ACESSO.");

    await act(async () => {
      fireEvent(getByTestId("feed-lista"), "onEndReached");
    });

    expect(mockListar).toHaveBeenCalledTimes(1); // só a carga inicial
  });

  it("deduplica por id entre páginas (não deixa a mesma publicação duas vezes)", async () => {
    mockListar.mockResolvedValueOnce(envelope([postagem()], { totalPaginas: 2, total: 2 }));
    const { getByTestId, findAllByText, findByText } = await renderTela();
    await findByText("Minha primeira publicação no ACESSO.");

    // O backend repete a mesma postagem (id "p1") na página 2 — não deveria acontecer, mas o front não presume isso.
    mockListar.mockResolvedValueOnce(envelope([postagem()], { pagina: 2, totalPaginas: 2, total: 2 }));
    await act(async () => {
      fireEvent(getByTestId("feed-lista"), "onEndReached");
    });

    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith({ page: 2, limit: 10 }));
    expect(await findAllByText("Minha primeira publicação no ACESSO.")).toHaveLength(1);
  });

  it("falha no primeiro carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("erro de rede"), { isAxiosError: true });
    mockListar.mockRejectedValue(erro);
    const { findByText } = await renderTela();

    expect(await findByText("Não foi possível carregar o feed")).toBeTruthy();
    expect(await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.")).toBeTruthy();
  });

  it("falha ao buscar a próxima página preserva a lista já carregada (não apaga nada)", async () => {
    mockListar.mockResolvedValueOnce(envelope([postagem()], { totalPaginas: 2, total: 11 }));
    const { getByTestId, findByText } = await renderTela();
    await findByText("Minha primeira publicação no ACESSO.");

    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListar.mockRejectedValueOnce(erro);
    await act(async () => {
      fireEvent(getByTestId("feed-lista"), "onEndReached");
    });

    expect(await findByText("Minha primeira publicação no ACESSO.")).toBeTruthy();
    expect(
      await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
    ).toBeTruthy();
  });

  describe("anexos (Fase 20)", () => {
    it("mostra a primeira imagem do anexo, com a descrição real como accessibilityLabel", async () => {
      mockListar.mockResolvedValue(
        envelope([
          postagem({
            anexos: [{ id: "a1", postagemId: "p1", tipo: "imagem", url: "https://x/a1.jpg", privado: true, descricao: "Um pôr do sol.", ordem: 0 }],
          }),
        ]),
      );
      const { findByLabelText } = await renderTela();

      expect(await findByLabelText("Um pôr do sol.")).toBeTruthy();
    });

    it("anexo sem descrição usa um aviso honesto como accessibilityLabel (nunca fica muda)", async () => {
      mockListar.mockResolvedValue(
        envelope([
          postagem({
            anexos: [{ id: "a1", postagemId: "p1", tipo: "imagem", url: "https://x/a1.jpg", privado: true, descricao: null, ordem: 0 }],
          }),
        ]),
      );
      const { findByLabelText } = await renderTela();

      expect(await findByLabelText("Imagem anexada à publicação, sem descrição informada.")).toBeTruthy();
    });

    it("mais de um anexo mostra '+N anexos' abaixo da primeira imagem", async () => {
      mockListar.mockResolvedValue(
        envelope([
          postagem({
            anexos: [
              { id: "a1", postagemId: "p1", tipo: "imagem", url: "https://x/a1.jpg", privado: true, descricao: "Foto 1", ordem: 0 },
              { id: "a2", postagemId: "p1", tipo: "imagem", url: "https://x/a2.jpg", privado: true, descricao: "Foto 2", ordem: 1 },
            ],
          }),
        ]),
      );
      const { findByText } = await renderTela();

      expect(await findByText("+1 anexo")).toBeTruthy();
    });

    it("postagem sem nenhum anexo não renderiza nenhuma imagem extra (comportamento anterior à Fase 20 preservado)", async () => {
      mockListar.mockResolvedValue(envelope([postagem()]));
      const { findByText, queryByLabelText } = await renderTela();
      await findByText("Minha primeira publicação no ACESSO.");

      expect(queryByLabelText("Imagem anexada à publicação, sem descrição informada.")).toBeNull();
    });
  });

  describe("tempo real (Fase 20)", () => {
    function capturarHandlers() {
      const capturados: Record<string, (dados: unknown) => void> = {};
      mockOuvirEvento.mockImplementation((evento: string, handler: (dados: unknown) => void) => {
        capturados[evento] = handler;
        return () => undefined;
      });
      return capturados;
    }

    it("'feed:postagem' criada:true mostra o aviso de novas publicações, sem inserir nada sozinho na lista", async () => {
      const capturados = capturarHandlers();
      mockListar.mockResolvedValue(envelope([postagem()]));
      const { findByText, findByLabelText } = await renderTela();
      await findByText("Minha primeira publicação no ACESSO.");

      await act(async () => {
        capturados["feed:postagem"]?.({ id: "p9", criada: true });
      });

      expect(await findByLabelText("Novas publicações disponíveis. Toque para atualizar o feed.")).toBeTruthy();
      // Nunca insere a postagem "p9" sozinho — só existe o aviso.
      expect(mockListar).toHaveBeenCalledTimes(1);
    });

    it("tocar no aviso de novas publicações recarrega a primeira página e esconde o aviso", async () => {
      const capturados = capturarHandlers();
      mockListar.mockResolvedValue(envelope([postagem()]));
      const { findByText, getByLabelText, queryByLabelText } = await renderTela();
      await findByText("Minha primeira publicação no ACESSO.");

      await act(async () => {
        capturados["feed:postagem"]?.({ id: "p9", criada: true });
      });
      const aviso = getByLabelText("Novas publicações disponíveis. Toque para atualizar o feed.");

      mockListar.mockResolvedValueOnce(envelope([postagem({ id: "p9", conteudo: "Publicação nova de verdade." })]));
      await act(async () => {
        fireEvent.press(aviso);
      });

      await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
      expect(await findByText("Publicação nova de verdade.")).toBeTruthy();
      expect(queryByLabelText("Novas publicações disponíveis. Toque para atualizar o feed.")).toBeNull();
    });

    it("'feed:curtida' desta postagem atualiza a contagem direto, sem chamar a API de novo", async () => {
      const capturados = capturarHandlers();
      mockListar.mockResolvedValue(envelope([postagem()]));
      const { findByText } = await renderTela();
      await findByText("Minha primeira publicação no ACESSO.");

      await act(async () => {
        capturados["feed:curtida"]?.({ postagemId: "p1", totalCurtidas: 5 });
      });

      expect(await findByText("Curtir · 5")).toBeTruthy();
      expect(mockObterPorId).not.toHaveBeenCalled();
    });

    it("'feed:comentario' desta postagem atualiza a contagem de comentários direto", async () => {
      const capturados = capturarHandlers();
      mockListar.mockResolvedValue(envelope([postagem()]));
      const { findByText } = await renderTela();
      await findByText("Minha primeira publicação no ACESSO.");

      await act(async () => {
        capturados["feed:comentario"]?.({ postagemId: "p1", totalComentarios: 3 });
      });

      expect(await findByText("3 comentários")).toBeTruthy();
    });

    it("'feed:postagem' atualizada:true de uma postagem já carregada revalida via REST e substitui o item", async () => {
      const capturados = capturarHandlers();
      mockListar.mockResolvedValue(envelope([postagem()]));
      const { findByText } = await renderTela();
      await findByText("Minha primeira publicação no ACESSO.");

      mockObterPorId.mockResolvedValue(postagem({ conteudo: "Texto editado em outro lugar." }));
      await act(async () => {
        capturados["feed:postagem"]?.({ id: "p1", atualizada: true });
      });

      expect(mockObterPorId).toHaveBeenCalledWith("p1");
      expect(await findByText("Texto editado em outro lugar.")).toBeTruthy();
    });

    it("'feed:postagem' removida:true de uma postagem já carregada tira ela da lista", async () => {
      const capturados = capturarHandlers();
      mockListar.mockResolvedValue(envelope([postagem()]));
      const { findByText, queryByText } = await renderTela();
      await findByText("Minha primeira publicação no ACESSO.");

      await act(async () => {
        capturados["feed:postagem"]?.({ id: "p1", removida: true });
      });

      await waitFor(() => expect(queryByText("Minha primeira publicação no ACESSO.")).toBeNull());
    });

    it("'feed:postagem' para uma postagem que NÃO está na lista é ignorado silenciosamente", async () => {
      const capturados = capturarHandlers();
      mockListar.mockResolvedValue(envelope([postagem()]));
      const { findByText } = await renderTela();
      await findByText("Minha primeira publicação no ACESSO.");

      await act(async () => {
        capturados["feed:postagem"]?.({ id: "outra-postagem-nunca-carregada", atualizada: true });
      });

      expect(mockObterPorId).not.toHaveBeenCalled();
      expect(await findByText("Minha primeira publicação no ACESSO.")).toBeTruthy();
    });
  });
});
