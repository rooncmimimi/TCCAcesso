/**
 * Comandos de voz do ACESSO: transforma o que o reconhecimento de fala ouviu em uma ação conhecida.
 *
 * Princípios:
 *  - **Lista fechada.** Só frases reconhecidas fazem alguma coisa; o resto vira "não entendi", nunca um palpite.
 *  - **Nada destrutivo por voz.** Excluir, apagar, enviar, publicar e sair da conta são recusados, com a
 *    explicação de que isso se faz com as mãos, em uma tela de confirmação.
 *  - **Candidatar-me só abre** o diálogo de candidatura; o envio continua exigindo a revisão e o aceite na tela.
 *
 * Funções puras. Quem ouve e executa é `components/acessibilidade/ComandosDeVoz.tsx`.
 */

export type Comando =
  | { tipo: "navegar"; para: string; descricao: string }
  | { tipo: "voltar" }
  | { tipo: "proxima-pagina" }
  | { tipo: "pesquisar-vagas"; termo: string }
  | { tipo: "candidatar" }
  | { tipo: "preferencia"; chave: "readingMode" | "focusMode"; valor: boolean; descricao: string }
  | { tipo: "parar-leitura" }
  | { tipo: "atalhos" }
  | { tipo: "recusado"; motivo: string }
  | { tipo: "desconhecido" };

export type ContextoDeVoz = { autenticado: boolean; tipoDeUsuario: string | null };

/** Minúsculas, sem acento, sem pontuação e com espaços simples. */
export function normalizarFala(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PALAVRAS_DESTRUTIVAS = /\b(excluir|exclua|apagar|apague|deletar|delete|remover|remova|enviar|envie|publicar|publique|encerrar conta|desativar conta|sair da conta|sair do site|logout)\b/;

const palavra = (fala: string, termo: string) => new RegExp(`\\b${termo}\\b`).test(fala);

type Rota = { termos: string[]; para: string; descricao: string; privada: boolean };

const ROTAS: readonly Rota[] = [
  { termos: ["minha acessibilidade"], para: "/minha-acessibilidade", descricao: "Minha Acessibilidade", privada: true },
  { termos: ["configuracoes de acessibilidade", "configuracao de acessibilidade", "preferencias de acessibilidade"], para: "/configuracoes/acessibilidade", descricao: "as configurações de acessibilidade", privada: false },
  { termos: ["configuracoes", "configuracao"], para: "/configuracoes", descricao: "as configurações", privada: true },
  { termos: ["mensagens", "mensagem", "conversas"], para: "/mensagens", descricao: "as mensagens", privada: true },
  { termos: ["notificacoes", "notificacao", "avisos"], para: "/notificacoes", descricao: "as notificações", privada: true },
  { termos: ["perfil"], para: "/perfil", descricao: "o seu perfil", privada: true },
  { termos: ["inicio", "feed", "publicacoes"], para: "/feed", descricao: "o início", privada: true },
  { termos: ["objetivos", "o que quero fazer", "o que eu quero fazer"], para: "/objetivos", descricao: "os objetivos", privada: false },
  { termos: ["profissoes", "dicionario de profissoes", "dicionario"], para: "/profissoes", descricao: "o dicionário de profissões", privada: false },
  { termos: ["comunicacao", "cartoes", "frases prontas"], para: "/comunicacao", descricao: "a central de comunicação", privada: false },
  { termos: ["simulador", "treino", "treinar"], para: "/simulador", descricao: "o simulador", privada: true },
  { termos: ["vagas", "vaga", "empregos"], para: "/vagas", descricao: "as vagas", privada: false },
];

const FRASES_VOLTAR = ["voltar", "volte", "volta", "pagina anterior", "voltar pagina", "voltar para tras"];
const FRASES_PROXIMA = ["proxima pagina", "proxima", "pagina seguinte", "avancar pagina", "avancar"];
const FRASES_PARAR = ["parar leitura", "parar de ler", "pare de ler", "pare a leitura", "parar a leitura", "silencio", "pare"];
const FRASES_ATALHOS = ["atalhos", "mostrar atalhos", "ver atalhos", "ajuda de atalhos", "lista de atalhos"];

/** Termo que a pessoa quer pesquisar: o que vem depois de "pesquisar vagas de/para/em...". */
function termoDaPesquisa(fala: string): string | null {
  // Cada palavrinha opcional só conta se for uma palavra inteira ("pesquisar atendente" não pode perder o "a" de "atendente").
  const m = fala.match(/^(?:pesquisar|pesquise|buscar|busque|procurar|procure)(?: por(?= |$))?(?: (?:as|os|a|o)(?= ))?(?: vagas?(?= |$))?(?: (?:de|para|em|por|com|na|no)(?= ))? ?(.*)$/);

  if (!m) return null;

  return m[1].trim().slice(0, 80);
}

export function interpretarComando(falaOriginal: string, contexto: ContextoDeVoz): Comando {
  const fala = normalizarFala(falaOriginal);

  if (!fala) return { tipo: "desconhecido" };

  if (PALAVRAS_DESTRUTIVAS.test(fala)) {
    return { tipo: "recusado", motivo: "Por segurança, excluir, apagar, enviar e publicar não são feitos por voz. Faça isso com as mãos, na tela de confirmação." };
  }

  if (FRASES_PARAR.includes(fala)) return { tipo: "parar-leitura" };
  if (FRASES_VOLTAR.includes(fala)) return { tipo: "voltar" };
  if (FRASES_PROXIMA.includes(fala)) return { tipo: "proxima-pagina" };
  if (FRASES_ATALHOS.includes(fala)) return { tipo: "atalhos" };

  const termo = termoDaPesquisa(fala);

  if (termo !== null) return termo ? { tipo: "pesquisar-vagas", termo } : { tipo: "navegar", para: "/vagas", descricao: "as vagas" };

  if (/\b(candidatar|candidatura)\b/.test(fala) && /\b(me|candidatar|quero)\b/.test(fala) && !/\b(minhas|acompanhar)\b/.test(fala)) return { tipo: "candidatar" };

  const modo = fala.match(/^(?:(ativar|ligar|colocar|usar)|(desativar|desligar|sair do|tirar))(?: o)? modo (leitura|foco)$/);

  if (modo) {
    const ligar = Boolean(modo[1]);
    const nome = modo[3] === "leitura" ? "leitura" : "foco";

    return { tipo: "preferencia", chave: nome === "leitura" ? "readingMode" : "focusMode", valor: ligar, descricao: `${ligar ? "Modo" : "Saindo do modo"} ${nome}` };
  }

  // Navegação: "ir para vagas", "abrir meu perfil", "mensagens"...
  const verbo = /^(?:ir|va|vai|abrir|abra|abre|mostrar|mostre|quero ver|ver|levar|me leve)\b/.test(fala);
  const curta = fala.split(" ").length <= 3;

  if (verbo || curta) {
    for (const rota of ROTAS) {
      if (rota.privada && !contexto.autenticado) continue;
      if (rota.termos.some((t) => (t.includes(" ") ? fala.includes(t) : palavra(fala, t)))) return { tipo: "navegar", para: rota.para, descricao: rota.descricao };
    }
  }

  return { tipo: "desconhecido" };
}

/** Exemplos mostrados para a pessoa saber o que pode dizer. */
export const EXEMPLOS_DE_COMANDOS: readonly string[] = [
  "“Ir para vagas”",
  "“Abrir meu perfil”",
  "“Abrir mensagens”",
  "“Pesquisar vagas de atendente”",
  "“Próxima página”",
  "“Voltar”",
  "“Candidatar-me” (só abre a candidatura)",
  "“Ativar modo leitura” / “Ativar modo foco”",
  "“Parar leitura”",
  "“Mostrar atalhos”",
];
