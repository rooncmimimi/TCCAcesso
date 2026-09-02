import { PreferenciaAcessibilidade } from "../models/index.js";

/**
 * Preferências de acessibilidade persistidas por usuário.
 *
 * O frontend aplica as preferências em tempo real e sincroniza aqui,
 * garantindo que a experiência acompanhe o usuário em qualquer dispositivo.
 */

const CAMPOS = [
    "tema",
    "altoContraste",
    "fonteDislexia",
    "escalaFonte",
    "espacamentoTexto",
    "reduzirAnimacoes",
    "leituraPorVoz",
    "consentimentoVoz",
    "velocidadeVoz",
    "linguagemSimplificada",
    "libras",
    "destaqueFoco"
];

class AcessibilidadeService {
    async obter(usuarioId) {
        const [preferencias] = await PreferenciaAcessibilidade.findOrCreate({
            where: { usuarioId },
            defaults: { usuarioId }
        });

        return preferencias;
    }

    async atualizar(usuarioId, data) {
        const preferencias = await this.obter(usuarioId);

        const alteracoes = CAMPOS.reduce((acumulado, campo) => {
            if (data[campo] !== undefined) {
                acumulado[campo] = data[campo];
            }

            return acumulado;
        }, {});

        await preferencias.update(alteracoes);

        return preferencias;
    }

    async restaurarPadrao(usuarioId) {
        const preferencias = await this.obter(usuarioId);

        await preferencias.update({
            tema: "sistema",
            altoContraste: false,
            fonteDislexia: false,
            escalaFonte: 100,
            espacamentoTexto: false,
            reduzirAnimacoes: false,
            leituraPorVoz: false,
            // Fase 9, Bloco 8: o correto aqui é `null` (redefinir volta ao
            // estado "nunca perguntado", fazendo a pergunta reaparecer) —
            // mas a coluna `consentimento_voz` ainda é NOT NULL no banco
            // (migration 0042, proposta mas NÃO aplicada ainda: aguardando
            // autorização explícita). Escrever `null` aqui HOJE quebraria
            // este endpoint inteiro (violação de constraint). Preserva o
            // valor atual por enquanto — trocar para `null` assim que a
            // migration 0042 for aprovada e executada.
            consentimentoVoz: preferencias.consentimentoVoz,
            velocidadeVoz: 1.0,
            linguagemSimplificada: false,
            libras: true,
            destaqueFoco: true
        });

        return preferencias;
    }
}

export default new AcessibilidadeService();
