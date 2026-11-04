import env from "../config/env.js";
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

        // `idioma` só existe com o recurso ligado (migration 0011); desligado, o campo enviado é ignorado como qualquer outro desconhecido.
        const campos = env.idioma.naContaHabilitado ? [...CAMPOS, "idioma"] : CAMPOS;

        const alteracoes = campos.reduce((acumulado, campo) => {
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
            // Redefinir volta ao estado "nunca perguntado", para a pergunta de consentimento
            // reaparecer, como o `restaurar()` do `AcessibilidadeProvider` faz no Site (remove
            // `CHAVE_ESCOLHA_VOZ` do localStorage). A coluna aceita NULL.
            consentimentoVoz: null,
            velocidadeVoz: 1.0,
            linguagemSimplificada: false,
            libras: true,
            destaqueFoco: true
        });

        return preferencias;
    }
}

export default new AcessibilidadeService();
