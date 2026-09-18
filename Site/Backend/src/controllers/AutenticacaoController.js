import AutenticacaoService from "../services/AutenticacaoService.js";
import RecuperacaoSenhaService from "../services/RecuperacaoSenhaService.js";
import SessaoService from "../services/SessaoService.js";
import ErroApi from "../utils/ErroApi.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

const MENSAGEM_ERRO_CADASTRO =
    "Não foi possível concluir o cadastro agora. Tente novamente.";

/**
 * Erros esperados de regra de negócio (ErroApi, ex.: e-mail duplicado)
 * já trazem mensagem amigável e devem seguir como estão. Qualquer outra
 * falha (ex.: erro inesperado de banco de dados) é traduzida numa
 * mensagem genérica e amigável para o cadastro; a causa original
 * continua sendo logada no servidor via ErroApi.interno.
 */
const tratarErroCadastro = (erro) =>
    erro instanceof ErroApi ? erro : ErroApi.interno(MENSAGEM_ERRO_CADASTRO, erro);

/**
 * Rotas de `/auth`: cadastro, login e renovação de sessão, senha, confirmação e troca de e-mail,
 * pausa e exclusão da conta e sessões ativas.
 */
class AutenticacaoController {
    async cadastrarCandidato(req, res, next) {
        try {
            const resultado = await AutenticacaoService.cadastrarCandidato(
                req.body,
                contextoRequisicao(req)
            );

            return res.status(201).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(tratarErroCadastro(erro));
        }
    }

    async cadastrarEmpresa(req, res, next) {
        try {
            const resultado = await AutenticacaoService.cadastrarEmpresa(
                req.body,
                contextoRequisicao(req)
            );

            return res.status(201).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(tratarErroCadastro(erro));
        }
    }

    async entrar(req, res, next) {
        try {
            const { email, senha, confirmarReativacao } = req.body;
            const resultado = await AutenticacaoService.entrar(
                email,
                senha,
                contextoRequisicao(req),
                Boolean(confirmarReativacao)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async renovarToken(req, res, next) {
        try {
            const resultado = await AutenticacaoService.renovarToken(
                req.body.refreshToken,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async perfilAtual(req, res, next) {
        try {
            const usuario = await AutenticacaoService.perfilAtual(req.user.id);

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async alterarSenha(req, res, next) {
        try {
            const { senhaAtual, novaSenha } = req.body;
            const resultado = await AutenticacaoService.alterarSenha(
                req.user.id,
                senhaAtual,
                novaSenha
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async esqueciSenha(req, res, next) {
        try {
            const resultado = await RecuperacaoSenhaService.solicitar(
                req.body.email,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async redefinirSenha(req, res, next) {
        try {
            const resultado = await RecuperacaoSenhaService.redefinir(req.body);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /** Confirma o e-mail de um cadastro recém-criado (rota pública: usuário ainda não está logado). */
    async confirmarCadastro(req, res, next) {
        try {
            const resultado = await AutenticacaoService.confirmarEmailCadastro(
                req.body.email,
                req.body.codigo
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /** Reenvia o e-mail de confirmação de cadastro (rota pública, resposta sempre genérica). */
    async reenviarConfirmacaoCadastro(req, res, next) {
        try {
            const resultado = await AutenticacaoService.reenviarConfirmacaoCadastro(req.body.email);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /** Revoga o refresh token da sessão atual. */
    async sair(req, res, next) {
        try {
            const resultado = await AutenticacaoService.sair(req.body?.refreshToken);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async pausarConta(req, res, next) {
        try {
            const resultado = await AutenticacaoService.pausarConta(
                req.user.id,
                req.body.senhaAtual
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluirConta(req, res, next) {
        try {
            const resultado = await AutenticacaoService.excluirConta(
                req.user.id,
                req.body.senhaAtual
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async solicitarTrocaEmail(req, res, next) {
        try {
            const resultado = await AutenticacaoService.solicitarTrocaEmail(
                req.user.id,
                req.body.senhaAtual,
                req.body.novoEmail
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async confirmarTrocaEmail(req, res, next) {
        try {
            const resultado = await AutenticacaoService.confirmarTrocaEmail(
                req.user.id,
                req.body.codigo
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async sessoes(req, res, next) {
        try {
            const sessoes = await SessaoService.listarAtivas(
                req.user.id,
                req.body?.refreshToken
            );

            return res.status(200).json({ sucesso: true, sessoes });
        } catch (erro) {
            return next(erro);
        }
    }

    async revogarSessao(req, res, next) {
        try {
            const resultado = await SessaoService.revogarPorId(
                req.user.id,
                req.params.id
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async revogarOutrasSessoes(req, res, next) {
        try {
            const resultado = await SessaoService.revogarTodosExceto(
                req.user.id,
                req.body?.refreshToken
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new AutenticacaoController();
