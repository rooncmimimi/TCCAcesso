/**
 * Tipos do contrato real de vagas do backend (Site/Backend), conforme
 * auditoria da Fase 9. Nomes de campo em português são LITERAIS ao que a API
 * envia (`models/Vaga.js`, `VagaController.js`, `CandidaturaController.js`,
 * `InteracaoController.js`) — não são estilo, são o contrato.
 */

/** `Site/Backend/src/models/Vaga.js` — `modalidade` ENUM. */
export type ModalidadeVaga = "Presencial" | "Hibrido" | "Remoto";

/** `Site/Backend/src/models/Vaga.js` — `contrato` ENUM. */
export type ContratoVaga = "CLT" | "PJ" | "Estagio" | "JovemAprendiz" | "Temporario";

/** `Site/Backend/src/models/Vaga.js` — `status` ENUM. */
export type StatusVaga = "Aberta" | "Pausada" | "Encerrada";

/** `Site/Backend/src/models/Vaga.js` — `publico_alvo` ENUM. */
export type PublicoAlvoVaga = "geral" | "pcd" | "cinquenta_mais" | "pcd_cinquenta_mais";

/** `Site/Backend/src/models/Vaga.js` — `recursos_acessibilidade` (TEXT[]). */
export type RecursoAcessibilidadeVaga =
  | "interprete_libras"
  | "tecnologia_assistiva"
  | "ambiente_fisico_acessivel"
  | "banheiro_adaptado"
  | "elevador_rampa"
  | "jornada_adaptavel"
  | "ferramentas_digitais_acessiveis"
  | "outro";

/**
 * O objeto `empresa` embutido em `Vaga` — só os campos que esta fase usa
 * (mesmo índice de campos não mapeados que `EmpresaResumo` já tem em
 * `src/auth/types.ts`, mesmo motivo).
 */
export interface EmpresaResumoVaga {
  id: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  empresaVerificada?: boolean;
  /**
   * Só vem embutido em `GET /vagas/:id` (detalhe) — confirmado por
   * auditoria da Fase 14 em `VagaService.js`; a LISTAGEM (`GET /vagas`) não
   * inclui isto. É o que permite navegar da vaga até o perfil público da
   * empresa (`PublicProfileScreen` recebe `usuarioId`, não `empresaId`).
   */
  usuario?: { id: string; nome: string; fotoPerfil?: string | null };
  [chave: string]: unknown;
}

/**
 * Tipado só com os campos que esta fase usa — o backend envia mais campos,
 * e eles continuam disponíveis em tempo de execução (índice `[chave:
 * string]`), só não são nomeados aqui até uma tela futura precisar deles.
 *
 * `salario` é `DECIMAL(10,2)` no Postgres — Sequelize normalmente serializa
 * isso como STRING no JSON (ex.: `"3500.00"`), não como `number`. Nunca
 * presuma um dos dois: sempre `Number(vaga.salario)` + `Number.isFinite`
 * antes de formatar.
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
  exclusivaPcd?: boolean;
  publicoAlvo?: PublicoAlvoVaga;
  recursosAcessibilidade?: RecursoAcessibilidadeVaga[] | null;
  acessibilidade?: string | null;
  status: StatusVaga;
  dataPublicacao?: string | null;
  dataEncerramento?: string | null;
  empresa?: EmpresaResumoVaga;
  [chave: string]: unknown;
}

/** `GET /vagas` — paginação clássica por página (não cursor/infinite). */
export interface ListaVagasResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  vagas: Vaga[];
}

/**
 * Payload de `POST /vagas` (todos obrigatórios) e `PUT /vagas/:id` (todos
 * opcionais — o backend faz atualização parcial de verdade aqui, diferente
 * do perfil de candidato/empresa) — `vagaValidator.js: camposVaga`.
 *
 * IMPORTANTE (achado da Fase 12, reaplicado): interface EXPLÍCITA, nunca
 * `Omit<Vaga, ...>` — `Vaga` tem índice `[chave: string]: unknown`, que
 * colapsaria `keyof` e destruiria a checagem de campo obrigatório.
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
  exclusivaPcd?: boolean;
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

/** `GET /vagas/minhas` — cada vaga ganha `totalCandidaturas` (uma consulta agregada no backend, não N+1). */
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
 * `GET /vagas` (`VagaService.findAll`, Site/Backend) — filtros confirmados
 * por auditoria (Fase R1). A API real também aceita `estado`, `exclusivaPcd`
 * e `empresaId`, mas esta fase só expõe na UI os filtros pedidos (busca
 * textual, cidade, modalidade, contrato, público-alvo, recursos de
 * acessibilidade) — os campos abaixo são exatamente os que `JobsScreen`
 * usa. `recursosAcessibilidade` é AND (a vaga precisa ter TODOS os
 * recursos selecionados, não qualquer um deles — `Op.contains` no backend).
 */
export interface ListarVagasParametros {
  page?: number;
  limit?: number;
  /** Busca textual em título, descrição e requisitos (`Op.iLike`, case-insensitive, substring). */
  search?: string;
  /** Substring, case-insensitive (`Op.iLike`) — não precisa bater com a cidade inteira. */
  cidade?: string;
  modalidade?: ModalidadeVaga;
  contrato?: ContratoVaga;
  publicoAlvo?: PublicoAlvoVaga;
  /** Vaga precisa ter TODOS os recursos da lista (`Op.contains`), não apenas um. */
  recursosAcessibilidade?: RecursoAcessibilidadeVaga[];
}

/** `Site/Backend/src/models/Candidatura.js: STATUS_CANDIDATURA`. `"Visualizada"|"EmAnalise"|"Aprovada"|"Rejeitada"` são os únicos que a EMPRESA pode aplicar (`CandidaturaService.STATUS_EMPRESA`); `"Pendente"` é o estado inicial, `"Cancelada"` só o próprio candidato aplica. */
export type StatusCandidatura = "Pendente" | "Visualizada" | "EmAnalise" | "Aprovada" | "Rejeitada" | "Cancelada";

/** Resumo do candidato dono da candidatura — só embutido quando a EMPRESA lista/vê candidaturas (`GET /vagas/:vagaId/candidaturas`, `CandidaturaService.listarDaVaga`), nunca do lado do próprio candidato. */
export interface CandidatoResumoCandidatura {
  id: string;
  usuarioId: string;
  usuario?: { id: string; nome: string; email: string; fotoPerfil?: string | null };
  [chave: string]: unknown;
}

/**
 * Campos usados por esta fase — `Site/Backend/src/models/Candidatura.js`
 * tem mais (`dataCandidatura` etc.) que continuam disponíveis via índice.
 * `candidato` só vem preenchido na visão da empresa (Fase 18).
 */
export interface Candidatura {
  id: string;
  vagaId?: string;
  mensagem?: string | null;
  status?: StatusCandidatura;
  candidato?: CandidatoResumoCandidatura;
  [chave: string]: unknown;
}

/** `POST /vagas/:vagaId/candidaturas` — 201 em sucesso, 409 se já candidatado (erro tratado pelo chamador). */
export interface CandidatarSeResposta {
  sucesso: true;
  candidatura: Candidatura;
}

export interface ListarCandidaturasParametros {
  page?: number;
  limit?: number;
  status?: StatusCandidatura;
}

/** `GET /vagas/:vagaId/candidaturas` — empresa dona ou administrador (`rbacMiddleware("empresa","administrador")`). */
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

/** Rótulos legíveis dos status de candidatura — mesma razão dos rótulos de vaga abaixo (códigos do backend não são texto pronto para tela). */
export const STATUS_CANDIDATURA_LABEL: Record<StatusCandidatura, string> = {
  Pendente: "Pendente",
  Visualizada: "Visualizada",
  EmAnalise: "Em análise",
  Aprovada: "Aprovada",
  Rejeitada: "Rejeitada",
  Cancelada: "Cancelada",
};

/**
 * `POST /vagas/:vagaId/favoritar` — toggle idempotente. O backend NUNCA
 * informa, em `GET /vagas` nem em `GET /vagas/:id`, se a vaga já estava
 * favoritada antes — só esta chamada devolve o estado real, e só depois de
 * alternar. Ver comentário em `VagaDetailScreen.tsx` sobre a consequência
 * disso no estado inicial do botão.
 */
export interface FavoritarVagaResposta {
  sucesso: true;
  favoritado: boolean;
}

/**
 * Rótulos legíveis para os ENUMs acima — os valores do backend são códigos
 * (`Hibrido`, `pcd_cinquenta_mais`, `interprete_libras`...), não texto pronto
 * pra tela nem para leitor de tela. Vivem aqui (não num arquivo à parte) por
 * serem pequenos e fortemente acoplados aos tipos que descrevem.
 */
export const MODALIDADE_LABEL: Record<ModalidadeVaga, string> = {
  Presencial: "Presencial",
  Hibrido: "Híbrido",
  Remoto: "Remoto",
};

export const CONTRATO_LABEL: Record<ContratoVaga, string> = {
  CLT: "CLT",
  PJ: "PJ",
  Estagio: "Estágio",
  JovemAprendiz: "Jovem Aprendiz",
  Temporario: "Temporário",
};

export const PUBLICO_ALVO_LABEL: Record<PublicoAlvoVaga, string> = {
  geral: "Geral",
  pcd: "Pessoas com deficiência",
  cinquenta_mais: "50 anos ou mais",
  pcd_cinquenta_mais: "Pessoas com deficiência e 50 anos ou mais",
};

export const RECURSO_ACESSIBILIDADE_LABEL: Record<RecursoAcessibilidadeVaga, string> = {
  interprete_libras: "Intérprete de Libras",
  tecnologia_assistiva: "Tecnologia assistiva",
  ambiente_fisico_acessivel: "Ambiente físico acessível",
  banheiro_adaptado: "Banheiro adaptado",
  elevador_rampa: "Elevador ou rampa",
  jornada_adaptavel: "Jornada adaptável",
  ferramentas_digitais_acessiveis: "Ferramentas digitais acessíveis",
  outro: "Outro recurso de acessibilidade",
};

export const STATUS_VAGA_LABEL: Record<StatusVaga, string> = {
  Aberta: "Aberta",
  Pausada: "Pausada",
  Encerrada: "Encerrada",
};
