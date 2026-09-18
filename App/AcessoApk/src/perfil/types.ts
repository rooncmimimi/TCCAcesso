/**
 * Tipos do perfil do candidato, com os nomes de campo da API (`models/Candidato.js`,
 * `PerfilCandidatoService.js`, `CandidatoService.js`).
 *
 * `experiencia` e `habilidades` em texto livre aparecem no validator e em `CAMPOS_EDITAVEIS` do
 * backend, mas não são colunas de `Candidato`; foram substituídos pelas tabelas
 * `CandidatoExperiencia` e `CandidatoHabilidade`. Por isso não têm tipo nem tela aqui.
 */

/** Só os campos de `Usuario` relevantes ao perfil do candidato: o mesmo índice de campos não mapeados que `UsuarioAutenticado` já usa. */
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

/** `GET /deficiencias`: catálogo público, mantido pela administração. */
export interface Deficiencia {
  id: string;
  nome: string;
  descricao?: string | null;
  [chave: string]: unknown;
}

/**
 * Deficiência vinculada ao candidato. O Sequelize devolve os dados da tabela de junção na chave
 * `CandidatoDeficiencia`, nome do model da junção, porque a associação em `models/index.js` não
 * define um `as`.
 */
export interface DeficienciaVinculada extends Deficiencia {
  CandidatoDeficiencia?: { observacoes?: string | null };
}

/**
 * `Candidato` completo (`GET /candidatos/me`). Os campos de currículo só são lidos aqui para
 * mostrar o resumo; o envio fica em `PerfilService.uploadCurriculo`.
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
 * Campos que `PUT /candidatos/:id` realmente grava: `CandidatoService.CAMPOS_EDITAVEIS`, sem
 * `experiencia` e `habilidades`, que não têm coluna.
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

/**
 * `PUT /usuarios/:id`: campos editados pelo app. O backend recusa `email`, `senha`, `tipoUsuario` e
 * `ativo` nesta rota (`usuarioValidator.js`) e só grava nome, telefone, foto e capa.
 */
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
 * Corpo de criar e atualizar, declarado campo a campo em vez de `Omit<Experiencia, ...>`. Como
 * `Experiencia` tem o índice `[chave: string]: unknown`, o `Omit` perderia a obrigatoriedade de
 * `cargo`, `empresa` e `dataInicio`, e até `{}` passaria na checagem de tipos.
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

/** Mesmo motivo de `ExperienciaDados`: interface explícita, não `Omit`. */
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

/** Mesmo motivo de `ExperienciaDados`: interface explícita, não `Omit`. */
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

/** Mesmo motivo de `ExperienciaDados`: interface explícita, não `Omit`. */
export interface HabilidadeDados {
  nome: string;
  nivel?: string;
}

/**
 * Os 4 recursos de `/perfil/:recurso` (`GET` e `POST`) e `/perfil/:recurso/:id` (`PUT` e `DELETE`),
 * os mesmos de `param("recurso").isIn([...])` no backend.
 */
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

/** `GET /deficiencias`: catálogo completo, sem paginação. */
export interface ListaDeficienciasResposta {
  sucesso: true;
  deficiencias: Deficiencia[];
}

/**
 * `POST /candidatos/:id/deficiencias`: devolve a linha da tabela de
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
 * Currículo: `PATCH /candidatos/:id/curriculo` grava o arquivo e
 * `POST /candidatos/:id/curriculo/importar` só extrai um rascunho. Os dois aceitam PDF, DOC e DOCX
 * no campo multipart `curriculo`.
 *
 * Não há rota para excluir o currículo: só dá para substituí-lo por outro (o backend apaga o
 * arquivo antigo do Storage).
 */

/** Formato que `expo-document-picker` devolve em `result.assets[0]`: tipado aqui só com os campos que `PerfilService` usa. */
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

/**
 * `POST /candidatos/:id/curriculo/importar`: extração por palavras-chave, sem IA, feita por
 * `utils/parsearCurriculo.js` no backend.
 */
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
  /** Mensagem fixa do backend, sempre mostrada junto do rascunho, nunca omitida. */
  aviso: string;
}

export interface ImportarCurriculoResposta {
  sucesso: true;
  rascunho: RascunhoCurriculo;
}
