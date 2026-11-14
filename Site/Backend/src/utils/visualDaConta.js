/**
 * A personalização visual guardada na conta (migration 0014).
 *
 * O JSON vem do cliente, então **nada aqui confia nele**: só sobrevive chave conhecida, padrão da
 * lista, número dentro da faixa e cor em `#rrggbb`. É o que impede uma preferência salva de virar
 * CSS arbitrário na tela de alguém — inclusive na tela de outra pessoa, se a preferência vazasse
 * de um lado para o outro.
 *
 * Os limites são os mesmos do Site (`lib/padroesVisuais.ts` e `lib/preferenciasVisuais.ts`). Se um
 * dia divergirem, quem manda é este arquivo: é o último antes do banco.
 */

const PADROES = ["nenhum", "acessivel", "protanopia", "deuteranopia", "tritanopia", "monocromatico"];
const PAPEIS = ["destaque", "sucesso", "erro", "alerta", "info"];
const CONTRASTES = [4.5, 7, 10];

const LIMITES = {
    intensidade: { min: 0, max: 100, padrao: 100 },
    saturacao: { min: 0, max: 150, padrao: 100 },
    brilho: { min: 70, max: 130, padrao: 100 }
};

const ehCorHex = (valor) => typeof valor === "string" && /^#[0-9a-fA-F]{6}$/.test(valor);

const numeroEntre = (valor, { min, max, padrao }) =>
    typeof valor === "number" && Number.isFinite(valor) ? Math.min(max, Math.max(min, valor)) : padrao;

/**
 * Devolve o objeto limpo, ou `null` quando não há nada que valha a pena guardar (não é objeto, ou
 * é a personalização padrão inteira). `null` é o estado "nunca personalizou".
 */
export function limparVisual(bruto) {
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
        return null;
    }

    const cores = {};

    if (bruto.cores && typeof bruto.cores === "object" && !Array.isArray(bruto.cores)) {
        for (const papel of PAPEIS) {
            if (ehCorHex(bruto.cores[papel])) {
                cores[papel] = bruto.cores[papel].toLowerCase();
            }
        }
    }

    const limpo = {
        padrao: PADROES.includes(bruto.padrao) ? bruto.padrao : "nenhum",
        intensidade: numeroEntre(bruto.intensidade, LIMITES.intensidade),
        saturacao: numeroEntre(bruto.saturacao, LIMITES.saturacao),
        brilho: numeroEntre(bruto.brilho, LIMITES.brilho),
        contraste: CONTRASTES.includes(bruto.contraste) ? bruto.contraste : CONTRASTES[0],
        cores
    };

    const ehPadrao =
        limpo.padrao === "nenhum" &&
        limpo.intensidade === LIMITES.intensidade.padrao &&
        limpo.saturacao === LIMITES.saturacao.padrao &&
        limpo.brilho === LIMITES.brilho.padrao &&
        limpo.contraste === CONTRASTES[0] &&
        Object.keys(limpo.cores).length === 0;

    return ehPadrao ? null : limpo;
}

export const PADROES_VISUAIS_ACEITOS = PADROES;
export const PAPEIS_DE_COR_ACEITOS = PAPEIS;
