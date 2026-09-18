/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockLogout = jest.fn();

jest.mock("../../autenticacao", () => ({
  useAutenticacao: () => ({
    status: "autenticado",
    usuario: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    autenticado: true,
    carregando: false,
    motivoFimSessao: null,
    entrar: jest.fn(),
    sair: mockLogout,
    limparMotivoFimSessao: jest.fn(),
  }),
}));

// `VagasScreen` busca vagas ao montar, e o mock evita chamar o backend. O comportamento da tela é
// testado em `screens/__tests__/VagasScreen.test.tsx`; aqui só importa que a aba abre a tela certa.
jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    listar: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, vagas: [] }),
  },
}));

// Mesmo motivo para o feed (`screens/__tests__/FeedScreen.test.tsx`).
jest.mock("../../feed", () => ({
  ...jest.requireActual("../../feed"),
  FeedService: {
    listar: jest
      .fn()
      .mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, postagens: [] }),
  },
}));

// Mesmo motivo para as notificações (`screens/__tests__/NotificacoesScreen.test.tsx`). O
// `AbasNavigator` também chama `contarNaoLidas` para o selo da aba.
jest.mock("../../notificacoes", () => ({
  ...jest.requireActual("../../notificacoes"),
  NotificacaoService: {
    listar: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, notificacoes: [] }),
    contarNaoLidas: jest.fn().mockResolvedValue(0),
  },
}));

// Mesmo motivo para as mensagens (`screens/__tests__/MensagensScreen.test.tsx`); `ouvirEvento`
// também é mockado para não abrir um socket de verdade.
jest.mock("../../mensagens", () => ({
  ...jest.requireActual("../../mensagens"),
  ConversaService: {
    listar: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 20, totalPaginas: 0, conversas: [] }),
  },
}));

jest.mock("../../services/socket/socketClient", () => ({
  ouvirEvento: jest.fn(() => () => undefined),
}));

import { NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../acessibilidade";
import { TemaProvider } from "../../tema";
import { AbasNavigator } from "../AbasNavigator";

// O `AcessibilidadeProvider` é obrigatório: o `TemaProvider` lê as preferências dele e renderiza
// `null` até o AsyncStorage mockado responder.
async function renderTabs() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <NavigationContainer>
          <AbasNavigator />
        </NavigationContainer>
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("AbasNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("abre na aba Home mostrando o feed", async () => {
    const { findByText } = await renderTabs();
    expect(await findByText("Nenhuma publicação ainda")).toBeTruthy();
  });

  it("as cinco abas existem e têm accessibilityLabel de navegação", async () => {
    const { getByLabelText } = await renderTabs();
    expect(getByLabelText("Página inicial")).toBeTruthy();
    expect(getByLabelText("Vagas")).toBeTruthy();
    expect(getByLabelText("Mensagens")).toBeTruthy();
    expect(getByLabelText("Notificações")).toBeTruthy();
    expect(getByLabelText("Perfil")).toBeTruthy();
  });

  it("aba Vagas abre a tela de listagem de vagas", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Vagas"));
    });
    expect(await findByText("Nenhuma vaga encontrada")).toBeTruthy();
  });

  it("aba Mensagens mostra a tela de Mensagens", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Mensagens"));
    });
    expect(await findByText("Nenhuma conversa ainda")).toBeTruthy();
  });

  it("aba Notificações mostra a tela de Notificações", async () => {
    const { getByLabelText, findByText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Notificações"));
    });
    expect(await findByText("Nenhuma notificação ainda")).toBeTruthy();
  });

  it("selo da aba Notificações mostra a contagem de não lidas ao montar", async () => {
    const { NotificacaoService } = jest.requireMock("../../notificacoes") as {
      NotificacaoService: { contarNaoLidas: jest.Mock };
    };
    NotificacaoService.contarNaoLidas.mockResolvedValue(3);

    const { findByText } = await renderTabs();

    expect(await findByText("3")).toBeTruthy();
  });

  it("sem não lidas, a aba Notificações não mostra selo", async () => {
    const { NotificacaoService } = jest.requireMock("../../notificacoes") as {
      NotificacaoService: { contarNaoLidas: jest.Mock };
    };
    NotificacaoService.contarNaoLidas.mockResolvedValue(0);

    const { queryByText } = await renderTabs();
    await waitFor(() => expect(NotificacaoService.contarNaoLidas).toHaveBeenCalled());

    expect(queryByText("0")).toBeNull();
  });

  it("aba Perfil mostra o menu do perfil (não uma tela única)", async () => {
    const { getByLabelText, findByLabelText } = await renderTabs();
    await act(async () => {
      fireEvent.press(getByLabelText("Perfil"));
    });
    expect(await findByLabelText("Sair da conta")).toBeTruthy();
    expect(await findByLabelText("Configurações")).toBeTruthy();
  });
});
