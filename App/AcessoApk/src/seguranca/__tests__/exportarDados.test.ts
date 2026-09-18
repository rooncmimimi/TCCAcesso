/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockMeuCandidato = jest.fn();
const mockListarExperiencias = jest.fn();
const mockListarFormacoes = jest.fn();
const mockListarCertificados = jest.fn();
const mockListarHabilidades = jest.fn();
const mockMeuPerfilEmpresa = jest.fn();
const mockObterPreferenciasNotificacao = jest.fn();

jest.mock("../../perfil", () => ({
  PerfilService: {
    meuCandidato: (...a: unknown[]) => mockMeuCandidato(...a),
    listarExperiencias: (...a: unknown[]) => mockListarExperiencias(...a),
    listarFormacoes: (...a: unknown[]) => mockListarFormacoes(...a),
    listarCertificados: (...a: unknown[]) => mockListarCertificados(...a),
    listarHabilidades: (...a: unknown[]) => mockListarHabilidades(...a),
  },
}));

jest.mock("../../empresas", () => ({
  EmpresaService: {
    meuPerfil: (...a: unknown[]) => mockMeuPerfilEmpresa(...a),
  },
}));

jest.mock("../../configuracoes", () => ({
  ConfiguracoesService: {
    obterPreferenciasNotificacao: (...a: unknown[]) => mockObterPreferenciasNotificacao(...a),
  },
}));

const mockFileCreate = jest.fn();
const mockFileWrite = jest.fn();
const mockFileConstructor = jest.fn();

jest.mock("expo-file-system", () => ({
  Paths: { cache: "mock-cache-dir" },
  File: jest.fn().mockImplementation((...args: unknown[]) => {
    mockFileConstructor(...args);
    return {
      uri: "mock-cache-dir/acesso-meus-dados.json",
      create: mockFileCreate,
      write: mockFileWrite,
    };
  }),
}));

const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();

jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...a: unknown[]) => mockIsAvailableAsync(...a),
  shareAsync: (...a: unknown[]) => mockShareAsync(...a),
}));

import type { UsuarioAutenticado } from "../../autenticacao";
import { PREFERENCIAS_ACESSIBILIDADE_PADRAO } from "../../acessibilidade";
import { coletarMeusDados, exportarECompartilhar } from "../exportarDados";

const usuarioCandidato: UsuarioAutenticado = { id: "u1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" };
const usuarioEmpresa: UsuarioAutenticado = { id: "u2", nome: "ACME", email: "acme@exemplo.com", tipoUsuario: "empresa" };

describe("coletarMeusDados", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObterPreferenciasNotificacao.mockResolvedValue({ id: "p1", usuarioId: "u1", vagasCandidaturas: true, mensagens: true, publicacoesComentarios: true, redeSeguidores: true });
  });

  it("candidato: busca perfil + experiências + formações + certificados + habilidades, nunca dados de empresa", async () => {
    mockMeuCandidato.mockResolvedValue({ id: "c1", usuarioId: "u1" });
    mockListarExperiencias.mockResolvedValue([{ id: "e1" }]);
    mockListarFormacoes.mockResolvedValue([{ id: "f1" }]);
    mockListarCertificados.mockResolvedValue([{ id: "cert1" }]);
    mockListarHabilidades.mockResolvedValue([{ id: "h1" }]);

    const dados = await coletarMeusDados(usuarioCandidato, PREFERENCIAS_ACESSIBILIDADE_PADRAO);

    expect(dados.conta).toEqual(usuarioCandidato);
    expect(dados.candidato).toEqual({ id: "c1", usuarioId: "u1" });
    expect(dados.experiencias).toEqual([{ id: "e1" }]);
    expect(dados.formacoes).toEqual([{ id: "f1" }]);
    expect(dados.certificados).toEqual([{ id: "cert1" }]);
    expect(dados.habilidades).toEqual([{ id: "h1" }]);
    expect(dados.empresa).toBeUndefined();
    expect(dados.preferenciasAcessibilidade).toEqual(PREFERENCIAS_ACESSIBILIDADE_PADRAO);
    expect(mockMeuPerfilEmpresa).not.toHaveBeenCalled();
  });

  it("empresa: busca só o perfil de empresa, nunca dados de candidato", async () => {
    mockMeuPerfilEmpresa.mockResolvedValue({ id: "emp1", razaoSocial: "ACME Ltda" });

    const dados = await coletarMeusDados(usuarioEmpresa, PREFERENCIAS_ACESSIBILIDADE_PADRAO);

    expect(dados.empresa).toEqual({ id: "emp1", razaoSocial: "ACME Ltda" });
    expect(dados.candidato).toBeUndefined();
    expect(mockMeuCandidato).not.toHaveBeenCalled();
  });

  it("sempre inclui preferências de notificação e um horário de geração", async () => {
    mockMeuPerfilEmpresa.mockResolvedValue({ id: "emp1" });

    const dados = await coletarMeusDados(usuarioEmpresa, PREFERENCIAS_ACESSIBILIDADE_PADRAO);

    expect(dados.preferenciasNotificacao).toEqual(
      expect.objectContaining({ vagasCandidaturas: true }),
    );
    expect(new Date(dados.geradoEm).getTime()).not.toBeNaN();
  });
});

describe("exportarECompartilhar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
  });

  it("escreve o JSON num arquivo e compartilha, com mimeType application/json", async () => {
    const dados = {
      geradoEm: "2026-01-01T00:00:00.000Z",
      conta: { id: "u1" },
      preferenciasAcessibilidade: PREFERENCIAS_ACESSIBILIDADE_PADRAO,
    };

    await exportarECompartilhar(dados);

    expect(mockFileCreate).toHaveBeenCalledWith({ overwrite: true, intermediates: true });
    expect(mockFileWrite).toHaveBeenCalledWith(JSON.stringify(dados, null, 2));
    expect(mockShareAsync).toHaveBeenCalledWith(
      "mock-cache-dir/acesso-meus-dados.json",
      expect.objectContaining({ mimeType: "application/json" }),
    );
  });

  it("sem compartilhamento disponível no aparelho, lança um erro amigável e nunca escreve o arquivo", async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    const dados = { geradoEm: "x", conta: {}, preferenciasAcessibilidade: PREFERENCIAS_ACESSIBILIDADE_PADRAO };

    await expect(exportarECompartilhar(dados)).rejects.toThrow(
      "O compartilhamento de arquivos não está disponível neste aparelho.",
    );
    expect(mockFileConstructor).not.toHaveBeenCalled();
  });
});
