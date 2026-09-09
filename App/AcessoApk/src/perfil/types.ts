/**
 * Tipos do contrato real de perfil do candidato (Site/Backend), conforme
 * auditoria da Fase 12. Nomes de campo em português são LITERAIS ao que a
 * API envia/espera (`models/Candidato.js`, `PerfilCandidatoService.js`,
 * `CandidatoService.js`) — não são estilo, são o contrato.
 *
 * `experiencia`/`habilidades` (texto livre) aparecem em
 * `validarAtualizacaoCandidato`/`CAMPOS_EDITAVEIS` do backend, mas NÃO são
 * colunas do model `Candidato` — são campos mortos, superados pelas tabelas
 * estruturadas `CandidatoExperiencia`/`CandidatoHabilidade` abaixo. Não têm
 * tipo nem tela aqui de propósito (replicar um campo morto criaria uma
 * "funcionalidade" que nunca persiste nada).
 */

/** Só os campos de `Usuario` relevantes ao perfil do candidato — o mesmo índice de campos não mapeados que `AuthUser` já usa. */
export interface UsuarioResumoPerfil {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  fotoPerfil?: string | null;
  capaPerfil?: string | null;
  tipoUsuario: string;
  perfilPublico?: boolean;
  [chave: string]: unknown;
}

/** `GET /deficiencias` — catálogo público, mantido pela administração. */
export interface Deficiencia {
  id: string;
  nome: string;
  descricao?: string | null;
  [chave: string]: unknown;
}

/**
 * Uma deficiência já vinculada ao candidato — o Sequelize devolve os dados
 * da tabela de junção (`candidato_deficiencias`) sob a chave
 * `CandidatoDeficiencia` (nome do model da junção, não um alias customizado
 * — confirmado em `models/index.js`: `through: CandidatoDeficiencia` sem
 * `as` próprio).
 */
export interface DeficienciaVinculada extends Deficiencia {
  CandidatoDeficiencia?: { observacoes?: string | null };
}

/**
 * `Candidato` completo (`GET /candidatos/me`). `curriculo`/`curriculoNome`/
 * `curriculoAtualizadoEm` existem no contrato mas pertencem à Fase 13
 * (Currículo) — só lidos aqui para mostrar um resumo, nunca editados nesta
 * fase.
 */
export interface Candidato {
  id: string;
  usuarioId: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  genero?: string | null;
  biografia?: string | null;
  escolaridade?: string | null;
  tituloProfissional?: string | null;
  necessidadesAcessibilidade?: string | null;
  linkedin?: string | null;
  github?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  cep?: string | null;
  disponibilidade?: string | null;
  pretensaoSalarial?: string | number | null;
  curriculo?: string | null;
  curriculoNome?: string | null;
  curriculoAtualizadoEm?: string | null;
  usuario?: UsuarioResumoPerfil;
  deficiencias?: DeficienciaVinculada[];
  [chave: string]: unknown;
}

/**
 * Campos que `PUT /candidatos/:id` de fato persiste — lista extraída de
 * `CandidatoService.CAMPOS_EDITAVEIS` no backend (a fonte real, não o
 * validator sozinho: o validator tem `experiencia`/`habilidades`, que o
 * service aceitaria mas o MODEL não tem como coluna — nunca persistem).
 */
export interface DadosPessoaisCandidato {
  cpf?: string | null;
  dataNascimento?: string | null;
  genero?: string | null;
  biografia?: string | null;
  escolaridade?: string | null;
  tituloProfissional?: string | null;
  necessidadesAcessibilidade?: string | null;
  linkedin?: string | null;
  github?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  cep?: string | null;
  disponibilidade?: string | null;
  pretensaoSalarial?: string | null;
}

/** `PUT /usuarios/:id` — só os campos que esta fase edita (nunca `email`/`senha`/`tipoUsuario`/`ativo`, rejeitados pelo próprio backend por mass assignment). */
export interface DadosPessoaisUsuario {
  nome?: string;
  telefone?: string | null;
}

/** `Site/Backend/src/models/CandidatoExperiencia.js`. */
export interface Experiencia {
  id: string;
  candidatoId: string;
  cargo: string;
  empresa: string;
  local?: string | null;
  modalidade?: string | null;
  dataInicio: string;
  dataFim?: string | null;
  atual?: boolean;
  descricao?: string | null;
  [chave: string]: unknown;
}

/**
 * Payload de criar/atualizar — interface EXPLÍCITA, não `Omit<Experiencia,
 * ...>`. `Experiencia` tem `[chave: string]: unknown` (escape hatch para
 * ler campos extras que o backend manda); `Omit`/`Pick` sobre um tipo com
 * índice de string colapsam `keyof` para `string`, e o resultado perde a
 * obrigatoriedade de `cargo`/`empresa`/`dataInicio` (`{}` passaria a
 * type-check sem erro nenhum). Corrigido — cada campo é escrito à mão.
 */
export interface ExperienciaDados {
  cargo: string;
  empresa: string;
  local?: string;
  modalidade?: string;
  dataInicio: string;
  dataFim?: string;
  atual?: boolean;
  descricao?: string;
}

/** `Site/Backend/src/models/CandidatoFormacao.js`. */
export interface Formacao {
  id: string;
  candidatoId: string;
  instituicao: string;
  curso: string;
  nivel?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  emAndamento?: boolean;
  descricao?: string | null;
  [chave: string]: unknown;
}

/** Mesmo motivo de `ExperienciaDados` — interface explícita, não `Omit`. */
export interface FormacaoDados {
  instituicao: string;
  curso: string;
  nivel?: string;
  dataInicio?: string;
  dataFim?: string;
  emAndamento?: boolean;
  descricao?: string;
}

/** `Site/Backend/src/models/CandidatoCertificado.js`. */
export interface Certificado {
  id: string;
  candidatoId: string;
  titulo: string;
  instituicao?: string | null;
  emitidoEm?: string | null;
  expiraEm?: string | null;
  credencialUrl?: string | null;
  [chave: string]: unknown;
}

/** Mesmo motivo de `ExperienciaDados` — interface explícita, não `Omit`. */
export interface CertificadoDados {
  titulo: string;
  instituicao?: string;
  emitidoEm?: string;
  expiraEm?: string;
  credencialUrl?: string;
}

/** `Site/Backend/src/models/CandidatoHabilidade.js`. */
export interface Habilidade {
  id: string;
  candidatoId: string;
  nome: string;
  nivel?: string | null;
  [chave: string]: unknown;
}

/** Mesmo motivo de `ExperienciaDados` — interface explícita, não `Omit`. */
export interface HabilidadeDados {
  nome: string;
  nivel?: string;
}

/** Os 4 recursos de `GET/POST/PUT/DELETE /perfil/:recurso[/:id]` — literal ao `param("recurso").isIn([...])` do backend. */
export type RecursoPerfil = "experiencias" | "formacoes" | "certificados" | "habilidades";

export interface ListaRegistrosResposta<T> {
  sucesso: true;
  registros: T[];
}

export interface RegistroResposta<T> {
  sucesso: true;
  registro: T;
}

export interface CandidatoResposta {
  sucesso: true;
  candidato: Candidato;
}

export interface UsuarioAtualizadoResposta {
  sucesso: true;
  usuario: UsuarioResumoPerfil;
}

/** `GET /deficiencias` — catálogo completo, sem paginação (confirmado em `DeficienciaController.index`/`DeficienciaService.findAll`). */
export interface ListaDeficienciasResposta {
  sucesso: true;
  deficiencias: Deficiencia[];
}

/**
 * `POST /candidatos/:id/deficiencias` — devolve a linha da tabela de
 * junção (`candidato_deficiencias`), não a `Deficiencia` em si.
 * Idempotente no backend (`findOrCreate`): vincular de novo com
 * `observacoes` diferentes apenas atualiza, nunca duplica.
 */
export interface VinculoDeficiencia {
  id: string;
  candidatoId: string;
  deficienciaId: string;
  observacoes?: string | null;
}

export interface VincularDeficienciaResposta {
  sucesso: true;
  vinculo: VinculoDeficiencia;
}

/**
 * Currículo (Fase 13). `PATCH /candidatos/:id/curriculo` (upload real) e
 * `POST /candidatos/:id/curriculo/importar` (extrai um RASCUNHO, nunca
 * grava nada) aceitam PDF/DOC/DOCX, campo multipart `"curriculo"`
 * (confirmado em `middlewares/uploadMiddleware.js`/`candidatoRoutes.js`).
 *
 * NÃO EXISTE endpoint para excluir o currículo — só substituir por um novo
 * (o backend já limpa o arquivo antigo do Storage ao substituir) ou deixar
 * como está. Confirmado por auditoria completa de `candidatoRoutes.js`:
 * não há nenhuma rota `DELETE .../curriculo`. Registrado como pendência
 * (ver relatório da Fase 13) — não inventado workaround nenhum aqui.
 */

/** Formato que `expo-document-picker` devolve em `result.assets[0]` — tipado aqui só com os campos que `PerfilService` usa. */
export interface ArquivoSelecionado {
  uri: string;
  name: string;
  mimeType?: string | null;
}

export interface CurriculoUrlResposta {
  sucesso: true;
  url: string;
  expiraEm: string;
  nomeArquivo: string | null;
}

/** `POST /candidatos/:id/curriculo/importar` — extração por palavras-chave (sem IA), literal a `utils/parsearCurriculo.js`. */
export interface RascunhoCurriculoExperiencia {
  cargo: string;
  empresa: string;
  dataInicio: string;
  dataFim: string;
  atual: boolean;
  descricaoSugerida: string;
}

export interface RascunhoCurriculoFormacao {
  instituicao: string;
  curso: string;
  dataFim: string;
  emAndamento: boolean;
  descricaoSugerida: string;
}

export interface RascunhoCurriculo {
  email: string | null;
  telefone: string | null;
  linkedin: string | null;
  github: string | null;
  resumo: string | null;
  experiencias: RascunhoCurriculoExperiencia[];
  formacoes: RascunhoCurriculoFormacao[];
  habilidades: string[];
  /** Mensagem fixa do backend — sempre mostrada junto do rascunho, nunca omitida. */
  aviso: string;
}

export interface ImportarCurriculoResposta {
  sucesso: true;
  rascunho: RascunhoCurriculo;
}
