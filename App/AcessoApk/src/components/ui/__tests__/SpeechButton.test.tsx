/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockSpeak = jest.fn();
const mockStop = jest.fn();

jest.mock("expo-speech", () => ({
  speak: (...a: unknown[]) => mockSpeak(...a),
  stop: (...a: unknown[]) => mockStop(...a),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { AccessibilityProvider } from "../../../accessibility";
import { ThemeProvider } from "../../../theme";
import { SpeechButton } from "../SpeechButton";

const CHAVE_PREFERENCIAS = "acesso.accessibilityPreferences";

async function renderComVoz(texto = "Texto de exemplo para leitura.", rotulo?: string) {
  await AsyncStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ voiceEnabled: true }));
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <SpeechButton texto={texto} rotulo={rotulo} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("SpeechButton", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("não renderiza nada quando 'Leitura por voz' está desativada (padrão)", async () => {
    // Marcador ao lado (`Text`) só para `waitFor` ter algo concreto pra
    // esperar — o próprio `SpeechButton` legitimamente não renderiza nada
    // neste caso, então `toJSON()` sozinho não serve de sinal de "terminou
    // de carregar" aqui (diferente do padrão `renderTela` do resto do app).
    const { queryByRole, findByText } = await render(
      <AccessibilityProvider>
        <ThemeProvider>
          <Text>marcador</Text>
          <SpeechButton texto="Algum texto." />
        </ThemeProvider>
      </AccessibilityProvider>,
    );
    await findByText("marcador");

    expect(queryByRole("button")).toBeNull();
  });

  it("não renderiza nada quando o texto está vazio, mesmo com a preferência ativa", async () => {
    await AsyncStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ voiceEnabled: true }));
    const { queryByRole, findByText } = await render(
      <AccessibilityProvider>
        <ThemeProvider>
          <Text>marcador</Text>
          <SpeechButton texto="   " />
        </ThemeProvider>
      </AccessibilityProvider>,
    );
    await findByText("marcador");

    expect(queryByRole("button")).toBeNull();
  });

  it("com a preferência ativa e texto real, mostra 'Ouvir em voz alta'", async () => {
    const { getByRole } = await renderComVoz("Descrição da vaga de teste.", "esta vaga");
    expect(getByRole("button", { name: "Ouvir esta vaga em voz alta" })).toBeTruthy();
  });

  it("tocar chama Speech.speak com o texto e language pt-BR, e troca para 'Parar leitura'", async () => {
    const { getByRole, findByRole } = await renderComVoz("Descrição da vaga de teste.");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Ouvir este conteúdo em voz alta" }));
    });

    expect(mockSpeak).toHaveBeenCalledWith(
      "Descrição da vaga de teste.",
      expect.objectContaining({ language: "pt-BR" }),
    );
    expect(await findByRole("button", { name: "Parar leitura de este conteúdo" })).toBeTruthy();
  });

  it("tocar de novo enquanto fala chama Speech.stop e volta para 'Ouvir em voz alta'", async () => {
    const { getByRole, findByRole } = await renderComVoz("Texto.");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Ouvir este conteúdo em voz alta" }));
    });
    await findByRole("button", { name: "Parar leitura de este conteúdo" });

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Parar leitura de este conteúdo" }));
    });

    expect(mockStop).toHaveBeenCalled();
    expect(await findByRole("button", { name: "Ouvir este conteúdo em voz alta" })).toBeTruthy();
  });

  it("quando a fala termina sozinha (onDone), volta para 'Ouvir em voz alta'", async () => {
    const { getByRole, findByRole } = await renderComVoz("Texto.");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Ouvir este conteúdo em voz alta" }));
    });
    await findByRole("button", { name: "Parar leitura de este conteúdo" });

    const opcoes = mockSpeak.mock.calls[0][1] as { onDone: () => void };
    await act(async () => {
      opcoes.onDone();
    });

    expect(await findByRole("button", { name: "Ouvir este conteúdo em voz alta" })).toBeTruthy();
  });

  it("desmontar enquanto fala chama Speech.stop (nunca deixa uma leitura tocando sozinha)", async () => {
    const { getByRole, unmount, findByRole } = await renderComVoz("Texto.");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Ouvir este conteúdo em voz alta" }));
    });
    await findByRole("button", { name: "Parar leitura de este conteúdo" });
    mockStop.mockClear();

    await act(async () => {
      unmount();
    });

    expect(mockStop).toHaveBeenCalled();
  });
});
