/** Perfis de usuário suportados pela plataforma. */
export type TipoUsuario = "candidato" | "empresa" | "administrador";

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
  created_at?: string;
  ultimoLogin?: string | null;
  pausadoPeloUsuario?: boolean;
  perfilPublico?: boolean;
}

/** Usuário bloqueado — item da lista em Configurações → Privacidade. */
export interface UsuarioBloqueado {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario?: TipoUsuario;
}

/** Espelha a tabela `candidatos` do backend (ver Backend/src/models/Candidato.js). */
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
  arquivo?: string | null;
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

export type PorteEmpresa = "MEI" | "Micro" | "Pequena" | "Media" | "Grande";

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
  statusAprovacao?: "pendente" | "aprovada" | "reprovada";
  empresaVerificada?: boolean;
  motivoReprovacao?: string | null;
}

export interface CredenciaisLogin {
  email: string;
  senha: string;
  /** Código do app autenticador — só enviado na segunda etapa do login com 2FA. */
  codigoTotp?: string;
  /** Reenviado como `true` quando o usuário confirma que quer reativar uma conta pausada. */
  confirmarReativacao?: boolean;
}

export interface RespostaLogin {
  usuario: Usuario;
  /** O backend Express devolve o access token no campo `token`. */
  token: string;
  refreshToken: string;
}

/** Retornado no lugar de `RespostaLogin` quando a conta tem 2FA ativado e o código ainda não foi enviado. */
export interface RespostaLoginPendente2FA {
  requerDoisFatores: true;
}

/** Retornado no lugar de `RespostaLogin` quando a conta foi pausada pelo próprio usuário. */
export interface RespostaLoginContaPausada {
  contaPausada: true;
}

/** Uma sessão ativa (refresh token) do usuário — ver `GET /auth/sessoes`. */
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

export interface StatusDoisFatores {
  ativado: boolean;
  metodo: "totp" | "sms";
  ativadoEm: string | null;
}

export interface AtivacaoDoisFatores {
  segredo: string;
  uri: string;
  qrCodeDataUrl: string;
}


export type ModalidadeVaga = "Presencial" | "Hibrido" | "Remoto";
export type ContratoVaga = "CLT" | "PJ" | "Estagio" | "JovemAprendiz" | "Temporario";
export type StatusVaga = "Aberta" | "Pausada" | "Encerrada";

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
  acessibilidade?: string | null;
  recursosAcessibilidade?: string[] | null;
  status: StatusVaga;
  /** O backend serializa os timestamps como `createdAt`/`updatedAt` (não `criadoEm`). */
  createdAt?: string;
  dataPublicacao?: string | null;
  dataEncerramento?: string | null;
  empresaId?: string;
  /** Só presente em `GET /vagas/minhas` (painel de gestão). */
  totalCandidaturas?: number;
  empresa?: {
    id: string;
    nomeFantasia?: string | null;
    razaoSocial?: string;
    logo?: string | null;
    usuario?: { id: string };
  };
}

export type StatusCandidatura = "Pendente" | "EmAnalise" | "Aprovada" | "Rejeitada" | "Cancelada" | "Visualizada";

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
  imagem?: string | null;
  /** O backend serializa os timestamps como `created_at`/`updated_at`. */
  criadoEm?: string;
  created_at?: string;
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
  created_at?: string;
  autor?: Usuario;
  postagemId?: string;
  respostas?: Comentario[];
}

export type { Conversa, Mensagem, ParticipanteConversa } from "@/lib/api-types";


export type TipoNotificacao = string;

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem?: string;
  tipo: TipoNotificacao;
  lida: boolean;
  criadoEm: string;
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

/* ==========================================================
   Arquivos e anexos
   ========================================================== */
export type TipoArquivo = "imagem" | "documento" | "video";

export interface Arquivo {
  id: string;
  url: string;
  tipo: TipoArquivo;
  categoria: string;
  nomeOriginal?: string | null;
  mimeType?: string;
  tamanhoBytes?: number;
}

export interface AnexoPostagem {
  id: string;
  url: string;
  tipo: TipoArquivo;
  nomeOriginal?: string | null;
  ordem?: number;
}

/* ==========================================================
   Feed
   ========================================================== */
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

export interface ComentarioCompleto extends Comentario {
  usuario?: Usuario;
  comentarioPaiId?: string | null;
  respostas?: ComentarioCompleto[];
  totalRespostas?: number;
}

/* ==========================================================
   Seguidores
   ========================================================== */
/** Espelha exatamente o retorno de `GET /seguir/resumo/:usuarioId` no backend. */
export interface ResumoSeguidores {
  totalSeguidores: number;
  totalSeguindo: number;
  seguindoEsteUsuario?: boolean;
}

export interface SugestaoPerfil {
  id: string;
  nome: string;
  tipo?: TipoUsuario;
  fotoPerfil?: string | null;
  titulo?: string | null;
}

/* ==========================================================
   Dashboards e administração
   ========================================================== */
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

/* ==========================================================
   Preferências de acessibilidade (persistidas na conta)
   ========================================================== */
/** Espelha exatamente a tabela `preferencias_acessibilidade` do Backend. */
export interface PreferenciasAcessibilidade {
  tema?: "claro" | "escuro" | "sistema" | null;
  altoContraste?: boolean;
  fonteDislexia?: boolean;
  /** Percentual inteiro entre 80 e 200. */
  escalaFonte?: number;
  espacamentoTexto?: boolean;
  reduzirAnimacoes?: boolean;
  leituraPorVoz?: boolean;
  consentimentoVoz?: boolean;
  velocidadeVoz?: number | string;
  linguagemSimplificada?: boolean;
  libras?: boolean;
  destaqueFoco?: boolean;
  [chave: string]: unknown;
}


/* ==========================================================
   Página inicial pública
   ========================================================== */
export interface HomePublica {
  estatisticas?: {
    usuarios?: number;
    vagas?: number;
    empresas?: number;
    candidaturas?: number;
    [chave: string]: unknown;
  };
  vagasDestaque?: Vaga[];
  empresasParceiras?: Empresa[];
  [chave: string]: unknown;
}

/* ==========================================================
   Chatbot
   ========================================================== */
export interface ChatbotMensagem {
  id: string;
  conteudo: string;
  origem: "usuario" | "bot";
  criadoEm: string;
}

