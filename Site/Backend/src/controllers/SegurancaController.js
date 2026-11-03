import ContaComprometidaService from "../services/ContaComprometidaService.js";
import DispositivoConfiavelService from "../services/DispositivoConfiavelService.js";
import SegurancaEventosService from "../services/SegurancaEventosService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Rotas do Bloco 3 (`/auth`): estado do recurso, dispositivos de confiança, histórico de segurança e conta comprometida. Todas,
 * menos `disponivel`, respondem 503 enquanto o recurso estiver desligado.
 */
class SegurancaController {
    /** Público: o Site só mostra "Acho que invadiram minha conta" e as telas novas quando o recurso está ligado. */
    async disponivel(req, res, next) {
        try {
            return res.status(200).json({
                sucesso: true,
                habilitado: DispositivoConfiavelService.habilitado(),
                // `ativo`: ligado E com e-mail capaz de enviar. Ligado sem e-mail, o login segue sem a verificação.
                ativo: DispositivoConfiavelService.disponivel()
            });
        } catch (erro) {
            return next(erro);
        }
    }

    async dispositivos(req, res, next) {
        try {
            DispositivoConfiavelService.exigirHabilitado();

            const dispositivos = await DispositivoConfiavelService.listar(req.user.id, req.headers["x-dispositivo"]);

            return res.status(200).json({ sucesso: true, dispositivos });
        } catch (erro) {
            return next(erro);
        }
    }

    async revogarDispositivo(req, res, next) {
        try {
            DispositivoConfiavelService.exigirHabilitado();

            const resultado = await DispositivoConfiavelService.revogar(req.user.id, req.params.id, contextoRequisicao(req));

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async revogarTodosDispositivos(req, res, next) {
        try {
            DispositivoConfiavelService.exigirHabilitado();

            const quantidade = await DispositivoConfiavelService.revogarTodos(req.user.id, { contexto: contextoRequisicao(req) });

            return res.status(200).json({ sucesso: true, quantidade, mensagem: "A confiança em todos os dispositivos foi removida." });
        } catch (erro) {
            return next(erro);
        }
    }

    async eventos(req, res, next) {
        try {
            DispositivoConfiavelService.exigirHabilitado();

            const eventos = await SegurancaEventosService.listar(req.user.id, req.query.limite);

            return res.status(200).json({ sucesso: true, eventos });
        } catch (erro) {
            return next(erro);
        }
    }

    async solicitarContaComprometida(req, res, next) {
        try {
            DispositivoConfiavelService.exigirHabilitado();

            const resultado = await ContaComprometidaService.solicitar(req.body.email, contextoRequisicao(req));

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async confirmarContaComprometida(req, res, next) {
        try {
            DispositivoConfiavelService.exigirHabilitado();

            const resultado = await ContaComprometidaService.confirmar(req.body.token, contextoRequisicao(req));

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async protegerAgora(req, res, next) {
        try {
            DispositivoConfiavelService.exigirHabilitado();

            const resultado = await ContaComprometidaService.protegerAgora(
                req.user,
                { senhaAtual: req.body.senhaAtual },
                { familiaId: req.sessaoFamiliaId, tokenAtual: req.body.refreshToken },
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new SegurancaController();
