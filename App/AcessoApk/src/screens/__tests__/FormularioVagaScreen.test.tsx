/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockObterPorId = jest.fn();
const mockCriar = jest.fn();
const mockAtualizar = jest.fn();

jest.mock("../../vagas", () => ({
  ...jest.requireActual("../../vagas"),
  VagasService: {
    obterPorId: (...a: unknown[]) => mockObterPorId(...a),
    criar: (...a: unknown[]) => mockCriar(...a),
    atualizar: (...a: unknown[]) => mockAtualizar(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AcessibilidadeProvider } from "../../acessibilidade";
import type { PerfilStackParamList } from "../../navigation/types";
import { TemaProvider } from "../../tema";
import { FormularioVagaScreen } from "../FormularioVagaScreen";

const vagaExistente = {
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "Vaga para desenvolvedor front-end com experiência em React.",
  requisitos: "React, TypeScript",
  beneficios: "VR, VT",
  salario: "5000.00",
  modalidade: "remoto" as const,
  contrato: "clt" as const,
  cidade: "São Paulo",
  estado: "SP",
  cargaHoraria: "40h semanais",
  publicoAlvo: "pcd" as const,
  recursosAcessibilidade: ["tecnologia_assistiva" as const],
  acessibilidade: "Ambiente adaptado.",
  status: "aberta" as const,
  dataEncerramento: "2026-12-31",
};

const mockGoBack = jest.fn();

function navigationMock() {
  return { goBack: mockGoBack, navigate: jest.fn() } as unknown as NativeStackScreenProps<PerfilStackParamList, "JobForm">["navigation"];
}

async function renderTela(vagaId?: string) {
  const utils = await render(
    <AcessibilidadeProvider>
      <TemaProvider>
        <FormularioVagaScreen
          navigation={navigationMock()}
          route={{ key: "JobForm", name: "JobForm", params: { vagaId } }}
        />
      </TemaProvider>
    </AcessibilidadeProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("FormularioVagaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("criar (sem vagaId)", () => {
    it("abre com o formulário em branco, sem buscar nada", async () => {
      const { findByLabelText } = await renderTela();

      expect((await findByLabelText("Título")).props.value).toBe("");
      expect(mockObterPorId).not.toHaveBeenCalled();
    });

    it("título curto demais não salva — mostra erro", async () => {
      const { getByLabelText, getByRole, findByText } = await renderTela();
      await findByText("Publicar vaga");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Título"), "Dev");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Publicar vaga" }));
      });

      expect(await findByText("O título deve ter pelo menos 5 caracteres.")).toBeTruthy();
      expect(mockCriar).not.toHaveBeenCalled();
    });

    it("descrição curta demais não salva — mostra erro", async () => {
      const { getByLabelText, getByRole, findByText } = await renderTela();
      await findByText("Publicar vaga");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Título"), "Desenvolvedor Front-end");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Descrição"), "Muito curta");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Publicar vaga" }));
      });

      expect(await findByText("A descrição deve ter pelo menos 20 caracteres.")).toBeTruthy();
      expect(mockCriar).not.toHaveBeenCalled();
    });

    it("sucesso chama VagasService.criar (nunca atualizar) e volta (goBack)", async () => {
      mockCriar.mockResolvedValue({ ...vagaExistente, id: "v2" });
      const { getByLabelText, getByRole, findByText } = await renderTela();
      await findByText("Publicar vaga");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Título"), "Desenvolvedor Front-end");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Descrição"), "Vaga para desenvolvedor front-end com experiência em React.");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Publicar vaga" }));
      });

      await waitFor(() => expect(mockCriar).toHaveBeenCalled());
      expect(mockAtualizar).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it("alternar um recurso de acessibilidade inclui no payload enviado", async () => {
      mockCriar.mockResolvedValue(vagaExistente);
      const { getByLabelText, getByRole, findByText } = await renderTela();
      await findByText("Publicar vaga");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Título"), "Desenvolvedor Front-end");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Descrição"), "Vaga para desenvolvedor front-end com experiência em React.");
      });
      await act(async () => {
        fireEvent.press(getByLabelText("Intérprete de Libras"));
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Publicar vaga" }));
      });

      await waitFor(() => expect(mockCriar).toHaveBeenCalled());
      expect(mockCriar).toHaveBeenCalledWith(
        expect.objectContaining({ recursosAcessibilidade: ["interprete_libras"] }),
      );
    });

    it("erro ao salvar mostra mensagem amigável, sem voltar", async () => {
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockCriar.mockRejectedValue(erro);
      const { getByLabelText, getByRole, findByText } = await renderTela();
      await findByText("Publicar vaga");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Título"), "Desenvolvedor Front-end");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Descrição"), "Vaga para desenvolvedor front-end com experiência em React.");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Publicar vaga" }));
      });

      expect(
        await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
      ).toBeTruthy();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe("editar (com vagaId)", () => {
    it("mostra loading, depois pré-preenche o formulário com a vaga buscada", async () => {
      mockObterPorId.mockResolvedValue(vagaExistente);
      const { findByLabelText } = await renderTela("v1");

      expect((await findByLabelText("Título")).props.value).toBe("Desenvolvedor Front-end");
      expect((await findByLabelText("Descrição")).props.value).toBe(vagaExistente.descricao);
      expect(mockObterPorId).toHaveBeenCalledWith("v1");
    });

    it("falha ao carregar mostra erro em tela cheia com 'Tentar novamente'", async () => {
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockObterPorId.mockRejectedValueOnce(erro);
      const { findByText, getByRole, findByLabelText } = await renderTela("v1");

      expect(await findByText("Não foi possível carregar esta vaga")).toBeTruthy();

      mockObterPorId.mockResolvedValueOnce(vagaExistente);
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
      });

      expect((await findByLabelText("Título")).props.value).toBe("Desenvolvedor Front-end");
    });

    it("sucesso chama VagasService.atualizar com o vagaId (nunca criar) e volta", async () => {
      mockObterPorId.mockResolvedValue(vagaExistente);
      mockAtualizar.mockResolvedValue(vagaExistente);
      const { getByLabelText, getByRole, findByLabelText } = await renderTela("v1");
      await findByLabelText("Título");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Título"), "Desenvolvedor Front-end Sênior");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar alterações" }));
      });

      await waitFor(() => expect(mockAtualizar).toHaveBeenCalledWith("v1", expect.objectContaining({ titulo: "Desenvolvedor Front-end Sênior" })));
      expect(mockCriar).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
