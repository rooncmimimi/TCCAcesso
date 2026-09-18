/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockMinha = jest.fn();

jest.mock("../../atividades", () => ({
  ...jest.requireActual("../../atividades"),
  AtividadeService: { minha: (...args: unknown[]) => mockMinha(...args) },
}));

jest.mock("../../autenticacao", () => ({
  useAutenticacao: () => ({
    status: "autenticado",
    usuario: { id: "u1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
    autenticado: true,
    carregando: false,
    motivoFimSessao: null,
    entrar: jest.fn(),
    sair: jest.fn(),
    limparMotivoFimSessao: jest.fn(),
  }),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { MinhaAtividade } from "../../atividades";
import { AcessibilidadeProvider } from "../../acessibilidade";
import type { AppStackParamList, PerfilStackParamList } from "../../navigation/types";
import { TemaProvider } from "../../tema";
import { AtividadesScreen } from "../AtividadesScreen";

const atividadeVazia: MinhaAtividade = {
  ehCandidato: true,
  candidaturas: { itens: [], total: 0 },
  vagasFavoritas: { itens: [], total: 0 },
  seguindo: { pessoas: { itens: [], total: 0 }, empresas: { itens: [], total: 0 } },
  interacoesFeed: {
    curtidas: { itens: [], total: 0 },
    comentarios: { itens: [], total: 0 },
    compartilhamentos: { itens: [], total: 0 },
  },
};

const mockNavigate = jest.fn();
const navigationMock = { navigate: mockNavigate } as unknown as NativeStackScreenProps<PerfilStackParamList, "Activities">["navigation"] &
  NativeStackScreenProps<AppStackParamList, "VagaDetail">["navigation"];

async function renderTela() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <AtividadesScreen navigation={navigationMock} route={{ key: "Activities", name: "Activities" }} />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("AtividadesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra loading e depois as seções vazias de uma conta candidato sem atividade nenhuma", async () => {
    mockMinha.mockResolvedValue(atividadeVazia);
    const { findByText } = await renderTela();

    expect(await findByText("Candidaturas")).toBeTruthy();
    expect(await findByText("Você ainda não se candidatou a nenhuma vaga.")).toBeTruthy();
    expect(await findByText("Nenhuma vaga favoritada ainda.")).toBeTruthy();
    expect(await findByText("Você ainda não segue ninguém.")).toBeTruthy();
    expect(await findByText("Você ainda não segue nenhuma empresa.")).toBeTruthy();
    expect(await findByText("Você ainda não curtiu nenhuma publicação.")).toBeTruthy();
    expect(await findByText("Você ainda não comentou em nenhuma publicação.")).toBeTruthy();
    expect(await findByText("Você ainda não compartilhou nenhuma publicação.")).toBeTruthy();
  });

  it("conta empresa (ehCandidato: false) não mostra as seções de candidaturas/favoritos", async () => {
    mockMinha.mockResolvedValue({ ...atividadeVazia, ehCandidato: false });
    const { findByText, queryByText } = await renderTela();

    expect(await findByText("Pessoas que você segue")).toBeTruthy();
    expect(queryByText("Candidaturas")).toBeNull();
    expect(queryByText("Vagas favoritas")).toBeNull();
  });

  it("toque numa candidatura navega para VagaDetail com o vagaId certo, com o total e o status no rótulo", async () => {
    mockMinha.mockResolvedValue({
      ...atividadeVazia,
      candidaturas: {
        total: 1,
        itens: [{ id: "c1", status: "aprovada", vaga: { id: "v1", titulo: "Dev Front-end", empresa: { id: "e1", usuarioId: "ue1", razaoSocial: "ACME Ltda" } } }],
      },
    });
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Candidaturas (1)")).toBeTruthy();
    const item = getByRole("button", { name: "Dev Front-end, ACME Ltda, Aprovada" });
    await act(async () => {
      fireEvent.press(item);
    });

    expect(mockNavigate).toHaveBeenCalledWith("VagaDetail", { vagaId: "v1" });
  });

  it("toque numa pessoa seguida navega para PublicProfile com o usuarioId certo", async () => {
    mockMinha.mockResolvedValue({
      ...atividadeVazia,
      seguindo: {
        pessoas: { total: 1, itens: [{ id: "p1", nome: "Bruno", tipoUsuario: "candidato" }] },
        empresas: { itens: [], total: 0 },
      },
    });
    const { getByLabelText } = await renderTela();

    await act(async () => {
      fireEvent.press(getByLabelText("Abrir perfil de Bruno"));
    });

    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "p1" });
  });

  it("'Ver tudo' em pessoas que você segue navega para FollowList com o próprio usuarioId; só aparece se total > 0", async () => {
    mockMinha.mockResolvedValue({
      ...atividadeVazia,
      seguindo: {
        pessoas: { total: 1, itens: [{ id: "p1", nome: "Bruno", tipoUsuario: "candidato" }] },
        empresas: { itens: [], total: 0 },
      },
    });
    const { getByLabelText, queryByLabelText } = await renderTela();

    // Só a seção de pessoas tem "Ver tudo": empresas seguidas não tem lista completa no app.
    expect(queryByLabelText("Ver tudo em Empresas que você segue")).toBeNull();

    await act(async () => {
      fireEvent.press(getByLabelText("Ver tudo em Pessoas que você segue"));
    });

    expect(mockNavigate).toHaveBeenCalledWith("FollowList", { usuarioId: "u1", modo: "seguindo", nomeUsuario: "Ana" });
  });

  it("sem ninguém seguido, não mostra 'Ver tudo'", async () => {
    mockMinha.mockResolvedValue(atividadeVazia);
    const { findByText, queryByLabelText } = await renderTela();

    await findByText("Você ainda não segue ninguém.");
    expect(queryByLabelText("Ver tudo em Pessoas que você segue")).toBeNull();
  });

  it("toque numa publicação curtida navega para PostagemDetail com o postagemId certo", async () => {
    mockMinha.mockResolvedValue({
      ...atividadeVazia,
      interacoesFeed: {
        curtidas: {
          total: 1,
          itens: [{ id: "cur1", postagem: { id: "post1", conteudo: "Minha primeira publicação", usuarioId: "x", criadoEm: "2026-01-05T10:00:00.000Z" } }],
        },
        comentarios: { itens: [], total: 0 },
        compartilhamentos: { itens: [], total: 0 },
      },
    });
    const { findByText } = await renderTela();

    const item = await findByText("Minha primeira publicação");
    await act(async () => {
      fireEvent.press(item);
    });

    expect(mockNavigate).toHaveBeenCalledWith("PostagemDetail", { postagemId: "post1" });
  });

  it("falha no carregamento inicial mostra erro em tela cheia com 'Tentar novamente'", async () => {
    mockMinha.mockRejectedValueOnce(new Error("Network Error"));
    const { findByText } = await renderTela();

    expect(await findByText("Não foi possível carregar sua atividade")).toBeTruthy();

    mockMinha.mockResolvedValueOnce(atividadeVazia);
    await act(async () => {
      fireEvent.press(await findByText("Tentar novamente"));
    });

    expect(await findByText("Você ainda não se candidatou a nenhuma vaga.")).toBeTruthy();
  });

  it("puxar para atualizar busca de novo e atualiza a lista", async () => {
    mockMinha.mockResolvedValueOnce(atividadeVazia);
    const { getByTestId, findByText } = await renderTela();
    await findByText("Você ainda não se candidatou a nenhuma vaga.");

    let resolver: (valor: MinhaAtividade) => void = () => {};
    mockMinha.mockReturnValueOnce(new Promise((resolve) => { resolver = resolve; }));

    const scroll = getByTestId("atividades-scroll");
    await act(async () => {
      scroll.props.refreshControl.props.onRefresh();
    });

    expect(getByTestId("atividades-scroll").props.refreshControl.props.refreshing).toBe(true);

    await act(async () => {
      resolver({
        ...atividadeVazia,
        candidaturas: {
          total: 1,
          itens: [{ id: "c1", status: "pendente", vaga: { id: "v1", titulo: "Vaga nova", empresa: { id: "e1", usuarioId: "ue1", razaoSocial: "ACME" } } }],
        },
      });
    });

    expect(await findByText("Vaga nova")).toBeTruthy();
    expect(getByTestId("atividades-scroll").props.refreshControl.props.refreshing).toBe(false);
  });
});
