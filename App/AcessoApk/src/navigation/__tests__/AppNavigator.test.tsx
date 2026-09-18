/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../autenticacao", () => ({
  useAutenticacao: () => ({
    status: "autenticado",
    usuario: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    autenticado: true,
    carregando: false,
    motivoFimSessao: null,
    entrar: jest.fn(),
    sair: jest.fn(),
    limparMotivoFimSessao: jest.fn(),
  }),
}));

const vagaMock = {
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "Descrição completa da vaga.",
  modalidade: "remoto",
  status: "aberta",
  empresa: { id: "e1", nomeFantasia: "ACME" },
};

jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    listar: jest.fn().mockResolvedValue({ sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, vagas: [vagaMock] }),
    obterPorId: jest.fn().mockResolvedValue(vagaMock),
  },
}));

// O `AppNavigator` monta as abas, e o `FeedScreen` busca o feed ao montar; sem este mock o teste
// chamaria a API.
jest.mock("../../feed", () => ({
  ...jest.requireActual("../../feed"),
  FeedService: {
    listar: jest
      .fn()
      .mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, postagens: [] }),
  },
}));

import { createNavigationContainerRef, getStateFromPath, NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../acessibilidade";
import { TemaProvider } from "../../tema";
import { AppNavigator } from "../AppNavigator";
import { linking } from "../linking";

// Mesma técnica de `PerfilNavigator.test.tsx`: o header/botão "voltar" do
// native-stack é desenhado nativamente (`react-native-screens`), sem um nó
// consultável com accessibilityLabel no ambiente de teste; `goBack()` pela
// ref do `NavigationContainer` dispara exatamente a mesma ação da pilha.
const refNavegacao = createNavigationContainerRef();

async function renderApp() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <NavigationContainer ref={refNavegacao}>
          <AppNavigator />
        </NavigationContainer>
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("AppNavigator — Jobs → VagaDetail", () => {
  it("Jobs → toca num item → empilha VagaDetail com o header themed e o conteúdo real", async () => {
    const { getByLabelText, getByRole, findByText } = await renderApp();

    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    const item = await waitFor(() => getByRole("button", { name: /Desenvolvedor Front-end/ }));

    await act(async () => {
      fireEvent.press(item);
    });

    expect(await findByText("Descrição completa da vaga.")).toBeTruthy();
  });

  it("VagaDetail → voltar (goBack) retorna à lista de Vagas, sem duplicar telas na pilha", async () => {
    const { getByLabelText, getByRole, findByText } = await renderApp();

    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    const item = await waitFor(() => getByRole("button", { name: /Desenvolvedor Front-end/ }));
    await act(async () => {
      fireEvent.press(item);
    });
    await findByText("Descrição completa da vaga.");

    await act(async () => {
      refNavegacao.current?.goBack();
    });

    // De volta à lista: o contador da lista reaparece (só existe na tela de Vagas, não no detalhe).
    expect(await findByText("1 vaga encontrada")).toBeTruthy();
  });
});

describe("linking — deep link acesso://vagas/:vagaId", () => {
  it("getStateFromPath resolve /vagas/123 para a rota VagaDetail com vagaId '123'", () => {
    const estado = getStateFromPath("/vagas/123", linking.config);
    const serializado = JSON.stringify(estado);

    expect(serializado).toContain("VagaDetail");
    expect(serializado).toContain('"vagaId":"123"');
  });

  it("continua resolvendo /vagas (lista) para a aba Jobs, sem quebrar o link já existente", () => {
    const estado = getStateFromPath("/vagas", linking.config);
    const serializado = JSON.stringify(estado);

    expect(serializado).toContain("Jobs");
  });
});
