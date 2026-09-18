import CandidatoService from "../services/CandidatoService.js";
import { urlPublica } from "../middlewares/uploadMiddleware.js";
import { Candidato } from "../models/index.js";
import ArmazenamentoService from "../services/ArmazenamentoService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Perfil de candidato (`/candidatos`), com currículo (envio, importação, URL assinada e download) e
 * deficiências vinculadas.
 */
class CandidatoController {
    async listar(req, res, next) {
        try {
            const dados = await CandidatoService.listar(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async perfilAtual(req, res, next) {
        try {
            const candidato = await CandidatoService.buscarPorUsuario(req.user.id);

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    async obter(req, res, next) {
        try {
            const candidato = await CandidatoService.buscarPorId(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * URL temporária (assinada) do currículo, nunca uma URL permanente.
     * Autorização (dono, empresa com candidatura legítima ou administrador)
     * é verificada em `CandidatoService.gerarUrlCurriculo`.
     */
    async urlCurriculo(req, res, next) {
        try {
            const resultado = await CandidatoService.gerarUrlCurriculo(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * Mesma autorização do endpoint acima, mas a URL assinada força download
     * (`Content-Disposition: attachment`) em vez de exibição inline, como
     * `PostagemController.baixarAnexo`.
     */
    async baixarCurriculo(req, res, next) {
        try {
            const resultado = await CandidatoService.gerarUrlCurriculo(
                req.params.id,
                req.user,
                { baixar: true }
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizar(req, res, next) {
        try {
            const candidato = await CandidatoService.atualizar(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    async enviarCurriculo(req, res, next) {
        try {
            const curriculo = urlPublica(req.file);

            const anterior = await Candidato.findByPk(req.params.id, {
                attributes: ["curriculo"],
                raw: true
            });

            const candidato = await CandidatoService.atualizarCurriculo(
                req.params.id,
                { caminho: curriculo, nomeOriginal: req.file?.originalname },
                req.user
            );

            if (anterior?.curriculo && anterior.curriculo !== curriculo) {
                await ArmazenamentoService.removerArquivoFisico(anterior.curriculo, {
                    privado: true
                });
            }

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    async vincularDeficiencia(req, res, next) {
        try {
            const vinculo = await CandidatoService.vincularDeficiencia(
                req.params.id,
                req.body.deficienciaId,
                req.body.observacoes,
                req.user
            );

            return res.status(201).json({ sucesso: true, vinculo });
        } catch (erro) {
            return next(erro);
        }
    }

    async desvincularDeficiencia(req, res, next) {
        try {
            const resultado = await CandidatoService.desvincularDeficiencia(
                req.params.id,
                req.params.deficienciaId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const resultado = await CandidatoService.remover(
                req.params.id,
                req.user,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * Extrai texto do arquivo enviado e devolve um rascunho; nunca grava
     * nada no perfil. O arquivo enviado aqui não vira o currículo oficial
     * do candidato (isso continua exigindo `PATCH /candidatos/:id/curriculo`
     * numa ação separada e explícita, depois que o usuário revisar/confirmar).
     */
    async importarCurriculo(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ sucesso: false, mensagem: "Envie um arquivo PDF ou DOCX." });
            }

            const rascunho = await CandidatoService.importarCurriculo(
                req.params.id,
                { buffer: req.file.buffer, mimetype: req.file.mimetype },
                req.user
            );

            return res.status(200).json({ sucesso: true, rascunho });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new CandidatoController();
