/** Perfis de usuário suportados pela plataforma. */
export type TipoUsuario = "candidato" | "empresa" | "administrador";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  fotoPerfil?: string | null;
  telefone?: string | null;
  criadoEm?: string;
}

export interface Candidato {
  id: string;
  usuarioId: string;
  usuario?: Usuario;
  tituloProfissional?: string | null;
  resumo?: string | null;
  cidade?: string | null;
  estado?: string | null;
  curriculo?: string | null;
  deficiencias?: { id: string; nome: string; observacoes?: string | null }[];
  experiencias?: Experiencia[];
  formacoes?: Formacao[];
  certificados?: Certificado[];
  habilidades?: Habilidade[];
}

export interface Experiencia {
  id: string;
  cargo: string;
  empresaNome: string;
  dataInicio?: string;
  dataFim?: string | null;
  descricao?: string | null;
}

export interface Formacao {
  id: string;
  instituicao: string;
  curso: string;
  nivel?: string | null;
  dataInicio?: string;
  dataFim?: string | null;
}

export interface Certificado {
  id: string;
  nome: string;
  instituicao?: string | null;
  arquivo?: string | null;
  dataEmissao?: string | null;
}

export interface Habilidade {
  id: string;
  nome: string;
  nivel?: string | null;
}

export interface Empresa {
  id: string;
  usuarioId?: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj?: string;
  setor?: string | null;
  descricao?: string | null;
  logo?: string | null;
  cidade?: string | null;
  estado?: string | null;
  aprovada?: boolean;
  seguindo?: boolean;
  totalVagas?: number;
  totalSeguidores?: number;
}

export interface CredenciaisLogin {
  email: string;
  senha: string;
}

export interface RespostaLogin {
  usuario: Usuario;
  /** O backend Express devolve o access token no campo `token`. */
  token: string;
  refreshToken: string;
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
  modalidade: ModalidadeVaga;
  contrato?: ContratoVaga;
  salario?: number | string | null;
  exclusivaPcd?: boolean;
  status: StatusVaga;
  criadoEm?: string;
  empresaId?: string;
  empresa?: {
    id: string;
    nomeFantasia?: string | null;
    razaoSocial?: string;
    logo?: string | null;
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
export type TipoArquivo = "imagem" | "documento";

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

export interface ComentarioCompleto extends Comentario {
  usuario?: Usuario;
  comentarioPaiId?: string | null;
  respostas?: ComentarioCompleto[];
  totalRespostas?: number;
}

/* ==========================================================
   Seguidores
   ========================================================== */
export interface ResumoSeguidores {
  seguidores: number;
  seguindo: number;
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

