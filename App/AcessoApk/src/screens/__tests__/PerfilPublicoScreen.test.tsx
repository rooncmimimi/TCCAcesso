/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockUseAuth = jest.fn();
const mockObterUsuarioPublicoBasico = jest.fn();
const mockObterCandidatoPorUsuario = jest.fn();
const mockObterEmpresaPorUsuario = jest.fn();
const mockResumo = jest.fn();
const mockResumoEmpresa = jest.fn();
const mockAlternarSeguirUsuario = jest.fn();
const mockAlternarSeguirEmpresa = jest.fn();
const mockSolicitarSeguir = jest.fn();
const mockCancelarSolicitacao = jest.fn();
const mockPodeIniciar = jest.fn();
const mockAbrirConversa = jest.fn();
const mockBloquear = jest.fn();
const mockDesbloquear = jest.fn();

jest.mock("../../autenticacao", () => ({
  useAutenticacao: () => mockUseAuth(),
}));

jest.mock("../../seguidores", () => ({
  ...jest.requireActual("../../seguidores"),
  SeguidorService: {
    obterUsuarioPublicoBasico: (...a: unknown[]) => mockObterUsuarioPublicoBasico(...a),
    resumo: (...a: unknown[]) => mockResumo(...a),
    resumoEmpresa: (...a: unknown[]) => mockResumoEmpresa(...a),
    alternarSeguirUsuario: (...a: unknown[]) => mockAlternarSeguirUsuario(...a),
    alternarSeguirEmpresa: (...a: unknown[]) => mockAlternarSeguirEmpresa(...a),
    solicitarSeguir: (...a: unknown[]) => mockSolicitarSeguir(...a),
    cancelarSolicitacao: (...a: unknown[]) => mockCancelarSolicitacao(...a),
  },
}));

jest.mock("../../perfil", () => ({
  ...jest.requireActual("../../perfil"),
  PerfilService: {
    obterCandidatoPorUsuario: (...a: unknown[]) => mockObterCandidatoPorUsuario(...a),
  },
}));

jest.mock("../../empresas", () => ({
  ...jest.requireActual("../../empresas"),
  EmpresaService: {
    obterPorUsuario: (...a: unknown[]) => mockObterEmpresaPorUsuario(...a),
  },
}));

// Botão "Enviar mensagem".
jest.mock("../../mensagens", () => ({
  ...jest.requireActual("../../mensagens"),
  ConversaService: {
    podeIniciar: (...a: unknown[]) => mockPodeIniciar(...a),
    abrir: (...a: unknown[]) => mockAbrirConversa(...a),
  },
}));

// Botões "Bloquear", "Desbloquear" e "Denunciar".
jest.mock("../../moderacao", () => ({
  ...jest.requireActual("../../moderacao"),
  ModeracaoService: {
    bloquear: (...a: unknown[]) => mockBloquear(...a),
    desbloquear: (...a: unknown[]) => mockDesbloquear(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AcessibilidadeProvider } from "../../acessibilidade";
import type { AppStackParamList } from "../../navigation/types";
import { TemaProvider } from "../../tema";
import { PerfilPublicoScreen } from "../PerfilPublicoScreen";

const mockNavigate = jest.fn();
const navigationMock = { navigate: mockNavigate } as unknown as NativeStackScreenProps<
  AppStackParamList,
  "PublicProfile"
>["navigation"];

async function renderTela(usuarioId = "u2") {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <PerfilPublicoScreen
          navigation={navigationMock}
          route={{ key: "PublicProfile", name: "PublicProfile", params: { usuarioId } }}
        />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

const candidatoBasico = { id: "u2", nome: "Beatriz Souza", tipoUsuario: "candidato" as const, perfilPublico: true };
const candidatoCompleto = {
  id: "c2",
  usuarioId: "u2",
  tituloProfissional: "Designer",
  biografia: "Bio.",
  cidade: "Rio de Janeiro",
  estado: "RJ",
  experiencias: [],
  formacoes: [],
  habilidades: [],
  deficiencias: [{ id: "d1", nome: "Baixa visão" }],
};
const resumoPublico = {
  totalSeguidores: 10,
  totalSeguindo: 3,
  seguindoEsteUsuario: false,
  perfilPublico: true,
  elesSeguemVoce: false,
  solicitacaoPendente: false,
  bloqueado: false,
};

describe("PerfilPublicoScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ usuario: { id: "u1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" } });
    mockPodeIniciar.mockResolvedValue({ permitido: true });
    // Todo perfil, de candidato ou de empresa, chama `SeguidorService.resumo` (na empresa, só por
    // causa de `bloqueado`). O valor padrão evita que os testes de empresa dependam de sobras de um
    // teste de candidato, já que `jest.clearAllMocks()` limpa as chamadas, mas não a implementação.
    mockResumo.mockResolvedValue(resumoPublico);
  });

  it("candidato público: mostra dados e botão 'Seguir'", async () => {
    mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
    mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
    mockResumo.mockResolvedValue(resumoPublico);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Beatriz Souza")).toBeTruthy();
    expect(await findByText("Designer")).toBeTruthy();
    expect(await findByText("Baixa visão")).toBeTruthy();
    expect(getByRole("button", { name: "Seguir" })).toBeTruthy();
  });

  it("seguir um perfil público chama alternarSeguirUsuario e alterna para 'Deixar de seguir'", async () => {
    mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
    mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
    mockResumo.mockResolvedValue(resumoPublico);
    mockAlternarSeguirUsuario.mockResolvedValue({ seguindo: true, totalSeguidores: 11 });
    const { getByRole, findByText } = await renderTela();
    await findByText("Beatriz Souza");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Seguir" }));
    });

    expect(mockAlternarSeguirUsuario).toHaveBeenCalledWith("u2");
    expect(await findByText("11")).toBeTruthy();
    expect(getByRole("button", { name: "Deixar de seguir" })).toBeTruthy();
  });

  it("perfil privado sem solicitação: mostra 'Solicitar para seguir', que chama solicitarSeguir", async () => {
    mockObterUsuarioPublicoBasico.mockResolvedValue({ ...candidatoBasico, perfilPublico: false });
    mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
    mockResumo.mockResolvedValue({ ...resumoPublico, perfilPublico: false });
    mockSolicitarSeguir.mockResolvedValue({ sucesso: true, solicitacaoCriada: true, solicitacaoPendente: true });
    const { getByRole, findByText } = await renderTela();
    await findByText("Beatriz Souza");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Solicitar para seguir" }));
    });

    expect(mockSolicitarSeguir).toHaveBeenCalledWith("u2");
    expect(getByRole("button", { name: "Cancelar solicitação" })).toBeTruthy();
  });

  it("cancelar solicitação pendente chama cancelarSolicitacao e volta para 'Solicitar para seguir'", async () => {
    mockObterUsuarioPublicoBasico.mockResolvedValue({ ...candidatoBasico, perfilPublico: false });
    mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
    mockResumo.mockResolvedValue({ ...resumoPublico, perfilPublico: false, solicitacaoPendente: true });
    mockCancelarSolicitacao.mockResolvedValue(undefined);
    const { getByRole, findByText } = await renderTela();
    await findByText("Beatriz Souza");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Cancelar solicitação" }));
    });

    expect(mockCancelarSolicitacao).toHaveBeenCalledWith("u2");
    expect(getByRole("button", { name: "Solicitar para seguir" })).toBeTruthy();
  });

  it("empresa: mostra nome fantasia, setor e o botão 'Seguir empresa'", async () => {
    mockObterUsuarioPublicoBasico.mockResolvedValue({ id: "u3", nome: "Fulano", tipoUsuario: "empresa" as const, perfilPublico: true });
    mockObterEmpresaPorUsuario.mockResolvedValue({ id: "e1", usuarioId: "u3", nomeFantasia: "ACME", razaoSocial: "ACME Ltda", setor: "Tecnologia" });
    mockResumoEmpresa.mockResolvedValue({ totalSeguidores: 4, seguindoEstaEmpresa: false });
    const { findByText, getByRole } = await renderTela("u3");

    expect(await findByText("ACME")).toBeTruthy();
    expect(await findByText("Tecnologia")).toBeTruthy();
    expect(getByRole("button", { name: "Seguir empresa" })).toBeTruthy();
  });

  it("seguir empresa chama alternarSeguirEmpresa com o empresaId (não o usuarioId)", async () => {
    mockObterUsuarioPublicoBasico.mockResolvedValue({ id: "u3", nome: "Fulano", tipoUsuario: "empresa" as const, perfilPublico: true });
    mockObterEmpresaPorUsuario.mockResolvedValue({ id: "e1", usuarioId: "u3", nomeFantasia: "ACME", razaoSocial: "ACME Ltda" });
    mockResumoEmpresa.mockResolvedValue({ totalSeguidores: 4, seguindoEstaEmpresa: false });
    mockAlternarSeguirEmpresa.mockResolvedValue({ seguindo: true, totalSeguidores: 5 });
    const { getByRole, findByText } = await renderTela("u3");
    await findByText("ACME");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Seguir empresa" }));
    });

    expect(mockAlternarSeguirEmpresa).toHaveBeenCalledWith("e1");
    expect(getByRole("button", { name: "Deixar de seguir" })).toBeTruthy();
  });

  it("próprio perfil: não mostra nenhum botão de seguir", async () => {
    mockObterUsuarioPublicoBasico.mockResolvedValue({ id: "u1", nome: "Ana", tipoUsuario: "candidato" as const, perfilPublico: true });
    mockObterCandidatoPorUsuario.mockResolvedValue({ ...candidatoCompleto, id: "c1", usuarioId: "u1" });
    mockResumo.mockResolvedValue(resumoPublico);
    const { findByText, queryByRole } = await renderTela("u1");

    await findByText("Ana");
    expect(queryByRole("button", { name: "Seguir" })).toBeNull();
    expect(queryByRole("button", { name: "Deixar de seguir" })).toBeNull();
  });

  describe("botão 'Enviar mensagem' (Fase 17)", () => {
    it("permitido: mostra 'Enviar mensagem'; toque abre a conversa e navega para Conversation", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue(resumoPublico);
      mockPodeIniciar.mockResolvedValue({ permitido: true });
      mockAbrirConversa.mockResolvedValue({ id: "c1" });
      const { getByRole, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      const botao = await waitFor(() => getByRole("button", { name: "Enviar mensagem" }));
      await act(async () => {
        fireEvent.press(botao);
      });

      expect(mockPodeIniciar).toHaveBeenCalledWith("u2");
      expect(mockAbrirConversa).toHaveBeenCalledWith({ usuarioId: "u2" });
      expect(mockNavigate).toHaveBeenCalledWith("Conversation", { conversaId: "c1", nomeOutroParticipante: "Beatriz Souza" });
    });

    it("não permitido: mostra 'Mensagens indisponíveis' com o motivo, desabilitado", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue(resumoPublico);
      mockPodeIniciar.mockResolvedValue({ permitido: false, motivo: "Este usuário desativou o recebimento de novas mensagens." });
      const { getByRole, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      const botao = await waitFor(() => getByRole("button", { name: "Mensagens indisponíveis" }));
      expect(botao.props.accessibilityState.disabled).toBe(true);
      expect(await findByText("Este usuário desativou o recebimento de novas mensagens.")).toBeTruthy();
      expect(mockAbrirConversa).not.toHaveBeenCalled();
    });

    it("falha ao consultar 'pode iniciar' não trava a ação — mostra 'Enviar mensagem' mesmo assim", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue(resumoPublico);
      mockPodeIniciar.mockRejectedValue(Object.assign(new Error("falhou"), { isAxiosError: true }));
      const { getByRole, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      expect(await waitFor(() => getByRole("button", { name: "Enviar mensagem" }))).toBeTruthy();
    });

    it("erro ao abrir a conversa mostra mensagem amigável, sem navegar", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue(resumoPublico);
      mockPodeIniciar.mockResolvedValue({ permitido: true });
      mockAbrirConversa.mockRejectedValue(Object.assign(new Error("falhou"), { isAxiosError: true }));
      const { getByRole, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      const botao = await waitFor(() => getByRole("button", { name: "Enviar mensagem" }));
      await act(async () => {
        fireEvent.press(botao);
      });

      expect(await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.")).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalledWith("Conversation", expect.anything());
    });

    it("próprio perfil: não mostra o botão de enviar mensagem", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue({ id: "u1", nome: "Ana", tipoUsuario: "candidato" as const, perfilPublico: true });
      mockObterCandidatoPorUsuario.mockResolvedValue({ ...candidatoCompleto, id: "c1", usuarioId: "u1" });
      mockResumo.mockResolvedValue(resumoPublico);
      const { findByText, queryByRole } = await renderTela("u1");

      await findByText("Ana");
      expect(queryByRole("button", { name: "Enviar mensagem" })).toBeNull();
      expect(mockPodeIniciar).not.toHaveBeenCalled();
    });

    it("perfil de empresa: também mostra o botão de enviar mensagem", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue({ id: "u3", nome: "Fulano", tipoUsuario: "empresa" as const, perfilPublico: true });
      mockObterEmpresaPorUsuario.mockResolvedValue({ id: "e1", usuarioId: "u3", nomeFantasia: "ACME", razaoSocial: "ACME Ltda" });
      mockResumoEmpresa.mockResolvedValue({ totalSeguidores: 4, seguindoEstaEmpresa: false });
      mockPodeIniciar.mockResolvedValue({ permitido: true });
      const { getByRole, findByText } = await renderTela("u3");
      await findByText("ACME");

      expect(await waitFor(() => getByRole("button", { name: "Enviar mensagem" }))).toBeTruthy();
      expect(mockPodeIniciar).toHaveBeenCalledWith("u3");
    });
  });

  it("erro ao carregar mostra tela cheia de erro com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockObterUsuarioPublicoBasico.mockRejectedValueOnce(erro);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar este perfil")).toBeTruthy();

    mockObterUsuarioPublicoBasico.mockResolvedValueOnce(candidatoBasico);
    mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
    mockResumo.mockResolvedValue(resumoPublico);
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Beatriz Souza")).toBeTruthy();
  });

  it("abre a lista de seguidores ao tocar no contador", async () => {
    mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
    mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
    mockResumo.mockResolvedValue(resumoPublico);
    const { getByRole, findByText } = await renderTela();
    await findByText("Beatriz Souza");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "10 seguidores" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("FollowList", { usuarioId: "u2", modo: "seguidores", nomeUsuario: "Beatriz Souza" });
  });

  describe("bloquear/desbloquear e denunciar", () => {
    it("candidato não bloqueado: mostra 'Bloquear'; toque chama ModeracaoService.bloquear e vira 'Desbloquear'", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue({ ...resumoPublico, bloqueado: false });
      mockBloquear.mockResolvedValue(true);
      const { getByRole, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      const botao = getByRole("button", { name: "Bloquear" });
      await act(async () => {
        fireEvent.press(botao);
      });

      expect(mockBloquear).toHaveBeenCalledWith("u2");
      expect(getByRole("button", { name: "Desbloquear" })).toBeTruthy();
    });

    it("já bloqueado: mostra 'Desbloquear'; toque chama ModeracaoService.desbloquear e volta a 'Bloquear'", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue({ ...resumoPublico, bloqueado: true });
      mockDesbloquear.mockResolvedValue(false);
      const { getByRole, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      const botao = getByRole("button", { name: "Desbloquear" });
      await act(async () => {
        fireEvent.press(botao);
      });

      expect(mockDesbloquear).toHaveBeenCalledWith("u2");
      expect(getByRole("button", { name: "Bloquear" })).toBeTruthy();
    });

    it("bloquear com sucesso também limpa o estado local de seguir (o backend já desfaz nos dois sentidos)", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue({ ...resumoPublico, bloqueado: false, seguindoEsteUsuario: true });
      mockBloquear.mockResolvedValue(true);
      const { getByRole, findByText, queryByRole } = await renderTela();
      await findByText("Beatriz Souza");
      expect(getByRole("button", { name: "Deixar de seguir" })).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Bloquear" }));
      });

      expect(queryByRole("button", { name: "Deixar de seguir" })).toBeNull();
    });

    it("erro ao bloquear mostra mensagem amigável, sem trocar o rótulo do botão", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue({ ...resumoPublico, bloqueado: false });
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockBloquear.mockRejectedValue(erro);
      const { getByRole, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Bloquear" }));
      });

      expect(
        await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
      ).toBeTruthy();
      expect(getByRole("button", { name: "Bloquear" })).toBeTruthy();
    });

    it("toque em 'Denunciar' (perfil de candidato) navega para Report com entidadeTipo 'usuario'", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue(candidatoBasico);
      mockObterCandidatoPorUsuario.mockResolvedValue(candidatoCompleto);
      mockResumo.mockResolvedValue(resumoPublico);
      const { getByRole, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Denunciar" }));
      });

      expect(mockNavigate).toHaveBeenCalledWith("Report", { entidadeTipo: "usuario", entidadeId: "u2", tituloAlvo: "Beatriz Souza" });
    });

    it("toque em 'Denunciar' (perfil de empresa) navega para Report com entidadeTipo 'empresa' e o empresaId (não o usuarioId)", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue({ id: "u3", nome: "Fulano", tipoUsuario: "empresa" as const, perfilPublico: true });
      mockObterEmpresaPorUsuario.mockResolvedValue({ id: "e1", usuarioId: "u3", nomeFantasia: "ACME", razaoSocial: "ACME Ltda" });
      mockResumoEmpresa.mockResolvedValue({ totalSeguidores: 4, seguindoEstaEmpresa: false });
      const { getByRole, findByText } = await renderTela("u3");
      await findByText("ACME");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Denunciar" }));
      });

      expect(mockNavigate).toHaveBeenCalledWith("Report", { entidadeTipo: "empresa", entidadeId: "e1", tituloAlvo: "ACME" });
    });

    it("próprio perfil: não mostra Bloquear/Desbloquear nem Denunciar", async () => {
      mockObterUsuarioPublicoBasico.mockResolvedValue({ id: "u1", nome: "Ana", tipoUsuario: "candidato" as const, perfilPublico: true });
      mockObterCandidatoPorUsuario.mockResolvedValue({ ...candidatoCompleto, id: "c1", usuarioId: "u1" });
      mockResumo.mockResolvedValue(resumoPublico);
      const { findByText, queryByRole } = await renderTela("u1");

      await findByText("Ana");
      expect(queryByRole("button", { name: "Bloquear" })).toBeNull();
      expect(queryByRole("button", { name: "Denunciar" })).toBeNull();
    });
  });
});
