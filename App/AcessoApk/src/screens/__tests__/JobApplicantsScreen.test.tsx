/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockObterPorId = jest.fn();
const mockListarCandidaturas = jest.fn();
const mockAlterarStatus = jest.fn();
const mockRemover = jest.fn();
const mockAtualizarStatusCandidatura = jest.fn();

jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    obterPorId: (...a: unknown[]) => mockObterPorId(...a),
    listarCandidaturas: (...a: unknown[]) => mockListarCandidaturas(...a),
    alterarStatus: (...a: unknown[]) => mockAlterarStatus(...a),
    remover: (...a: unknown[]) => mockRemover(...a),
    atualizarStatusCandidatura: (...a: unknown[]) => mockAtualizarStatusCandidatura(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList, ProfileStackParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { JobApplicantsScreen } from "../JobApplicantsScreen";

const vagaAberta = {
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "...",
  modalidade: "Remoto" as const,
  status: "Aberta" as const,
};

const candidatura = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "c1",
  vagaId: "v1",
  status: "Pendente",
  mensagem: "Tenho muito interesse nesta vaga.",
  candidato: { id: "cd1", usuarioId: "u2", usuario: { id: "u2", nome: "Beatriz Souza", email: "beatriz@exemplo.com", fotoPerfil: null } },
  ...sobrescreve,
});

const envelopeCandidaturas = (candidaturas: unknown[]) => ({
  sucesso: true,
  total: candidaturas.length,
  pagina: 1,
  limite: 50,
  totalPaginas: 1,
  candidaturas,
});

let alertSpy: jest.SpyInstance;

function confirmarViaAlert(textoBotao: string) {
  const ultimaChamada = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const botoes = ultimaChamada[2] as { text: string; onPress?: () => void }[];
  botoes.find((b) => b.text === textoBotao)?.onPress?.();
}

// Mesmo tipo composto de verdade da tela (`CompositeScreenProps`) — evita
// tentar interseccionar dois `NativeStackNavigationProp` manualmente, que
// não bate estruturalmente com o tipo de marca privada que o React
// Navigation usa internamente para tipos compostos.
type JobApplicantsNavigation = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, "JobApplicants">,
  NativeStackScreenProps<AppStackParamList>
>["navigation"];

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const navigationMock = { navigate: mockNavigate, goBack: mockGoBack } as unknown as JobApplicantsNavigation;

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <JobApplicantsScreen
          navigation={navigationMock}
          route={{ key: "JobApplicants", name: "JobApplicants", params: { vagaId: "v1", vagaTitulo: "Desenvolvedor Front-end" } }}
        />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("JobApplicantsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert");
  });

  it("mostra loading, depois a vaga e as candidaturas", async () => {
    mockObterPorId.mockResolvedValue(vagaAberta);
    mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([candidatura()]));
    const { findByText } = await renderTela();

    expect(await findByText("Desenvolvedor Front-end")).toBeTruthy();
    expect(await findByText("Beatriz Souza")).toBeTruthy();
    expect(await findByText("Tenho muito interesse nesta vaga.")).toBeTruthy();
    expect(mockObterPorId).toHaveBeenCalledWith("v1");
    expect(mockListarCandidaturas).toHaveBeenCalledWith("v1", { page: 1, limit: 50 });
  });

  it("sem candidaturas, mostra o estado vazio", async () => {
    mockObterPorId.mockResolvedValue(vagaAberta);
    mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([]));
    const { findByText } = await renderTela();

    expect(await findByText("Ninguém se candidatou a esta vaga ainda.")).toBeTruthy();
  });

  it("falha no carregamento mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockObterPorId.mockRejectedValueOnce(erro);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar esta vaga")).toBeTruthy();

    mockObterPorId.mockResolvedValueOnce(vagaAberta);
    mockListarCandidaturas.mockResolvedValueOnce(envelopeCandidaturas([]));
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Desenvolvedor Front-end")).toBeTruthy();
  });

  it("toque em 'Editar vaga' navega para JobForm com o vagaId", async () => {
    mockObterPorId.mockResolvedValue(vagaAberta);
    mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([]));
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Editar vaga" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("JobForm", { vagaId: "v1" });
  });

  it("toque no candidato navega para PublicProfile com o usuarioId", async () => {
    mockObterPorId.mockResolvedValue(vagaAberta);
    mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([candidatura()]));
    const { getByRole, findByText } = await renderTela();
    await findByText("Beatriz Souza");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Ver perfil de Beatriz Souza" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "u2" });
  });

  describe("ações de status da vaga", () => {
    it("'Pausar' chama alterarStatus('Pausada') e atualiza o selo", async () => {
      mockObterPorId.mockResolvedValue(vagaAberta);
      mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([]));
      mockAlterarStatus.mockResolvedValue({ ...vagaAberta, status: "Pausada" });
      const { getByRole, findByText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Pausar" }));
      });

      expect(mockAlterarStatus).toHaveBeenCalledWith("v1", "Pausada");
      expect(await findByText("Pausada")).toBeTruthy();
      expect(await findByText("Reabrir")).toBeTruthy();
    });

    it("vaga encerrada: 'Pausar' e 'Encerrar' ficam desabilitados", async () => {
      mockObterPorId.mockResolvedValue({ ...vagaAberta, status: "Encerrada" });
      mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([]));
      const { getByRole, findByText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      expect(getByRole("button", { name: "Pausar" }).props.accessibilityState.disabled).toBe(true);
      expect(getByRole("button", { name: "Encerrar" }).props.accessibilityState.disabled).toBe(true);
    });

    it("'Excluir vaga' pede confirmação (Alert); confirmando, chama remover e volta", async () => {
      mockObterPorId.mockResolvedValue(vagaAberta);
      mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([]));
      mockRemover.mockResolvedValue(undefined);
      const { getByRole, findByText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir vaga" }));
      });
      expect(mockRemover).not.toHaveBeenCalled();

      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(mockRemover).toHaveBeenCalledWith("v1");
      expect(mockGoBack).toHaveBeenCalled();
    });

    it("erro ao excluir mostra mensagem amigável, sem voltar", async () => {
      mockObterPorId.mockResolvedValue(vagaAberta);
      mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([]));
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockRemover.mockRejectedValue(erro);
      const { getByRole, findByText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir vaga" }));
      });
      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(
        await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
      ).toBeTruthy();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe("status da candidatura", () => {
    it("alterar o status chama atualizarStatusCandidatura e atualiza o selo", async () => {
      mockObterPorId.mockResolvedValue(vagaAberta);
      mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([candidatura()]));
      mockAtualizarStatusCandidatura.mockResolvedValue(candidatura({ status: "Aprovada" }));
      const { getByLabelText, findByText, findAllByText } = await renderTela();
      await findByText("Beatriz Souza");

      await act(async () => {
        fireEvent.press(getByLabelText("Aprovada"));
      });

      expect(mockAtualizarStatusCandidatura).toHaveBeenCalledWith("c1", "Aprovada");
      // "Aprovada" aparece 2 vezes: o selo do card + a opção do
      // `SegmentedControl` — as duas confirmam que a lista foi atualizada
      // (o selo mudou de "Pendente" para "Aprovada", e a opção certa marcou
      // `checked`).
      expect(await findAllByText("Aprovada")).toHaveLength(2);
    });

    it("erro ao alterar o status mostra mensagem amigável", async () => {
      mockObterPorId.mockResolvedValue(vagaAberta);
      mockListarCandidaturas.mockResolvedValue(envelopeCandidaturas([candidatura()]));
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockAtualizarStatusCandidatura.mockRejectedValue(erro);
      const { getByLabelText, findByText } = await renderTela();
      await findByText("Beatriz Souza");

      await act(async () => {
        fireEvent.press(getByLabelText("Rejeitada"));
      });

      expect(
        await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
      ).toBeTruthy();
    });
  });
});
