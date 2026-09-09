import { apiClient } from "../services/api/client";
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

/** Monta o `FormData` de um documento selecionado — usado por upload e importação de currículo (mesmo campo `"curriculo"` nas duas rotas). */
function formDataDoArquivo(arquivo: ArquivoSelecionado): FormData {
  const formData = new FormData();
  // React Native aceita `{uri, name, type}` como valor de `FormData.append`
  // para representar um arquivo local — não é o mesmo shape de `Blob`/`File`
  // do navegador, por isso o cast: é o formato que o runtime do RN espera
  // de verdade (documentado pelo próprio React Native, não uma gambiarra).
  formData.append("curriculo", {
    uri: arquivo.uri,
    name: arquivo.name,
    type: arquivo.mimeType || "application/octet-stream",
  } as unknown as Blob);
  return formData;
}

/**
 * Única camada que conhece os endpoints reais de perfil do candidato
 * (`Site/Backend/src/routes/perfilRoutes.js`, `candidatoRoutes.js`,
 * `deficienciaRoutes.js`, `usuarioRoutes.js`, confirmado por auditoria).
 * Todo path, payload e formato de resposta aqui é literal ao que o backend
 * realmente expõe hoje — nada foi presumido. Nenhum método trata 401 por
 * conta própria: o interceptor de `apiClient` já cuida disso.
 *
 * Métodos nomeados por recurso (não um único `listar(recurso, ...)`
 * genérico): TypeScript não aceita sobrecarga de assinatura dentro de um
 * literal de objeto, e um genérico só com `unknown`/`Record<string,
 * unknown>` perderia o tipo forte de cada recurso — mesmo padrão simples e
 * explícito que `VagasService`/`FeedService` já usam em vez de abstração.
 */
export const PerfilService = {
  /** `GET /candidatos/me` — perfil completo do candidato autenticado, com `usuario` e `deficiencias` já embutidos (uma única chamada cobre a tela inteira). */
  async meuCandidato(): Promise<Candidato> {
    const { data } = await apiClient.get<CandidatoResposta>("/candidatos/me");
    return data.candidato;
  },

  /**
   * `GET /perfil/candidatos/usuario/:usuarioId` — perfil PÚBLICO de um
   * candidato de terceiros (Fase 14). Mesmo `PerfilCandidatoController` da
   * Fase 12, rota diferente — o backend já aplica a allowlist de
   * privacidade (`aplicarPrivacidadeCandidato`) sozinho quando o
   * solicitante não é o dono/admin/empresa com candidatura legítima; os
   * campos que não vêm simplesmente não aparecem no JSON (nunca chegam
   * como `null` disfarçado de "não preenchido").
   */
  async obterCandidatoPorUsuario(usuarioId: string): Promise<Candidato> {
    const { data } = await apiClient.get<CandidatoResposta>(`/perfil/candidatos/usuario/${usuarioId}`);
    return data.candidato;
  },

  /** `GET /perfil/candidatos/:candidatoId` — mesmo endpoint acima, resolvido por `candidatoId` em vez de `usuarioId` (útil quando já se tem o `candidatoId`, ex.: a partir de uma lista de candidaturas). */
  async obterCandidatoPorId(candidatoId: string): Promise<Candidato> {
    const { data } = await apiClient.get<CandidatoResposta>(`/perfil/candidatos/${candidatoId}`);
    return data.candidato;
  },

  /**
   * `PUT /candidatos/:id`. Só os campos de `DadosPessoaisCandidato` (lista
   * real de `CandidatoService.CAMPOS_EDITAVEIS`) — nunca `experiencia`/
   * `habilidades` (campos mortos no backend, sem coluna correspondente).
   */
  async atualizarDadosPessoais(candidatoId: string, dados: DadosPessoaisCandidato): Promise<Candidato> {
    const { data } = await apiClient.put<CandidatoResposta>(`/candidatos/${candidatoId}`, dados);
    return data.candidato;
  },

  /** `PUT /usuarios/:id` — só `nome`/`telefone` nesta fase (o backend também aceita `fotoPerfil`/`capaPerfil` como STRING, mas isso é a URL já hospedada; o upload de arquivo em si fica para a fase de mídia, via `PATCH /usuarios/:id/foto`). */
  async atualizarUsuario(usuarioId: string, dados: DadosPessoaisUsuario): Promise<UsuarioResumoPerfil> {
    const { data } = await apiClient.put<UsuarioAtualizadoResposta>(`/usuarios/${usuarioId}`, dados);
    return data.usuario;
  },

  async listarExperiencias(): Promise<Experiencia[]> {
    const { data } = await apiClient.get<ListaRegistrosResposta<Experiencia>>("/perfil/experiencias");
    return data.registros;
  },
  async criarExperiencia(dados: ExperienciaDados): Promise<Experiencia> {
    const { data } = await apiClient.post<RegistroResposta<Experiencia>>("/perfil/experiencias", dados);
    return data.registro;
  },
  /**
   * O backend já garante posse do registro (`buscarProprio`) — sem
   * checagem própria aqui (nunca duplicar autorização do servidor).
   *
   * Recebe `ExperienciaDados` completo, não `Partial` — confirmado ao vivo
   * (Fase 12) que `validarCorpoPerfil` aplica as MESMAS regras de "campo
   * obrigatório" tanto em `POST` quanto em `PUT` (não existe atualização
   * parcial de verdade no contrato real): enviar só `{cargo}` num PUT
   * devolve 422 pedindo `empresa`/`dataInicio` de novo. O formulário sempre
   * reenvia todos os campos (o que já fazia, isto só torna o tipo honesto).
   */
  async atualizarExperiencia(id: string, dados: ExperienciaDados): Promise<Experiencia> {
    const { data } = await apiClient.put<RegistroResposta<Experiencia>>(`/perfil/experiencias/${id}`, dados);
    return data.registro;
  },
  async removerExperiencia(id: string): Promise<void> {
    await apiClient.delete(`/perfil/experiencias/${id}`);
  },

  async listarFormacoes(): Promise<Formacao[]> {
    const { data } = await apiClient.get<ListaRegistrosResposta<Formacao>>("/perfil/formacoes");
    return data.registros;
  },
  async criarFormacao(dados: FormacaoDados): Promise<Formacao> {
    const { data } = await apiClient.post<RegistroResposta<Formacao>>("/perfil/formacoes", dados);
    return data.registro;
  },
  /** Mesmo contrato de `atualizarExperiencia`: `PUT` exige os campos obrigatórios de novo, não é atualização parcial de verdade. */
  async atualizarFormacao(id: string, dados: FormacaoDados): Promise<Formacao> {
    const { data } = await apiClient.put<RegistroResposta<Formacao>>(`/perfil/formacoes/${id}`, dados);
    return data.registro;
  },
  async removerFormacao(id: string): Promise<void> {
    await apiClient.delete(`/perfil/formacoes/${id}`);
  },

  async listarCertificados(): Promise<Certificado[]> {
    const { data } = await apiClient.get<ListaRegistrosResposta<Certificado>>("/perfil/certificados");
    return data.registros;
  },
  async criarCertificado(dados: CertificadoDados): Promise<Certificado> {
    const { data } = await apiClient.post<RegistroResposta<Certificado>>("/perfil/certificados", dados);
    return data.registro;
  },
  /** Mesmo contrato de `atualizarExperiencia`. */
  async atualizarCertificado(id: string, dados: CertificadoDados): Promise<Certificado> {
    const { data } = await apiClient.put<RegistroResposta<Certificado>>(`/perfil/certificados/${id}`, dados);
    return data.registro;
  },
  async removerCertificado(id: string): Promise<void> {
    await apiClient.delete(`/perfil/certificados/${id}`);
  },

  async listarHabilidades(): Promise<Habilidade[]> {
    const { data } = await apiClient.get<ListaRegistrosResposta<Habilidade>>("/perfil/habilidades");
    return data.registros;
  },
  async criarHabilidade(dados: HabilidadeDados): Promise<Habilidade> {
    const { data } = await apiClient.post<RegistroResposta<Habilidade>>("/perfil/habilidades", dados);
    return data.registro;
  },
  /** Mesmo contrato de `atualizarExperiencia`. */
  async atualizarHabilidade(id: string, dados: HabilidadeDados): Promise<Habilidade> {
    const { data } = await apiClient.put<RegistroResposta<Habilidade>>(`/perfil/habilidades/${id}`, dados);
    return data.registro;
  },
  async removerHabilidade(id: string): Promise<void> {
    await apiClient.delete(`/perfil/habilidades/${id}`);
  },

  /** `GET /deficiencias` — catálogo público (não precisa de `candidatoId`). */
  async listarDeficiencias(): Promise<Deficiencia[]> {
    const { data } = await apiClient.get<ListaDeficienciasResposta>("/deficiencias");
    return data.deficiencias;
  },

  /** `POST /candidatos/:id/deficiencias` — idempotente no servidor (vincular de novo só atualiza `observacoes`, nunca duplica). */
  async vincularDeficiencia(candidatoId: string, deficienciaId: string, observacoes?: string): Promise<void> {
    await apiClient.post<VincularDeficienciaResposta>(`/candidatos/${candidatoId}/deficiencias`, {
      deficienciaId,
      observacoes,
    });
  },

  /** `DELETE /candidatos/:id/deficiencias/:deficienciaId`. */
  async desvincularDeficiencia(candidatoId: string, deficienciaId: string): Promise<void> {
    await apiClient.delete(`/candidatos/${candidatoId}/deficiencias/${deficienciaId}`);
  },

  /**
   * `PATCH /candidatos/:id/curriculo` — grava o arquivo como currículo
   * oficial (substitui o anterior; o backend já remove o arquivo antigo do
   * Storage). NÃO existe endpoint para excluir sem substituir (Fase 13,
   * ver comentário em `types.ts`) — pendência registrada, sem workaround.
   */
  async uploadCurriculo(candidatoId: string, arquivo: ArquivoSelecionado): Promise<Candidato> {
    const { data } = await apiClient.patch<CandidatoResposta>(
      `/candidatos/${candidatoId}/curriculo`,
      formDataDoArquivo(arquivo),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.candidato;
  },

  /** `GET /candidatos/:id/curriculo` — URL assinada e temporária (nunca permanente) para exibir/abrir o currículo já enviado. */
  async obterUrlCurriculo(candidatoId: string): Promise<{ url: string; expiraEm: string; nomeArquivo: string | null }> {
    const { data } = await apiClient.get<CurriculoUrlResposta>(`/candidatos/${candidatoId}/curriculo`);
    return { url: data.url, expiraEm: data.expiraEm, nomeArquivo: data.nomeArquivo };
  },

  /** `GET /candidatos/:id/curriculo/download` — mesma autorização acima, mas força download (`Content-Disposition: attachment`). */
  async obterUrlDownloadCurriculo(
    candidatoId: string,
  ): Promise<{ url: string; expiraEm: string; nomeArquivo: string | null }> {
    const { data } = await apiClient.get<CurriculoUrlResposta>(`/candidatos/${candidatoId}/curriculo/download`);
    return { url: data.url, expiraEm: data.expiraEm, nomeArquivo: data.nomeArquivo };
  },

  /**
   * `POST /candidatos/:id/curriculo/importar` — extrai um RASCUNHO do
   * arquivo (texto por palavras-chave, sem IA) e devolve para revisão.
   * Nunca grava nada sozinho: o arquivo enviado aqui não vira o currículo
   * oficial (isso continua exigindo `uploadCurriculo`, ação separada).
   */
  async importarCurriculo(candidatoId: string, arquivo: ArquivoSelecionado): Promise<RascunhoCurriculo> {
    const { data } = await apiClient.post<ImportarCurriculoResposta>(
      `/candidatos/${candidatoId}/curriculo/importar`,
      formDataDoArquivo(arquivo),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.rascunho;
  },
};
