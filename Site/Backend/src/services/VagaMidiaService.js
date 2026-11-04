import { VagaMidia } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { garantirDono, garantirEmpresaAprovada } from "../utils/autorizacao.js";
import { gerarUrlAssinada } from "../utils/supabaseStorage.js";
import { urlPublica, LIMITE_LEGENDA_BYTES } from "../middlewares/uploadMiddleware.js";
import ArmazenamentoService from "./ArmazenamentoService.js";
import VagaService from "./VagaService.js";

export const LIMITES_DA_MIDIA = { transcricaoMinima: 20, transcricaoMaxima: 8000, descricao: 300 };

const limpar = (texto) => (typeof texto === "string" ? texto.replace(/\r\n/g, "\n").trim() : "");

/**
 * Vídeo da vaga em Libras (um por vaga), com TRANSCRIÇÃO obrigatória e legenda WebVTT opcional.
 *
 * - Só a empresa dona da vaga (empresa aprovada) envia, troca e remove. A visibilidade do vídeo é a
 *   da própria vaga (`VagaService.buscarPorId`): vaga que o público não vê, mídia que o público não vê.
 * - O arquivo vai para o bucket PRIVADO; a URL é assinada e temporária, resolvida a cada leitura.
 * - O vídeo só existe com a transcrição: quem não consegue ver ou ouvir o vídeo lê o texto.
 * - A legenda é texto WebVTT guardado na linha (sem arquivo, sem CORS do player).
 * - **Nada é traduzido automaticamente para Libras.** O ACESSO só hospeda o que a empresa enviou.
 * - Trocar o vídeo apaga o arquivo anterior e a legenda (o tempo das falas não vale para o vídeo novo).
 */
class VagaMidiaService {
    async vagaDaEmpresa(vagaId, solicitante) {
        const vaga = await VagaService.buscarVagaComEmpresa(vagaId);

        garantirDono(solicitante, vaga.empresa.usuarioId, "Apenas a empresa dona da vaga pode gerenciar o vídeo.");
        garantirEmpresaAprovada(vaga.empresa, solicitante);

        return vaga;
    }

    async paraResposta(midia) {
        const assinatura = await gerarUrlAssinada(midia.videoCaminho);

        return {
            id: midia.id,
            descricao: midia.descricao ?? null,
            transcricao: midia.transcricao,
            legendaVtt: midia.legendaVtt ?? null,
            video: { url: assinatura?.url ?? null, expiraEm: assinatura?.expiraEm ?? null, tipoMime: midia.videoTipoMime }
        };
    }

    /** O vídeo da vaga, para quem pode ver a vaga. Sem vídeo, nulo. */
    async obter(vagaId, solicitante) {
        await VagaService.buscarPorId(vagaId, solicitante);

        const midia = await VagaMidia.findOne({ where: { vagaId } });

        return midia ? this.paraResposta(midia) : null;
    }

    validarTextos({ transcricao, descricao }) {
        const t = limpar(transcricao);

        if (t.length < LIMITES_DA_MIDIA.transcricaoMinima) {
            throw ErroApi.requisicaoInvalida(
                `Escreva a transcrição do vídeo (no mínimo ${LIMITES_DA_MIDIA.transcricaoMinima} caracteres). Ela é obrigatória para publicar o vídeo.`
            );
        }

        if (t.length > LIMITES_DA_MIDIA.transcricaoMaxima) {
            throw ErroApi.requisicaoInvalida(`A transcrição deve ter no máximo ${LIMITES_DA_MIDIA.transcricaoMaxima} caracteres.`);
        }

        const d = limpar(descricao);

        if (d.length > LIMITES_DA_MIDIA.descricao) {
            throw ErroApi.requisicaoInvalida(`A descrição do vídeo deve ter no máximo ${LIMITES_DA_MIDIA.descricao} caracteres.`);
        }

        return { transcricao: t, descricao: d || null };
    }

    /** O arquivo já foi enviado ao Storage pelo middleware; se algo falhar aqui, ele não pode ficar órfão. */
    async descartarArquivoNovo(arquivo) {
        await ArmazenamentoService.removerArquivoFisico(urlPublica(arquivo), { privado: true }).catch(() => false);
    }

    async salvarVideo(vagaId, arquivo, corpo, solicitante) {
        try {
            if (!arquivo) {
                throw ErroApi.requisicaoInvalida("Envie o arquivo de vídeo (MP4 ou WEBM).");
            }

            await this.vagaDaEmpresa(vagaId, solicitante);
            const textos = this.validarTextos(corpo ?? {});
            const existente = await VagaMidia.findOne({ where: { vagaId } });
            const anterior = existente?.videoCaminho ?? null;
            const dados = { videoCaminho: urlPublica(arquivo), videoTipoMime: arquivo.mimetype, legendaVtt: null, ...textos };

            const midia = existente ? await existente.update(dados) : await VagaMidia.create({ vagaId, tipo: "video_libras", ...dados });

            if (anterior) {
                await ArmazenamentoService.removerArquivoFisico(anterior, { privado: true }).catch(() => false);
            }

            return this.paraResposta(midia);
        } catch (erro) {
            await this.descartarArquivoNovo(arquivo);
            throw erro;
        }
    }

    /** Legenda WebVTT para o vídeo já enviado. Texto, validado de novo aqui. */
    async salvarLegenda(vagaId, arquivo, solicitante) {
        if (!arquivo?.buffer) {
            throw ErroApi.requisicaoInvalida("Envie a legenda no formato WebVTT (.vtt).");
        }

        await this.vagaDaEmpresa(vagaId, solicitante);
        const midia = await VagaMidia.findOne({ where: { vagaId } });

        if (!midia) {
            throw ErroApi.requisicaoInvalida("Envie primeiro o vídeo, com a transcrição, para depois acrescentar a legenda.");
        }

        if (arquivo.buffer.length > LIMITE_LEGENDA_BYTES) {
            throw ErroApi.requisicaoInvalida("A legenda é grande demais (limite de 256 KB).");
        }

        const texto = arquivo.buffer.toString("utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");

        if (!/^WEBVTT(\s|$)/.test(texto) || !texto.includes("-->")) {
            throw ErroApi.requisicaoInvalida("O arquivo não parece uma legenda WebVTT válida (precisa começar com WEBVTT e ter pelo menos uma fala com horário).");
        }

        await midia.update({ legendaVtt: texto });

        return this.paraResposta(midia);
    }

    async removerLegenda(vagaId, solicitante) {
        await this.vagaDaEmpresa(vagaId, solicitante);
        const midia = await VagaMidia.findOne({ where: { vagaId } });

        if (!midia) throw ErroApi.naoEncontrado("Esta vaga não tem vídeo.");

        await midia.update({ legendaVtt: null });

        return this.paraResposta(midia);
    }

    async atualizarTextos(vagaId, corpo, solicitante) {
        await this.vagaDaEmpresa(vagaId, solicitante);
        const midia = await VagaMidia.findOne({ where: { vagaId } });

        if (!midia) throw ErroApi.naoEncontrado("Esta vaga não tem vídeo.");

        await midia.update(this.validarTextos({ transcricao: corpo?.transcricao ?? midia.transcricao, descricao: corpo?.descricao ?? midia.descricao }));

        return this.paraResposta(midia);
    }

    async remover(vagaId, solicitante) {
        await this.vagaDaEmpresa(vagaId, solicitante);
        const midia = await VagaMidia.findOne({ where: { vagaId } });

        if (!midia) return { removido: false };

        const caminho = midia.videoCaminho;
        await midia.destroy();
        await ArmazenamentoService.removerArquivoFisico(caminho, { privado: true }).catch(() => false);

        return { removido: true };
    }
}

export default new VagaMidiaService();
