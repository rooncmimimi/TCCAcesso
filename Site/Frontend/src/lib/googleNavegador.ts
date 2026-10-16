/**
 * O que este navegador guarda do fluxo "Continuar com Google" (achado 3 da auditoria).
 *
 * **O vínculo com o navegador.** O retorno do Google é uma navegação comum: quem receber aquele
 * endereço (um link colado, o histórico, um registro) poderia usá-lo no próprio navegador e entrar
 * na conta de outra pessoa, ou fazer a vítima entrar na conta do atacante (login CSRF). Para isso
 * não bastar, a cada clique no botão:
 *
 * 1. nasce um segredo aleatório de 256 bits, guardado no `sessionStorage` desta aba e nunca enviado
 *    ao servidor até o fim do fluxo;
 * 2. só o **SHA-256** dele vai ao servidor, na ida (`/auth/google/iniciar?vinculo=`), e é gravado
 *    dentro do código de entrega;
 * 3. na volta, o Site apresenta o segredo junto com o código, e o servidor confere que um é o hash
 *    do outro. Sem o segredo, o código não serve.
 *
 * **A prova do Google.** Quando a pessoa ainda não tem conta, o servidor devolve uma prova assinada
 * ("este `sub` e este e-mail foram verificados pelo Google"), que acompanha o cadastro. Ela fica no
 * `sessionStorage` — nunca na URL — e expira em 15 minutos.
 *
 * `sessionStorage` é por aba: abrir o link em outra aba ou outro navegador não leva o segredo junto,
 * e é justamente esse o ponto. Quando o armazenamento não está disponível (modo restrito, política
 * do navegador), o fluxo **não começa**: sem o segredo, não há como amarrar o retorno.
 */

const CHAVE_VINCULO = "acesso:google:vinculo";
const CHAVE_PROVA = "acesso:google:prova";

const SEM_SUPORTE =
  "Este navegador não deixa o ACESSO entrar com o Google com segurança (armazenamento da aba ou criptografia bloqueados). Entre com e-mail e senha ou use outro navegador.";

/** Erro do próprio navegador, com mensagem pronta para a pessoa (e não uma resposta do servidor). */
export class ErroGoogleNavegador extends Error {
  constructor(mensagem: string = SEM_SUPORTE) {
    super(mensagem);
    this.name = "ErroGoogleNavegador";
  }
}

function guardaDaAba(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function ler(chave: string): string | null {
  try {
    return guardaDaAba()?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string): boolean {
  try {
    const guarda = guardaDaAba();
    if (!guarda) return false;
    guarda.setItem(chave, valor);
    return true;
  } catch {
    return false;
  }
}

function apagar(chave: string): void {
  try {
    guardaDaAba()?.removeItem(chave);
  } catch {
    // Sem armazenamento, não há o que apagar.
  }
}

/** Base64 "da URL", sem preenchimento: o mesmo formato que o servidor usa para o hash. */
export function emBase64Url(bytes: Uint8Array): string {
  let texto = "";
  for (const byte of bytes) texto += String.fromCharCode(byte);
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 do segredo, em base64url (sempre 43 caracteres). É o que o servidor guarda no código. */
export async function hashDoVinculo(segredo: string): Promise<string> {
  const resumo = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(segredo));
  return emBase64Url(new Uint8Array(resumo));
}

/**
 * Começa um fluxo: gera o segredo, guarda-o nesta aba e devolve o hash para ir ao servidor. Um
 * clique novo sempre substitui o segredo anterior — só o fluxo mais recente é válido.
 */
export async function prepararVinculo(): Promise<string> {
  const cripto = typeof window !== "undefined" ? window.crypto : undefined;
  if (!cripto?.subtle || typeof cripto.getRandomValues !== "function") {
    throw new ErroGoogleNavegador();
  }

  const segredo = emBase64Url(cripto.getRandomValues(new Uint8Array(32)));
  if (!gravar(CHAVE_VINCULO, segredo)) {
    throw new ErroGoogleNavegador();
  }

  return hashDoVinculo(segredo);
}

/** O segredo do fluxo em andamento nesta aba, ou `null` se este navegador não começou nenhum. */
export function lerVinculo(): string | null {
  return ler(CHAVE_VINCULO);
}

/** Esquece o segredo: o fluxo terminou (com sucesso ou não) e o código não tem mais o que provar. */
export function limparVinculo(): void {
  apagar(CHAVE_VINCULO);
}

/**
 * O código de entrega que o backend deixa no **fragmento** da URL (`#codigo=`), ou `undefined`. O
 * fragmento não é enviado a servidor nenhum, nem aos logs da hospedagem.
 */
export function lerCodigoDoFragmento(): string | undefined {
  try {
    return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("codigo") || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Tira da barra de endereço o código (do fragmento e da query) e as chaves da query indicadas, sem
 * recarregar a página nem mexer no histórico do roteador. O código traz e-mail e nome do Google, e
 * não há por que deixá-lo no histórico do navegador.
 */
export function tirarCodigoDaUrl(chavesDaQuery: string[] = ["codigo"]): void {
  try {
    const url = new URL(window.location.href);
    const noFragmento = new URLSearchParams(url.hash.replace(/^#/, "")).has("codigo");
    const naQuery = chavesDaQuery.filter((chave) => url.searchParams.has(chave));
    if (!noFragmento && naQuery.length === 0) return;

    for (const chave of naQuery) url.searchParams.delete(chave);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  } catch {
    // Sem History API: segue com o código na barra, que é como era.
  }
}

/**
 * Lê o corpo de um JWT **sem verificar a assinatura** — só para mostrar nome e e-mail e saber quando
 * o token vence. Quem confere a assinatura é o servidor, quando o token volta.
 *
 * O corpo é UTF-8 em base64url; decodificar só com `atob` estraga acentos ("José" viraria "JosÃ©").
 */
export function corpoDoToken(token: string): Record<string, unknown> | null {
  try {
    const corpo = token.split(".")[1];
    if (!corpo) return null;

    const binario = atob(corpo.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binario, (letra) => letra.charCodeAt(0));
    const json: unknown = JSON.parse(new TextDecoder().decode(bytes));

    return json !== null && typeof json === "object" ? (json as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Guarda a prova do Google para o cadastro. `false` quando o armazenamento da aba não deixou. */
export function guardarProva(prova: string): boolean {
  return gravar(CHAVE_PROVA, prova);
}

/** A prova guardada, se ainda estiver dentro da validade; uma vencida ou ilegível é descartada. */
export function lerProva(): string | null {
  const prova = ler(CHAVE_PROVA);
  if (!prova) return null;

  const expiraEm = corpoDoToken(prova)?.exp;
  if (typeof expiraEm !== "number" || expiraEm * 1000 <= Date.now()) {
    limparProva();
    return null;
  }

  return prova;
}

export function limparProva(): void {
  apagar(CHAVE_PROVA);
}
