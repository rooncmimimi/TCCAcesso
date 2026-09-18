/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockSugestoesPessoas = jest.fn();
const mockSugestoesEmpresas = jest.fn();
const mockSolicitarSeguir = jest.fn();
const mockAlternarSeguirUsuario = jest.fn();
const mockCancelarSolicitacao = jest.fn();
const mockAlternarSeguirEmpresa = jest.fn();

jest.mock("../../seguidores", () => ({
  ...jest.requireActual("../../seguidores"),
  SeguidorService: {
    sugestoesPessoas: (...a: unknown[]) => mockSugestoesPessoas(...a),
    sugestoesEmpresas: (...a: unknown[]) => mockSugestoesEmpresas(...a),
    solicitarSeguir: (...a: unknown[]) => mockSolicitarSeguir(...a),
    alternarSeguirUsuario: (...a: unknown[]) => mockAlternarSeguirUsuario(...a),
    cancelarSolicitacao: (...a: unknown[]) => mockCancelarSolicitacao(...a),
    alternarSeguirEmpresa: (...a: unknown[]) => mockAlternarSeguirEmpresa(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AcessibilidadeProvider } from "../../acessibilidade";
import type { AppStackParamList, PerfilStackParamList } from "../../navigation/types";
import { TemaProvider } from "../../tema";
import { DescobrirScreen } from "../DescobrirScreen";

const mockNavigate = jest.fn();
const navigationMock = { navigate: mockNavigate } as unknown as NativeStackScreenProps<
  PerfilStackParamList,
  "Discover"
>["navigation"] &
  NativeStackScreenProps<AppStackParamList>["navigation"];

async function renderTela() {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        {/* @ts-expect-error -- route não é usado pela tela, só navigation; mock mínimo de propósito. */}
        <DescobrirScreen navigation={navigationMock} route={{ key: "Discover", name: "Discover" }} />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

const pessoa = { id: "u2", nome: "Bia", fotoPerfil: null, tipo: "candidato", titulo: "Dev", motivo: "Também está em SP" };
const empresa = { id: "e1", usuarioId: "u3", nomeFantasia: "ACME", razaoSocial: "ACME Ltda", logo: null, setor: "Tecnologia", cidade: null, descricao: null, empresaVerificada: false, motivo: "Empresa parceira do ACESSO" };

describe("DescobrirScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra sugestões de pessoas e empresas, com o motivo de cada uma", async () => {
    mockSugestoesPessoas.mockResolvedValue([pessoa]);
    mockSugestoesEmpresas.mockResolvedValue([empresa]);
    const { findByText } = await renderTela();

    expect(await findByText("Bia")).toBeTruthy();
    expect(await findByText("Também está em SP")).toBeTruthy();
    expect(await findByText("ACME")).toBeTruthy();
    expect(await findByText("Empresa parceira do ACESSO")).toBeTruthy();
  });

  it("sem sugestões, mostra a mensagem certa nas duas seções", async () => {
    mockSugestoesPessoas.mockResolvedValue([]);
    mockSugestoesEmpresas.mockResolvedValue([]);
    const { findAllByText } = await renderTela();

    expect((await findAllByText("Nenhuma sugestão no momento.")).length).toBe(2);
  });

  it("seguir uma pessoa (perfil público) chama solicitarSeguir e o botão vira 'Seguindo'", async () => {
    mockSugestoesPessoas.mockResolvedValue([pessoa]);
    mockSugestoesEmpresas.mockResolvedValue([]);
    mockSolicitarSeguir.mockResolvedValue({ sucesso: true, seguindo: true, totalSeguidores: 1, solicitacaoCriada: false });
    const { getByRole, findByText } = await renderTela();
    await findByText("Bia");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Seguir" }));
    });

    expect(mockSolicitarSeguir).toHaveBeenCalledWith("u2");
    expect(getByRole("button", { name: "Seguindo" })).toBeTruthy();
  });

  it("seguir uma pessoa de perfil privado cria solicitação — botão vira 'Solicitado'", async () => {
    mockSugestoesPessoas.mockResolvedValue([pessoa]);
    mockSugestoesEmpresas.mockResolvedValue([]);
    mockSolicitarSeguir.mockResolvedValue({ sucesso: true, solicitacaoCriada: true, solicitacaoPendente: true });
    const { getByRole, findByText } = await renderTela();
    await findByText("Bia");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Seguir" }));
    });

    expect(getByRole("button", { name: "Solicitado" })).toBeTruthy();
  });

  it("tocar em 'Seguindo' deixa de seguir (alternarSeguirUsuario) e volta para 'Seguir'", async () => {
    mockSugestoesPessoas.mockResolvedValue([pessoa]);
    mockSugestoesEmpresas.mockResolvedValue([]);
    mockSolicitarSeguir.mockResolvedValue({ sucesso: true, seguindo: true, totalSeguidores: 1, solicitacaoCriada: false });
    mockAlternarSeguirUsuario.mockResolvedValue({ seguindo: false, totalSeguidores: 0 });
    const { getByRole, findByText } = await renderTela();
    await findByText("Bia");
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Seguir" }));
    });

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Seguindo" }));
    });

    expect(mockAlternarSeguirUsuario).toHaveBeenCalledWith("u2");
    expect(getByRole("button", { name: "Seguir" })).toBeTruthy();
  });

  it("seguir uma empresa chama alternarSeguirEmpresa e alterna o rótulo", async () => {
    mockSugestoesPessoas.mockResolvedValue([]);
    mockSugestoesEmpresas.mockResolvedValue([empresa]);
    mockAlternarSeguirEmpresa.mockResolvedValue({ seguindo: true, totalSeguidores: 1 });
    const { getByRole, findByText } = await renderTela();
    await findByText("ACME");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Seguir" }));
    });

    expect(mockAlternarSeguirEmpresa).toHaveBeenCalledWith("e1");
    expect(getByRole("button", { name: "Seguindo" })).toBeTruthy();
  });

  it("tocar no cartão de uma sugestão navega para o perfil público dela", async () => {
    mockSugestoesPessoas.mockResolvedValue([pessoa]);
    mockSugestoesEmpresas.mockResolvedValue([]);
    const { getByRole, findByText } = await renderTela();
    await findByText("Bia");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Abrir perfil de Bia" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u2" });
  });

  it("falha ao carregar mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockSugestoesPessoas.mockRejectedValueOnce(erro);
    mockSugestoesEmpresas.mockResolvedValueOnce([]);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar sugestões")).toBeTruthy();

    mockSugestoesPessoas.mockResolvedValueOnce([pessoa]);
    mockSugestoesEmpresas.mockResolvedValueOnce([]);
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Bia")).toBeTruthy();
  });
});
