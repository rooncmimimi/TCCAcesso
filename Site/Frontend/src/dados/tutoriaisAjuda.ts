/**
 * Os tutoriais da Central de Ajuda (`/ajuda`), separados por público: candidatos e empresas. Os que
 * servem aos dois (entrar, acessibilidade) aparecem nas duas áreas.
 *
 * A ordem desta lista é a ordem em que aparecem, e é a do "anterior / próximo" dentro de cada área.
 *
 * Aqui ficam as CHAVES de texto, não o texto: quem traduz é a tela, no idioma do momento.
 *
 * **O texto de cada passo se basta.** O print mostra onde a coisa fica; quem não o enxerga (leitor de
 * tela, imagem que não carregou) não perde nenhuma instrução. O `alt` descreve o que aparece na tela.
 *
 * Os prints são das telas reais do Site, com dados inventados, um conjunto por idioma
 * (`src/assets/ajuda/<idioma>/`). Quando uma tela mudar, `npm run ajuda:prints` tira todos de novo
 * (veja `scripts/prints-da-ajuda/`); aqui só se cita o nome do arquivo.
 */
import {
  Accessibility,
  Briefcase,
  Building2,
  ClipboardList,
  HandHelping,
  Hourglass,
  Inbox,
  KeyRound,
  ListChecks,
  LogIn,
  Megaphone,
  Store,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import medidas from "@/assets/ajuda/medidas.json";
import type { ChaveBase } from "@/i18n/dicionarios";
import type { CodigoIdioma } from "@/i18n/idiomas";


export const PUBLICOS = ["candidato", "empresa"] as const;

export type Publico = (typeof PUBLICOS)[number];

export const TEMAS_DE_AJUDA = [
  "conta",
  "perfil",
  "vagas",
  "candidaturas",
  "adaptacoes",
  "empresa",
  "aprovacao",
  "publicar-vaga",
  "gerenciar-vagas",
  "candidaturas-recebidas",
  "perfil-empresa",
  "entrar",
  "acessibilidade",
  "google",
] as const;

/** Em que parte da área o tutorial aparece. */
export const CATEGORIAS = ["comecar", "usar", "conta"] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export type TemaDeAjuda = (typeof TEMAS_DE_AJUDA)[number];

/** O print de um passo: o nome do arquivo (igual nos três idiomas) e a descrição dele. */
export type PrintDoPasso = { nome: string; alt: ChaveBase };

const ARQUIVOS = import.meta.glob<string>("../assets/ajuda/*/*.webp", { eager: true, query: "?url", import: "default" });
const MEDIDAS = medidas as unknown as Record<CodigoIdioma, Record<string, [number, number]>>;

/** O arquivo daquele print no idioma da tela, com as medidas que reservam o espaço antes de carregar. */
export function imagemDoPrint(nome: string, idioma: CodigoIdioma): { src: string; largura: number; altura: number } {
  const src = ARQUIVOS[`../assets/ajuda/${idioma}/${nome}.webp`];
  const medida = MEDIDAS[idioma]?.[nome];
  if (!src || !medida) throw new Error(`print ausente: ${idioma}/${nome} (rode npm run ajuda:prints)`);
  return { src, largura: medida[0], altura: medida[1] };
}

export type PassoDoTutorial = { texto: ChaveBase; print?: PrintDoPasso };

/** Para onde o botão do fim do tutorial leva. */
export type RotaDoTutorial =
  | "/cadastro/candidato"
  | "/entrar"
  | "/configuracoes/acessibilidade"
  | "/vagas"
  | "/cadastro/empresa"
  | "/dashboard/empresa"
  | "/dashboard/candidato"
  | "/minha-acessibilidade"
  | "/perfil";

export type Tutorial = {
  tema: TemaDeAjuda;
  publicos: readonly Publico[];
  categoria: Categoria;
  titulo: ChaveBase;
  resumo: ChaveBase;
  icone: LucideIcon;
  /** O que a pessoa precisa ter em mãos antes de começar. */
  antes?: readonly ChaveBase[];
  passos: readonly PassoDoTutorial[];
  /** Observação mostrada depois dos passos. */
  observacao?: ChaveBase;
  acao: { para: RotaDoTutorial; rotulo: ChaveBase };
};

const print = (nome: string, alt: ChaveBase): PrintDoPasso => ({ nome, alt });

export const TUTORIAIS: readonly Tutorial[] = [
  {
    tema: "conta",
    publicos: ["candidato"],
    categoria: "comecar",
    antes: ["ajuda.antes.emailQueVoceAcessa", "ajuda.antes.cpf"],
    titulo: "ajuda.conta.titulo",
    resumo: "ajuda.conta.resumo",
    icone: UserPlus,
    passos: [
      { texto: "ajuda.conta.passo1", print: print("conta-1-inicio", "ajuda.conta.passo1Alt") },
      { texto: "ajuda.conta.passo2", print: print("conta-2-dados-de-acesso", "ajuda.conta.passo2Alt") },
      { texto: "ajuda.conta.passo3", print: print("conta-3-dados-pessoais", "ajuda.conta.passo3Alt") },
    ],
    acao: { para: "/cadastro/candidato", rotulo: "ajuda.conta.acao" },
  },
  {
    tema: "perfil",
    publicos: ["candidato"],
    categoria: "comecar",
    antes: ["ajuda.antes.curriculo"],
    titulo: "ajuda.perfil.titulo",
    resumo: "ajuda.perfil.resumo",
    icone: UserRound,
    passos: [
      { texto: "ajuda.perfil.passo1", print: print("perfil-1-importar", "ajuda.perfil.passo1Alt") },
      { texto: "ajuda.perfil.passo2", print: print("perfil-2-arquivo", "ajuda.perfil.passo2Alt") },
      { texto: "ajuda.perfil.passo3" },
    ],
    acao: { para: "/perfil", rotulo: "ajuda.perfil.acao" },
  },
  {
    tema: "vagas",
    publicos: ["candidato"],
    categoria: "usar",
    titulo: "ajuda.vagas.titulo",
    resumo: "ajuda.vagas.resumo",
    icone: Briefcase,
    passos: [
      { texto: "ajuda.vagas.passo1", print: print("vagas-1-lista", "ajuda.vagas.passo1Alt") },
      { texto: "ajuda.vagas.passo2", print: print("vagas-2-abrir", "ajuda.vagas.passo2Alt") },
      { texto: "ajuda.vagas.passo3", print: print("vagas-3-candidatura", "ajuda.vagas.passo3Alt") },
    ],
    acao: { para: "/vagas", rotulo: "ajuda.vagas.acao" },
  },
  {
    tema: "candidaturas",
    publicos: ["candidato"],
    categoria: "usar",
    titulo: "ajuda.candidaturas.titulo",
    resumo: "ajuda.candidaturas.resumo",
    icone: ClipboardList,
    passos: [
      { texto: "ajuda.candidaturas.passo1", print: print("candidaturas-1-painel", "ajuda.candidaturas.passo1Alt") },
      { texto: "ajuda.candidaturas.passo2" },
      { texto: "ajuda.candidaturas.passo3" },
    ],
    acao: { para: "/dashboard/candidato", rotulo: "ajuda.candidaturas.acao" },
  },
  {
    tema: "adaptacoes",
    publicos: ["candidato"],
    categoria: "usar",
    titulo: "ajuda.adaptacoes.titulo",
    resumo: "ajuda.adaptacoes.resumo",
    icone: HandHelping,
    passos: [
      { texto: "ajuda.adaptacoes.passo1", print: print("adaptacoes-1-pagina", "ajuda.adaptacoes.passo1Alt") },
      { texto: "ajuda.adaptacoes.passo2", print: print("adaptacoes-2-salvar", "ajuda.adaptacoes.passo2Alt") },
      { texto: "ajuda.adaptacoes.passo3" },
    ],
    acao: { para: "/minha-acessibilidade", rotulo: "ajuda.adaptacoes.acao" },
  },
  {
    tema: "empresa",
    publicos: ["empresa"],
    categoria: "comecar",
    antes: ["ajuda.antes.contaDeCandidato", "ajuda.antes.cnpj", "ajuda.antes.emailDaEmpresa"],
    titulo: "ajuda.empresa.titulo",
    resumo: "ajuda.empresa.resumo",
    icone: Building2,
    passos: [
      { texto: "ajuda.empresa.passo1", print: print("empresa-1-inicio", "ajuda.empresa.passo1Alt") },
      { texto: "ajuda.empresa.passo2", print: print("empresa-2-escolha", "ajuda.empresa.passo2Alt") },
      { texto: "ajuda.empresa.passo3", print: print("empresa-3-dados", "ajuda.empresa.passo3Alt") },
      { texto: "ajuda.empresa.passo4" },
    ],
    acao: { para: "/cadastro/empresa", rotulo: "ajuda.empresa.acao" },
  },
  {
    tema: "aprovacao",
    publicos: ["empresa"],
    categoria: "comecar",
    titulo: "ajuda.aprovacao.titulo",
    resumo: "ajuda.aprovacao.resumo",
    icone: Hourglass,
    passos: [
      { texto: "ajuda.aprovacao.passo1", print: print("aprovacao-1-analise", "ajuda.aprovacao.passo1Alt") },
      { texto: "ajuda.aprovacao.passo2" },
    ],
    acao: { para: "/dashboard/empresa", rotulo: "ajuda.aprovacao.acao" },
  },
  {
    tema: "publicar-vaga",
    publicos: ["empresa"],
    categoria: "usar",
    antes: ["ajuda.antes.empresaAprovada"],
    titulo: "ajuda.publicarVaga.titulo",
    resumo: "ajuda.publicarVaga.resumo",
    icone: Megaphone,
    passos: [
      { texto: "ajuda.publicarVaga.passo1", print: print("vaga-1-painel", "ajuda.publicarVaga.passo1Alt") },
      { texto: "ajuda.publicarVaga.passo2", print: print("vaga-2-formulario", "ajuda.publicarVaga.passo2Alt") },
    ],
    acao: { para: "/dashboard/empresa", rotulo: "ajuda.publicarVaga.acao" },
  },
  {
    tema: "gerenciar-vagas",
    publicos: ["empresa"],
    categoria: "usar",
    titulo: "ajuda.gerenciarVagas.titulo",
    resumo: "ajuda.gerenciarVagas.resumo",
    icone: ListChecks,
    passos: [
      { texto: "ajuda.gerenciarVagas.passo1", print: print("gerenciar-1-acoes", "ajuda.gerenciarVagas.passo1Alt") },
      { texto: "ajuda.gerenciarVagas.passo2" },
      { texto: "ajuda.gerenciarVagas.passo3" },
    ],
    acao: { para: "/dashboard/empresa", rotulo: "ajuda.gerenciarVagas.acao" },
  },
  {
    tema: "candidaturas-recebidas",
    publicos: ["empresa"],
    categoria: "usar",
    titulo: "ajuda.recebidas.titulo",
    resumo: "ajuda.recebidas.resumo",
    icone: Inbox,
    passos: [
      { texto: "ajuda.recebidas.passo1", print: print("recebidas-1-lista", "ajuda.recebidas.passo1Alt") },
      { texto: "ajuda.recebidas.passo2" },
      { texto: "ajuda.recebidas.passo3" },
    ],
    acao: { para: "/dashboard/empresa", rotulo: "ajuda.recebidas.acao" },
  },
  {
    tema: "perfil-empresa",
    publicos: ["empresa"],
    categoria: "usar",
    antes: ["ajuda.antes.empresaAprovada"],
    titulo: "ajuda.perfilEmpresa.titulo",
    resumo: "ajuda.perfilEmpresa.resumo",
    icone: Store,
    passos: [
      { texto: "ajuda.perfilEmpresa.passo1", print: print("perfilempresa-1-pagina", "ajuda.perfilEmpresa.passo1Alt") },
      { texto: "ajuda.perfilEmpresa.passo2" },
    ],
    acao: { para: "/perfil", rotulo: "ajuda.perfilEmpresa.acao" },
  },
  {
    tema: "entrar",
    publicos: ["candidato", "empresa"],
    categoria: "conta",
    titulo: "ajuda.entrar.titulo",
    resumo: "ajuda.entrar.resumo",
    icone: KeyRound,
    passos: [
      { texto: "ajuda.entrar.passo1", print: print("entrar-1-login", "ajuda.entrar.passo1Alt") },
      { texto: "ajuda.entrar.passo2", print: print("entrar-2-esqueci", "ajuda.entrar.passo2Alt") },
      { texto: "ajuda.entrar.passo3", print: print("entrar-3-recuperar", "ajuda.entrar.passo3Alt") },
    ],
    acao: { para: "/entrar", rotulo: "ajuda.entrar.acao" },
  },
  {
    tema: "acessibilidade",
    publicos: ["candidato", "empresa"],
    categoria: "conta",
    titulo: "ajuda.acessibilidade.titulo",
    resumo: "ajuda.acessibilidade.resumo",
    icone: Accessibility,
    passos: [
      { texto: "ajuda.acessibilidade.passo1", print: print("acessibilidade-1-inicio", "ajuda.acessibilidade.passo1Alt") },
      { texto: "ajuda.acessibilidade.passo2", print: print("acessibilidade-2-painel", "ajuda.acessibilidade.passo2Alt") },
    ],
    acao: { para: "/configuracoes/acessibilidade", rotulo: "ajuda.acessibilidade.acao" },
  },
  {
    tema: "google",
    publicos: ["candidato"],
    categoria: "conta",
    titulo: "ajuda.google.titulo",
    resumo: "ajuda.google.resumo",
    icone: LogIn,
    // Os mesmos passos do tutorial que aparece quando o Google ainda não está vinculado.
    passos: [
      { texto: "retorno-google.tutorialPasso1", print: print("google-1-entrar", "retorno-google.tutorialPasso1Alt") },
      { texto: "retorno-google.tutorialPasso2", print: print("google-2-contas", "retorno-google.tutorialPasso2Alt") },
      { texto: "retorno-google.tutorialPasso3", print: print("google-3-senha", "retorno-google.tutorialPasso3Alt") },
      { texto: "retorno-google.tutorialPasso4" },
    ],
    observacao: "retorno-google.tutorialSoCandidato",
    acao: { para: "/entrar", rotulo: "ajuda.google.acao" },
  },
];

/** Os tutoriais de uma área, na ordem em que aparecem. */
export function tutoriaisDe(publico: Publico): readonly Tutorial[] {
  return TUTORIAIS.filter((t) => t.publicos.includes(publico));
}

/** O caminho sugerido para quem está chegando, em cada área. */
export const COMECE_POR_AQUI: Record<Publico, readonly TemaDeAjuda[]> = {
  candidato: ["conta", "perfil", "vagas", "candidaturas"],
  empresa: ["empresa", "aprovacao", "publicar-vaga", "candidaturas-recebidas"],
};
