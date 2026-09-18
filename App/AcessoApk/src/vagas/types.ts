/**
 * Tipos de vagas e candidaturas, com os nomes de campo da API (`models/Vaga.js`,
 * `models/Candidatura.js`).
 */

/** `Site/Backend/src/models/Vaga.js`: `modalidade` ENUM. */
export type ModalidadeVaga = "presencial" | "hibrido" | "remoto";

/** `Site/Backend/src/models/Vaga.js`: `contrato` ENUM. */
export type ContratoVaga = "clt" | "pj" | "estagio" | "jovem_aprendiz" | "temporario";

/** `Site/Backend/src/models/Vaga.js`: `status` ENUM. */
export type StatusVaga = "aberta" | "pausada" | "encerrada";

/** `Site/Backend/src/models/Vaga.js`: `publico_alvo` ENUM. */
export type PublicoAlvoVaga = "geral" | "pcd" | "cinquenta_mais" | "pcd_cinquenta_mais";

/** `Site/Backend/src/models/Vaga.js`: `recursos_acessibilidade` (TEXT[]). */
export type RecursoAcessibilidadeVaga =
  | "interprete_libras"
  | "tecnologia_assistiva"
  | "ambiente_fisico_acessivel"
  | "banheiro_adaptado"
  | "elevador_rampa"
  | "jornada_adaptavel"
  | "ferramentas_digitais_acessiveis"
  | "outro";

/** Empresa embutida em `Vaga`. Só os campos usados pelo app têm nome; o restante fica no índice. */
export interface EmpresaResumoVaga {
  id: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  empresaVerificada?: boolean;
  /**
   * Só vem no detalhe (`GET /vagas/:id`), não na listagem. Serve para abrir o perfil público da
   * empresa, que é aberto pelo `usuarioId`.
   */
  usuario?: { id: string; nome: string; fotoPerfil?: string | null };
  [chave: string]: unknown;
}

/**
 * Só os campos usados pelo app têm nome; o restante fica no índice.
 *
 * `salario` é `DECIMAL(10,2)` no banco e o Sequelize costuma serializá-lo como string
 * (`"3500.00"`). Converta com `Number` e confira `Number.isFinite` antes de formatar.
 */
export interface Vaga {
  id: string;
  titulo: string;
  descricao: string;
  requisitos?: string | null;
  beneficios?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cargaHoraria?: string | null;
  modalidade: ModalidadeVaga;
  contrato?: ContratoVaga;
  salario?: number | string | null;
  publicoAlvo?: PublicoAlvoVaga;
  recursosAcessibilidade?: RecursoAcessibilidadeVaga[] | null;
  acessibilidade?: string | null;
  status: StatusVaga;
  /** Momento em que a vaga foi criada, que é o que as telas mostram como data de publicação. */
  criadoEm: string;
  dataEncerramento?: string | null;
  empresa?: EmpresaResumoVaga;
  [chave: string]: unknown;
}

/** `GET /vagas`: paginação clássica por página (não cursor/infinite). */
export interface ListaVagasResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  vagas: Vaga[];
}

/**
 * Corpo de `POST /vagas` (campos obrigatórios) e de `PUT /vagas/:id` (todos opcionais, porque o
 * backend aceita atualização parcial), conforme `camposVaga` em `vagaValidator.js`. Declarado campo
 * a campo: um `Omit` sobre `Vaga`, que tem o índice `[chave: string]`, perderia a checagem dos
 * campos obrigatórios.
 */
export interface VagaDados {
  titulo?: string;
  descricao?: string;
  requisitos?: string;
  beneficios?: string;
  salario?: number | string;
  modalidade?: ModalidadeVaga;
  contrato?: ContratoVaga;
  cidade?: string;
  estado?: string;
  cargaHoraria?: string;
  publicoAlvo?: PublicoAlvoVaga;
  recursosAcessibilidade?: RecursoAcessibilidadeVaga[];
  acessibilidade?: string;
  status?: StatusVaga;
  /** Formato `AAAA-MM-DD` (`isISO8601` no backend). */
  dataEncerramento?: string;
}

export interface MinhasVagasParametros {
  page?: number;
  limit?: number;
  status?: StatusVaga;
}

/** `GET /vagas/minhas`: cada vaga ganha `totalCandidaturas` (uma consulta agregada no backend, não N+1). */
export interface VagaComContagem extends Vaga {
  totalCandidaturas: number;
}

export interface ListaMinhasVagasResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  vagas: VagaComContagem[];
}

/** `GET /vagas/:id`. */
export interface VagaDetalheResposta {
  sucesso: true;
  vaga: Vaga;
}

/**
 * Filtros de `GET /vagas` usados pela `VagasScreen`. A API também aceita `estado`, `empresaId` e
 * `exclusivaPcd` (atalho para os dois públicos-alvo que incluem PCD), que o app não usa: aqui o
 * filtro é o próprio `publicoAlvo`. Em `recursosAcessibilidade`, a vaga precisa ter todos os
 * recursos marcados (`Op.contains`), não apenas um.
 */
export interface ListarVagasParametros {
  page?: number;
  limit?: number;
  /** Busca textual em título, descrição e requisitos (`Op.iLike`, case-insensitive, substring). */
  search?: string;
  /** Substring, case-insensitive (`Op.iLike`): não precisa bater com a cidade inteira. */
  cidade?: string;
  modalidade?: ModalidadeVaga;
  contrato?: ContratoVaga;
  publicoAlvo?: PublicoAlvoVaga;
  /** Vaga precisa ter todos os recursos da lista (`Op.contains`), não apenas um. */
  recursosAcessibilidade?: RecursoAcessibilidadeVaga[];
}

/**
 * `STATUS_CANDIDATURA` de `models/Candidatura.js`. A empresa só aplica `visualizada`, `em_analise`,
 * `aprovada` e `rejeitada` (`STATUS_EMPRESA` em `CandidaturaService.js`); `pendente` é o estado
 * inicial e `cancelada` só o próprio candidato aplica.
 */
export type StatusCandidatura = "pendente" | "visualizada" | "em_analise" | "aprovada" | "rejeitada" | "cancelada";

/** Resumo do candidato dono da candidatura: só embutido quando a empresa lista/vê candidaturas (`GET /vagas/:vagaId/candidaturas`, `CandidaturaService.listarDaVaga`), nunca do lado do próprio candidato. */
export interface CandidatoResumoCandidatura {
  id: string;
  usuarioId: string;
  usuario?: { id: string; nome: string; email: string; fotoPerfil?: string | null };
  [chave: string]: unknown;
}

/**
 * Só os campos usados pelo app têm nome (`models/Candidatura.js` tem outros, como `criadoEm`, a
 * data da candidatura). `candidato` só vem preenchido na visão da empresa.
 */
export interface Candidatura {
  id: string;
  vagaId?: string;
  mensagem?: string | null;
  status?: StatusCandidatura;
  candidato?: CandidatoResumoCandidatura;
  [chave: string]: unknown;
}

/** `POST /vagas/:vagaId/candidaturas`: 201 em sucesso, 409 se já candidatado (erro tratado pelo chamador). */
export interface CandidatarSeResposta {
  sucesso: true;
  candidatura: Candidatura;
}

export interface ListarCandidaturasParametros {
  page?: number;
  limit?: number;
  status?: StatusCandidatura;
}

/**
 * `GET /vagas/:vagaId/candidaturas`: empresa dona da vaga ou administrador
 * (`exigirTipoUsuarioMiddleware("empresa", "administrador")`).
 */
export interface ListaCandidaturasResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  candidaturas: Candidatura[];
}

/** `PATCH /candidaturas/:id/status`. */
export interface AtualizarStatusCandidaturaResposta {
  sucesso: true;
  candidatura: Candidatura;
}

/** Rótulos legíveis dos status de candidatura: mesma razão dos rótulos de vaga abaixo (códigos do backend não são texto pronto para tela). */
export const ROTULOS_STATUS_CANDIDATURA: Record<StatusCandidatura, string> = {
  pendente: "Pendente",
  visualizada: "Visualizada",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  cancelada: "Cancelada",
};

/**
 * `POST /vagas/:vagaId/favoritar`: toggle idempotente. O backend nunca
 * informa, em `GET /vagas` nem em `GET /vagas/:id`, se a vaga já estava
 * favoritada antes; só esta chamada devolve o estado real, e só depois de
 * alternar. Ver comentário em `DetalheVagaScreen.tsx` sobre a consequência
 * disso no estado inicial do botão.
 */
export interface FavoritarVagaResposta {
  sucesso: true;
  favoritado: boolean;
}

/**
 * Rótulos legíveis para os ENUMs acima: os valores do backend são códigos
 * (`Hibrido`, `pcd_cinquenta_mais`, `interprete_libras`...), não texto pronto
 * pra tela nem para leitor de tela. Vivem aqui (não num arquivo à parte) por
 * serem pequenos e fortemente acoplados aos tipos que descrevem.
 */
export const ROTULOS_MODALIDADE: Record<ModalidadeVaga, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
};

export const ROTULOS_CONTRATO: Record<ContratoVaga, string> = {
  clt: "CLT",
  pj: "PJ",
  estagio: "Estágio",
  jovem_aprendiz: "Jovem Aprendiz",
  temporario: "Temporário",
};

export const ROTULOS_PUBLICO_ALVO: Record<PublicoAlvoVaga, string> = {
  geral: "Geral",
  pcd: "Pessoas com deficiência",
  cinquenta_mais: "50 anos ou mais",
  pcd_cinquenta_mais: "Pessoas com deficiência e 50 anos ou mais",
};

export const ROTULOS_RECURSO_ACESSIBILIDADE: Record<RecursoAcessibilidadeVaga, string> = {
  interprete_libras: "Intérprete de Libras",
  tecnologia_assistiva: "Tecnologia assistiva",
  ambiente_fisico_acessivel: "Ambiente físico acessível",
  banheiro_adaptado: "Banheiro adaptado",
  elevador_rampa: "Elevador ou rampa",
  jornada_adaptavel: "Jornada adaptável",
  ferramentas_digitais_acessiveis: "Ferramentas digitais acessíveis",
  outro: "Outro recurso de acessibilidade",
};

export const ROTULOS_STATUS_VAGA: Record<StatusVaga, string> = {
  aberta: "Aberta",
  pausada: "Pausada",
  encerrada: "Encerrada",
};
