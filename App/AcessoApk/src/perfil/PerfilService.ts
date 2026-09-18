import { clienteApi } from "../services/api/cliente";
import type {
  ArquivoSelecionado,
  Candidato,
  CandidatoResposta,
  Certificado,
  CertificadoDados,
  CurriculoUrlResposta,
  DadosPessoaisCandidato,
  DadosPessoaisUsuario,
  Deficiencia,
  Experiencia,
  ExperienciaDados,
  Formacao,
  FormacaoDados,
  Habilidade,
  HabilidadeDados,
  ImportarCurriculoResposta,
  ListaDeficienciasResposta,
  ListaRegistrosResposta,
  RascunhoCurriculo,
  RegistroResposta,
  UsuarioAtualizadoResposta,
  UsuarioResumoPerfil,
  VincularDeficienciaResposta,
} from "./types";

/** Monta o `FormData` de um documento selecionado: usado por upload e importação de currículo (mesmo campo `"curriculo"` nas duas rotas). */
function formDataDoArquivo(arquivo: ArquivoSelecionado): FormData {
  const formData = new FormData();
  // O React Native aceita `{ uri, name, type }` em `FormData.append` para enviar um arquivo local;
  // não é um `Blob` de verdade, daí o cast.
  formData.append("curriculo", {
    uri: arquivo.uri,
    name: arquivo.name,
    type: arquivo.mimeType || "application/octet-stream",
  } as unknown as Blob);
  return formData;
}

/**
 * Chamadas do perfil do candidato. Há um método por recurso (experiências, formações etc.) em vez
 * de um `listar(recurso)` genérico para manter o tipo de cada resposta.
 */
export const PerfilService = {
  /** `GET /candidatos/me`: perfil completo do candidato autenticado, com `usuario` e `deficiencias` já embutidos (uma única chamada cobre a tela inteira). */
  async meuCandidato(): Promise<Candidato> {
    const { data } = await clienteApi.get<CandidatoResposta>("/candidatos/me");
    return data.candidato;
  },

  /**
   * `GET /perfil/candidatos/usuario/:usuarioId`: perfil de outro candidato. O backend aplica a
   * privacidade (`aplicarPrivacidadeCandidato`) conforme quem pede; os campos ocultos simplesmente
   * não vêm no JSON.
   */
  async obterCandidatoPorUsuario(usuarioId: string): Promise<Candidato> {
    const { data } = await clienteApi.get<CandidatoResposta>(`/perfil/candidatos/usuario/${usuarioId}`);
    return data.candidato;
  },

  /** `GET /perfil/candidatos/:candidatoId`: mesmo endpoint acima, resolvido por `candidatoId` em vez de `usuarioId` (útil quando já se tem o `candidatoId`, ex.: a partir de uma lista de candidaturas). */
  async obterCandidatoPorId(candidatoId: string): Promise<Candidato> {
    const { data } = await clienteApi.get<CandidatoResposta>(`/perfil/candidatos/${candidatoId}`);
    return data.candidato;
  },

  /**
   * `PUT /candidatos/:id`. Envia só os campos de `DadosPessoaisCandidato`; `experiencia` e
   * `habilidades` são aceitos pelo backend, mas não existem como colunas e nunca são gravados.
   */
  async atualizarDadosPessoais(candidatoId: string, dados: DadosPessoaisCandidato): Promise<Candidato> {
    const { data } = await clienteApi.put<CandidatoResposta>(`/candidatos/${candidatoId}`, dados);
    return data.candidato;
  },

  /** `PUT /usuarios/:id`: nome e telefone. O app não envia foto nem capa de perfil. */
  async atualizarUsuario(usuarioId: string, dados: DadosPessoaisUsuario): Promise<UsuarioResumoPerfil> {
    const { data } = await clienteApi.put<UsuarioAtualizadoResposta>(`/usuarios/${usuarioId}`, dados);
    return data.usuario;
  },

  async listarExperiencias(): Promise<Experiencia[]> {
    const { data } = await clienteApi.get<ListaRegistrosResposta<Experiencia>>("/perfil/experiencias");
    return data.registros;
  },
  async criarExperiencia(dados: ExperienciaDados): Promise<Experiencia> {
    const { data } = await clienteApi.post<RegistroResposta<Experiencia>>("/perfil/experiencias", dados);
    return data.registro;
  },
  /**
   * O backend já confere se o registro é do usuário, então não há checagem aqui. Recebe
   * `ExperienciaDados` completo porque o `PUT` valida os campos obrigatórios como o `POST`
   * (`validarCorpoPerfil`): enviar só `{ cargo }` volta 422.
   */
  async atualizarExperiencia(id: string, dados: ExperienciaDados): Promise<Experiencia> {
    const { data } = await clienteApi.put<RegistroResposta<Experiencia>>(`/perfil/experiencias/${id}`, dados);
    return data.registro;
  },
  async removerExperiencia(id: string): Promise<void> {
    await clienteApi.delete(`/perfil/experiencias/${id}`);
  },

  async listarFormacoes(): Promise<Formacao[]> {
    const { data } = await clienteApi.get<ListaRegistrosResposta<Formacao>>("/perfil/formacoes");
    return data.registros;
  },
  async criarFormacao(dados: FormacaoDados): Promise<Formacao> {
    const { data } = await clienteApi.post<RegistroResposta<Formacao>>("/perfil/formacoes", dados);
    return data.registro;
  },
  /** Mesmo contrato de `atualizarExperiencia`: `PUT` exige os campos obrigatórios de novo, não é atualização parcial de verdade. */
  async atualizarFormacao(id: string, dados: FormacaoDados): Promise<Formacao> {
    const { data } = await clienteApi.put<RegistroResposta<Formacao>>(`/perfil/formacoes/${id}`, dados);
    return data.registro;
  },
  async removerFormacao(id: string): Promise<void> {
    await clienteApi.delete(`/perfil/formacoes/${id}`);
  },

  async listarCertificados(): Promise<Certificado[]> {
    const { data } = await clienteApi.get<ListaRegistrosResposta<Certificado>>("/perfil/certificados");
    return data.registros;
  },
  async criarCertificado(dados: CertificadoDados): Promise<Certificado> {
    const { data } = await clienteApi.post<RegistroResposta<Certificado>>("/perfil/certificados", dados);
    return data.registro;
  },
  /** Mesmo contrato de `atualizarExperiencia`. */
  async atualizarCertificado(id: string, dados: CertificadoDados): Promise<Certificado> {
    const { data } = await clienteApi.put<RegistroResposta<Certificado>>(`/perfil/certificados/${id}`, dados);
    return data.registro;
  },
  async removerCertificado(id: string): Promise<void> {
    await clienteApi.delete(`/perfil/certificados/${id}`);
  },

  async listarHabilidades(): Promise<Habilidade[]> {
    const { data } = await clienteApi.get<ListaRegistrosResposta<Habilidade>>("/perfil/habilidades");
    return data.registros;
  },
  async criarHabilidade(dados: HabilidadeDados): Promise<Habilidade> {
    const { data } = await clienteApi.post<RegistroResposta<Habilidade>>("/perfil/habilidades", dados);
    return data.registro;
  },
  /** Mesmo contrato de `atualizarExperiencia`. */
  async atualizarHabilidade(id: string, dados: HabilidadeDados): Promise<Habilidade> {
    const { data } = await clienteApi.put<RegistroResposta<Habilidade>>(`/perfil/habilidades/${id}`, dados);
    return data.registro;
  },
  async removerHabilidade(id: string): Promise<void> {
    await clienteApi.delete(`/perfil/habilidades/${id}`);
  },

  /** `GET /deficiencias`: catálogo público (não precisa de `candidatoId`). */
  async listarDeficiencias(): Promise<Deficiencia[]> {
    const { data } = await clienteApi.get<ListaDeficienciasResposta>("/deficiencias");
    return data.deficiencias;
  },

  /** `POST /candidatos/:id/deficiencias`: idempotente no servidor (vincular de novo só atualiza `observacoes`, nunca duplica). */
  async vincularDeficiencia(candidatoId: string, deficienciaId: string, observacoes?: string): Promise<void> {
    await clienteApi.post<VincularDeficienciaResposta>(`/candidatos/${candidatoId}/deficiencias`, {
      deficienciaId,
      observacoes,
    });
  },

  /** `DELETE /candidatos/:id/deficiencias/:deficienciaId`. */
  async desvincularDeficiencia(candidatoId: string, deficienciaId: string): Promise<void> {
    await clienteApi.delete(`/candidatos/${candidatoId}/deficiencias/${deficienciaId}`);
  },

  /**
   * `PATCH /candidatos/:id/curriculo`: grava o arquivo como currículo e substitui o anterior (o
   * backend apaga o arquivo antigo do Storage). A API não tem rota para excluir o currículo sem
   * enviar outro.
   */
  async uploadCurriculo(candidatoId: string, arquivo: ArquivoSelecionado): Promise<Candidato> {
    const { data } = await clienteApi.patch<CandidatoResposta>(
      `/candidatos/${candidatoId}/curriculo`,
      formDataDoArquivo(arquivo),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.candidato;
  },

  /** `GET /candidatos/:id/curriculo`: URL assinada e temporária (nunca permanente) para exibir/abrir o currículo já enviado. */
  async obterUrlCurriculo(candidatoId: string): Promise<{ url: string; expiraEm: string; nomeArquivo: string | null }> {
    const { data } = await clienteApi.get<CurriculoUrlResposta>(`/candidatos/${candidatoId}/curriculo`);
    return { url: data.url, expiraEm: data.expiraEm, nomeArquivo: data.nomeArquivo };
  },

  /** `GET /candidatos/:id/curriculo/download`: mesma autorização acima, mas força download (`Content-Disposition: attachment`). */
  async obterUrlDownloadCurriculo(
    candidatoId: string,
  ): Promise<{ url: string; expiraEm: string; nomeArquivo: string | null }> {
    const { data } = await clienteApi.get<CurriculoUrlResposta>(`/candidatos/${candidatoId}/curriculo/download`);
    return { url: data.url, expiraEm: data.expiraEm, nomeArquivo: data.nomeArquivo };
  },

  /**
   * `POST /candidatos/:id/curriculo/importar`: extrai um rascunho do
   * arquivo (texto por palavras-chave, sem IA) e devolve para revisão.
   * Nunca grava nada sozinho: o arquivo enviado aqui não vira o currículo
   * oficial (isso continua exigindo `uploadCurriculo`, ação separada).
   */
  async importarCurriculo(candidatoId: string, arquivo: ArquivoSelecionado): Promise<RascunhoCurriculo> {
    const { data } = await clienteApi.post<ImportarCurriculoResposta>(
      `/candidatos/${candidatoId}/curriculo/importar`,
      formDataDoArquivo(arquivo),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.rascunho;
  },
};
