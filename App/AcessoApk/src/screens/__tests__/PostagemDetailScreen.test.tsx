/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockObterPorId = jest.fn();
const mockAlternarCurtida = jest.fn();
const mockListarComentarios = jest.fn();
const mockCriarComentario = jest.fn();
const mockRemoverComentario = jest.fn();
const mockAtualizar = jest.fn();
const mockRemover = jest.fn();
const mockAtualizarDescricaoAnexo = jest.fn();
const mockObterUrlAnexo = jest.fn();
const mockOuvirEvento = jest.fn();
const mockAnnounce = jest.fn();

jest.mock("../../feed", () => ({
  ...jest.requireActual("../../feed"),
  FeedService: {
    obterPorId: (...args: unknown[]) => mockObterPorId(...args),
    alternarCurtida: (...args: unknown[]) => mockAlternarCurtida(...args),
    listarComentarios: (...args: unknown[]) => mockListarComentarios(...args),
    criarComentario: (...args: unknown[]) => mockCriarComentario(...args),
    removerComentario: (...args: unknown[]) => mockRemoverComentario(...args),
    atualizar: (...args: unknown[]) => mockAtualizar(...args),
    remover: (...args: unknown[]) => mockRemover(...args),
    atualizarDescricaoAnexo: (...args: unknown[]) => mockAtualizarDescricaoAnexo(...args),
    obterUrlAnexo: (...args: unknown[]) => mockObterUrlAnexo(...args),
  },
}));

// Mesma técnica de `MessagesScreen.test.tsx`/`HomeScreen.test.tsx` — captura o handler registrado por evento.
jest.mock("../../services/socket/socketClient", () => ({
  ouvirEvento: (...args: unknown[]) => mockOuvirEvento(...args),
}));

// Mesma técnica de `NovaPostagemScreen.test.tsx` — preserva o `AccessibilityProvider` real, troca só o anúncio por um espião.
jest.mock("../../accessibility", () => ({
  ...jest.requireActual("../../accessibility"),
  announceForAccessibility: (...args: unknown[]) => mockAnnounce(...args),
}));

// Fase 19: a tela passou a chamar `useAuth()` (pra esconder "Denunciar" no
// próprio conteúdo) — `"u9"` nunca bate com os autores de teste abaixo
// (`u1`/`u2`), então por padrão nada aqui é "meu conteúdo".
jest.mock("../../auth", () => ({
  useAuth: () => ({ user: { id: "u9", nome: "Quem Está Vendo", email: "vendo@exemplo.com", tipoUsuario: "candidato" } }),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { PostagemDetailScreen } from "../PostagemDetailScreen";

// Mesmo padrão de `JobApplicantsScreen.test.tsx` (Fase 18) — confirma a exclusão sem depender de um diálogo nativo de verdade.
let alertSpy: jest.SpyInstance;
function confirmarViaAlert(textoBotao: string) {
  const ultimaChamada = alertSpy.mock.calls[alertSpy.mock.calls.length - 1] as [string, string, { text: string; onPress?: () => void }[]];
  ultimaChamada[2].find((botao) => botao.text === textoBotao)?.onPress?.();
}

const postagem = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "p1",
  conteudo: "Minha publicação de teste.",
  publica: true,
  created_at: "2026-01-01T00:00:00.000Z",
  usuario: { id: "u1", nome: "Beatriz Souza", fotoPerfil: null, tipoUsuario: "candidato" },
  totalCurtidas: 0,
  curtidoPorMim: false,
  totalComentarios: 0,
  ...sobrescreve,
});

const comentario = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "c1",
  comentario: "Um comentário de teste.",
  created_at: "2026-01-01T01:00:00.000Z",
  usuario: { id: "u2", nome: "Carlos Lima" },
  respostas: [],
  ...sobrescreve,
});

const envelopeComentarios = (comentarios: unknown[]) => ({
  sucesso: true,
  total: comentarios.length,
  pagina: 1,
  limite: 50,
  totalPaginas: comentarios.length > 0 ? 1 : 0,
  comentarios,
});

type Nav = NativeStackScreenProps<AppStackParamList, "PostagemDetail">;

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

async function renderTela(postagemId = "p1") {
  const props = {
    route: { key: "PostagemDetail", name: "PostagemDetail", params: { postagemId } },
    navigation: { navigate: mockNavigate, goBack: mockGoBack },
  } as unknown as Nav;

  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <PostagemDetailScreen {...props} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("PostagemDetailScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert");
    mockOuvirEvento.mockReturnValue(() => undefined);
    // Fase 21: nenhum outro teste deste arquivo depende de `voiceEnabled` — limpa pra não vazar entre eles.
    await AsyncStorage.clear();
  });

  it("publicação e comentários carregam de forma independente — os dois aparecem quando ambos têm sucesso", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    mockListarComentarios.mockResolvedValue(envelopeComentarios([comentario()]));
    const { findByText } = await renderTela();

    expect(await findByText("Minha publicação de teste.")).toBeTruthy();
    expect(await findByText("Um comentário de teste.")).toBeTruthy();
    expect(mockObterPorId).toHaveBeenCalledWith("p1");
    expect(mockListarComentarios).toHaveBeenCalledWith("p1", { page: 1, limit: 50 });
  });

  it("falha só nos comentários NÃO esconde a publicação já carregada — mostra erro/retry restrito à seção", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockListarComentarios.mockRejectedValueOnce(erro);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Minha publicação de teste.")).toBeTruthy();
    expect(
      await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
    ).toBeTruthy();

    mockListarComentarios.mockResolvedValueOnce(envelopeComentarios([comentario()]));
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Um comentário de teste.")).toBeTruthy();
  });

  it("falha só na publicação mostra erro em tela cheia com retry, mesmo que os comentários tenham carregado", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockObterPorId.mockRejectedValueOnce(erro);
    mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar esta publicação")).toBeTruthy();

    mockObterPorId.mockResolvedValueOnce(postagem());
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Minha publicação de teste.")).toBeTruthy();
  });

  it("curtir alterna o rótulo/estado sem optimistic update (espera a resposta do servidor)", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
    mockAlternarCurtida.mockResolvedValueOnce({ curtido: true, totalCurtidas: 1 });
    const { getByRole, findByText } = await renderTela();
    await findByText("Minha publicação de teste.");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Curtir" }));
    });

    expect(mockAlternarCurtida).toHaveBeenCalledWith("p1");
    const botaoCurtido = await waitFor(() => getByRole("button", { name: "Descurtir" }));
    expect(botaoCurtido.props.accessibilityState.selected).toBe(true);
    expect(await findByText("Curtido · 1")).toBeTruthy();
  });

  it("comentar com sucesso limpa o campo, adiciona o comentário à lista e atualiza o contador (polite)", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
    mockCriarComentario.mockResolvedValueOnce(comentario());
    const { getByLabelText, getByRole, findByText } = await renderTela();
    await findByText("Minha publicação de teste.");

    await act(async () => {
      fireEvent.changeText(getByLabelText("Adicionar um comentário"), "Um comentário de teste.");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Comentar" }));
    });

    expect(mockCriarComentario).toHaveBeenCalledWith("p1", "Um comentário de teste.");
    expect(await findByText("Um comentário de teste.")).toBeTruthy();
    const contador = await findByText("Comentários (1)");
    expect(contador.props.accessibilityLiveRegion).toBe("polite");
    expect(getByLabelText("Adicionar um comentário").props.value).toBe("");
  });

  it("duplo toque em 'Comentar' dispara só uma chamada", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
    let resolver: (valor: unknown) => void = () => {};
    mockCriarComentario.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    const { getByLabelText, getByRole, findByText } = await renderTela();
    await findByText("Minha publicação de teste.");

    await act(async () => {
      fireEvent.changeText(getByLabelText("Adicionar um comentário"), "Texto.");
    });
    const botao = getByRole("button", { name: "Comentar" });
    await act(async () => { fireEvent.press(botao); });
    await act(async () => { fireEvent.press(botao); }); // já desabilitado (enviandoComentario)

    await act(async () => { resolver(comentario()); });

    expect(mockCriarComentario).toHaveBeenCalledTimes(1);
  });

  it("responder a um comentário de nível raiz envia comentarioPaiId e a resposta aparece indentada, sem a própria ação de responder", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    mockListarComentarios.mockResolvedValue(envelopeComentarios([comentario()]));
    mockCriarComentario.mockResolvedValueOnce(
      comentario({ id: "c2", comentario: "Uma resposta.", comentarioPaiId: "c1", usuario: { id: "u3", nome: "Diana" } }),
    );
    const { getByLabelText, getByRole, findByText, queryByLabelText } = await renderTela();
    await findByText("Um comentário de teste.");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Responder a Carlos Lima" }));
    });
    await act(async () => {
      fireEvent.changeText(getByLabelText("Responder a Carlos Lima"), "Uma resposta.");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Enviar resposta" }));
    });

    expect(mockCriarComentario).toHaveBeenCalledWith("p1", "Uma resposta.", "c1");
    expect(await findByText("Uma resposta.")).toBeTruthy();
    // A resposta em si não ganha um "Responder a Diana" — 1 nível só.
    expect(queryByLabelText("Responder a Diana")).toBeNull();
  });

  it("erro ao comentar mostra mensagem amigável com accessibilityRole=alert e accessibilityLiveRegion=assertive", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockCriarComentario.mockRejectedValue(erro);
    const { getByLabelText, getByRole, findByText } = await renderTela();
    await findByText("Minha publicação de teste.");

    await act(async () => {
      fireEvent.changeText(getByLabelText("Adicionar um comentário"), "Texto.");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Comentar" }));
    });

    const mensagem = await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    expect(mensagem.props.accessibilityRole).toBe("alert");
    expect(mensagem.props.accessibilityLiveRegion).toBe("assertive");
  });

  // Fase 14: navegação a partir do Feed.
  it("toque no autor da publicação navega para PublicProfile com o usuarioId certo", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
    const { getByRole, findByText } = await renderTela();
    await findByText("Minha publicação de teste.");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Ver perfil de Beatriz Souza" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u1" });
  });

  it("toque no autor de um comentário navega para PublicProfile com o usuarioId dele", async () => {
    mockObterPorId.mockResolvedValue(postagem());
    mockListarComentarios.mockResolvedValue(envelopeComentarios([comentario()]));
    const { getByRole, findByText } = await renderTela();
    await findByText("Um comentário de teste.");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Ver perfil de Carlos Lima" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u2" });
  });

  describe("denunciar (Fase 19)", () => {
    it("toque em 'Denunciar publicação' navega para Report com entidadeTipo 'postagem'", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { getByRole, findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Denunciar publicação" }));
      });

      expect(mockNavigate).toHaveBeenCalledWith("Report", { entidadeTipo: "postagem", entidadeId: "p1", tituloAlvo: "Beatriz Souza" });
    });

    it("minha própria publicação: não mostra 'Denunciar publicação'", async () => {
      mockObterPorId.mockResolvedValue(postagem({ usuario: { id: "u9", nome: "Quem Está Vendo", fotoPerfil: null, tipoUsuario: "candidato" } }));
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { queryByRole, findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      expect(queryByRole("button", { name: "Denunciar publicação" })).toBeNull();
    });

    it("toque em 'Denunciar comentário de X' navega para Report com entidadeTipo 'comentario'", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([comentario()]));
      const { getByRole, findByText } = await renderTela();
      await findByText("Um comentário de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Denunciar comentário de Carlos Lima" }));
      });

      expect(mockNavigate).toHaveBeenCalledWith("Report", { entidadeTipo: "comentario", entidadeId: "c1", tituloAlvo: "Carlos Lima" });
    });

    it("meu próprio comentário: não mostra 'Denunciar'", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(
        envelopeComentarios([comentario({ usuario: { id: "u9", nome: "Quem Está Vendo" } })]),
      );
      const { queryByRole, findByText } = await renderTela();
      await findByText("Um comentário de teste.");

      expect(queryByRole("button", { name: /Denunciar comentário/ })).toBeNull();
    });
  });

  describe("editar/excluir a própria publicação (Fase 20)", () => {
    const minhaPostagem = (sobrescreve: Partial<Record<string, unknown>> = {}) =>
      postagem({ usuario: { id: "u9", nome: "Quem Está Vendo", fotoPerfil: null, tipoUsuario: "candidato" }, ...sobrescreve });

    it("mostra 'Editar'/'Excluir' na própria publicação, nunca 'Denunciar'", async () => {
      mockObterPorId.mockResolvedValue(minhaPostagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { getByRole, queryByRole, findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      expect(getByRole("button", { name: "Editar publicação" })).toBeTruthy();
      expect(getByRole("button", { name: "Excluir publicação" })).toBeTruthy();
      expect(queryByRole("button", { name: "Denunciar publicação" })).toBeNull();
    });

    it("publicação de outra pessoa nunca mostra 'Editar'/'Excluir'", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { queryByRole, findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      expect(queryByRole("button", { name: "Editar publicação" })).toBeNull();
      expect(queryByRole("button", { name: "Excluir publicação" })).toBeNull();
    });

    it("editar: troca o conteúdo por um campo, salva chamando FeedService.atualizar e volta a mostrar o texto", async () => {
      mockObterPorId.mockResolvedValue(minhaPostagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      mockAtualizar.mockResolvedValue(minhaPostagem({ conteudo: "Texto editado." }));
      const { getByRole, getByLabelText, findByText, queryByLabelText } = await renderTela();
      await findByText("Minha publicação de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar publicação" }));
      });
      const campo = getByLabelText("Texto da publicação");
      await act(async () => {
        fireEvent.changeText(campo, "Texto editado.");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar" }));
      });

      expect(mockAtualizar).toHaveBeenCalledWith("p1", { conteudo: "Texto editado." });
      expect(await findByText("Texto editado.")).toBeTruthy();
      expect(queryByLabelText("Texto da publicação")).toBeNull(); // saiu do modo de edição
    });

    it("cancelar a edição não chama a API e mantém o texto original", async () => {
      mockObterPorId.mockResolvedValue(minhaPostagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { getByRole, findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar publicação" }));
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Cancelar" }));
      });

      expect(mockAtualizar).not.toHaveBeenCalled();
      expect(await findByText("Minha publicação de teste.")).toBeTruthy();
    });

    it("excluir pede confirmação (Alert); confirmando, chama remover, anuncia e volta", async () => {
      mockObterPorId.mockResolvedValue(minhaPostagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      mockRemover.mockResolvedValue({ mensagem: "Postagem removida com sucesso." });
      const { getByRole, findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir publicação" }));
      });
      expect(mockRemover).not.toHaveBeenCalled();

      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(mockRemover).toHaveBeenCalledWith("p1");
      expect(mockAnnounce).toHaveBeenCalledWith("Publicação removida.");
      expect(mockGoBack).toHaveBeenCalled();
    });

    it("erro ao excluir mostra mensagem amigável, sem voltar", async () => {
      mockObterPorId.mockResolvedValue(minhaPostagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockRemover.mockRejectedValue(erro);
      const { getByRole, findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir publicação" }));
      });
      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(
        await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
      ).toBeTruthy();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe("excluir o próprio comentário (Fase R6)", () => {
    const meuComentario = (sobrescreve: Partial<Record<string, unknown>> = {}) =>
      comentario({ id: "cmeu", usuario: { id: "u9", nome: "Quem Está Vendo" }, ...sobrescreve });

    it("mostra 'Excluir' só no próprio comentário, nunca no dos outros", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(
        envelopeComentarios([meuComentario({ comentario: "Meu comentário." }), comentario({ id: "coutro", comentario: "Comentário alheio." })]),
      );
      const { findByText, getByRole, queryByRole } = await renderTela();
      await findByText("Meu comentário.");

      // `getByRole` lança se houver mais de um — passar já prova que só o MEU comentário tem "Excluir".
      expect(getByRole("button", { name: "Excluir meu comentário" })).toBeTruthy();
      // O comentário alheio tem "Denunciar", nunca "Excluir".
      expect(getByRole("button", { name: "Denunciar comentário de Carlos Lima" })).toBeTruthy();
      expect(queryByRole("button", { name: "Denunciar comentário de Quem Está Vendo" })).toBeNull();
    });

    it("confirmar a exclusão chama a API, tira o comentário da lista e atualiza o contador", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([meuComentario({ comentario: "Vou apagar isto." })]));
      mockRemoverComentario.mockResolvedValue({ mensagem: "Comentário removido com sucesso." });
      const { findByText, getByRole, queryByText } = await renderTela();
      await findByText("Vou apagar isto.");
      expect(await findByText("Comentários (1)")).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir meu comentário" }));
      });
      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(mockRemoverComentario).toHaveBeenCalledWith("cmeu");
      expect(queryByText("Vou apagar isto.")).toBeNull();
      expect(await findByText("Comentários (0)")).toBeTruthy();
    });

    it("cancelar no diálogo não chama a API", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([meuComentario()]));
      const { findByText, getByRole } = await renderTela();
      await findByText("Um comentário de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir meu comentário" }));
      });
      await act(async () => {
        confirmarViaAlert("Cancelar");
      });

      expect(mockRemoverComentario).not.toHaveBeenCalled();
    });

    it("excluir uma RESPOSTA minha também funciona (1 nível)", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(
        envelopeComentarios([
          comentario({
            id: "craiz",
            comentario: "Comentário raiz de outra pessoa.",
            respostas: [{ id: "rmeu", comentario: "Minha resposta.", created_at: "2026-01-01T02:00:00.000Z", usuario: { id: "u9", nome: "Quem Está Vendo" } }],
          }),
        ]),
      );
      mockRemoverComentario.mockResolvedValue({ mensagem: "Comentário removido com sucesso." });
      const { findByText, getByRole, queryByText } = await renderTela();
      await findByText("Minha resposta.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir meu comentário" }));
      });
      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(mockRemoverComentario).toHaveBeenCalledWith("rmeu");
      expect(queryByText("Minha resposta.")).toBeNull();
      expect(await findByText("Comentário raiz de outra pessoa.")).toBeTruthy(); // o pai continua
    });

    it("falha na exclusão mantém o comentário e mostra a mensagem amigável", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([meuComentario({ comentario: "Continua aqui." })]));
      mockRemoverComentario.mockRejectedValueOnce(new Error("falhou"));
      const { findByText, getByRole } = await renderTela();
      await findByText("Continua aqui.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir meu comentário" }));
      });
      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(await findByText("Não foi possível excluir o comentário agora.")).toBeTruthy();
      expect(await findByText("Continua aqui.")).toBeTruthy();
    });
  });

  describe("anexos (Fase 20)", () => {
    const anexoImagem = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
      id: "a1",
      postagemId: "p1",
      tipo: "imagem",
      url: "https://x/a1.jpg",
      privado: true,
      descricao: "Uma foto de teste.",
      ordem: 0,
      ...sobrescreve,
    });

    it("mostra o anexo com a descrição real como accessibilityLabel", async () => {
      mockObterPorId.mockResolvedValue(postagem({ anexos: [anexoImagem()] }));
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByLabelText } = await renderTela();

      expect(await findByLabelText("Uma foto de teste.")).toBeTruthy();
    });

    it("anexo sem descrição usa um aviso honesto, com a opção de editar quando é minha publicação", async () => {
      mockObterPorId.mockResolvedValue(
        postagem({
          usuario: { id: "u9", nome: "Quem Está Vendo", fotoPerfil: null, tipoUsuario: "candidato" },
          anexos: [anexoImagem({ descricao: null })],
        }),
      );
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByLabelText, getByRole, findByText } = await renderTela();

      expect(await findByLabelText("Imagem anexada à publicação, sem descrição informada.")).toBeTruthy();
      expect(await findByText("Sem descrição.")).toBeTruthy();
      expect(getByRole("button", { name: "Editar descrição da imagem" })).toBeTruthy();
    });

    it("publicação de outra pessoa não mostra 'Editar descrição da imagem'", async () => {
      mockObterPorId.mockResolvedValue(postagem({ anexos: [anexoImagem()] }));
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { queryByRole, findByLabelText } = await renderTela();
      await findByLabelText("Uma foto de teste.");

      expect(queryByRole("button", { name: "Editar descrição da imagem" })).toBeNull();
    });

    it("editar a descrição do anexo chama FeedService.atualizarDescricaoAnexo e atualiza a tela", async () => {
      mockObterPorId.mockResolvedValue(
        postagem({
          usuario: { id: "u9", nome: "Quem Está Vendo", fotoPerfil: null, tipoUsuario: "candidato" },
          anexos: [anexoImagem()],
        }),
      );
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      mockAtualizarDescricaoAnexo.mockResolvedValue(
        postagem({
          usuario: { id: "u9", nome: "Quem Está Vendo", fotoPerfil: null, tipoUsuario: "candidato" },
          anexos: [anexoImagem({ descricao: "Descrição corrigida." })],
        }),
      );
      const { getByRole, findByLabelText, getByLabelText, findByText } = await renderTela();
      await findByLabelText("Uma foto de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar descrição da imagem" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Descrição da imagem"), "Descrição corrigida.");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar" }));
      });

      expect(mockAtualizarDescricaoAnexo).toHaveBeenCalledWith("p1", "a1", "Descrição corrigida.");
      expect(await findByText("Descrição corrigida.")).toBeTruthy();
    });

    it("toque na imagem abre a visualização ampliada (lightbox)", async () => {
      mockObterPorId.mockResolvedValue(postagem({ anexos: [anexoImagem()] }));
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { getByRole, findByLabelText, findAllByLabelText } = await renderTela();
      await findByLabelText("Uma foto de teste.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Ver imagem ampliada" }));
      });

      // A mesma descrição aparece de novo, agora como accessibilityLabel da imagem ampliada (2 ocorrências: a miniatura + a ampliada).
      expect(await findAllByLabelText("Uma foto de teste.")).toHaveLength(2);
      expect(getByRole("button", { name: "Fechar imagem ampliada" })).toBeTruthy();
    });

    it("um anexo de vídeo (criado por outro cliente) mostra um aviso em texto, sem tentar exibir imagem nenhuma", async () => {
      mockObterPorId.mockResolvedValue(
        postagem({ anexos: [{ id: "a2", postagemId: "p1", tipo: "video", url: "https://x/v.mp4", privado: true, descricao: null, ordem: 0 }] }),
      );
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByText } = await renderTela();

      expect(await findByText("Vídeo anexado (sem player nesta versão do app).")).toBeTruthy();
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

    it("'feed:curtida' desta postagem atualiza a contagem direto", async () => {
      const capturados = capturarHandlers();
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      await act(async () => {
        capturados["feed:curtida"]?.({ postagemId: "p1", totalCurtidas: 4 });
      });

      expect(await findByText("Curtir · 4")).toBeTruthy();
    });

    it("'feed:curtida' de OUTRA postagem é ignorado", async () => {
      const capturados = capturarHandlers();
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByText, queryByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      await act(async () => {
        capturados["feed:curtida"]?.({ postagemId: "outra-postagem", totalCurtidas: 999 });
      });

      expect(queryByText("Curtir · 999")).toBeNull();
    });

    it("'feed:comentario' removido (com comentarioId) filtra o comentário localmente, sem refetch", async () => {
      const capturados = capturarHandlers();
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([comentario()]));
      const { findByText, queryByText } = await renderTela();
      await findByText("Um comentário de teste.");
      mockListarComentarios.mockClear();

      await act(async () => {
        capturados["feed:comentario"]?.({ postagemId: "p1", totalComentarios: 0, comentarioId: "c1", removido: true });
      });

      await waitFor(() => expect(queryByText("Um comentário de teste.")).toBeNull());
      expect(mockListarComentarios).not.toHaveBeenCalled();
    });

    it("'feed:comentario' criado (sem comentarioId) refaz a busca da lista de comentários", async () => {
      const capturados = capturarHandlers();
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      mockListarComentarios.mockResolvedValueOnce(envelopeComentarios([comentario({ comentario: "Chegou por outra pessoa." })]));
      await act(async () => {
        capturados["feed:comentario"]?.({ postagemId: "p1", totalComentarios: 1 });
      });

      expect(await findByText("Chegou por outra pessoa.")).toBeTruthy();
    });

    it("'feed:postagem' atualizada:true revalida via REST e substitui a publicação", async () => {
      const capturados = capturarHandlers();
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByText } = await renderTela();
      await findByText("Minha publicação de teste.");

      mockObterPorId.mockResolvedValueOnce(postagem({ conteudo: "Editado em outro dispositivo." }));
      await act(async () => {
        capturados["feed:postagem"]?.({ id: "p1", atualizada: true });
      });

      expect(await findByText("Editado em outro dispositivo.")).toBeTruthy();
    });

    it("'feed:postagem' removida:true mostra o aviso e desabilita curtir/comentar, sem navegar sozinho", async () => {
      const capturados = capturarHandlers();
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByText, getByRole } = await renderTela();
      await findByText("Minha publicação de teste.");

      await act(async () => {
        capturados["feed:postagem"]?.({ id: "p1", removida: true });
      });

      expect(await findByText("Esta publicação foi removida e não está mais disponível.")).toBeTruthy();
      expect(getByRole("button", { name: "Curtir" }).props.accessibilityState.disabled).toBe(true);
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe("Ouvir em voz alta (Fase 21)", () => {
    it("com 'Leitura por voz' desativada (padrão), o botão não aparece", async () => {
      mockObterPorId.mockResolvedValue(postagem());
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByText, queryByRole } = await renderTela();

      await findByText("Minha publicação de teste.");
      expect(queryByRole("button", { name: "Ouvir esta publicação em voz alta" })).toBeNull();
    });

    it("com 'Leitura por voz' ativada, mostra o botão; some durante a edição (o conteúdo lido não está visível)", async () => {
      await AsyncStorage.setItem("acesso.accessibilityPreferences", JSON.stringify({ voiceEnabled: true }));
      mockObterPorId.mockResolvedValue(
        postagem({ usuario: { id: "u9", nome: "Quem Está Vendo", fotoPerfil: null, tipoUsuario: "candidato" } }),
      );
      mockListarComentarios.mockResolvedValue(envelopeComentarios([]));
      const { findByText, getByRole, queryByRole } = await renderTela();
      await findByText("Minha publicação de teste.");

      expect(getByRole("button", { name: "Ouvir esta publicação em voz alta" })).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar publicação" }));
      });

      expect(queryByRole("button", { name: "Ouvir esta publicação em voz alta" })).toBeNull();
    });
  });
});
