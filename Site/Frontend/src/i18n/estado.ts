import { ehIdioma, IDIOMA_PADRAO, IDIOMAS, type Idioma } from "./tipos";

/**
 * Estado global do idioma, fora do React.
 *
 * Fica fora de um contexto de propósito: há texto que precisa do idioma onde não há componente
 * (títulos de página, avisos disparados por serviços, formatadores de data). `useIdioma` assina
 * este estado com `useSyncExternalStore`, então os componentes ainda se atualizam na troca — e
 * trocar de idioma **não** remonta a árvore, para ninguém perder o que já digitou num formulário.
 *
 * A escolha vale por navegador (`localStorage`). Com a pessoa logada, o `SessaoProvider` também a
 * guarda na conta, para e-mails e outros dispositivos seguirem o mesmo idioma.
 */
export const CHAVE_IDIOMA = "acesso:idioma";

function lerSalvo(): Idioma {
  try {
    const salvo = window.localStorage.getItem(CHAVE_IDIOMA);
    if (ehIdioma(salvo)) return salvo;
  } catch {
    // Sem acesso ao armazenamento (modo privado, bloqueio): segue com o padrão.
  }
  return IDIOMA_PADRAO;
}

let atual: Idioma = typeof window === "undefined" ? IDIOMA_PADRAO : lerSalvo();
const ouvintes = new Set<() => void>();
const aoMudar = new Set<(novo: Idioma) => void>();

function aplicarNoDocumento(idioma: Idioma) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = IDIOMAS.find((i) => i.codigo === idioma)?.htmlLang ?? "pt-BR";
}

aplicarNoDocumento(atual);

export function obterIdioma(): Idioma {
  return atual;
}

/**
 * Troca o idioma. `origem: "conta"` é a troca que veio do servidor (login): não precisa voltar ao
 * servidor, então não dispara os avisos de "o usuário escolheu".
 */
export function definirIdioma(novo: Idioma, origem: "usuario" | "conta" = "usuario") {
  if (novo === atual) return;
  atual = novo;

  try {
    window.localStorage.setItem(CHAVE_IDIOMA, novo);
  } catch {
    // Não persistir não impede de usar o idioma até fechar a aba.
  }

  aplicarNoDocumento(novo);
  ouvintes.forEach((ouvinte) => ouvinte());
  if (origem === "usuario") aoMudar.forEach((cb) => cb(novo));
}

export function assinarIdioma(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Registra quem precisa saber quando a pessoa escolhe outro idioma (ex.: gravar na conta). */
export function aoEscolherIdioma(cb: (novo: Idioma) => void) {
  aoMudar.add(cb);
  return () => {
    aoMudar.delete(cb);
  };
}
