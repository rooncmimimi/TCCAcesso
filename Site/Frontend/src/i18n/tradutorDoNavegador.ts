import { ehIdioma, type CodigoIdioma } from "./idiomas";

/**
 * O que o Site precisa de um motor de tradução. Existe uma implementação (o tradutor embutido do navegador) e a interface existe
 * para o hook ser testado sem navegador e para trocar o motor um dia (um serviço externo, por exemplo) sem mexer nas telas.
 */
export type MotorDeTraducao = {
  /** O navegador oferece tradução embutida? */
  disponivel: () => boolean;
  /** Em que idioma o texto está, entre os três do Site; `null` se não deu para saber (texto curto, ou sem detector). */
  detectar: (texto: string) => Promise<CodigoIdioma | null>;
  /** Traduz os textos, na mesma ordem. `aoPreparar` é chamado se for preciso baixar o modelo do idioma antes. */
  traduzir: (textos: string[], origem: CodigoIdioma, destino: CodigoIdioma, aoPreparar?: () => void) => Promise<string[]>;
};

export class ErroDeTraducao extends Error {
  constructor(
    public readonly codigo: "nao_suportado" | "par_indisponivel" | "falhou",
    mensagem?: string,
  ) {
    super(mensagem ?? codigo);
    this.name = "ErroDeTraducao";
  }
}

type Disponibilidade = "unavailable" | "downloadable" | "downloading" | "available";

type TradutorNativo = { translate: (texto: string) => Promise<string>; destroy?: () => void };
type DetectorNativo = { detect: (texto: string) => Promise<{ detectedLanguage: string; confidence: number }[]> };

type ApiDoNavegador = {
  Translator?: {
    availability: (opcoes: { sourceLanguage: string; targetLanguage: string }) => Promise<Disponibilidade>;
    create: (opcoes: { sourceLanguage: string; targetLanguage: string }) => Promise<TradutorNativo>;
  };
  LanguageDetector?: {
    create: () => Promise<DetectorNativo>;
  };
};

const api = () => globalThis as unknown as ApiDoNavegador;

/** Abaixo disso o detector erra demais (texto curto, misturado): melhor dizer "não sei" do que traduzir do idioma errado. */
const CONFIANCA_MINIMA = 0.6;
const TAMANHO_MINIMO_PARA_DETECTAR = 12;

/**
 * Quanto esperar o navegador responder. `availability()` deveria ser imediata: se não responde (há navegadores que expõem a API
 * sem o motor por trás, e a promessa nunca resolve), a tela não pode ficar presa em "Traduzindo…". Depois que o modelo está
 * disponível, traduzir leva segundos; se ainda precisa baixar o modelo do idioma, pode levar minutos.
 */
export const LIMITE_DA_DISPONIBILIDADE_MS = 8_000;
export const LIMITE_DA_DETECCAO_MS = 5_000;
export const LIMITE_DE_TRADUCAO_MS = 30_000;
export const LIMITE_COM_DOWNLOAD_MS = 180_000;

function comLimite<T>(promessa: Promise<T>, ms: number, erro: () => ErroDeTraducao): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const relogio = setTimeout(() => reject(erro()), ms);

    promessa.then(
      (valor) => {
        clearTimeout(relogio);
        resolve(valor);
      },
      (falha) => {
        clearTimeout(relogio);
        reject(falha);
      },
    );
  });
}

const tradutores = new Map<string, Promise<TradutorNativo>>();
let detector: Promise<DetectorNativo | null> | null = null;

function obterDetector(): Promise<DetectorNativo | null> {
  detector ??= (async () => {
    try {
      return (await api().LanguageDetector?.create()) ?? null;
    } catch {
      return null;
    }
  })();

  return detector;
}

/** O tradutor embutido do navegador (APIs `Translator` e `LanguageDetector` do Chrome). Roda no aparelho: o texto não sai dele. */
export const tradutorDoNavegador: MotorDeTraducao = {
  disponivel: () => typeof api().Translator?.create === "function",

  async detectar(texto) {
    if (texto.trim().length < TAMANHO_MINIMO_PARA_DETECTAR) return null;

    try {
      // Detector que não responde (ou demora) equivale a "não sei": a tradução segue com o palpite, em vez de travar.
      const resultados = await comLimite(
        obterDetector().then((detectorNativo) => detectorNativo?.detect(texto) ?? []),
        LIMITE_DA_DETECCAO_MS,
        () => new ErroDeTraducao("falhou", "o detector não respondeu"),
      );
      const [melhor] = resultados;
      const codigo = melhor?.detectedLanguage?.toLowerCase().split("-")[0];

      return melhor && melhor.confidence >= CONFIANCA_MINIMA && ehIdioma(codigo) ? codigo : null;
    } catch {
      return null;
    }
  },

  async traduzir(textos, origem, destino, aoPreparar) {
    const nativo = api().Translator;

    if (!nativo) throw new ErroDeTraducao("nao_suportado");

    const par = { sourceLanguage: origem, targetLanguage: destino };
    const disponibilidade = await comLimite(nativo.availability(par), LIMITE_DA_DISPONIBILIDADE_MS, () => new ErroDeTraducao("nao_suportado", "o navegador não respondeu"));

    if (disponibilidade === "unavailable") throw new ErroDeTraducao("par_indisponivel");
    if (disponibilidade !== "available") aoPreparar?.();

    const chave = `${origem}>${destino}`;
    let promessa = tradutores.get(chave);

    if (!promessa) {
      promessa = nativo.create(par);
      tradutores.set(chave, promessa);
      // Falha na criação não pode ficar guardada: a próxima tentativa recomeça.
      promessa.catch(() => tradutores.delete(chave));
    }

    const limite = disponibilidade === "available" ? LIMITE_DE_TRADUCAO_MS : LIMITE_COM_DOWNLOAD_MS;

    try {
      const traducoes = (async () => {
        const tradutor = await promessa;

        return Promise.all(textos.map((texto) => (texto.trim() ? tradutor.translate(texto) : Promise.resolve(texto))));
      })();

      return await comLimite(traducoes, limite, () => new ErroDeTraducao("falhou", "a tradução demorou demais"));
    } catch (erro) {
      if (erro instanceof ErroDeTraducao) throw erro;

      throw new ErroDeTraducao("falhou", erro instanceof Error ? erro.message : undefined);
    }
  },
};
