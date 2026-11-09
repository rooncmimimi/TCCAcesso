/**
 * O chão comum do microfone: o reconhecimento de fala do navegador (Web Speech API), as mensagens de
 * erro em linguagem simples e o estado da permissão.
 *
 * Existe para que o ditado (`hooks/useDitado`) e os comandos de voz (`hooks/useComandoDeVoz`) tratem o
 * navegador do mesmo jeito. Os dois já tinham as mesmas falhas, cada um à sua maneira: ficavam presos em
 * "ouvindo" depois de um erro, tratavam o fim normal como falha e deixavam a leitura em voz do próprio
 * ACESSO entrando pelo microfone.
 *
 * O ACESSO **não grava áudio**: só recebe o texto reconhecido. Em Chrome e Edge é o próprio navegador que
 * manda o áudio a um serviço online para reconhecer — por isso as telas avisam, e por isso falta de
 * internet aparece como o erro `network`.
 */

import { localeDe } from "@/i18n/idiomas";
import { idiomaDoSite } from "@/lib/idiomaDaFala";

/** O mínimo da Web Speech API (`SpeechRecognition`) que o site usa. Não é padrão em todos os navegadores. */
export interface ResultadoDeFala {
  isFinal: boolean;
  0: { transcript: string };
}

export interface EventoDeResultado {
  resultIndex: number;
  results: ArrayLike<ResultadoDeFala>;
}

export interface Reconhecimento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoDeResultado) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type ConstrutorDeReconhecimento = new () => Reconhecimento;

export function construtor(): ConstrutorDeReconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorDeReconhecimento; webkitSpeechRecognition?: ConstrutorDeReconhecimento };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** O navegador oferece reconhecimento de fala? Firefox, por exemplo, não oferece. */
export function reconhecimentoDeFalaSuportado(): boolean {
  return construtor() !== null;
}

/**
 * O idioma em que o microfone vai escutar: o do site, com região ("pt-BR", "en-US", "es-ES").
 *
 * Com `<html lang>` cru o navegador recebia "pt" ou "en" sem região, e o reconhecimento do Chrome erra
 * muito mais nesse caso.
 */
export function idiomaDeEscuta(): string {
  return localeDe(idiomaDoSite());
}

export const MENSAGENS_DE_ERRO: Record<string, string> = {
  "not-allowed": "O navegador não deixou usar o microfone. Clique no cadeado ao lado do endereço do site, libere o microfone e tente de novo.",
  "service-not-allowed": "O navegador não deixou usar o reconhecimento de voz neste site.",
  "audio-capture": "Não encontramos um microfone. Confira se ele está conectado e se outro programa não está usando.",
  "no-speech": "Não ouvimos nada. Confira se o microfone certo está escolhido no navegador e tente falar mais perto dele.",
  network: "O reconhecimento de voz do navegador precisa de internet e não conseguiu se conectar. Tente de novo em instantes.",
  "language-not-supported": "O navegador não reconhece este idioma por voz.",
};

/** Mensagem de quando a escuta termina sem nada: o caso que antes não dizia coisa alguma. */
export const NADA_FOI_OUVIDO = "Não ouvimos nada. Confira se o microfone certo está escolhido no navegador e tente de novo.";

/** Mensagem de quando `start()` estoura: quase sempre uma escuta anterior que o navegador não fechou. */
export const NAO_LIGOU = "Não foi possível ligar o microfone agora. Feche outros programas que possam estar usando o microfone e tente de novo.";

/**
 * Erros em que insistir não adianta: ou falta permissão, ou falta aparelho, ou o serviço recusou. Em todos
 * eles a escuta encerra e a pessoa recebe a explicação, em vez de o site ficar tentando de novo para sempre.
 */
export const FIM_DEFINITIVO: ReadonlySet<string> = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported", "network"]);

/**
 * Solta um reconhecimento sem deixar que os avisos dele mexam no estado de uma escuta nova.
 *
 * Tirar os três tratadores antes de abortar é o que evita o caso em que o `onend` da sessão velha chega
 * depois da nova começar e desliga o microfone que a pessoa acabou de ligar.
 */
export function soltarReconhecimento(atual: Reconhecimento | null | undefined): void {
  if (!atual) return;

  atual.onresult = null;
  atual.onerror = null;
  atual.onend = null;

  try {
    atual.abort();
  } catch {
    /* Sessão já encerrada pelo navegador: não há o que abortar. */
  }
}

/**
 * Cala a leitura em voz do próprio ACESSO.
 *
 * Sem isso, a voz sai pelo alto-falante e entra direto no microfone: o reconhecimento ouve o site em vez
 * da pessoa. É o problema clássico de quem usa o computador sem fone.
 */
export function calarVozDoSite(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* Navegador sem síntese de fala: não há o que calar. */
  }
}

export type EstadoDoMicrofone = "liberado" | "negado" | "vai-perguntar" | "desconhecido";

const ESTADOS: Record<string, EstadoDoMicrofone> = { granted: "liberado", denied: "negado", prompt: "vai-perguntar" };

async function consultarPermissao(): Promise<PermissionStatus | null> {
  try {
    const permissoes = typeof navigator === "undefined" ? null : navigator.permissions;

    if (!permissoes?.query) return null;

    return await permissoes.query({ name: "microphone" as PermissionName });
  } catch {
    // Firefox não aceita consultar a permissão do microfone: `query` estoura em vez de responder.
    return null;
  }
}

/**
 * Como está a permissão do microfone, sem ligar o microfone.
 *
 * Serve para a tela avisar ANTES de a pessoa tentar: "negado" é a causa mais comum de "o ditado não
 * funciona" num navegador que suporta ditado e com internet. Onde não há como consultar, a resposta é
 * "desconhecido" — a tela não inventa nada nesse caso.
 */
export async function estadoDoMicrofone(): Promise<EstadoDoMicrofone> {
  const status = await consultarPermissao();

  return status ? (ESTADOS[status.state] ?? "desconhecido") : "desconhecido";
}

/**
 * Acompanha a permissão do microfone e avisa a cada mudança; devolve a função que para de acompanhar.
 *
 * O que isso resolve na tela: a pessoa lê o aviso, libera o microfone no navegador e o aviso sai sozinho,
 * sem precisar recarregar a página nem descobrir por tentativa.
 */
export function observarMicrofone(aoMudar: (estado: EstadoDoMicrofone) => void): () => void {
  let vivo = true;
  let status: PermissionStatus | null = null;

  void consultarPermissao().then((encontrado) => {
    if (!vivo) return;

    if (!encontrado) {
      aoMudar("desconhecido");

      return;
    }

    status = encontrado;

    const avisar = () => {
      if (vivo) aoMudar(ESTADOS[encontrado.state] ?? "desconhecido");
    };

    encontrado.onchange = avisar;
    avisar();
  });

  return () => {
    vivo = false;
    if (status) status.onchange = null;
  };
}

/** Onde liberar o microfone, no navegador de quem está lendo. Texto curto, para caber num aviso. */
export function comoLiberarOMicrofone(): string {
  const agente = typeof navigator === "undefined" ? "" : navigator.userAgent;

  if (/android/i.test(agente)) return "Toque no cadeado (ou no ícone ao lado do endereço do site), escolha Permissões e libere o microfone.";
  if (/iphone|ipad|ipod/i.test(agente)) return "Abra os Ajustes do aparelho, procure o navegador que você está usando e libere o microfone para ele.";

  return "Clique no cadeado ao lado do endereço do site, libere o microfone e recarregue a página.";
}
