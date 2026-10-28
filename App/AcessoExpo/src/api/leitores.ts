import { juntar, local, moeda, periodo, tempoRelativo } from '../utilitarios/formatacao';

/**
 * Converte o JSON da API do Site nos dados que as telas usam. Mesmos formatos e regras do app
 * Android (LeitoresConteudoApi.java), conferidos no código do backend: VagaService, PostagemService,
 * CandidaturaService, NotificacaoService, DashboardService, PerfilCandidatoService e EmpresaService.
 * Tolerante a campo ausente ou null: a tela nunca recebe "undefined".
 */

type Json = Record<string, unknown>;

export interface Anexo {
  id: string | null;
  url: string;
  descricao: string | null;
}

export interface Publicacao {
  id: string;
  conteudo: string;
  quando: string;
  curtidas: number;
  comentarios: number;
  curtidoPorMim: boolean;
  editada: boolean;
  anexos: Anexo[];
  autorId: string | null;
  nomeAutor: string;
  tipoAutor: string | null;
  fotoAutorUrl: string | null;
}

export interface Comentario {
  id: string;
  texto: string;
  quando: string;
  editado: boolean;
  autorId: string | null;
  nomeAutor: string;
  tipoAutor: string | null;
  fotoAutorUrl: string | null;
  respostas: Comentario[];
}

export interface Vaga {
  id: string;
  titulo: string;
  descricao: string | null;
  modalidade: string | null;
  contrato: string | null;
  publicoAlvo: string | null;
  cidade: string | null;
  estado: string | null;
  status: string | null;
  totalCandidaturas: number;
  recursosAcessibilidade: string[];
  requisitos: string | null;
  beneficios: string | null;
  salario: string | null;
  cargaHoraria: string | null;
  nomeEmpresa: string | null;
  empresaVerificada: boolean;
  empresaUsuarioId: string | null;
  logoEmpresaUrl: string | null;
  quando: string;
}

export interface Candidatura {
  id: string;
  status: string | null;
  quando: string;
  vagaId: string | null;
  tituloVaga: string | null;
  nomeEmpresa: string | null;
}

export interface Notificacao {
  id: string;
  tipo: string | null;
  titulo: string;
  descricao: string | null;
  lida: boolean;
  quando: string;
  entidadeTipo: string | null;
  entidadeId: string | null;
  atorNome: string | null;
}

export interface ResumoEmpresa {
  vagasPublicadas: number;
  vagasAbertas: number;
  candidaturas: number;
  seguidores: number;
  vagas: Vaga[];
}

export interface ItemCurriculo {
  titulo: string | null;
  subtitulo: string | null;
  periodo: string | null;
  descricao: string | null;
}

export interface Perfil {
  tipo: 'candidato' | 'empresa';
  usuarioId: string | null;
  nome: string | null;
  fotoUrl: string | null;
  detalhe: string | null;
  sobre: string | null;
  habilidades: string[];
  experiencias: ItemCurriculo[];
  formacoes: ItemCurriculo[];
  statusEmpresa: string | null;
  empresaVerificada: boolean;
  culturaInclusiva: string | null;
  site: string | null;
  porte: string | null;
  vagasAbertas: Vaga[];
}

// --- leitores ---

/** GET /postagens: { postagens: [...] } */
export function publicacoes(json: Json, agora: number = Date.now()): Publicacao[] {
  return lista(json, 'postagens').map((item) => publicacao(item, agora));
}

export function publicacao(json: Json, agora: number = Date.now()): Publicacao {
  const autor = objeto(json, 'usuario');
  return {
    id: texto(json, 'id') ?? '',
    conteudo: texto(json, 'conteudo') ?? '',
    quando: tempoRelativo(texto(json, 'criadoEm'), agora),
    curtidas: inteiro(json, 'totalCurtidas'),
    comentarios: inteiro(json, 'totalComentarios'),
    curtidoPorMim: booleano(json, 'curtidoPorMim'),
    editada: texto(json, 'editadoEm') !== null,
    anexos: lista(json, 'anexos')
      .filter((anexo) => texto(anexo, 'tipo') === 'imagem' && !!texto(anexo, 'url'))
      .map((anexo) => ({ id: texto(anexo, 'id'), url: texto(anexo, 'url')!, descricao: texto(anexo, 'descricao') })),
    autorId: texto(autor, 'id'),
    nomeAutor: texto(autor, 'nome') ?? 'Usuário do ACESSO',
    tipoAutor: texto(autor, 'tipoUsuario'),
    fotoAutorUrl: texto(autor, 'fotoPerfil'),
  };
}

/** GET /postagens/:id/comentarios: { comentarios: [{ ..., usuario, respostas: [...] }] } (respostas em um nível). */
export function comentarios(json: Json, agora: number = Date.now()): Comentario[] {
  return lista(json, 'comentarios').map((item) => comentario(item, agora, true));
}

function comentario(json: Json, agora: number, comRespostas: boolean): Comentario {
  const autor = objeto(json, 'usuario');
  return {
    id: texto(json, 'id') ?? '',
    texto: texto(json, 'comentario') ?? '',
    quando: tempoRelativo(texto(json, 'criadoEm'), agora),
    editado: texto(json, 'editadoEm') !== null,
    autorId: texto(autor, 'id') ?? texto(json, 'usuarioId'),
    nomeAutor: texto(autor, 'nome') ?? 'Usuário removido',
    tipoAutor: texto(autor, 'tipoUsuario'),
    fotoAutorUrl: texto(autor, 'fotoPerfil'),
    respostas: comRespostas ? lista(json, 'respostas').map((resposta) => comentario(resposta, agora, false)) : [],
  };
}

/** Comentários mais respostas, como a API e o app Android contam. */
export function totalComentarios(lista: Comentario[]): number {
  return lista.reduce((total, item) => total + 1 + item.respostas.length, 0);
}

/** POST /postagens/:id/curtidas: { curtido, totalCurtidas } */
export function curtida(json: Json): { curtido: boolean; total: number } {
  return { curtido: booleano(json, 'curtido'), total: inteiro(json, 'totalCurtidas') };
}

/** GET /vagas e GET /vagas/minhas: { vagas: [...] } */
export function vagas(json: Json, agora: number = Date.now()): Vaga[] {
  return lista(json, 'vagas').map((item) => vaga(item, agora));
}

export function vaga(json: Json, agora: number = Date.now()): Vaga {
  const empresa = objeto(json, 'empresa');
  return {
    id: texto(json, 'id') ?? '',
    titulo: texto(json, 'titulo') ?? 'Vaga sem título',
    descricao: texto(json, 'descricao'),
    modalidade: texto(json, 'modalidade'),
    contrato: texto(json, 'contrato'),
    publicoAlvo: texto(json, 'publicoAlvo'),
    cidade: texto(json, 'cidade'),
    estado: texto(json, 'estado'),
    status: texto(json, 'status'),
    totalCandidaturas: inteiro(json, 'totalCandidaturas'),
    recursosAcessibilidade: (Array.isArray(json.recursosAcessibilidade) ? json.recursosAcessibilidade : []).filter(
      (recurso): recurso is string => typeof recurso === 'string',
    ),
    requisitos: texto(json, 'requisitos'),
    beneficios: texto(json, 'beneficios'),
    salario: moeda(texto(json, 'salario')),
    cargaHoraria: texto(json, 'cargaHoraria'),
    nomeEmpresa: empresa ? nomeDaEmpresa(empresa) : null,
    empresaVerificada: booleano(empresa, 'empresaVerificada'),
    empresaUsuarioId: texto(empresa, 'usuarioId'),
    logoEmpresaUrl: texto(empresa, 'logo'),
    quando: tempoRelativo(texto(json, 'criadoEm'), agora),
  };
}

/** GET /vagas/:id: { vaga: {...} } */
export function vagaDetalhe(json: Json, agora: number = Date.now()): Vaga | null {
  const dados = objeto(json, 'vaga');
  return dados ? vaga(dados, agora) : null;
}

/** GET /candidaturas/minhas: { candidaturas: [{ id, status, criadoEm, vaga: { id, titulo, empresa } }] } */
export function candidaturas(json: Json, agora: number = Date.now()): Candidatura[] {
  return lista(json, 'candidaturas').map((dados) => {
    const vagaDados = objeto(dados, 'vaga');
    const empresa = objeto(vagaDados, 'empresa');
    return {
      id: texto(dados, 'id') ?? '',
      status: texto(dados, 'status'),
      quando: tempoRelativo(texto(dados, 'criadoEm'), agora),
      vagaId: vagaDados ? texto(vagaDados, 'id') : texto(dados, 'vagaId'),
      tituloVaga: texto(vagaDados, 'titulo'),
      nomeEmpresa: empresa ? nomeDaEmpresa(empresa) : null,
    };
  });
}

/** GET /notificacoes: { notificacoes: [...] } */
export function notificacoes(json: Json, agora: number = Date.now()): Notificacao[] {
  return lista(json, 'notificacoes').map((dados) => ({
    id: texto(dados, 'id') ?? '',
    tipo: texto(dados, 'tipo'),
    titulo: texto(dados, 'titulo') ?? 'Notificação',
    descricao: texto(dados, 'descricao'),
    lida: booleano(dados, 'lida'),
    quando: tempoRelativo(texto(dados, 'criadoEm'), agora),
    entidadeTipo: texto(dados, 'entidadeTipo'),
    entidadeId: texto(dados, 'entidadeId'),
    atorNome: texto(objeto(dados, 'ator'), 'nome'),
  }));
}

/** GET /dashboard/empresa ({ metricas }) junto com GET /vagas/minhas. "vagas" da API é a contagem total. */
export function resumoEmpresa(dashboard: Json, vagasMinhas: Json, agora: number = Date.now()): ResumoEmpresa {
  const metricas = objeto(dashboard, 'metricas');
  return {
    vagasPublicadas: inteiro(metricas, 'vagas'),
    vagasAbertas: inteiro(metricas, 'vagasAbertas'),
    candidaturas: inteiro(metricas, 'candidaturas'),
    seguidores: inteiro(metricas, 'seguidores'),
    vagas: vagas(vagasMinhas, agora),
  };
}

/**
 * Pessoa: GET /perfil/candidatos/usuario/:id ({ candidato }). Empresa: GET /empresas/me ({ empresa }).
 * CPF, CNPJ, endereço, CEP, currículo e necessidades de acessibilidade são ignorados de propósito.
 */
export function perfil(json: Json, empresa: boolean, agora: number = Date.now()): Perfil {
  const dados = objeto(json, empresa ? 'empresa' : 'candidato');
  const usuario = objeto(dados, 'usuario');
  const nomeDaConta = texto(usuario, 'nome');
  const vazio: Perfil = {
    tipo: empresa ? 'empresa' : 'candidato',
    usuarioId: null,
    nome: null,
    fotoUrl: null,
    detalhe: null,
    sobre: null,
    habilidades: [],
    experiencias: [],
    formacoes: [],
    statusEmpresa: null,
    empresaVerificada: false,
    culturaInclusiva: null,
    site: null,
    porte: null,
    vagasAbertas: [],
  };
  if (!dados) {
    return vazio;
  }
  const lugar = local(texto(dados, 'cidade'), texto(dados, 'estado'));
  const usuarioId = texto(dados, 'usuarioId') ?? texto(usuario, 'id');
  if (empresa) {
    const nome = nomeDaEmpresa(dados) || nomeDaConta;
    const fotoUrl = texto(dados, 'logo');
    const verificada = booleano(dados, 'empresaVerificada');
    return {
      ...vazio,
      usuarioId,
      nome,
      fotoUrl,
      detalhe: juntar(texto(dados, 'setor'), lugar),
      sobre: texto(dados, 'descricao'),
      statusEmpresa: texto(dados, 'statusAprovacao'),
      empresaVerificada: verificada,
      culturaInclusiva: texto(dados, 'culturaInclusiva'),
      site: texto(dados, 'site'),
      porte: texto(dados, 'porte'),
      vagasAbertas: lista(dados, 'vagas').map((item) => ({
        ...vaga(item, agora),
        nomeEmpresa: nome,
        empresaVerificada: verificada,
        empresaUsuarioId: usuarioId,
        logoEmpresaUrl: fotoUrl,
      })),
    };
  }
  return {
    ...vazio,
    usuarioId,
    nome: nomeDaConta,
    fotoUrl: texto(usuario, 'fotoPerfil'),
    detalhe: juntar(texto(dados, 'tituloProfissional'), lugar),
    sobre: texto(dados, 'biografia'),
    habilidades: lista(dados, 'habilidades')
      .map((item) => texto(item, 'nome')?.trim() ?? '')
      .filter((nome) => nome !== ''),
    experiencias: lista(dados, 'experiencias').map((item) => ({
      titulo: texto(item, 'cargo'),
      subtitulo: juntar(texto(item, 'empresa'), texto(item, 'local')),
      periodo: periodo(texto(item, 'dataInicio'), texto(item, 'dataFim'), booleano(item, 'atual')),
      descricao: texto(item, 'descricao'),
    })),
    formacoes: lista(dados, 'formacoes').map((item) => ({
      titulo: texto(item, 'curso'),
      subtitulo: texto(item, 'instituicao'),
      periodo: periodo(texto(item, 'dataInicio'), texto(item, 'dataFim'), booleano(item, 'emAndamento')),
      descricao: texto(item, 'descricao'),
    })),
  };
}

// --- auxiliares tolerantes a campo ausente ou null ---

function nomeDaEmpresa(empresa: Json): string | null {
  const fantasia = texto(empresa, 'nomeFantasia');
  return fantasia && fantasia.trim() !== '' ? fantasia : texto(empresa, 'razaoSocial');
}

function texto(json: Json | null, chave: string): string | null {
  const valor = json?.[chave];
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  return null;
}

function inteiro(json: Json | null, chave: string): number {
  const valor = Number(json?.[chave]);
  return Number.isFinite(valor) ? Math.trunc(valor) : 0;
}

function booleano(json: Json | null, chave: string): boolean {
  return json?.[chave] === true;
}

function objeto(json: Json | null, chave: string): Json | null {
  const valor = json?.[chave];
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Json) : null;
}

function lista(json: Json | null, chave: string): Json[] {
  const valor = json?.[chave];
  return Array.isArray(valor) ? valor.filter((item): item is Json => !!item && typeof item === 'object' && !Array.isArray(item)) : [];
}
