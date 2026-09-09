/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockObterPorId = jest.fn();
const mockFavoritar = jest.fn();
const mockCandidatarSe = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    obterPorId: (...args: unknown[]) => mockObterPorId(...args),
    favoritar: (...args: unknown[]) => mockFavoritar(...args),
    candidatarSe: (...args: unknown[]) => mockCandidatarSe(...args),
  },
}));

jest.mock("../../auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AccessibilityProvider } from "../../accessibility";
import type { AppStackParamList } from "../../navigation/types";
import { ThemeProvider } from "../../theme";
import { VagaDetailScreen } from "../VagaDetailScreen";

const candidato = { id: "1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" };
const empresaUsuario = { id: "2", nome: "ACME", email: "acme@exemplo.com", tipoUsuario: "empresa" };

const vaga = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "Descrição da vaga.",
  modalidade: "Remoto",
  status: "Aberta",
  empresa: { id: "e1", nomeFantasia: "ACME" },
  ...sobrescreve,
});

type Nav = NativeStackScreenProps<AppStackParamList, "VagaDetail">;

const mockNavigate = jest.fn();

async function renderTela(vagaId = "v1") {
  const props = {
    route: { key: "VagaDetail", name: "VagaDetail", params: { vagaId } },
    navigation: { setOptions: jest.fn(), navigate: mockNavigate },
  } as unknown as Nav;

  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <VagaDetailScreen {...props} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("VagaDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: candidato });
  });

  it("mostra loading e depois o detalhe da vaga", async () => {
    mockObterPorId.mockResolvedValue(vaga());
    const { findByText } = await renderTela();

    expect(await findByText("Desenvolvedor Front-end")).toBeTruthy();
    expect(await findByText("ACME")).toBeTruthy();
    expect(mockObterPorId).toHaveBeenCalledWith("v1");
  });

  it("falha no carregamento mostra erro com 'Tentar novamente', que refaz a busca", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockObterPorId.mockRejectedValueOnce(erro);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar esta vaga")).toBeTruthy();

    mockObterPorId.mockResolvedValueOnce(vaga());
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Desenvolvedor Front-end")).toBeTruthy();
    expect(mockObterPorId).toHaveBeenCalledTimes(2);
  });

  it("vaga não aberta mostra o status e não permite candidatura", async () => {
    mockObterPorId.mockResolvedValue(vaga({ status: "Pausada" }));
    const { findByText, queryByRole } = await renderTela();

    expect(await findByText("Pausada")).toBeTruthy();
    expect(await findByText(/não está mais aceitando candidaturas/)).toBeTruthy();
    expect(queryByRole("button", { name: "Candidatar-se" })).toBeNull();
  });

  it("salario como string é formatado; ausente não mostra 'R$ NaN'", async () => {
    mockObterPorId.mockResolvedValue(vaga({ salario: "3500.00" }));
    const { findByText } = await renderTela();

    expect(await findByText(/R\$\s*3\.500,00/)).toBeTruthy();
  });

  it("sem salario, não renderiza nenhum valor monetário", async () => {
    mockObterPorId.mockResolvedValue(vaga({ salario: null }));
    const { findByText, queryByText } = await renderTela();

    await findByText("Desenvolvedor Front-end");
    expect(queryByText(/R\$/)).toBeNull();
    expect(queryByText(/NaN/)).toBeNull();
  });

  it("sem dataPublicacao, não mostra nenhuma data", async () => {
    mockObterPorId.mockResolvedValue(vaga({ dataPublicacao: null }));
    const { findByText, queryByText } = await renderTela();

    await findByText("Desenvolvedor Front-end");
    expect(queryByText(/Publicada em/)).toBeNull();
  });

  it("candidatura com sucesso mostra confirmação com accessibilityLiveRegion=polite", async () => {
    mockObterPorId.mockResolvedValue(vaga());
    mockCandidatarSe.mockResolvedValue({ id: "c1", status: "Pendente" });
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Candidatar-se" }));
    });

    const confirmacao = await findByText("Candidatura enviada com sucesso!");
    expect(confirmacao.props.accessibilityLiveRegion).toBe("polite");
    expect(getByRole("button", { name: "Candidatura enviada" }).props.accessibilityState.disabled).toBe(true);
  });

  it("candidatura com 409 (já candidatado) mostra a mensagem amigável com accessibilityLiveRegion=assertive", async () => {
    mockObterPorId.mockResolvedValue(vaga());
    const erro409 = Object.assign(new Error("409"), {
      isAxiosError: true,
      response: { data: { mensagem: "Você já se candidatou a esta vaga." } },
    });
    mockCandidatarSe.mockRejectedValue(erro409);
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Candidatar-se" }));
    });

    const mensagem = await findByText("Você já se candidatou a esta vaga.");
    expect(mensagem.props.accessibilityLiveRegion).toBe("assertive");
    expect(mensagem.props.accessibilityRole).toBe("alert");
  });

  it("duplo toque em candidatar-se dispara só uma chamada", async () => {
    mockObterPorId.mockResolvedValue(vaga());
    let resolver: (valor: unknown) => void = () => {};
    mockCandidatarSe.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    const botao = getByRole("button", { name: "Candidatar-se" });
    await act(async () => { fireEvent.press(botao); });
    await act(async () => { fireEvent.press(botao); }); // já desabilitado (candidatando)

    await act(async () => { resolver({ id: "c1" }); });

    expect(mockCandidatarSe).toHaveBeenCalledTimes(1);
  });

  it("favoritar alterna label e accessibilityState.selected de acordo com a resposta do servidor", async () => {
    mockObterPorId.mockResolvedValue(vaga());
    mockFavoritar.mockResolvedValueOnce(true);
    const { getByRole, findByText, findByLabelText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Favoritar vaga" }));
    });

    const favoritado = await findByLabelText("Remover dos favoritos");
    expect(favoritado.props.accessibilityState.selected).toBe(true);

    mockFavoritar.mockResolvedValueOnce(false);
    await act(async () => {
      fireEvent.press(favoritado);
    });

    const desfavoritado = await findByLabelText("Favoritar vaga");
    expect(desfavoritado.props.accessibilityState.selected).toBe(false);
  });

  it("falha ao favoritar não muda o estado visual — só mostra o erro", async () => {
    mockObterPorId.mockResolvedValue(vaga());
    // Sem `.response`: `getFriendlyErrorMessage` cai na mensagem de "sem conexão" (comportamento real, documentado em `services/api/errors.ts`).
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockFavoritar.mockRejectedValue(erro);
    const { getByRole, findByText } = await renderTela();
    await findByText("Desenvolvedor Front-end");

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Favoritar vaga" }));
    });

    const mensagem = await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    expect(mensagem.props.accessibilityLiveRegion).toBe("assertive");
    // Continua "Favoritar vaga" (não virou "Remover dos favoritos") — sem optimistic update.
    expect(getByRole("button", { name: "Favoritar vaga" })).toBeTruthy();
  });

  it("usuário empresa não vê os controles de candidatura/favoritar", async () => {
    mockUseAuth.mockReturnValue({ user: empresaUsuario });
    mockObterPorId.mockResolvedValue(vaga());
    const { findByText, queryByRole } = await renderTela();

    await findByText("Desenvolvedor Front-end");
    expect(queryByRole("button", { name: "Candidatar-se" })).toBeNull();
    expect(queryByRole("button", { name: "Favoritar vaga" })).toBeNull();
    expect(mockFavoritar).not.toHaveBeenCalled();
    expect(mockCandidatarSe).not.toHaveBeenCalled();
  });

  it("visitante (sem usuário autenticado) também não vê os controles", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockObterPorId.mockResolvedValue(vaga());
    const { findByText, queryByRole } = await renderTela();

    await findByText("Desenvolvedor Front-end");
    expect(queryByRole("button", { name: "Candidatar-se" })).toBeNull();
    expect(queryByRole("button", { name: "Favoritar vaga" })).toBeNull();
  });

  // Fase 14: navegação a partir de Vagas — só quando `empresa.usuario` vem embutido (detalhe, confirmado por auditoria).
  it("com empresa.usuario embutido, o nome da empresa é clicável e navega para PublicProfile", async () => {
    mockObterPorId.mockResolvedValue(vaga({ empresa: { id: "e1", nomeFantasia: "ACME", usuario: { id: "ue1", nome: "ACME" } } }));
    const { getByRole } = await renderTela();

    const nomeEmpresa = await waitFor(() => getByRole("button", { name: "Ver perfil de ACME" }));
    await act(async () => {
      fireEvent.press(nomeEmpresa);
    });

    expect(mockNavigate).toHaveBeenCalledWith("PublicProfile", { usuarioId: "ue1" });
  });

  it("sem empresa.usuario, o nome da empresa é só texto (não clicável)", async () => {
    mockObterPorId.mockResolvedValue(vaga());
    const { findByText, queryByRole } = await renderTela();

    await findByText("Desenvolvedor Front-end");
    expect(queryByRole("button", { name: "Ver perfil de ACME" })).toBeNull();
  });

  describe("denunciar vaga (Fase 19)", () => {
    it("com empresa.usuario embutido, mostra 'Denunciar vaga'; toque navega para Report com entidadeTipo 'vaga'", async () => {
      mockObterPorId.mockResolvedValue(vaga({ empresa: { id: "e1", nomeFantasia: "ACME", usuario: { id: "ue1", nome: "ACME" } } }));
      const { getByRole, findByText } = await renderTela();
      await findByText("Desenvolvedor Front-end");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Denunciar vaga" }));
      });

      expect(mockNavigate).toHaveBeenCalledWith("Report", { entidadeTipo: "vaga", entidadeId: "v1", tituloAlvo: "Desenvolvedor Front-end" });
    });

    it("sem empresa.usuario embutido, não mostra 'Denunciar vaga' (não há como saber quem é o dono)", async () => {
      mockObterPorId.mockResolvedValue(vaga());
      const { findByText, queryByRole } = await renderTela();

      await findByText("Desenvolvedor Front-end");
      expect(queryByRole("button", { name: "Denunciar vaga" })).toBeNull();
    });

    it("a própria empresa dona da vaga não vê 'Denunciar vaga'", async () => {
      mockUseAuth.mockReturnValue({ user: empresaUsuario });
      mockObterPorId.mockResolvedValue(vaga({ empresa: { id: "e1", nomeFantasia: "ACME", usuario: { id: "2", nome: "ACME" } } }));
      const { findByText, queryByRole } = await renderTela();

      await findByText("Desenvolvedor Front-end");
      expect(queryByRole("button", { name: "Denunciar vaga" })).toBeNull();
    });
  });
});
