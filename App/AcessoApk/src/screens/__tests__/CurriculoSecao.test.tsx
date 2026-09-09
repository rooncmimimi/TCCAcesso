/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockGetDocumentAsync = jest.fn();
const mockUploadCurriculo = jest.fn();
const mockObterUrlCurriculo = jest.fn();
const mockObterUrlDownloadCurriculo = jest.fn();
const mockImportarCurriculo = jest.fn();
const mockOpenURL = jest.fn();

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...a: unknown[]) => mockGetDocumentAsync(...a),
}));

jest.mock("../../perfil", () => ({
  ...jest.requireActual("../../perfil"),
  PerfilService: {
    uploadCurriculo: (...a: unknown[]) => mockUploadCurriculo(...a),
    obterUrlCurriculo: (...a: unknown[]) => mockObterUrlCurriculo(...a),
    obterUrlDownloadCurriculo: (...a: unknown[]) => mockObterUrlDownloadCurriculo(...a),
    importarCurriculo: (...a: unknown[]) => mockImportarCurriculo(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { CurriculoSecao } from "../CurriculoSecao";

const candidatoSemCurriculo = { id: "c1", usuarioId: "u1", curriculo: null, curriculoNome: null, curriculoAtualizadoEm: null };
const candidatoComCurriculo = {
  id: "c1",
  usuarioId: "u1",
  curriculo: "curriculos/c1/abc.pdf",
  curriculoNome: "meu-curriculo.pdf",
  curriculoAtualizadoEm: "2026-01-01T00:00:00.000Z",
};

const arquivoSelecionado = { canceled: false, assets: [{ uri: "file:///tmp/x.pdf", name: "x.pdf", mimeType: "application/pdf", lastModified: 0 }] };

async function renderTela(candidato: Record<string, unknown> = candidatoSemCurriculo, onAtualizado = jest.fn()) {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        {/* @ts-expect-error -- objeto de teste simplificado, não o tipo Candidato completo */}
        <CurriculoSecao candidato={candidato} onAtualizado={onAtualizado} />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

describe("CurriculoSecao", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockImplementation((...a) => mockOpenURL(...a));
  });

  it("sem currículo enviado, mostra a mensagem certa e não mostra Visualizar/Baixar", async () => {
    const { findByText, queryByRole } = await renderTela();
    expect(await findByText("Nenhum currículo enviado ainda.")).toBeTruthy();
    expect(queryByRole("button", { name: "Visualizar" })).toBeNull();
    expect(queryByRole("button", { name: "Baixar" })).toBeNull();
    expect(await findByText("Selecionar e enviar currículo")).toBeTruthy();
  });

  it("com currículo já enviado, mostra o nome do arquivo e os botões Visualizar/Baixar", async () => {
    const { findByText, getByRole } = await renderTela(candidatoComCurriculo);
    expect(await findByText("meu-curriculo.pdf")).toBeTruthy();
    expect(getByRole("button", { name: "Substituir currículo" })).toBeTruthy();
    expect(getByRole("button", { name: "Visualizar" })).toBeTruthy();
    expect(getByRole("button", { name: "Baixar" })).toBeTruthy();
  });

  it("cancelar a seleção de arquivo não chama upload nem mostra erro", async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
    const { getByRole, queryByText } = await renderTela();

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Selecionar e enviar currículo" }));
    });

    expect(mockUploadCurriculo).not.toHaveBeenCalled();
    expect(queryByText("Não foi possível enviar o currículo agora.")).toBeNull();
  });

  it("selecionar e enviar um PDF chama uploadCurriculo e propaga o candidato atualizado", async () => {
    mockGetDocumentAsync.mockResolvedValue(arquivoSelecionado);
    mockUploadCurriculo.mockResolvedValue(candidatoComCurriculo);
    const onAtualizado = jest.fn();
    const { getByRole } = await renderTela(candidatoSemCurriculo, onAtualizado);

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Selecionar e enviar currículo" }));
    });

    expect(mockUploadCurriculo).toHaveBeenCalledWith("c1", { uri: "file:///tmp/x.pdf", name: "x.pdf", mimeType: "application/pdf" });
    expect(onAtualizado).toHaveBeenCalledWith(candidatoComCurriculo);
  });

  it("erro ao enviar mostra mensagem amigável", async () => {
    mockGetDocumentAsync.mockResolvedValue(arquivoSelecionado);
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockUploadCurriculo.mockRejectedValue(erro);
    const { getByRole, findByText } = await renderTela();

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Selecionar e enviar currículo" }));
    });

    const mensagem = await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    expect(mensagem.props.accessibilityLiveRegion).toBe("assertive");
  });

  it("visualizar abre a URL assinada retornada pelo backend", async () => {
    mockObterUrlCurriculo.mockResolvedValue({ url: "https://exemplo.com/assinada", expiraEm: "x", nomeArquivo: "meu-curriculo.pdf" });
    const { getByRole } = await renderTela(candidatoComCurriculo);

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Visualizar" }));
    });

    expect(mockObterUrlCurriculo).toHaveBeenCalledWith("c1");
    expect(mockOpenURL).toHaveBeenCalledWith("https://exemplo.com/assinada");
  });

  it("baixar chama obterUrlDownloadCurriculo (rota separada, força download) e abre a URL", async () => {
    mockObterUrlDownloadCurriculo.mockResolvedValue({ url: "https://exemplo.com/download", expiraEm: "x", nomeArquivo: "meu-curriculo.pdf" });
    const { getByRole } = await renderTela(candidatoComCurriculo);

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Baixar" }));
    });

    expect(mockObterUrlDownloadCurriculo).toHaveBeenCalledWith("c1");
    expect(mockObterUrlCurriculo).not.toHaveBeenCalled();
    expect(mockOpenURL).toHaveBeenCalledWith("https://exemplo.com/download");
  });

  it("importar currículo mostra o rascunho retornado, incluindo o aviso do backend", async () => {
    mockGetDocumentAsync.mockResolvedValue(arquivoSelecionado);
    mockImportarCurriculo.mockResolvedValue({
      email: "ana@exemplo.com",
      telefone: null,
      linkedin: null,
      github: null,
      resumo: "Desenvolvedora com 5 anos de experiência.",
      experiencias: [{ cargo: "", empresa: "", dataInicio: "", dataFim: "", atual: false, descricaoSugerida: "Dev na ACME" }],
      formacoes: [],
      habilidades: ["React", "TypeScript"],
      aviso: "Extração automática por palavras-chave, sem inteligência artificial — revise e complete cada campo antes de salvar.",
    });
    const { getByRole, findByText } = await renderTela();

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Selecionar arquivo para importar" }));
    });

    expect(mockImportarCurriculo).toHaveBeenCalledWith("c1", { uri: "file:///tmp/x.pdf", name: "x.pdf", mimeType: "application/pdf" });
    expect(await findByText("ana@exemplo.com")).toBeTruthy();
    expect(await findByText("Desenvolvedora com 5 anos de experiência.")).toBeTruthy();
    expect(await findByText("Dev na ACME")).toBeTruthy();
    expect(await findByText("React, TypeScript")).toBeTruthy();
    expect(
      await findByText(
        "Extração automática por palavras-chave, sem inteligência artificial — revise e complete cada campo antes de salvar.",
      ),
    ).toBeTruthy();
  });

  it("importação NUNCA chama uploadCurriculo — é só rascunho, não grava nada sozinho", async () => {
    mockGetDocumentAsync.mockResolvedValue(arquivoSelecionado);
    mockImportarCurriculo.mockResolvedValue({
      email: null,
      telefone: null,
      linkedin: null,
      github: null,
      resumo: null,
      experiencias: [],
      formacoes: [],
      habilidades: [],
      aviso: "Extração automática por palavras-chave, sem inteligência artificial — revise e complete cada campo antes de salvar.",
    });
    const onAtualizado = jest.fn();
    const { getByRole } = await renderTela(candidatoSemCurriculo, onAtualizado);

    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Selecionar arquivo para importar" }));
    });

    expect(mockUploadCurriculo).not.toHaveBeenCalled();
    expect(onAtualizado).not.toHaveBeenCalled();
  });

  it("não existe nenhum botão de excluir currículo (sem endpoint no backend — Fase 13)", async () => {
    const { queryByRole } = await renderTela(candidatoComCurriculo);
    expect(queryByRole("button", { name: "Excluir currículo" })).toBeNull();
  });
});
