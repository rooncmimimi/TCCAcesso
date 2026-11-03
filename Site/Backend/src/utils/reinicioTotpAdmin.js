import { emailCanonico } from "./email.js";

/**
 * As decisões do script de emergência `scripts/resetarTotpAdmin.js`, separadas da entrada e saída para
 * poderem ser testadas sem terminal nem banco. O script só pergunta, mostra e chama o `TotpService`.
 */

export const MOTIVO_MINIMO = 10;
export const MOTIVO_MAXIMO = 300;

/**
 * A conta informada pode ser reiniciada por este script?
 *
 * O e-mail serve só para **achar** a conta; quem autoriza é quem tem acesso ao servidor. Mesmo assim o
 * script só mexe em conta que existe, está ativa e é de administrador: o caminho de emergência não vira
 * um jeito de desligar a proteção de qualquer conta.
 */
export function avaliarAlvo(usuario, totpAtivo) {
    if (!usuario) {
        return { ok: false, motivo: "Não existe conta com esse e-mail. Nada foi alterado." };
    }

    if (usuario.tipoUsuario !== "administrador") {
        return {
            ok: false,
            motivo:
                "Essa conta não é de administrador. Este script só reinicia o TOTP de administrador; " +
                "para candidato ou empresa, outro administrador faz o reinício pelo painel. Nada foi alterado."
        };
    }

    if (!usuario.ativo || usuario.bloqueado) {
        return {
            ok: false,
            motivo: "Essa conta de administrador está desativada ou bloqueada. Reative-a antes de reiniciar o TOTP. Nada foi alterado."
        };
    }

    if (!totpAtivo) {
        return {
            ok: false,
            motivo:
                "Essa conta de administrador não tem TOTP ativo, então não há o que reiniciar: ao entrar, " +
                "ela é levada direto à configuração. Nada foi alterado."
        };
    }

    return { ok: true };
}

/** A confirmação é o e-mail digitado de novo (não um "sim"), para ninguém confirmar sem ler a conta. */
export function confirmacaoConfere(digitado, email) {
    const a = emailCanonico(digitado ?? "");
    const b = emailCanonico(email ?? "");

    return a !== "" && a === b;
}

export function motivoValido(motivo) {
    const texto = String(motivo ?? "").trim();

    return texto.length >= MOTIVO_MINIMO && texto.length <= MOTIVO_MAXIMO;
}

/** Quem executou, para a auditoria registrar a origem da operação sem inventar um endereço de rede. */
export function origemDoScript({ usuarioDoSistema, maquina }) {
    return {
        ip: "script-no-servidor",
        userAgent: `resetarTotpAdmin.js, executado por ${usuarioDoSistema || "desconhecido"}@${maquina || "desconhecida"}`
    };
}
