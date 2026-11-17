import { createHash } from "node:crypto";

import { Op } from "sequelize";

import env from "../config/env.js";
import { Traducao } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import DeepLService, { IDIOMAS_ACEITOS } from "./DeepLService.js";

/**
 * Tradução de conteúdo público, com o que já foi traduzido guardado no banco.
 *
 * **O cache é o ponto.** Antes, cada leitor que clicava em "Traduzir" pagava uma tradução nova do
 * mesmo texto: dez pessoas lendo a mesma vaga custavam dez traduções. Aqui o mesmo texto é
 * traduzido UMA vez por idioma e servido do banco daí em diante. É o que faz 500 mil caracteres por
 * mês sobrarem com folga larga.
 *
 * **A chave é o hash do texto**, não o id da publicação: editar o conteúdo muda o hash, a linha
 * velha deixa de ser encontrada e ninguém vê tradução desatualizada. Não existe invalidação para
 * esquecer de fazer.
 *
 * **Só conteúdo público passa por aqui** (publicação, comentário, vaga). Cache compartilhado e
 * mensagem privada não combinam: se um dia alguém quiser traduzir conversa, esta é exatamente a
 * parte que não dá para reaproveitar.
 */

/** O motor que traduziu. Guardado na linha para saber de onde veio uma tradução ruim. */
const MOTOR = "deepl";

/** A chave de busca de um texto: mesma origem, mesmo destino e mesmo texto dão a mesma linha. */
export function hashDoTexto(texto, origem, destino) {
    return createHash("sha256").update(`${origem}|${destino}|${texto}`).digest("hex");
}

class TraducaoService {
    disponivel() {
        return DeepLService.disponivel();
    }

    /** Recusa cedo o que não dá para traduzir, com a razão exata em vez de um "não deu". */
    validar({ textos, origem, destino }) {
        if (!Array.isArray(textos) || textos.length === 0) throw ErroApi.requisicaoInvalida("Nenhum texto para traduzir.");
        if (textos.some((texto) => typeof texto !== "string")) throw ErroApi.requisicaoInvalida("Cada texto precisa ser uma cadeia de caracteres.");
        if (textos.length > env.deepl.maximoDeTextos) throw ErroApi.requisicaoInvalida("Textos demais num pedido só.");

        if (!IDIOMAS_ACEITOS.includes(origem) || !IDIOMAS_ACEITOS.includes(destino)) {
            throw ErroApi.requisicaoInvalida("Idioma não aceito pela tradução.");
        }

        if (origem === destino) throw ErroApi.requisicaoInvalida("O texto já está no idioma pedido.");

        const total = textos.reduce((soma, texto) => soma + texto.length, 0);

        if (total > env.deepl.maximoDeCaracteres) throw ErroApi.requisicaoInvalida("Este texto é longo demais para traduzir de uma vez.");
    }

    /**
     * Traduz a lista toda e devolve na MESMA ordem.
     *
     * Texto vazio não vai para o tradutor (volta como está), e texto repetido dentro do mesmo pedido
     * é traduzido uma vez só — dois comentários iguais não custam duas traduções.
     */
    async traduzir({ textos, origem, destino }) {
        this.validar({ textos, origem, destino });

        if (!this.disponivel()) throw ErroApi.servicoIndisponivel("A tradução automática não está configurada no servidor.");

        const comHash = textos.map((texto) => ({
            texto,
            // Em branco não é tradução nenhuma: nem busca no cache, nem gasta cota.
            hash: texto.trim() ? hashDoTexto(texto, origem, destino) : null
        }));

        const hashes = [...new Set(comHash.map((item) => item.hash).filter(Boolean))];

        if (hashes.length === 0) return { textos, motor: MOTOR, doCache: textos.length };

        const guardadas = await Traducao.findAll({ where: { hash: { [Op.in]: hashes } } });
        const porHash = new Map(guardadas.map((linha) => [linha.hash, linha.texto]));

        // O que ainda não existe no banco, sem repetição: é só isto que vai custar cota.
        const faltando = hashes.filter((hash) => !porHash.has(hash));

        if (faltando.length > 0) {
            const textosFaltando = faltando.map((hash) => comHash.find((item) => item.hash === hash).texto);

            await this.conferirOrcamentoDoMes(textosFaltando.reduce((soma, texto) => soma + texto.length, 0));

            const traduzidos = await DeepLService.traduzir({ textos: textosFaltando, origem, destino });

            faltando.forEach((hash, i) => porHash.set(hash, traduzidos[i]));

            await this.guardar({ hashes: faltando, originais: textosFaltando, traduzidos, origem, destino });
        }

        await this.marcarComoUsadas(hashes);

        return {
            textos: comHash.map((item) => (item.hash ? (porHash.get(item.hash) ?? item.texto) : item.texto)),
            motor: MOTOR,
            doCache: hashes.length - faltando.length
        };
    }

    /**
     * Quantos caracteres foram mandados ao tradutor desde o dia 1 deste mês.
     *
     * Dá para contar a partir do próprio cache porque **só o que falta no cache é traduzido**: toda
     * linha gravada aqui corresponde a uma tradução que foi paga, e nada é traduzido sem gravar.
     * Não é uma estimativa — é o mesmo número que a DeepL conta, menos o que ela já tinha contado
     * antes deste cache existir.
     *
     * A conta é feita a cada falta de cache, sem guardar nada em memória de propósito: valor em
     * memória erra a cada reinício do servidor, e o Render reinicia sozinho. A soma percorre poucos
     * milhares de linhas por ano.
     */
    async usadoNoMes() {
        const agora = new Date();
        const inicioDoMes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));

        return (await Traducao.sum("caracteres", { where: { criadoEm: { [Op.gte]: inicioDoMes } } })) || 0;
    }

    /**
     * Para antes de estourar a cota do mês.
     *
     * Existe porque a rota é pública: sem isto, alguém mandando textos novos em sequência gastaria
     * a cota do mês inteiro numa tarde, e o botão "Traduzir" ficaria morto para todo mundo até o
     * dia 1. O teto é um pouco menor que o da DeepL (`DEEPL_ORCAMENTO_MENSAL`), para sobrar margem.
     *
     * Quem recebe o 429 não fica sem tradução: o Site cai para a reserva gratuita.
     */
    async conferirOrcamentoDoMes(caracteresDoPedido) {
        const teto = env.deepl.orcamentoMensal;

        if (!teto) return;

        const usado = await this.usadoNoMes();

        if (usado + caracteresDoPedido > teto) {
            throw new ErroApi(429, "A cota de tradução deste mês acabou. Tente de novo no mês que vem.");
        }
    }

    /**
     * Guarda as traduções novas.
     *
     * `ignoreDuplicates` porque duas pessoas podem pedir a mesma tradução ao mesmo tempo: as duas
     * acham o cache vazio, as duas traduzem, e a segunda a gravar esbarraria na chave única. Isso
     * não é erro — é só desperdício de uma tradução —, e derrubar o pedido de quem está esperando
     * por causa disso seria bem pior.
     *
     * Falhar ao gravar também não derruba nada: a tradução já está na mão de quem pediu, e o pior
     * que acontece é ela ser refeita da próxima vez.
     */
    async guardar({ hashes, originais, traduzidos, origem, destino }) {
        try {
            await Traducao.bulkCreate(
                hashes.map((hash, i) => ({
                    hash,
                    idiomaOrigem: origem,
                    idiomaDestino: destino,
                    texto: traduzidos[i],
                    motor: MOTOR,
                    caracteres: originais[i].length,
                    usadoEm: new Date()
                })),
                { ignoreDuplicates: true }
            );
        } catch (erro) {
            console.error("[traducao] não foi possível guardar a tradução no cache:", erro?.message);
        }
    }

    /** Marca que estas linhas foram lidas hoje, para um dia dar para limpar o que ninguém mais lê. */
    async marcarComoUsadas(hashes) {
        try {
            await Traducao.update({ usadoEm: new Date() }, { where: { hash: { [Op.in]: hashes } } });
        } catch (erro) {
            console.error("[traducao] não foi possível marcar o uso do cache:", erro?.message);
        }
    }
}

export default new TraducaoService();
