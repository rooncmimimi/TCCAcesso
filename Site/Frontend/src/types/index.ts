/** Perfis de usuário suportados pela plataforma. */
export type TipoUsuario = "candidato" | "empresa" | "administrador";

/** Quem pode iniciar uma nova conversa com o usuário. */
export type PreferenciaMensagens =
  | "todos"
  | "seguidores"
  | "seguindo"
  | "mutuo"
  | "empresas"
  | "ninguem";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  /** Nome do campo como o backend serializa (`Usuario.tipoUsuario`) em objetos aninhados (autor de post, etc). */
  tipoUsuario?: TipoUsuario;
  ativo: boolean;
  fotoPerfil?: string | null;
  capaPerfil?: string | null;
  telefone?: string | null;
  criadoEm?: string;
  ultimoLogin?: string | null;
  pausadoPeloUsuario?: boolean;
  perfilPublico?: boolean;
  /** Só vem preenchido na resposta pro próprio dono (nunca em perfis de terceiros). */
  preferenciaMensagens?: PreferenciaMensagens;
  /**
   * Só vem preenchido quando `tipo === "empresa"` (login/cadastro e
   * `/auth/me` já retornam esta associação); usado para decidir se a
   * empresa está aprovada antes de liberar o app (ver `EstruturaApp`).
   */
  empresa?: Empresa;
}

/** Usuário bloqueado: item da lista em Configurações → Privacidade. */
export interface UsuarioBloqueado {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario?: TipoUsuario;
}

/** Espelha a tabela `candidatos` do backend (ver Site/Backend/src/models/Candidato.js). */
export interface Candidato {
  id: string;
  usuarioId: string;
  usuario?: Usuario;
  cpf?: string | null;
  dataNascimento?: string | null;
  genero?: string | null;
  biografia?: string | null;
  escolaridade?: string | null;
  tituloProfissional?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  cep?: string | null;
  linkedin?: string | null;
  github?: string | null;
  disponibilidade?: string | null;
  pretensaoSalarial?: number | string | null;
  necessidadesAcessibilidade?: string | null;
  curriculo?: string | null;
  curriculoNome?: string | null;
  curriculoAtualizadoEm?: string | null;
  deficiencias?: { id: string; nome: string; descricao?: string | null; CandidatoDeficiencia?: { observacoes?: string | null } }[];
  experiencias?: Experiencia[];
  formacoes?: Formacao[];
  certificados?: Certificado[];
  habilidades?: Habilidade[];
}

/**
 * Espelha `POST /candidatos/:id/curriculo/importar`: rascunho extraído do
 * arquivo (sem IA), nunca gravado sozinho. Nunca traz CPF, de propósito.
 */
export interface RascunhoExperiencia {
  cargo: string;
  empresa: string;
  dataInicio: string;
  dataFim: string;
  atual: boolean;
  descricaoSugerida: string;
}

export interface RascunhoFormacao {
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
  experiencias: RascunhoExperiencia[];
  formacoes: RascunhoFormacao[];
  habilidades: string[];
  aviso: string;
}

export interface Experiencia {
  id: string;
  cargo: string;
  empresa: string;
  local?: string | null;
  modalidade?: string | null;
  dataInicio?: string;
  dataFim?: string | null;
  atual?: boolean;
  descricao?: string | null;
}

export interface Formacao {
  id: string;
  instituicao: string;
  curso: string;
  nivel?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  emAndamento?: boolean;
  descricao?: string | null;
}

export interface Certificado {
  id: string;
  titulo: string;
  instituicao?: string | null;
  emitidoEm?: string | null;
  expiraEm?: string | null;
  credencialUrl?: string | null;
}

export interface Habilidade {
  id: string;
  nome: string;
  nivel?: string | null;
}

export interface Deficiencia {
  id: string;
  nome: string;
  descricao?: string | null;
}

export type PorteEmpresa = "mei" | "micro" | "pequena" | "media" | "grande";

export interface Empresa {
  id: string;
  usuarioId?: string;
  usuario?: Usuario;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj?: string;
  setor?: string | null;
  porte?: PorteEmpresa | null;
  descricao?: string | null;
  culturaInclusiva?: string | null;
  site?: string | null;
  logo?: string | null;
  capa?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  cep?: string | null;
  aprovada?: boolean;
  seguindo?: boolean;
  totalVagas?: number;
  totalSeguidores?: number;
  vagas?: Vaga[];
  statusAprovacao?: "pendente" | "aprovada" | "reprovada" | "suspensa";
  empresaVerificada?: boolean;
  motivoReprovacao?: string | null;
  motivoSuspensao?: string | null;
}

export interface CredenciaisLogin {
  email: string;
  senha: string;
  /** Reenviado como `true` quando o usuário confirma que quer reativar uma conta pausada. */
  confirmarReativacao?: boolean;
}

export interface RespostaLogin {
  usuario: Usuario;
  /** O backend Express devolve o access token no campo `token`. */
  token: string;
  refreshToken: string;
}

/** Retornado no lugar de `RespostaLogin` quando a conta foi pausada pelo próprio usuário. */
export interface RespostaLoginContaPausada {
  contaPausada: true;
}

/** Retornado no lugar de `RespostaLogin` quando o cadastro ainda não confirmou o e-mail. */
export interface RespostaLoginEmailNaoVerificado {
  emailNaoVerificado: true;
  email: string;
}

/**
 * Retornado no lugar de `RespostaLogin` pelo cadastro (candidato/empresa)
 * quando a confirmação de e-mail está ativa: a conta foi criada, mas
 * nenhuma sessão é emitida até o e-mail ser confirmado.
 */
export interface RespostaCadastroPendenteVerificacao {
  pendenteVerificacaoEmail: true;
  email: string;
}

/** Uma sessão ativa do usuário (refresh token), como vem de `POST /auth/sessoes`. */
export interface SessaoAtiva {
  id: string;
  userAgent?: string | null;
  ip?: string | null;
  criadoEm: string;
  expiraEm: string;
  atual: boolean;
}

/** Espelha a tabela `preferencias_notificacao` do Backend. */
export interface PreferenciasNotificacao {
  vagasCandidaturas: boolean;
  mensagens: boolean;
  publicacoesComentarios: boolean;
  redeSeguidores: boolean;
}

export type ModalidadeVaga = "presencial" | "hibrido" | "remoto";
export type ContratoVaga = "clt" | "pj" | "estagio" | "jovem_aprendiz" | "temporario";
export type StatusVaga = "aberta" | "pausada" | "encerrada";
export type PublicoAlvoVaga = "geral" | "pcd" | "cinquenta_mais" | "pcd_cinquenta_mais";
export type RecursoAcessibilidadeVaga =
  | "interprete_libras"
  | "tecnologia_assistiva"
  | "ambiente_fisico_acessivel"
  | "banheiro_adaptado"
  | "elevador_rampa"
  | "jornada_adaptavel"
  | "ferramentas_digitais_acessiveis"
  | "outro";

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
  acessibilidade?: string | null;
  recursosAcessibilidade?: RecursoAcessibilidadeVaga[] | null;
  status: StatusVaga;
  criadoEm?: string;
  dataEncerramento?: string | null;
  empresaId?: string;
  /** Só presente em `GET /vagas/minhas` (painel de gestão). */
  totalCandidaturas?: number;
  empresa?: {
    id: string;
    nomeFantasia?: string | null;
    razaoSocial?: string;
    logo?: string | null;
    empresaVerificada?: boolean;
    usuario?: { id: string };
  };
}

export type StatusCandidatura = "pendente" | "em_analise" | "aprovada" | "rejeitada" | "cancelada" | "visualizada";

export interface Candidatura {
  id: string;
  status: StatusCandidatura;
  mensagem?: string | null;
  criadoEm: string;
  vaga?: Vaga;
  candidato?: Candidato;
}

export interface Postagem {
  id: string;
  conteudo: string;
  criadoEm?: string;
  atualizadoEm?: string;
  autor?: Usuario;
  usuarioId?: string;
  totalCurtidas?: number;
  totalComentarios?: number;
  totalCompartilhamentos?: number;
  curtidoPeloUsuario?: boolean;
}

export interface Comentario {
  id: string;
  comentario: string;
  criadoEm?: string;
  autor?: Usuario;
  postagemId?: string;
  respostas?: Comentario[];
}

export type { Conversa, Mensagem, ParticipanteConversa } from "@/lib/tiposApi";


export type TipoNotificacao = string;

/** Quem praticou a ação de uma notificação; nunca traz dado sensível (ver NotificacaoService.INCLUIR_ATOR no backend). */
export interface AtorNotificacao {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
}

export interface Notificacao {
  id: string;
  titulo: string;
  /** Campo real do backend (`Notificacao.descricao`); a resposta não tem `mensagem`. */
  descricao?: string;
  tipo: TipoNotificacao;
  /** Código livre do evento (como `curtida_postagem`), usado para escolher ícone e destino. */
  subtipo?: string | null;
  /** Ponteiro polimórfico (sem FK) para o conteúdo relacionado; ausente quando não há destino aplicável. */
  entidadeTipo?: string | null;
  entidadeId?: string | null;
  ator?: AtorNotificacao | null;
  lida: boolean;
  criadoEm: string;
}

/** Resultado de `GET /conversas/pode-iniciar/:usuarioId`: só informa, nunca lança erro de permissão. */
export interface PodeIniciarConversa {
  permitido: boolean;
  motivo?: string;
}

export interface RespostaPaginada<T> {
  dados: T[];
  total: number;
  pagina?: number;
  page?: number;
  limite?: number;
  limit?: number;
  totalPaginas?: number;
}

/* Arquivos e anexos */
export type TipoArquivo = "imagem" | "documento" | "video";

export interface AnexoPostagem {
  id: string;
  url: string;
  tipo: TipoArquivo;
  nomeOriginal?: string | null;
  /** Descrição acessível fornecida pelo autor, usada como `alt` real e lida pelo sistema de voz. */
  descricao?: string | null;
  ordem?: number;
}

/* Feed */
export interface PostagemCompleta extends Postagem {
  anexos?: AnexoPostagem[];
  curtidoPorMim?: boolean;
  compartilhadaPorMim?: boolean;
  usuario?: Usuario;
  editadoEm?: string | null;
  publica?: boolean;
}

export interface CompartilhamentoCompleto {
  id: string;
  comentario?: string | null;
  criadoEm?: string;
  usuario?: Usuario;
  postagem?: PostagemCompleta;
}

/**
 * Item da linha do tempo de um perfil (`GET /postagens/usuario/:usuarioId/linha-do-tempo`):
 * publicações próprias e compartilhamentos intercalados por data. `tipo` distingue os dois, e
 * `postagem` é sempre a publicação a exibir (a própria ou a original, no caso de compartilhamento).
 */
export interface ItemLinhaDoTempo {
  tipo: "postagem" | "compartilhamento";
  id: string;
  criadoEm: string;
  comentario?: string | null;
  postagem?: PostagemCompleta;
}

export interface ComentarioCompleto extends Comentario {
  usuario?: Usuario;
  comentarioPaiId?: string | null;
  respostas?: ComentarioCompleto[];
  totalRespostas?: number;
}

/* Seguidores */
/** Espelha exatamente o retorno de `GET /seguir/resumo/:usuarioId` no backend. */
export interface ResumoSeguidores {
  totalSeguidores: number;
  totalSeguindo: number;
  seguindoEsteUsuario?: boolean;
  /** Perfil público ou privado do alvo; só existe para usuários e candidatos. */
  perfilPublico?: boolean;
  /** O alvo já segue o usuário autenticado; necessário para "Seguir de volta". */
  elesSeguemVoce?: boolean;
  /** Usuário autenticado tem uma solicitação de seguir pendente para o alvo (perfil privado). */
  solicitacaoPendente?: boolean;
  /**
   * Bloqueio, em qualquer direção, entre o usuário autenticado e o alvo; só existe para usuários e
   * candidatos. O `SeguirButton` usa este campo para nunca oferecer uma ação que o backend
   * recusaria.
   */
  bloqueado?: boolean;
}

export interface SugestaoPerfil {
  id: string;
  nome: string;
  tipo?: TipoUsuario;
  fotoPerfil?: string | null;
  titulo?: string | null;
  /** Explicação em texto simples de por que esta pessoa foi sugerida (`GET /seguir/sugestoes`). Nunca opaco. */
  motivo?: string;
}

/** Espelha `GET /seguir/sugestoes/empresas`: sugestão explicável de empresa para seguir. */
export interface SugestaoEmpresa {
  id: string;
  usuarioId?: string;
  nomeFantasia?: string | null;
  razaoSocial?: string;
  logo?: string | null;
  setor?: string | null;
  cidade?: string | null;
  descricao?: string | null;
  empresaVerificada?: boolean;
  motivo?: string;
}

/*
 * Minha atividade: espelha `GET /atividade/minha`, sempre do próprio usuário autenticado. Cada
 * categoria traz uma prévia (`itens`) e o `total` real; "ver tudo" usa as rotas próprias de cada
 * lista (candidaturas, favoritos, seguidores etc.).
 */
export interface FavoritoVagaItem {
  id: string;
  criadoEm?: string;
  vaga?: Vaga;
}

export interface EmpresaSeguidaItem {
  id: string;
  criadoEm?: string;
  empresa?: Empresa;
}

export interface InteracaoFeedItem {
  id: string;
  criadoEm?: string;
  comentario?: string;
  postagem?: PostagemCompleta;
}

export interface AtividadePessoal {
  ehCandidato: boolean;
  candidaturas: { itens: Candidatura[]; total: number };
  vagasFavoritas: { itens: FavoritoVagaItem[]; total: number };
  seguindo: {
    pessoas: { itens: Usuario[]; total: number };
    empresas: { itens: EmpresaSeguidaItem[]; total: number };
  };
  interacoesFeed: {
    curtidas: { itens: InteracaoFeedItem[]; total: number };
    comentarios: { itens: InteracaoFeedItem[]; total: number };
    compartilhamentos: { itens: InteracaoFeedItem[]; total: number };
  };
}

/* Dashboards e administração */
export interface MetricasCandidato {
  candidaturas?: number;
  candidaturasPorStatus?: Record<string, number>;
  vagasFavoritas?: number;
  postagens?: number;
  seguidores?: number;
  visualizacoesPerfil?: number;
  [chave: string]: unknown;
}

export interface MetricasEmpresa {
  vagas?: number;
  vagasAbertas?: number;
  candidaturas?: number;
  candidaturasPorStatus?: Record<string, number>;
  seguidores?: number;
  [chave: string]: unknown;
}

export interface MetricasAdmin {
  usuarios?: number;
  candidatos?: number;
  empresas?: number;
  vagas?: number;
  postagens?: number;
  candidaturas?: number;
  empresasPendentes?: number;
  [chave: string]: unknown;
}

/* Preferências de acessibilidade (salvas na conta) */
/** Espelha exatamente a tabela `preferencias_acessibilidade` do Backend. */
export interface PreferenciasAcessibilidadeApi {
  tema?: "claro" | "escuro" | "sistema" | null;
  altoContraste?: boolean;
  fonteDislexia?: boolean;
  /** Percentual inteiro entre 80 e 200. */
  escalaFonte?: number;
  espacamentoTexto?: boolean;
  reduzirAnimacoes?: boolean;
  leituraPorVoz?: boolean;
  /** `null`: ainda não respondeu ao consentimento de voz; `true` ou `false`: já respondeu. */
  consentimentoVoz?: boolean | null;
  velocidadeVoz?: number | string;
  linguagemSimplificada?: boolean;
  libras?: boolean;
  destaqueFoco?: boolean;
  [chave: string]: unknown;
}


/* Página inicial pública */
export interface HomePublica {
  // Mesmas chaves de `PublicoService.paginaInicial()` no backend: `empresas`, `vagasAbertas`,
  // `candidatos` e `candidaturas`.
  estatisticas?: {
    candidatos?: number;
    vagasAbertas?: number;
    empresas?: number;
    candidaturas?: number;
    [chave: string]: unknown;
  };
  vagasDestaque?: Vaga[];
  empresasParceiras?: Empresa[];
  [chave: string]: unknown;
}

/* Chatbot */
export interface ChatbotConversa {
  id: string;
  titulo?: string | null;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface ChatbotMensagem {
  id: string;
  conversaId: string;
  conteudo: string;
  papel: "usuario" | "assistente";
  criadoEm?: string;
}

