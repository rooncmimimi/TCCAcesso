import env from "../config/env.js";
import { EventoDeSeguranca } from "../models/index.js";
import { descreverEvento } from "../utils/eventosDeSeguranca.js";
import { rotuloDoDispositivo } from "../utils/rotuloDoDispositivo.js";

/**
 * O histórico de segurança de cada conta. **Nunca atrapalha a ação que está registrando**: com a chave desligada não faz nada,
 * e uma falha ao gravar só vai para o log (a troca de senha não pode falhar porque o histórico falhou). Nunca recebe segredo
 * nem código: quem chama passa só o tipo e, no máximo, metadados sem dado sensível.
 */
class SegurancaEventosService {
    habilitado() {
        return Boolean(env.seguranca?.dispositivosHabilitado);
    }

    async registrar(usuarioId, tipo, contexto = {}, metadados = null, { transaction } = {}) {
        if (!this.habilitado() || !usuarioId) return;

        try {
            await EventoDeSeguranca.create(
                {
                    usuarioId,
                    tipo,
                    ip: contexto.ip ? String(contexto.ip).slice(0, 64) : null,
                    userAgent: contexto.userAgent ? String(contexto.userAgent).slice(0, 255) : null,
                    metadados
                },
                { transaction }
            );
        } catch (erro) {
            console.error(JSON.stringify({ nivel: "error", servico: "SegurancaEventosService", acao: "registrar", tipo, causa: erro.message }));
        }
    }

    /** Os eventos mais recentes da própria conta, já com o texto que a pessoa lê. */
    async listar(usuarioId, limite = 30) {
        const eventos = await EventoDeSeguranca.findAll({
            where: { usuarioId },
            order: [["criadoEm", "DESC"]],
            limit: Math.min(Math.max(Number(limite) || 30, 1), 100)
        });

        return eventos.map((evento) => ({
            id: evento.id,
            tipo: evento.tipo,
            descricao: descreverEvento(evento.tipo),
            ip: evento.ip,
            dispositivo: evento.userAgent ? rotuloDoDispositivo(evento.userAgent) : null,
            criadoEm: evento.criadoEm
        }));
    }
}

export default new SegurancaEventosService();
