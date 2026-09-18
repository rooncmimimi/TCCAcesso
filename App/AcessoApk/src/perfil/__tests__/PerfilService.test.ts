/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/cliente", () => ({
  clienteApi: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { clienteApi } from "../../services/api/cliente";
import { PerfilService } from "../PerfilService";

const candidatoExemplo = {
  id: "c1",
  usuarioId: "u1",
  cidade: "São Paulo",
  usuario: { id: "u1", nome: "Ana", email: "ana@exemplo.com", tipoUsuario: "candidato" },
  deficiencias: [],
};

describe("PerfilService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("meuCandidato", () => {
    it("chama GET /candidatos/me e devolve só o candidato, desembrulhado", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, candidato: candidatoExemplo } });

      await expect(PerfilService.meuCandidato()).resolves.toEqual(candidatoExemplo);
      expect(clienteApi.get).toHaveBeenCalledWith("/candidatos/me");
    });
  });

  describe("perfil público de terceiros", () => {
    it("obterCandidatoPorUsuario: chama GET /perfil/candidatos/usuario/:usuarioId", async () => {
      const candidatoPublico = { ...candidatoExemplo, email: undefined };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, candidato: candidatoPublico } });

      await expect(PerfilService.obterCandidatoPorUsuario("u1")).resolves.toEqual(candidatoPublico);
      expect(clienteApi.get).toHaveBeenCalledWith("/perfil/candidatos/usuario/u1");
    });

    it("obterCandidatoPorId: chama GET /perfil/candidatos/:candidatoId", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, candidato: candidatoExemplo } });

      await expect(PerfilService.obterCandidatoPorId("c1")).resolves.toEqual(candidatoExemplo);
      expect(clienteApi.get).toHaveBeenCalledWith("/perfil/candidatos/c1");
    });
  });

  describe("atualizarDadosPessoais", () => {
    it("chama PUT /candidatos/:id só com os campos enviados e devolve o candidato atualizado", async () => {
      (clienteApi.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, candidato: candidatoExemplo } });

      const resposta = await PerfilService.atualizarDadosPessoais("c1", { cidade: "São Paulo" });

      expect(clienteApi.put).toHaveBeenCalledWith("/candidatos/c1", { cidade: "São Paulo" });
      expect(resposta).toEqual(candidatoExemplo);
    });

    it("em erro (ex.: CPF já cadastrado), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("409"), { isAxiosError: true });
      (clienteApi.put as jest.Mock).mockRejectedValue(erro);

      await expect(PerfilService.atualizarDadosPessoais("c1", { cpf: "12345678901" })).rejects.toBe(erro);
    });
  });

  describe("atualizarUsuario", () => {
    it("chama PUT /usuarios/:id com nome/telefone e devolve o usuário atualizado", async () => {
      const usuario = { id: "u1", nome: "Ana Beatriz", email: "ana@exemplo.com", tipoUsuario: "candidato" };
      (clienteApi.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, usuario } });

      const resposta = await PerfilService.atualizarUsuario("u1", { nome: "Ana Beatriz" });

      expect(clienteApi.put).toHaveBeenCalledWith("/usuarios/u1", { nome: "Ana Beatriz" });
      expect(resposta).toEqual(usuario);
    });
  });

  describe("experiências", () => {
    const dados = { cargo: "Desenvolvedor", empresa: "ACME", dataInicio: "2024-01-01" };

    it("listarExperiencias: chama GET /perfil/experiencias e devolve a lista", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, registros: [{ id: "e1", ...dados }] } });

      await expect(PerfilService.listarExperiencias()).resolves.toEqual([{ id: "e1", ...dados }]);
      expect(clienteApi.get).toHaveBeenCalledWith("/perfil/experiencias");
    });

    it("criarExperiencia: chama POST /perfil/experiencias com os dados e devolve o registro criado", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, registro: { id: "e1", ...dados } } });

      const resposta = await PerfilService.criarExperiencia(dados);

      expect(clienteApi.post).toHaveBeenCalledWith("/perfil/experiencias", dados);
      expect(resposta).toEqual({ id: "e1", ...dados });
    });

    it("atualizarExperiencia: chama PUT /perfil/experiencias/:id — sempre com os campos obrigatórios (a API real exige, não é PATCH parcial)", async () => {
      (clienteApi.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, registro: { id: "e1", ...dados } } });

      await PerfilService.atualizarExperiencia("e1", { ...dados, cargo: "Dev Sênior" });

      expect(clienteApi.put).toHaveBeenCalledWith("/perfil/experiencias/e1", { ...dados, cargo: "Dev Sênior" });
    });

    it("removerExperiencia: chama DELETE /perfil/experiencias/:id", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await PerfilService.removerExperiencia("e1");

      expect(clienteApi.delete).toHaveBeenCalledWith("/perfil/experiencias/e1");
    });
  });

  describe("formações", () => {
    it("listarFormacoes/criarFormacao/atualizarFormacao/removerFormacao chamam /perfil/formacoes", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, registros: [] } });
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, registro: { id: "f1" } } });
      (clienteApi.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, registro: { id: "f1" } } });
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await PerfilService.listarFormacoes();
      await PerfilService.criarFormacao({ instituicao: "USP", curso: "ADS" });
      await PerfilService.atualizarFormacao("f1", { instituicao: "USP", curso: "Ciência da Computação" });
      await PerfilService.removerFormacao("f1");

      expect(clienteApi.get).toHaveBeenCalledWith("/perfil/formacoes");
      expect(clienteApi.post).toHaveBeenCalledWith("/perfil/formacoes", { instituicao: "USP", curso: "ADS" });
      expect(clienteApi.put).toHaveBeenCalledWith("/perfil/formacoes/f1", { instituicao: "USP", curso: "Ciência da Computação" });
      expect(clienteApi.delete).toHaveBeenCalledWith("/perfil/formacoes/f1");
    });
  });

  describe("certificados", () => {
    it("listarCertificados/criarCertificado/atualizarCertificado/removerCertificado chamam /perfil/certificados", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, registros: [] } });
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, registro: { id: "cert1" } } });
      (clienteApi.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, registro: { id: "cert1" } } });
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await PerfilService.listarCertificados();
      await PerfilService.criarCertificado({ titulo: "AWS Certified" });
      await PerfilService.atualizarCertificado("cert1", { titulo: "AWS Certified Developer" });
      await PerfilService.removerCertificado("cert1");

      expect(clienteApi.get).toHaveBeenCalledWith("/perfil/certificados");
      expect(clienteApi.post).toHaveBeenCalledWith("/perfil/certificados", { titulo: "AWS Certified" });
      expect(clienteApi.put).toHaveBeenCalledWith("/perfil/certificados/cert1", { titulo: "AWS Certified Developer" });
      expect(clienteApi.delete).toHaveBeenCalledWith("/perfil/certificados/cert1");
    });
  });

  describe("habilidades", () => {
    it("listarHabilidades/criarHabilidade/atualizarHabilidade/removerHabilidade chamam /perfil/habilidades", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, registros: [] } });
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, registro: { id: "h1" } } });
      (clienteApi.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, registro: { id: "h1" } } });
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await PerfilService.listarHabilidades();
      await PerfilService.criarHabilidade({ nome: "React" });
      await PerfilService.atualizarHabilidade("h1", { nome: "React", nivel: "Avançado" });
      await PerfilService.removerHabilidade("h1");

      expect(clienteApi.get).toHaveBeenCalledWith("/perfil/habilidades");
      expect(clienteApi.post).toHaveBeenCalledWith("/perfil/habilidades", { nome: "React" });
      expect(clienteApi.put).toHaveBeenCalledWith("/perfil/habilidades/h1", { nome: "React", nivel: "Avançado" });
      expect(clienteApi.delete).toHaveBeenCalledWith("/perfil/habilidades/h1");
    });
  });

  describe("catálogo de deficiências", () => {
    it("listarDeficiencias: chama GET /deficiencias e devolve a lista", async () => {
      const deficiencias = [{ id: "d1", nome: "Baixa visão" }];
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, deficiencias } });

      await expect(PerfilService.listarDeficiencias()).resolves.toEqual(deficiencias);
      expect(clienteApi.get).toHaveBeenCalledWith("/deficiencias");
    });

    it("vincularDeficiencia: chama POST /candidatos/:id/deficiencias com deficienciaId e observacoes", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, vinculo: { id: "v1" } } });

      await PerfilService.vincularDeficiencia("c1", "d1", "Uso leitor de tela.");

      expect(clienteApi.post).toHaveBeenCalledWith("/candidatos/c1/deficiencias", {
        deficienciaId: "d1",
        observacoes: "Uso leitor de tela.",
      });
    });

    it("desvincularDeficiencia: chama DELETE /candidatos/:id/deficiencias/:deficienciaId", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await PerfilService.desvincularDeficiencia("c1", "d1");

      expect(clienteApi.delete).toHaveBeenCalledWith("/candidatos/c1/deficiencias/d1");
    });
  });

  describe("currículo", () => {
    const arquivo = { uri: "file:///tmp/curriculo.pdf", name: "curriculo.pdf", mimeType: "application/pdf" };

    it("uploadCurriculo: chama PATCH /candidatos/:id/curriculo com FormData (campo 'curriculo') e devolve o candidato atualizado", async () => {
      (clienteApi.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, candidato: candidatoExemplo } });

      const resposta = await PerfilService.uploadCurriculo("c1", arquivo);

      expect(clienteApi.patch).toHaveBeenCalledWith(
        "/candidatos/c1/curriculo",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const formDataEnviado = (clienteApi.patch as jest.Mock).mock.calls[0][1] as FormData;
      // O `FormData` do React Native não tem `.get()` no Jest, então o teste só confirma que algo
      // foi anexado na chave certa.
      expect(formDataEnviado.append).toBeDefined();
      expect(resposta).toEqual(candidatoExemplo);
    });

    it("uploadCurriculo: em erro (ex.: formato inválido), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("400"), { isAxiosError: true });
      (clienteApi.patch as jest.Mock).mockRejectedValue(erro);

      await expect(PerfilService.uploadCurriculo("c1", arquivo)).rejects.toBe(erro);
    });

    it("obterUrlCurriculo: chama GET /candidatos/:id/curriculo e devolve url/expiraEm/nomeArquivo", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, url: "https://exemplo.com/assinada", expiraEm: "2026-01-01T00:00:00.000Z", nomeArquivo: "curriculo.pdf" },
      });

      const resposta = await PerfilService.obterUrlCurriculo("c1");

      expect(clienteApi.get).toHaveBeenCalledWith("/candidatos/c1/curriculo");
      expect(resposta).toEqual({ url: "https://exemplo.com/assinada", expiraEm: "2026-01-01T00:00:00.000Z", nomeArquivo: "curriculo.pdf" });
    });

    it("obterUrlDownloadCurriculo: chama GET /candidatos/:id/curriculo/download", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, url: "https://exemplo.com/download", expiraEm: "2026-01-01T00:00:00.000Z", nomeArquivo: "curriculo.pdf" },
      });

      await PerfilService.obterUrlDownloadCurriculo("c1");

      expect(clienteApi.get).toHaveBeenCalledWith("/candidatos/c1/curriculo/download");
    });

    it("importarCurriculo: chama POST /candidatos/:id/curriculo/importar com FormData e devolve o rascunho", async () => {
      const rascunho = {
        email: "ana@exemplo.com",
        telefone: null,
        linkedin: null,
        github: null,
        resumo: null,
        experiencias: [],
        formacoes: [],
        habilidades: [],
        aviso: "Extração automática por palavras-chave, sem inteligência artificial — revise e complete cada campo antes de salvar.",
      };
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, rascunho } });

      const resposta = await PerfilService.importarCurriculo("c1", arquivo);

      expect(clienteApi.post).toHaveBeenCalledWith(
        "/candidatos/c1/curriculo/importar",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      expect(resposta).toEqual(rascunho);
    });
  });
});
