/**
 * Validações de dados pessoais: CPF, nome e data de nascimento. Funções puras, sem I/O, usadas pelos
 * validadores de rota (`validators/camposPessoais.js`).
 *
 * O Frontend tem uma cópia do mesmo algoritmo em `lib/validacoesPessoais.ts`, para errar antes da
 * viagem. As duas são cobertas pelos mesmos vetores de teste; **o servidor é quem vale**.
 */

/** Idade mínima para ter conta. Vem dos Termos de Uso ("16 anos ou mais"); depende de validação jurídica. */
export const IDADE_MINIMA = 16;

/**
 * Teto de plausibilidade, não regra de negócio: serve só para barrar datas digitadas errado (como o
 * ano 0001). O ACESSO atende profissionais 50+, então não há limite de idade que exclua ninguém.
 */
export const IDADE_MAXIMA_PLAUSIVEL = 120;

export const TAMANHO_MINIMO_NOME = 3;
export const TAMANHO_MAXIMO_NOME = 150;

export function somenteDigitos(valor) {
    return String(valor ?? "").replace(/\D/g, "");
}

/**
 * CPF válido: 11 dígitos, não todos iguais (`111.111.111-11` passa na conta dos dígitos verificadores,
 * mas não é um CPF) e com os dois dígitos verificadores corretos. Aceita pontuação; confere só os dígitos.
 */
export function cpfValido(valor) {
    const cpf = somenteDigitos(valor);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    const digitoVerificador = (tamanho) => {
        let soma = 0;

        for (let i = 0; i < tamanho; i += 1) {
            soma += Number(cpf[i]) * (tamanho + 1 - i);
        }

        const resto = (soma * 10) % 11;

        return resto === 10 ? 0 : resto;
    };

    return digitoVerificador(9) === Number(cpf[9]) && digitoVerificador(10) === Number(cpf[10]);
}

/**
 * Forma canônica do nome: Unicode NFC, espaços (inclusive os não separáveis) colapsados em um só e
 * sem espaço nas pontas. Não muda maiúsculas, acentos nem a grafia: "de", "da" e "dos" ficam como vieram.
 */
export function normalizarNome(valor) {
    return String(valor ?? "")
        .normalize("NFC")
        .replace(/[\s\u00a0\u2000-\u200b\u202f\u205f\u3000]+/g, " ")
        .trim();
}

/**
 * Nome de pessoa real: palavras de letras de qualquer alfabeto (com acento e marcas combinadas), cada
 * uma com ponto opcional no fim (abreviações como "Jr." e "J."), separadas por espaço, hífen ou
 * apóstrofo (reto ou tipográfico). Recusa dígitos, símbolos, emoji e pontuação repetida.
 * Aceita "Maria da Silva", "João D'Ávila", "Anne-Marie O'Neil", "José dos Santos Jr." e "Zoë Müller".
 */
const PADRAO_NOME = /^[\p{L}\p{M}]+\.?(?:[ '’ʼ-][\p{L}\p{M}]+\.?)*$/u;

export function nomeValido(valor) {
    const nome = normalizarNome(valor);

    return (
        nome.length >= TAMANHO_MINIMO_NOME && nome.length <= TAMANHO_MAXIMO_NOME && PADRAO_NOME.test(nome)
    );
}

/** Data `AAAA-MM-DD` que existe no calendário (recusa 2026-02-30 e 2025-13-01). */
function lerDataIso(valor) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor ?? "").trim());

    if (!m) return null;

    const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
    // `setUTCFullYear` e não `Date.UTC`: este trata anos de 0 a 99 como 1900 a 1999 (o ano 0001 viraria 1901).
    const data = new Date(0);
    data.setUTCFullYear(ano, mes - 1, dia);

    if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
        return null;
    }

    return { ano, mes, dia };
}

function hojeComoPartes(hoje) {
    const base = hoje instanceof Date ? hoje : new Date(hoje ?? Date.now());

    return { ano: base.getFullYear(), mes: base.getMonth() + 1, dia: base.getDate() };
}

/** Idade completa em anos de quem nasceu em `nasc` no dia `hoje`. */
function idadeEm(nasc, hoje) {
    let idade = hoje.ano - nasc.ano;

    if (hoje.mes < nasc.mes || (hoje.mes === nasc.mes && hoje.dia < nasc.dia)) {
        idade -= 1;
    }

    return idade;
}

/**
 * Confere uma data de nascimento. Devolve `{ valida: true }` ou `{ valida: false, motivo }`, com
 * `motivo` em: `formato` (não é AAAA-MM-DD), `inexistente` (não existe no calendário), `futura`,
 * `menor` (abaixo de `IDADE_MINIMA`) ou `implausivel` (acima de `IDADE_MAXIMA_PLAUSIVEL`).
 */
export function validarDataNascimento(valor, hoje = new Date()) {
    const texto = String(valor ?? "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return { valida: false, motivo: "formato" };
    }

    const nasc = lerDataIso(texto);

    if (!nasc) {
        return { valida: false, motivo: "inexistente" };
    }

    const agora = hojeComoPartes(hoje);
    const chave = (p) => p.ano * 10000 + p.mes * 100 + p.dia;

    if (chave(nasc) > chave(agora)) {
        return { valida: false, motivo: "futura" };
    }

    const idade = idadeEm(nasc, agora);

    if (idade < IDADE_MINIMA) {
        return { valida: false, motivo: "menor" };
    }

    if (idade > IDADE_MAXIMA_PLAUSIVEL) {
        return { valida: false, motivo: "implausivel" };
    }

    return { valida: true };
}

export const MENSAGENS_DATA_NASCIMENTO = {
    formato: "Informe a data de nascimento no formato AAAA-MM-DD.",
    inexistente: "Essa data não existe no calendário. Confira o dia, o mês e o ano.",
    futura: "A data de nascimento não pode estar no futuro.",
    menor: `Para criar uma conta é preciso ter ${IDADE_MINIMA} anos ou mais.`,
    implausivel: "Confira o ano de nascimento: essa data parece digitada errado."
};
