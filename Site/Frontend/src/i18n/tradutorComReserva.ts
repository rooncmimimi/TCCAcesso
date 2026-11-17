import { detectarIdiomaDoTexto } from "@/lib/idiomaDaFala";

import type { CodigoIdioma } from "./idiomas";
import { tradutorDoAcesso } from "./tradutorDoAcesso";
import { ErroDeTraducao, tradutorDoNavegador, type MotorDeTraducao } from "./tradutorDoNavegador";
import { tradutorOnline } from "./tradutorOnline";

/**
 * O motor que o Site usa, em três degraus, do melhor para o que nunca falta:
 *
 *   1. **O tradutor embutido do navegador**, quando está mesmo pronto. Roda no aparelho, o texto não
 *      sai dali e não tem limite nenhum. É o melhor dos três — e o mais raro.
 *   2. **O servidor do ACESSO** (DeepL, com o resultado guardado). Melhor qualidade que a reserva, e o
 *      mesmo texto só é traduzido uma vez: o próximo leitor da mesma publicação recebe do banco.
 *   3. **O serviço gratuito sem chave** (MyMemory, direto do navegador). Pior qualidade e cota
 *      pequena, mas não depende de o servidor ter chave nem de sobrar cota do mês. É a rede de
 *      segurança: enquanto ela existir, o botão "Traduzir" nunca fica sem resposta.
 *
 * **Por que a reserva existe.** O tradutor embutido é o melhor dos dois (roda no aparelho, o texto não
 * sai dele, não tem limite), mas quase nunca está pronto: medido no Chrome 152, `Translator` e
 * `LanguageDetector` existem como funções — então o Site achava que dava — e `availability()` **nunca
 * responde**. O resultado era 8 segundos de espera e a mensagem "seu navegador ainda não traduz textos
 * por si só", que mandava a pessoa usar o menu do próprio navegador. O botão "Traduzir" não traduzia.
 *
 * **Como se decide.** Antes de usar o tradutor embutido, uma sondagem curta pergunta se o par de idiomas
 * está pronto. Sem resposta rápida, ou com qualquer resposta que não seja "pronto", vai pela reserva: é
 * melhor traduzir em dois segundos por um serviço online — avisando — do que esperar minutos por um
 * modelo baixando, ou não traduzir nada. A resposta fica guardada enquanto a aba estiver aberta.
 */

/** O tradutor embutido tem que responder rápido, senão não serve: a reserva traduz enquanto ele pensa. */
export const LIMITE_DA_SONDAGEM_MS = 2_000;

/** O detector do navegador é melhor que o palpite local, mas só vale a pena se responder quase na hora. */
export const LIMITE_DO_DETECTOR_MS = 1_500;

type Disponibilidade = "unavailable" | "downloadable" | "downloading" | "available";

type ApiDoNavegador = { Translator?: { availability: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<Disponibilidade> } };

const sondagens = new Map<string, Promise<boolean>>();

/** Só para os testes: cada um começa sem saber nada sobre o tradutor do navegador. */
export function esquecerSondagens() {
  sondagens.clear();
}

function comPrazo<T>(promessa: Promise<T>, ms: number, naFalta: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const relogio = setTimeout(() => resolve(naFalta), ms);
    const responder = (valor: T) => {
      clearTimeout(relogio);
      resolve(valor);
    };

    promessa.then(responder, () => responder(naFalta));
  });
}

/** O tradutor embutido já está pronto para este par de idiomas, aqui e agora? */
export async function navegadorTraduz(origem: CodigoIdioma, destino: CodigoIdioma): Promise<boolean> {
  const chave = `${origem}>${destino}`;
  let sondagem = sondagens.get(chave);

  if (!sondagem) {
    sondagem = (async () => {
      const nativo = (globalThis as unknown as ApiDoNavegador).Translator;

      if (typeof nativo?.availability !== "function") return false;

      // "downloadable" e "downloading" significam minutos de espera no primeiro uso: a reserva é melhor.
      return (await comPrazo(nativo.availability({ sourceLanguage: origem, targetLanguage: destino }), LIMITE_DA_SONDAGEM_MS, "unavailable" as Disponibilidade)) === "available";
    })();

    sondagens.set(chave, sondagem);
  }

  return sondagem;
}

export const tradutorComReserva: MotorDeTraducao = {
  // Sempre há um caminho: sem o tradutor do navegador, a reserva assume.
  disponivel: () => true,

  async detectar(texto) {
    // O palpite local responde na hora e acerta frases nos três idiomas do Site; o detector do navegador
    // só é consultado quando ele não sabe, e mesmo assim com prazo curto (há navegadores onde ele trava).
    const local = detectarIdiomaDoTexto(texto);

    if (local) return local;

    return comPrazo(tradutorDoNavegador.detectar(texto), LIMITE_DO_DETECTOR_MS, null);
  },

  // Só sai do aparelho quando a reserva assume; com o tradutor embutido pronto, o texto fica aqui.
  saiDoAparelho: async (origem, destino) => !(await navegadorTraduz(origem, destino)),

  async traduzir(textos, origem, destino, aoPreparar) {
    if (await navegadorTraduz(origem, destino)) {
      try {
        return await tradutorDoNavegador.traduzir(textos, origem, destino, aoPreparar);
      } catch {
        // O embutido prometeu e falhou: a reserva ainda pode salvar a tradução.
        sondagens.delete(`${origem}>${destino}`);
      }
    }

    // O servidor do ACESSO traduz melhor E guarda o resultado, então é a escolha certa sempre que
    // estiver ligado. Falhar aqui não é o fim: a cota do mês pode ter acabado, o servidor pode estar
    // sem chave de tradução ou fora do ar, e em todos esses casos a reserva gratuita ainda traduz.
    if (tradutorDoAcesso.disponivel()) {
      try {
        return await tradutorDoAcesso.traduzir(textos, origem, destino, aoPreparar);
      } catch {
        // Segue para a reserva.
      }
    }

    return tradutorOnline.traduzir(textos, origem, destino, aoPreparar);
  },
};

export { ErroDeTraducao };
