/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockBuscarResumo = jest.fn();

jest.mock("../../busca", () => ({
  ...jest.requireActual("../../busca"),
  BuscaService: { buscarResumo: (...args: unknown[]) => mockBuscarResumo(...args) },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AcessibilidadeProvider } from "../../acessibilidade";
import type { AppStackParamList, PerfilStackParamList } from "../../navigation/types";
import { TemaProvider } from "../../tema";
import { BuscaScreen } from "../BuscaScreen";

const resumo = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  sucesso: true,
  termo: "dev",
  tipo: "tudo",
  pagina: 1,
  limite: 5,
  total: 0,
  totais: { usuarios: 0, empresas: 0, vagas: 0, postagens: 0 },
  resultados: { usuarios: [], empresas: [], vagas: [], postagens: [] },
  ...sobrescreve,
});

const mockNavigate = jest.fn();
const navigationMock = { navigate: mockNavigate } as unknown as NativeStackScreenProps<PerfilStackParamList, "Search">["navigation"] &
  NativeStackScreenProps<AppStackParamList, "VagaDetail">["navigation"];

async function renderTela() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <BuscaScreen navigation={navigationMock} route={{ key: "Search", name: "Search" }} />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

async function buscarPor(utils: Awaited<ReturnType<typeof renderTela>>, termo: string) {
  await act(async () => {
    fireEvent.changeText(utils.getByPlaceholderText("Buscar pessoas, empresas, vagas, publicações..."), termo);
  });
  await act(async () => {
    fireEvent.press(utils.getByRole("button", { name: "Buscar" }));
  });
}

describe("BuscaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("antes de qualquer busca, mostra o convite e não chama a API", async () => {
    const { findByText } = await renderTela();
    expect(await findByText("Digite um termo para buscar pessoas, empresas, vagas e publicações no ACESSO.")).toBeTruthy();
    expect(mockBuscarResumo).not.toHaveBeenCalled();
  });

  it("com menos de 2 caracteres, o botão fica desabilitado e mostra o aviso", async () => {
    const { getByRole, getByPlaceholderText, findByText } = await renderTela();

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText("Buscar pessoas, empresas, vagas, publicações..."), "a");
    });

    expect(getByRole("button", { name: "Buscar" }).props.accessibilityState.disabled).toBe(true);
    expect(await findByText("Digite ao menos 2 caracteres.")).toBeTruthy();
    expect(mockBuscarResumo).not.toHaveBeenCalled();
  });

  it("busca com resultados mostra as seções com contagem; 'Ver mais' só quando passa de 5", async () => {
    mockBuscarResumo.mockResolvedValueOnce(
      resumo({
        total: 8,
        totais: { usuarios: 7, empresas: 1, vagas: 0, postagens: 0 },
        resultados: {
          usuarios: Array.from({ length: 5 }, (_, i) => ({ id: `u${i}`, nome: `Pessoa ${i}`, tipoUsuario: "candidato" })),
          empresas: [{ id: "e1", usuarioId: "ue1", nomeFantasia: "ACME", razaoSocial: "ACME Ltda" }],
          vagas: [],
          postagens: [],
        },
      }),
    );
    const utils = await renderTela();
    await buscarPor(utils, "dev");

    expect(await utils.findByText("Pessoas (7)")).toBeTruthy();
    expect(await utils.findByText("Empresas (1)")).toBeTruthy();
    expect(utils.queryByText("Vagas (0)")).toBeNull(); // categoria vazia não aparece
    expect(mockBuscarResumo).toHaveBeenCalledWith("dev");

    // usuarios tem 7 (>5) → "Ver mais"; empresas tem 1 → sem "Ver mais"
    expect(utils.getByLabelText("Ver mais em Pessoas")).toBeTruthy();
    expect(utils.queryByLabelText("Ver mais em Empresas")).toBeNull();
  });

  it("'Ver mais' navega para SearchResults com o termo pesquisado e o tipo", async () => {
    mockBuscarResumo.mockResolvedValueOnce(
      resumo({
        total: 7,
        totais: { usuarios: 7, empresas: 0, vagas: 0, postagens: 0 },
        resultados: {
          usuarios: Array.from({ length: 5 }, (_, i) => ({ id: `u${i}`, nome: `Pessoa ${i}`, tipoUsuario: "candidato" })),
          empresas: [],
          vagas: [],
          postagens: [],
        },
      }),
    );
    const utils = await renderTela();
    await buscarPor(utils, "dev");
    await utils.findByText("Pessoas (7)");

    await act(async () => {
      fireEvent.press(utils.getByLabelText("Ver mais em Pessoas"));
    });

    expect(mockNavigate).toHaveBeenCalledWith("SearchResults", { termo: "dev", tipo: "usuarios" });
  });

  it("toque num resultado de pessoa navega para PublicProfile", async () => {
    mockBuscarResumo.mockResolvedValueOnce(
      resumo({
        total: 1,
        totais: { usuarios: 1, empresas: 0, vagas: 0, postagens: 0 },
        resultados: { usuarios: [{ id: "u1", nome: "Bruno", tipoUsuario: "candidato" }], empresas: [], vagas: [], postagens: [] },
      }),
    );
    const utils = await renderTela();
    await buscarPor(utils, "bruno");

    await act(async () => {
      fireEvent.press(await utils.findByLabelText("Abrir perfil de Bruno"));
    });

    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u1" });
  });

  it("busca sem nenhum resultado mostra 'Nenhum resultado'", async () => {
    mockBuscarResumo.mockResolvedValueOnce(resumo({ termo: "zzz", total: 0 }));
    const utils = await renderTela();
    await buscarPor(utils, "zzz");

    expect(await utils.findByText('Nada encontrado para "zzz".')).toBeTruthy();
  });

  it("erro na busca mostra mensagem amigável e 'Tentar novamente' refaz a mesma busca", async () => {
    mockBuscarResumo.mockRejectedValueOnce(Object.assign(new Error("500"), { isAxiosError: true }));
    const utils = await renderTela();
    await buscarPor(utils, "dev");

    expect(await utils.findByText("Não foi possível buscar")).toBeTruthy();

    mockBuscarResumo.mockResolvedValueOnce(resumo({ total: 0 }));
    await act(async () => {
      fireEvent.press(utils.getByRole("button", { name: "Tentar novamente" }));
    });

    expect(mockBuscarResumo).toHaveBeenCalledTimes(2);
    expect(mockBuscarResumo).toHaveBeenLastCalledWith("dev");
  });
});
