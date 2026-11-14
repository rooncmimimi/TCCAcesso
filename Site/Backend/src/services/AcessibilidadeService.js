import env from "../config/env.js";
import { PreferenciaAcessibilidade } from "../models/index.js";
import { limparVisual } from "../utils/visualDaConta.js";

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

        // `idioma` e `visual` só existem com o recurso ligado (migrations 0011 e 0014); desligados, o campo enviado é ignorado como qualquer outro desconhecido.
        const campos = [...CAMPOS, ...(env.idioma.naContaHabilitado ? ["idioma"] : [])];

        const alteracoes = campos.reduce((acumulado, campo) => {
            if (data[campo] !== undefined) {
                acumulado[campo] = data[campo];
            }

            return acumulado;
        }, {});

        // O `visual` nunca entra como veio: `limparVisual` deixa passar só chave conhecida, padrão
        // da lista, número na faixa e cor em `#rrggbb`. `null` é "nunca personalizou" e também é
        // o que a pessoa grava ao restaurar.
        if (env.visual.naContaHabilitado && data.visual !== undefined) {
            alteracoes.visual = limparVisual(data.visual);
        }

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
            destaqueFoco: true,
            // Redefinir apaga a personalização visual junto, voltando ao estado "nunca personalizou".
            ...(env.visual.naContaHabilitado ? { visual: null } : {})
        });

        return preferencias;
    }
}

export default new AcessibilidadeService();
