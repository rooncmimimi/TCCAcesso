/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockBuscarUsuarios = jest.fn();
const mockBuscarEmpresas = jest.fn();
const mockBuscarVagas = jest.fn();
const mockBuscarPostagens = jest.fn();

jest.mock("../../busca", () => ({
  ...jest.requireActual("../../busca"),
  BuscaService: {
    buscarUsuarios: (...args: unknown[]) => mockBuscarUsuarios(...args),
    buscarEmpresas: (...args: unknown[]) => mockBuscarEmpresas(...args),
    buscarVagas: (...args: unknown[]) => mockBuscarVagas(...args),
    buscarPostagens: (...args: unknown[]) => mockBuscarPostagens(...args),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AcessibilidadeProvider } from "../../acessibilidade";
import type { TipoBusca } from "../../busca";
import type { AppStackParamList } from "../../navigation/types";
import { TemaProvider } from "../../tema";
import { ResultadosBuscaScreen } from "../ResultadosBuscaScreen";

const envelope = (chave: string, itens: unknown[], extra: Partial<Record<string, unknown>> = {}) => ({
  sucesso: true,
  termo: "dev",
  tipo: chave,
  pagina: 1,
  limite: 10,
  total: itens.length,
  totalPaginas: itens.length > 0 ? 1 : 0,
  resultados: { [chave]: itens },
  ...extra,
});

const mockNavigate = jest.fn();
const navigationMock = { navigate: mockNavigate } as unknown as NativeStackScreenProps<AppStackParamList, "SearchResults">["navigation"];

async function renderTela(tipo: TipoBusca, termo = "dev") {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <ResultadosBuscaScreen navigation={navigationMock} route={{ key: "SearchResults", name: "SearchResults", params: { termo, tipo } }} />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("ResultadosBuscaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("carrega a página 1 do tipo certo e mostra os itens (vagas → VagaDetail no toque)", async () => {
    mockBuscarVagas.mockResolvedValueOnce(
      envelope("vagas", [{ id: "v1", titulo: "Dev Front-end", modalidade: "remoto", status: "aberta", empresa: { nomeFantasia: "ACME" } }]),
    );
    const { findByText, getByRole } = await renderTela("vagas");

    expect(await findByText("Dev Front-end")).toBeTruthy();
    expect(mockBuscarVagas).toHaveBeenCalledWith("dev", { page: 1, limit: 10 });

    await act(async () => {
      fireEvent.press(getByRole("button", { name: /Dev Front-end/ }));
    });
    expect(mockNavigate).toHaveBeenCalledWith("VagaDetail", { vagaId: "v1" });
  });

  it("resultado de pessoa navega para PublicProfile", async () => {
    mockBuscarUsuarios.mockResolvedValueOnce(
      envelope("usuarios", [{ id: "u1", nome: "Ana", tipoUsuario: "candidato", candidato: { tituloProfissional: "Designer" } }]),
    );
    const { findByLabelText } = await renderTela("usuarios");

    await act(async () => {
      fireEvent.press(await findByLabelText("Abrir perfil de Ana"));
    });
    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u1" });
  });

  it("resultado de empresa navega para PublicProfile pelo usuarioId da empresa", async () => {
    mockBuscarEmpresas.mockResolvedValueOnce(
      envelope("empresas", [{ id: "e1", usuarioId: "ue1", nomeFantasia: "ACME", razaoSocial: "ACME Ltda" }]),
    );
    const { findByLabelText } = await renderTela("empresas");

    await act(async () => {
      fireEvent.press(await findByLabelText("Abrir perfil de ACME"));
    });
    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "ue1" });
  });

  it("com mais de uma página, 'Próxima página' busca a página 2", async () => {
    mockBuscarPostagens.mockResolvedValueOnce(
      envelope("postagens", [{ id: "p1", conteudo: "Olá mundo", criadoEm: "2026-01-01T00:00:00.000Z", usuario: { nome: "Ana" } }], {
        totalPaginas: 2,
        total: 11,
      }),
    );
    const { findByText, getByRole } = await renderTela("postagens");
    await findByText("Olá mundo");

    mockBuscarPostagens.mockResolvedValueOnce(
      envelope("postagens", [{ id: "p2", conteudo: "Segunda página", criadoEm: "2026-01-02T00:00:00.000Z", usuario: { nome: "Bia" } }], {
        pagina: 2,
        totalPaginas: 2,
        total: 11,
      }),
    );
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Próxima página" }));
    });

    await waitFor(() => expect(mockBuscarPostagens).toHaveBeenLastCalledWith("dev", { page: 2, limit: 10 }));
    expect(await findByText("Segunda página")).toBeTruthy();
  });

  it("puxar para atualizar refaz a página atual", async () => {
    mockBuscarVagas.mockResolvedValueOnce(envelope("vagas", [{ id: "v1", titulo: "Dev", modalidade: "remoto", status: "aberta" }]));
    const { getByTestId, findByText } = await renderTela("vagas");
    await findByText("Dev");

    mockBuscarVagas.mockResolvedValueOnce(envelope("vagas", [{ id: "v1", titulo: "Dev atualizado", modalidade: "remoto", status: "aberta" }]));
    await act(async () => {
      getByTestId("busca-resultados-lista").props.refreshControl.props.onRefresh();
    });

    expect(await findByText("Dev atualizado")).toBeTruthy();
  });

  it("nenhum resultado mostra o estado vazio com o termo", async () => {
    mockBuscarVagas.mockResolvedValueOnce(envelope("vagas", []));
    const { findByText } = await renderTela("vagas", "inexistente");

    expect(await findByText('Nenhum resultado em "vagas" para "inexistente".')).toBeTruthy();
  });

  it("erro no primeiro carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    mockBuscarVagas.mockRejectedValueOnce(Object.assign(new Error("500"), { isAxiosError: true }));
    const { findByText } = await renderTela("vagas");

    expect(await findByText("Não foi possível carregar os resultados")).toBeTruthy();

    mockBuscarVagas.mockResolvedValueOnce(envelope("vagas", [{ id: "v1", titulo: "Recuperou", modalidade: "remoto", status: "aberta" }]));
    await act(async () => {
      fireEvent.press(await findByText("Tentar novamente"));
    });

    expect(await findByText("Recuperou")).toBeTruthy();
  });
});
