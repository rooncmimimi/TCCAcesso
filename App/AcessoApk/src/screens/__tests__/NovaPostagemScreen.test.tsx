/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockCriar = jest.fn();
const mockSugerirDescricao = jest.fn();
const mockAnnounce = jest.fn();
const mockGoBack = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();

jest.mock("../../feed", () => ({
  ...jest.requireActual("../../feed"),
  FeedService: {
    criar: (...args: unknown[]) => mockCriar(...args),
    sugerirDescricao: (...args: unknown[]) => mockSugerirDescricao(...args),
  },
}));

// Preserva o `AccessibilityProvider`/`useAccessibility` reais (mesma técnica
// de `ResetPasswordScreen.test.tsx`) — troca só `announceForAccessibility`
// por um espião.
jest.mock("../../accessibility", () => ({
  ...jest.requireActual("../../accessibility"),
  announceForAccessibility: (...args: unknown[]) => mockAnnounce(...args),
}));

// Mesma técnica de `CurriculoSecao.test.tsx` (`expo-document-picker`) —
// espiões simples, sem tentar simular o módulo nativo real.
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: (...a: unknown[]) => mockRequestMediaLibraryPermissionsAsync(...a),
  launchImageLibraryAsync: (...a: unknown[]) => mockLaunchImageLibraryAsync(...a),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { NovaPostagemScreen } from "../NovaPostagemScreen";

const navigationMock = {
  goBack: mockGoBack,
} as unknown as NativeStackScreenProps<AppStackParamList, "NovaPostagem">["navigation"];

const imagemSelecionada = {
  canceled: false,
  assets: [{ uri: "file:///tmp/foto.jpg", fileName: "foto.jpg", mimeType: "image/jpeg", fileSize: 1024, width: 100, height: 100 }],
};

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <NovaPostagemScreen navigation={navigationMock} route={{ key: "NovaPostagem", name: "NovaPostagem" }} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("NovaPostagemScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  });

  it("mostra o contador de caracteres 0/3000 de início, com o botão desabilitado (campo vazio)", async () => {
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("0/3000")).toBeTruthy();
    expect(getByRole("button", { name: "Publicar" }).props.accessibilityState.disabled).toBe(true);
  });

  it("digitando texto, o contador atualiza e o botão habilita", async () => {
    const { getByLabelText, findByText, getByRole } = await renderTela();

    await act(async () => {
      fireEvent.changeText(getByLabelText("Texto da publicação"), "Olá, ACESSO!");
    });

    expect(await findByText("12/3000")).toBeTruthy();
    expect(getByRole("button", { name: "Publicar" }).props.accessibilityState.disabled).toBe(false);
  });

  it("acima do limite de 3000 caracteres, o botão fica desabilitado de novo", async () => {
    const { getByLabelText, getByRole } = await renderTela();
    const textoGrande = "a".repeat(3001);

    await act(async () => {
      fireEvent.changeText(getByLabelText("Texto da publicação"), textoGrande);
    });

    expect(getByRole("button", { name: "Publicar" }).props.accessibilityState.disabled).toBe(true);
  });

  it("publicar com sucesso (só texto) chama FeedService.criar sem anexos, anuncia e volta (goBack)", async () => {
    mockCriar.mockResolvedValue({ id: "p1", conteudo: "Olá, ACESSO!" });
    const { getByLabelText, getByRole } = await renderTela();

    await act(async () => {
      fireEvent.changeText(getByLabelText("Texto da publicação"), "Olá, ACESSO!");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Publicar" }));
    });

    expect(mockCriar).toHaveBeenCalledWith({ conteudo: "Olá, ACESSO!", publica: true, anexos: [] });
    expect(mockAnnounce).toHaveBeenCalledWith("Publicação criada.");
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("erro ao publicar mostra mensagem amigável, NÃO fecha a tela e preserva o texto digitado", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockCriar.mockRejectedValue(erro);
    const { getByLabelText, getByRole, findByText } = await renderTela();

    await act(async () => {
      fireEvent.changeText(getByLabelText("Texto da publicação"), "Um texto que não pode se perder.");
    });
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Publicar" }));
    });

    expect(
      await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
    ).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(getByLabelText("Texto da publicação").props.value).toBe("Um texto que não pode se perder.");
  });

  describe("anexos (Fase 20)", () => {
    it("com o campo de texto vazio, o botão de publicar continua desabilitado (sem nenhuma imagem ainda)", async () => {
      const { getByRole } = await renderTela();
      expect(getByRole("button", { name: "Publicar" }).props.accessibilityState.disabled).toBe(true);
    });

    it("adicionar uma imagem habilita o botão de publicar mesmo com o texto vazio", async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue(imagemSelecionada);
      const { getByRole, findByLabelText } = await renderTela();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar foto" }));
      });

      expect(await findByLabelText("Remover imagem 1")).toBeTruthy();
      expect(getByRole("button", { name: "Publicar" }).props.accessibilityState.disabled).toBe(false);
    });

    it("sem permissão de galeria concedida, mostra erro amigável e não abre o seletor", async () => {
      mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
      const { getByRole, findByText } = await renderTela();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar foto" }));
      });

      expect(
        await findByText("Não foi possível acessar suas fotos. Autorize o acesso nas configurações do aparelho para anexar imagens."),
      ).toBeTruthy();
      expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it("imagem acima de 5MB não é anexada e mostra aviso", async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file:///tmp/grande.jpg", fileName: "grande.jpg", mimeType: "image/jpeg", fileSize: 6 * 1024 * 1024 }],
      });
      const { getByRole, findByText, queryByLabelText } = await renderTela();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar foto" }));
      });

      expect(await findByText(/ultrapassar o limite de 5MB/)).toBeTruthy();
      expect(queryByLabelText("Remover imagem 1")).toBeNull();
    });

    it("remover uma imagem já anexada tira ela da lista", async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue(imagemSelecionada);
      const { getByRole, findByLabelText, queryByLabelText } = await renderTela();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar foto" }));
      });
      await findByLabelText("Remover imagem 1");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Remover imagem 1" }));
      });

      expect(queryByLabelText("Remover imagem 1")).toBeNull();
      expect(getByRole("button", { name: "Publicar" }).props.accessibilityState.disabled).toBe(true);
    });

    it("sugerir descrição com IA preenche o campo da imagem e anuncia", async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue(imagemSelecionada);
      mockSugerirDescricao.mockResolvedValue("Uma pessoa sorrindo ao ar livre.");
      const { getByRole, findByLabelText } = await renderTela();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar foto" }));
      });
      await findByLabelText("Remover imagem 1");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Sugerir descrição com IA" }));
      });

      expect(await findByLabelText("Descrição da imagem 1")).toHaveProperty(
        "props.value",
        "Uma pessoa sorrindo ao ar livre.",
      );
      expect(mockAnnounce).toHaveBeenCalledWith("Descrição sugerida para a imagem 1: Uma pessoa sorrindo ao ar livre.");
    });

    it("sugestão de IA indisponível mostra aviso, mas não impede publicar", async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue(imagemSelecionada);
      const erro = Object.assign(new Error("503"), { isAxiosError: true, response: { data: {} } });
      mockSugerirDescricao.mockRejectedValue(erro);
      mockCriar.mockResolvedValue({ id: "p1" });
      const { getByRole, findByLabelText, findByText } = await renderTela();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar foto" }));
      });
      await findByLabelText("Remover imagem 1");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Sugerir descrição com IA" }));
      });

      expect(
        await findByText("Sugestão indisponível agora. Você pode escrever a descrição manualmente."),
      ).toBeTruthy();
      expect(getByRole("button", { name: "Publicar" }).props.accessibilityState.disabled).toBe(false);
    });

    it("publicar com imagem e descrição envia os anexos para FeedService.criar", async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue(imagemSelecionada);
      mockCriar.mockResolvedValue({ id: "p1" });
      const { getByRole, findByLabelText } = await renderTela();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar foto" }));
      });
      const campoDescricao = await findByLabelText("Descrição da imagem 1");
      await act(async () => {
        fireEvent.changeText(campoDescricao, "Uma paisagem.");
      });

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Publicar" }));
      });

      expect(mockCriar).toHaveBeenCalledWith({
        conteudo: "",
        publica: true,
        anexos: [
          {
            arquivo: { uri: "file:///tmp/foto.jpg", nome: "foto.jpg", mimeType: "image/jpeg", tamanhoBytes: 1024 },
            descricao: "Uma paisagem.",
          },
        ],
      });
    });

    it("atingido o limite de 4 imagens, o botão de adicionar foto fica desabilitado", async () => {
      mockLaunchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [0, 1, 2, 3].map((indice) => ({
          uri: `file:///tmp/foto${indice}.jpg`,
          fileName: `foto${indice}.jpg`,
          mimeType: "image/jpeg",
          fileSize: 1024,
        })),
      });
      const { getByRole, findByLabelText } = await renderTela();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar foto" }));
      });
      await findByLabelText("Remover imagem 4");

      expect(getByRole("button", { name: "Limite de 4 imagens atingido" }).props.accessibilityState.disabled).toBe(true);
    });
  });
});
