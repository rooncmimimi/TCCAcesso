import UsuarioService from "../services/UsuarioService.js";
import { urlPublica } from "../middlewares/uploadMiddleware.js";
import { Usuario } from "../models/index.js";
import ArmazenamentoService from "../services/ArmazenamentoService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Conta de usuário (`/usuarios`): dados, foto e capa, ativação e exclusão. Também atende
 * `GET /perfil/usuario/:usuarioId`, com os dados públicos mínimos.
 */
class UsuarioController {
    async listar(req, res, next) {
        try {
            const dados = await UsuarioService.listar(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async obter(req, res, next) {
        try {
            const usuario = await UsuarioService.buscarRegistroCompleto(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async perfilPublico(req, res, next) {
        try {
            const usuario = await UsuarioService.perfilPublicoBasico(
                req.params.usuarioId,
                req.user
            );

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizar(req, res, next) {
        try {
            const usuario = await UsuarioService.atualizar(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarFoto(req, res, next) {
        try {
            const fotoPerfil = urlPublica(req.file);

            // Ordem segura: lê a referência antiga antes de trocar (sem getter, porque precisa do
            // caminho bruto e não da URL resolvida), confirma a nova no banco e só depois remove a
            // antiga, nunca o contrário.
            const anterior = await Usuario.findByPk(req.params.id, {
                attributes: ["fotoPerfil"],
                raw: true
            });

            const usuario = await UsuarioService.atualizar(
                req.params.id,
                { fotoPerfil },
                req.user
            );

            if (anterior?.fotoPerfil && anterior.fotoPerfil !== fotoPerfil) {
                await ArmazenamentoService.removerArquivoFisico(anterior.fotoPerfil, {
                    privado: false
                });
            }

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarCapa(req, res, next) {
        try {
            const capaPerfil = urlPublica(req.file);

            const anterior = await Usuario.findByPk(req.params.id, {
                attributes: ["capaPerfil"],
                raw: true
            });

            const usuario = await UsuarioService.atualizar(
                req.params.id,
                { capaPerfil },
                req.user
            );

            if (anterior?.capaPerfil && anterior.capaPerfil !== capaPerfil) {
                await ArmazenamentoService.removerArquivoFisico(anterior.capaPerfil, {
                    privado: false
                });
            }

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async ativar(req, res, next) {
        try {
            const usuario = await UsuarioService.ativar(
                req.params.id,
                req.user,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async desativar(req, res, next) {
        try {
            const usuario = await UsuarioService.desativar(
                req.params.id,
                req.user,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const resultado = await UsuarioService.excluir(
                req.params.id,
                req.user,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new UsuarioController();
