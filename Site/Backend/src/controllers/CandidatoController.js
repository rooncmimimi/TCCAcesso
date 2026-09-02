import CandidatoService from "../services/CandidatoService.js";
import { urlPublica } from "../middlewares/uploadMiddleware.js";
import { Candidato } from "../models/index.js";
import UploadService from "../services/UploadService.js";

const contextoDa = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});

class CandidatoController {
    async index(req, res, next) {
        try {
            const dados = await CandidatoService.findAll(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async me(req, res, next) {
        try {
            const candidato = await CandidatoService.findByUsuario(req.user.id);

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const candidato = await CandidatoService.findById(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * URL temporária (assinada) do currículo — nunca uma URL permanente.
     * Autorização (dono, empresa com candidatura legítima ou administrador)
     * é verificada em `CandidatoService.gerarUrlCurriculo`.
     */
    async curriculoUrl(req, res, next) {
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
     * Mesma autorização do endpoint acima, mas gera uma URL assinada com
     * `Content-Disposition: attachment` (força download em vez de
     * exibição inline) — mesmo padrão de
     * `PostagemController.downloadAnexo` (Fase 7).
     */
    async curriculoDownload(req, res, next) {
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

    async update(req, res, next) {
        try {
            const candidato = await CandidatoService.update(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    async uploadCurriculo(req, res, next) {
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
                await UploadService.removerArquivoFisico(anterior.curriculo, {
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

    async destroy(req, res, next) {
        try {
            const resultado = await CandidatoService.remove(
                req.params.id,
                req.user,
                contextoDa(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * Extrai texto do arquivo enviado e devolve um RASCUNHO — nunca grava
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
