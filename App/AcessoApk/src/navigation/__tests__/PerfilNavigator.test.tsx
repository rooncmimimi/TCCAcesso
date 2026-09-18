/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
// `jest.fn()` para cada teste poder trocar o `tipoUsuario`: o menu do Perfil só mostra "Minhas
// Vagas" para empresa. O padrão é candidato.
const mockUseAuth = jest.fn().mockReturnValue({
  status: "autenticado",
  usuario: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato", perfilPublico: true, preferenciaMensagens: "todos" },
  autenticado: true,
  carregando: false,
  motivoFimSessao: null,
  entrar: jest.fn(),
  sair: jest.fn(),
  limparMotivoFimSessao: jest.fn(),
  atualizarUsuario: jest.fn(),
});

jest.mock("../../autenticacao", () => ({
  ...jest.requireActual("../../autenticacao"),
  useAutenticacao: () => mockUseAuth(),
  AutenticacaoService: {
    listarSessoes: jest.fn().mockResolvedValue([]),
  },
}));

// As telas de empresa (`MinhasVagasScreen`, `PerfilEmpresaScreen`) buscam dados ao montar. Cada
// tela tem suíte própria, então aqui os serviços são mockados.
jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    minhas: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, vagas: [] }),
  },
}));

// `ConfiguracoesScreen` busca sessões e preferências de notificação ao montar; mesmo motivo dos
// mocks acima.
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

// "Usuários bloqueados" busca a lista ao montar; mesmo motivo dos mocks acima.
jest.mock("../../moderacao", () => ({
  ...jest.requireActual("../../moderacao"),
  ModeracaoService: {
    listarBloqueados: jest.fn().mockResolvedValue({ sucesso: true, total: 0, pagina: 1, limite: 20, totalPaginas: 0, bloqueados: [] }),
  },
}));

// "Atividades" chama `AtividadeService.minha` ao montar; mesmo motivo dos mocks acima.
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

// A busca não chama a API ao montar, mas o mock segue o padrão dos demais.
jest.mock("../../busca", () => ({
  ...jest.requireActual("../../busca"),
  BuscaService: { buscarResumo: jest.fn().mockResolvedValue(null) },
}));

import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AcessibilidadeProvider } from "../../acessibilidade";
import { TemaProvider } from "../../tema";
import { PerfilNavigator } from "../PerfilNavigator";

// O header/botão "Voltar" do native-stack é desenhado nativamente por
// `react-native-screens`: no ambiente de teste ele aparece só como um nó de
// configuração (`RNSScreenStackHeaderConfig`), sem um elemento consultável
// com `accessibilityLabel`. Por isso o "voltar" é testado chamando
// `goBack()` pela ref do próprio `NavigationContainer` em vez de procurar um
// botão na árvore: é exatamente a mesma ação que o header nativo e o botão
// físico/gestual do Android disparam por baixo (ambos chamam `goBack()` na
// pilha atual), então isto testa o comportamento real da pilha.
const refNavegacao = createNavigationContainerRef();

// O `AcessibilidadeProvider` é obrigatório: o `TemaProvider` lê as preferências dele e renderiza
// `null` até o AsyncStorage mockado responder.
async function renderProfileStack() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <NavigationContainer ref={refNavegacao}>
          <PerfilNavigator />
        </NavigationContainer>
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("PerfilNavigator", () => {
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

  it("Perfil → Configurações empilha a tela de Configurações", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Configurações"));
    });
    expect(await findByText("Privacidade")).toBeTruthy();
    expect(await findByText("Zona de perigo")).toBeTruthy();
  });

  it("Perfil → Configurações → Usuários bloqueados empilha a tela de bloqueios", async () => {
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

  it("Perfil → Acessibilidade empilha a tela de Acessibilidade", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Acessibilidade"));
    });
    expect(await findByText("Personalize sua experiência")).toBeTruthy();
  });

  it("Perfil → Ajuda empilha a tela de Ajuda", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Ajuda"));
    });
    expect(await findByText("Como eu me candidato a uma vaga?")).toBeTruthy();
  });

  it("Perfil → Atividades empilha a tela de atividades", async () => {
    const { getByLabelText, findByText } = await renderProfileStack();
    await act(async () => {
      fireEvent.press(getByLabelText("Atividades"));
    });
    expect(await findByText("Você ainda não se candidatou a nenhuma vaga.")).toBeTruthy();
  });

  it("Perfil → Buscar empilha a tela de busca global", async () => {
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
      refNavegacao.current?.goBack();
    });

    expect(await findByText("Ana")).toBeTruthy();
  });

  describe("Modo Empresa", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        status: "autenticado",
        usuario: { id: "2", nome: "ACME", email: "acme@exemplo.com", tipoUsuario: "empresa" },
        autenticado: true,
        carregando: false,
        motivoFimSessao: null,
        entrar: jest.fn(),
        sair: jest.fn(),
        limparMotivoFimSessao: jest.fn(),
        atualizarUsuario: jest.fn(),
      });
    });

    it("conta empresa vê 'Minhas Vagas' no menu; conta candidato não vê", async () => {
      const { getByLabelText } = await renderProfileStack();
      expect(getByLabelText("Minhas Vagas")).toBeTruthy();
    });

    it("candidato não vê 'Minhas Vagas'", async () => {
      mockUseAuth.mockReturnValue({
        status: "autenticado",
        usuario: { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
        autenticado: true,
        carregando: false,
        motivoFimSessao: null,
        entrar: jest.fn(),
        sair: jest.fn(),
        limparMotivoFimSessao: jest.fn(),
        atualizarUsuario: jest.fn(),
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
