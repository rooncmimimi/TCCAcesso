import axios from "axios";

import { traduzirTextos } from "@/services/traducao.service";

import { ErroDeTraducao, type MotorDeTraducao } from "./tradutorDoNavegador";

/**
 * Tradução pelo servidor do ACESSO, que fala com a DeepL e **guarda o resultado**.
 *
 * **Por que passar pelo servidor.** Chave de API não pode morar no navegador — qualquer pessoa lê o
 * código da página —, então todo tradutor bom obriga este caminho. E, já que obriga, ele traz o
 * ganho que importa: o servidor guarda a tradução, e a mesma publicação é traduzida UMA vez por
 * idioma em vez de uma vez por leitor. Dez pessoas lendo a mesma vaga custam uma tradução.
 *
 * **O que isso muda para quem lê.** O texto passa a sair do aparelho pelo servidor do ACESSO, e não
 * direto para o tradutor. Continua saindo — por isso `saiDoAparelho` segue dizendo que sim e a
 * pessoa continua autorizando antes da primeira vez.
 *
 * **Quando este motor não serve**, quem chama cai para a reserva gratuita (ver `tradutorComReserva`):
 * servidor sem chave de tradução configurada (503), cota do mês esgotada (429) ou servidor fora do
 * ar. Nunca é a última palavra.
 */

/** Um pedido só, com o lote inteiro; o servidor fala com a DeepL de uma vez. */
export const LIMITE_DO_PEDIDO_MS = 20_000;

/** O servidor diz que a tradução não está configurada ali: nem adianta tentar de novo nesta aba. */
let desligadoNoServidor = false;

/** Só para os testes: volta a achar que o servidor pode traduzir. */
export function esquecerEstadoDoServidor(): void {
  desligadoNoServidor = false;
}

/** Traduz o status HTTP no motivo que a tela sabe explicar. */
function erroDoStatus(status: number | undefined): ErroDeTraducao {
  if (status === 429) return new ErroDeTraducao("limite_diario");
  if (status === 400 || status === 413) return new ErroDeTraducao("texto_longo");
  if (status === undefined) return new ErroDeTraducao("sem_rede");

  return new ErroDeTraducao("falhou", `o servidor respondeu ${status}`);
}

export const tradutorDoAcesso: MotorDeTraducao = {
  // Enquanto o servidor não disser que não traduz, vale tentar.
  disponivel: () => !desligadoNoServidor,

  // Quem detecta o idioma é o palpite local, em `tradutorComReserva`.
  detectar: async () => null,

  // Passa pelo servidor do ACESSO, mas sai do aparelho do mesmo jeito: a pessoa precisa saber.
  saiDoAparelho: async () => true,

  async traduzir(textos, origem, destino) {
    if (desligadoNoServidor) throw new ErroDeTraducao("falhou", "tradução desligada no servidor");

    try {
      const resposta = await traduzirTextos(textos, origem, destino);

      // Veio menos texto do que foi mandado: usar isso trocaria a tradução de um pelo do outro.
      if (resposta.textos.length !== textos.length) throw new ErroDeTraducao("falhou", "resposta incompleta");

      return resposta.textos;
    } catch (erro) {
      if (erro instanceof ErroDeTraducao) throw erro;

      const status = axios.isAxiosError(erro) ? erro.response?.status : undefined;

      // 503 é "este servidor não tem tradução configurada", e isso não muda enquanto a aba existir:
      // continuar perguntando só atrasaria a reserva em todo clique seguinte.
      if (status === 503) desligadoNoServidor = true;

      throw erroDoStatus(status);
    }
  },
};
