/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
// Fase 18: convertido de retorno fixo para `jest.fn()` sobrescrevível —
// precisa poder trocar `tipoUsuario` entre candidato/empresa por teste (o
// menu da aba Perfil ganha "Minhas Vagas" só para empresa). Valor padrão
// (candidato) é o MESMO de antes da Fase 18, para os testes já existentes
// não precisarem mudar nada.
const mockUseAuth = jest.fn().mockReturnValue({
  status: "authenticated",
  user: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato", perfilPublico: true, preferenciaMensagens: "todos" },
  isAuthenticated: true,
  isLoading: false,
  sessionEndedReason: null,
  login: jest.fn(),
  logout: jest.fn(),
  clearSessionEndedReason: jest.fn(),
  refreshUser: jest.fn(),
});

jest.mock("../../auth", () => ({
  ...jest.requireActual("../../auth"),
  useAuth: () => mockUseAuth(),
  AuthService: {
    listarSessoes: jest.fn().mockResolvedValue([]),
  },
}));

// Fase 18: `MyJobsScreen`/`EmpresaProfileScreen` (só alcançáveis por uma
// conta empresa) buscam de verdade ao montar — mesmo raciocínio de
// `VagasService`/`FeedService` já mockados neste arquivo: o comportamento
// real de cada tela já tem sua própria suíte.
jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    minhas: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, vagas: [] }),
  },
}));

// Fase 15: `SettingsScreen` deixou de ser placeholder — busca sessões
// ativas e preferências de notificação de verdade ao montar. Mesmo
// raciocínio de `VagasService`/`FeedService` mockados neste arquivo: o
// comportamento real da tela já tem sua própria suíte.
jest.mock("../../configuracoes", () => ({
  ...jest.requireActual("../../configuracoes"),
  ConfiguracoesService: {
    obterPreferenciasNotificacao: jest.fn().mockResolvedValue({
      id: "p1",
      usuarioId: "1",
      vagasCandidaturas: true,
      mensagens: true,
      publicacoesComentarios: true,
      redeSeguidores: true,
    }),
  },
}));

// Fase 19: "Usuários bloqueados" (alcançada a partir de Configurações) busca
// de verdade ao montar — mesmo raciocínio dos mocks acima: o comportamento
// real da tela já tem sua própria suíte.
jest.mock("../../moderacao", () => ({
  ...jest.requireActual("../../moderacao"),
  ModeracaoService: {
    listarBloqueados: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 20, totalPaginas: 0, bloqueados: [] }),
  },
}));

// Fase 26: "Atividades" deixou de ser placeholder — busca `GET
// /atividades/minha` de verdade ao montar. Mesmo raciocínio dos mocks acima:
// o comportamento real da tela já tem sua própria suíte.
jest.mock("../../atividades", () => ({
  ...jest.requireActual("../../atividades"),
  AtividadeService: {
    minha: jest.fn().mockResolvedValue({
      ehCandidato: true,
      candidaturas: { itens: [], total: 0 },
      vagasFavoritas: { itens: [], total: 0 },
      seguindo: { pessoas: { itens: [], total: 0 }, empresas: { itens: [], total: 0 } },
      interacoesFeed: {
        curtidas: { itens: [], total: 0 },
        comentarios: { itens: [], total: 0 },
        compartilhamentos: { itens: [], total: 0 },
      },
    }),
  },
}));

// Fase R2: "Buscar" é uma tela nova — não busca nada ao montar (só quando o
// usuário pesquisa), mas o mock mantém o padrão dos demais e evita chamada
// real caso a suíte evolua.
jest.mock("../../busca", () => ({
  ...jest.requireActual("../../busca"),
  BuscaService: { buscarResumo: jest.fn().mockResolvedValue(null) },
}));

import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { ProfileNavigator } from "../ProfileNavigator";

// O header/botão "Voltar" do native-stack é desenhado nativamente por
// `react-native-screens` — no ambiente de teste ele aparece só como um nó de
// configuração (`RNSScreenStackHeaderConfig`), sem um elemento consultável
// com `accessibilityLabel`. Por isso o "voltar" é testado chamando
// `goBack()` pela ref do próprio `NavigationContainer` em vez de procurar um
// botão na árvore — é exatamente a mesma ação que o header nativo e o botão
// físico/gestual do Android disparam por baixo (ambos chamam `goBack()` na
// pilha atual), então isto testa o comportamento real da pilha.
const navigationRef = createNavigationContainerRef();

// `AccessibilityProvider` (Fase 5) é obrigatório: `ThemeProvider` lê
// preferências dele e renderiza `null` até a leitura inicial do
// AsyncStorage mockado terminar.
async function renderProfileStack() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <NavigationContainer ref={navigationRef}>
          <ProfileNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("ProfileNavigator", () => {
  it("abre no menu do Perfil, mostrando os dados do usuário e os itens do menu", async () => {
    const { findByText, getByLabelText } = await renderProfileStack();
    expect(await findByText("Ana")).toBeTruthy();
    expect(getByLabelText("Meu perfil")).toBeTruthy();
    expect(getByLabelText("Atividades")).toBeTruthy();
    expect(getByLabelText("Descobrir")).toBeTruthy();
    expect(getByLabelText("Configurações")).toBeTruthy();
    expect(getByLabelText("Acessibilidade")).toBeTruthy();
    expect(getByLabelText("Ajuda")).toBeTruthy();
  });

  it("Perfil → Configurações empilha a tela real de Configurações (Fase 15, não mais o placeholder)", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Configurações"));
    });
    expect(await findByText("Privacidade")).toBeTruthy();
    expect(await findByText("Zona de perigo")).toBeTruthy();
  });

  it("Perfil → Configurações → Usuários bloqueados empilha a tela real de bloqueios (Fase 19)", async () => {
    const { getByLabelText, getByRole, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Configurações"));
    });
    await findByText("Privacidade");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Usuários bloqueados" }));
    });

    expect(await findByText("Você não bloqueou ninguém ainda.")).toBeTruthy();
  });

  it("Perfil → Acessibilidade empilha a tela real de Acessibilidade (Fase 6, não mais o placeholder)", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Acessibilidade"));
    });
    expect(await findByText("Personalize sua experiência")).toBeTruthy();
  });

  it("Perfil → Ajuda empilha a tela real de Ajuda (Fase 26, não mais o placeholder)", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Ajuda"));
    });
    expect(await findByText("Como eu me candidato a uma vaga?")).toBeTruthy();
  });

  it("Perfil → Atividades empilha a tela real de atividades (Fase 26, não mais o placeholder)", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Atividades"));
    });
    expect(await findByText("Você ainda não se candidatou a nenhuma vaga.")).toBeTruthy();
  });

  it("Perfil → Buscar empilha a tela de busca global (Fase R2)", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Buscar"));
    });
    expect(await findByText("Digite um termo para buscar pessoas, empresas, vagas e publicações no ACESSO.")).toBeTruthy();
  });

  it("Perfil → Configurações → voltar retorna ao menu do Perfil (não sai do app)", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();

    await act(async () => {
      fireEvent.press(getByLabelText("Configurações"));
    });
    expect(await findByText("Privacidade")).toBeTruthy();

    await act(async () => {
      navigationRef.current?.goBack();
    });

    expect(await findByText("Ana")).toBeTruthy();
  });

  describe("Modo Empresa (Fase 18)", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        status: "authenticated",
        user: { id: "2", nome: "ACME", email: "acme@exemplo.com", tipoUsuario: "empresa" },
        isAuthenticated: true,
        isLoading: false,
        sessionEndedReason: null,
        login: jest.fn(),
        logout: jest.fn(),
        clearSessionEndedReason: jest.fn(),
        refreshUser: jest.fn(),
      });
    });

    it("conta empresa vê 'Minhas Vagas' no menu; conta candidato não vê", async () => {
      const { getByLabelText } = await renderProfileStack();
      expect(getByLabelText("Minhas Vagas")).toBeTruthy();
    });

    it("candidato não vê 'Minhas Vagas'", async () => {
      mockUseAuth.mockReturnValue({
        status: "authenticated",
        user: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
        isAuthenticated: true,
        isLoading: false,
        sessionEndedReason: null,
        login: jest.fn(),
        logout: jest.fn(),
        clearSessionEndedReason: jest.fn(),
        refreshUser: jest.fn(),
      });
      const { queryByLabelText } = await renderProfileStack();
      expect(queryByLabelText("Minhas Vagas")).toBeNull();
    });

    it("Perfil → Minhas Vagas empilha a tela real de gestão de vagas", async () => {
      const { getByLabelText, findByText } = await renderProfileStack();
      await act(async () => {
        fireEvent.press(getByLabelText("Minhas Vagas"));
      });
      expect(await findByText("Nova vaga")).toBeTruthy();
    });
  });
});
