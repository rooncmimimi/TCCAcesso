/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockMeuPerfil = jest.fn();
const mockAtualizar = jest.fn();

jest.mock("../../empresas", () => ({
  ...jest.requireActual("../../empresas"),
  EmpresaService: {
    meuPerfil: (...a: unknown[]) => mockMeuPerfil(...a),
    atualizar: (...a: unknown[]) => mockAtualizar(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { EmpresaProfileScreen } from "../EmpresaProfileScreen";

const empresaBase = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "e1",
  usuarioId: "u1",
  razaoSocial: "ACME Ltda",
  nomeFantasia: "ACME",
  descricao: "Uma empresa de tecnologia.",
  setor: "Tecnologia",
  porte: "Media",
  site: "https://acme.com",
  cidade: "São Paulo",
  estado: "SP",
  endereco: "Rua A, 100",
  cep: "01000000",
  culturaInclusiva: "Contratamos PCD.",
  statusAprovacao: "aprovada",
  ...sobrescreve,
});

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <EmpresaProfileScreen />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("EmpresaProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra loading e depois o formulário preenchido, quando aprovada", async () => {
    mockMeuPerfil.mockResolvedValue(empresaBase());
    const { findByLabelText } = await renderTela();

    expect((await findByLabelText("Razão social")).props.value).toBe("ACME Ltda");
    expect((await findByLabelText("Nome fantasia")).props.value).toBe("ACME");
    expect(mockMeuPerfil).toHaveBeenCalled();
  });

  it("falha ao carregar mostra erro em tela cheia com 'Tentar novamente'", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockMeuPerfil.mockRejectedValueOnce(erro);
    const { findByText, findByLabelText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar o perfil da empresa")).toBeTruthy();

    mockMeuPerfil.mockResolvedValueOnce(empresaBase());
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect((await findByLabelText("Razão social")).props.value).toBe("ACME Ltda");
  });

  describe("empresa não aprovada — mostra aviso em vez do formulário", () => {
    it("pendente", async () => {
      mockMeuPerfil.mockResolvedValue(empresaBase({ statusAprovacao: "pendente" }));
      const { findByText, queryByLabelText } = await renderTela();

      expect(
        await findByText(
          "Sua empresa está aguardando aprovação da equipe do ACESSO. Você poderá editar o perfil e publicar vagas assim que a análise for concluída.",
        ),
      ).toBeTruthy();
      expect(queryByLabelText("Razão social")).toBeNull();
    });

    it("reprovada, com motivo", async () => {
      mockMeuPerfil.mockResolvedValue(
        empresaBase({ statusAprovacao: "reprovada", motivoReprovacao: "CNPJ inválido." }),
      );
      const { findByText } = await renderTela();

      expect(await findByText("Seu cadastro empresarial não foi aprovado. Motivo: CNPJ inválido.")).toBeTruthy();
    });

    it("suspensa, com motivo", async () => {
      mockMeuPerfil.mockResolvedValue(
        empresaBase({ statusAprovacao: "suspensa", motivoSuspensao: "Denúncias recorrentes." }),
      );
      const { findByText } = await renderTela();

      expect(
        await findByText("Sua empresa está suspensa pela moderação do ACESSO. Motivo: Denúncias recorrentes."),
      ).toBeTruthy();
    });
  });

  describe("salvar alterações", () => {
    it("razão social vazia não salva — mostra erro", async () => {
      mockMeuPerfil.mockResolvedValue(empresaBase());
      const { getByLabelText, getByRole, findByText, findByLabelText } = await renderTela();
      await findByLabelText("Razão social");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Razão social"), "");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar alterações" }));
      });

      expect(await findByText("A razão social não pode ficar vazia.")).toBeTruthy();
      expect(mockAtualizar).not.toHaveBeenCalled();
    });

    it("sucesso chama EmpresaService.atualizar com os dados e mostra confirmação (polite)", async () => {
      mockMeuPerfil.mockResolvedValue(empresaBase());
      mockAtualizar.mockResolvedValue(empresaBase({ descricao: "Nova descrição." }));
      const { getByLabelText, getByRole, findByText, findByLabelText } = await renderTela();
      await findByLabelText("Razão social");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Descrição"), "Nova descrição.");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar alterações" }));
      });

      expect(mockAtualizar).toHaveBeenCalledWith(
        "e1",
        expect.objectContaining({ razaoSocial: "ACME Ltda", descricao: "Nova descrição." }),
      );
      const confirmacao = await findByText("Perfil da empresa atualizado.");
      expect(confirmacao.props.accessibilityLiveRegion).toBe("polite");
    });

    it("estado é normalizado para maiúsculas ao salvar", async () => {
      mockMeuPerfil.mockResolvedValue(empresaBase());
      mockAtualizar.mockResolvedValue(empresaBase());
      const { getByLabelText, getByRole, findByLabelText } = await renderTela();
      await findByLabelText("Razão social");

      await act(async () => {
        fireEvent.changeText(getByLabelText("UF"), "sp");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar alterações" }));
      });

      expect(mockAtualizar).toHaveBeenCalledWith("e1", expect.objectContaining({ estado: "SP" }));
    });

    it("erro ao salvar (ex.: empresa deixou de estar aprovada nesse meio-tempo → 403) mostra mensagem amigável", async () => {
      mockMeuPerfil.mockResolvedValue(empresaBase());
      const erro = Object.assign(new Error("403"), {
        isAxiosError: true,
        response: { data: { mensagem: "Sua empresa está aguardando aprovação da equipe do ACESSO." } },
      });
      mockAtualizar.mockRejectedValue(erro);
      const { getByRole, findByText, findByLabelText } = await renderTela();
      await findByLabelText("Razão social");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar alterações" }));
      });

      expect(await findByText("Sua empresa está aguardando aprovação da equipe do ACESSO.")).toBeTruthy();
    });
  });
});
