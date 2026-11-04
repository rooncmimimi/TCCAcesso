/**
 * Catálogos e regras do ambiente de trabalho de uma vaga (Bloco 3): a prévia sensorial, o mapa de
 * acessibilidade física e as adaptações que a entrevista oferece.
 *
 * É informação ESCRITA PELA EMPRESA sobre a vaga, sem dado pessoal. Tudo é opcional: o que não foi
 * informado não existe nos objetos (nunca vira um valor padrão inventado), e a tela diz "a empresa
 * não informou". As listas são fechadas e vivem só aqui: o front-end as recebe pela API
 * (`GET /vagas/catalogo-acessibilidade`).
 */

import { ADAPTACOES } from "./adaptacoes.js";

export const LIMITES_DO_AMBIENTE = { rotina: 500, detalheFisico: 200, observacaoEntrevista: 500 };

/** Prévia sensorial: cada característica, com as respostas possíveis. */
export const AMBIENTE_SENSORIAL = [
    {
        chave: "ruido",
        rotulo: "Nível de ruído",
        opcoes: [
            { valor: "silencioso", rotulo: "Silencioso" },
            { valor: "moderado", rotulo: "Moderado" },
            { valor: "alto", rotulo: "Alto" }
        ]
    },
    {
        chave: "iluminacao",
        rotulo: "Iluminação",
        opcoes: [
            { valor: "natural", rotulo: "Luz natural" },
            { valor: "artificial_suave", rotulo: "Luz artificial suave" },
            { valor: "artificial_forte", rotulo: "Luz artificial forte" },
            { valor: "ajustavel", rotulo: "Ajustável por quem trabalha" }
        ]
    },
    {
        chave: "espaco",
        rotulo: "Espaço de trabalho",
        opcoes: [
            { valor: "individual", rotulo: "Individual" },
            { valor: "compartilhado", rotulo: "Compartilhado" },
            { valor: "misto", rotulo: "Misto" }
        ]
    },
    {
        chave: "interrupcoes",
        rotulo: "Interrupções durante o trabalho",
        opcoes: [
            { valor: "raras", rotulo: "Raras" },
            { valor: "ocasionais", rotulo: "Ocasionais" },
            { valor: "frequentes", rotulo: "Frequentes" }
        ]
    },
    {
        chave: "pausas",
        rotulo: "Pausas",
        opcoes: [
            { valor: "livres", rotulo: "Livres, quando a pessoa precisar" },
            { valor: "programadas", rotulo: "Em horários programados" },
            { valor: "nao_previstas", rotulo: "Não previstas" }
        ]
    },
    {
        chave: "comunicacao",
        rotulo: "Comunicação predominante",
        opcoes: [
            { valor: "escrita", rotulo: "Escrita" },
            { valor: "oral", rotulo: "Oral" },
            { valor: "mista", rotulo: "Escrita e oral" }
        ]
    }
];

/** Itens do mapa de acessibilidade física. */
export const ITENS_FISICOS = [
    { chave: "rampa", rotulo: "Rampas" },
    { chave: "elevador", rotulo: "Elevadores" },
    { chave: "banheiro_acessivel", rotulo: "Banheiros acessíveis" },
    { chave: "entrada_sem_degraus", rotulo: "Entrada sem degraus" },
    { chave: "estacionamento", rotulo: "Estacionamento acessível" },
    { chave: "piso_tatil", rotulo: "Piso tátil" },
    { chave: "sinalizacao", rotulo: "Sinalização acessível" },
    { chave: "circulacao", rotulo: "Circulação interna" },
    { chave: "local_entrevista", rotulo: "Local da entrevista" }
];

export const SITUACOES_FISICAS = [
    { valor: "sim", rotulo: "Sim" },
    { valor: "parcial", rotulo: "Parcial" },
    { valor: "nao", rotulo: "Não" }
];

/** Origem da informação: a empresa só DECLARA; quem marca "verificado" é a moderação. */
export const ORIGENS_FISICAS = [
    { valor: "declarado", rotulo: "Declarado pela empresa" },
    { valor: "verificado", rotulo: "Verificado pela equipe do ACESSO" }
];

/** Adaptações que uma entrevista pode oferecer: um recorte do catálogo de adaptações do Bloco 2. */
export const CHAVES_DE_ENTREVISTA = [
    "interprete_libras",
    "legendas",
    "comunicacao_alternativa",
    "instrucoes_escritas",
    "pausas",
    "tempo_adicional",
    "perguntas_antecipadas",
    "entrevista_por_texto",
    "entrevista_por_video",
    "local_acessivel"
];

export const OPCOES_DE_ENTREVISTA = ADAPTACOES.filter((a) => CHAVES_DE_ENTREVISTA.includes(a.chave)).map(({ chave, rotulo }) => ({ chave, rotulo }));

export function catalogoDoAmbiente() {
    return {
        ambienteSensorial: AMBIENTE_SENSORIAL,
        itensFisicos: ITENS_FISICOS,
        situacoesFisicas: SITUACOES_FISICAS,
        origensFisicas: ORIGENS_FISICAS,
        entrevista: OPCOES_DE_ENTREVISTA
    };
}

const ehObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const textoOuNulo = (valor, maximo) => {
    if (typeof valor !== "string") return null;
    const limpo = valor.replace(/\s+/g, " ").trim();
    return limpo ? limpo.slice(0, maximo) : null;
};

/**
 * Prévia sensorial: só chaves e valores do catálogo, mais a rotina. Valor fora da lista é um ERRO
 * (devolvido em `erros`), não é ignorado em silêncio. Chave ausente ou vazia = não informado.
 */
export function normalizarAmbienteSensorial(entrada) {
    const erros = [];
    const resultado = {};

    if (entrada === undefined || entrada === null) return { valor: {}, erros };

    if (!ehObjeto(entrada)) return { valor: {}, erros: ["A prévia sensorial deve ser um objeto."] };

    const conhecidas = new Set([...AMBIENTE_SENSORIAL.map((c) => c.chave), "rotina"]);

    for (const chave of Object.keys(entrada)) {
        if (!conhecidas.has(chave)) erros.push(`Característica desconhecida: ${chave}.`);
    }

    for (const caracteristica of AMBIENTE_SENSORIAL) {
        const valor = entrada[caracteristica.chave];

        if (valor === undefined || valor === null || valor === "") continue;

        if (!caracteristica.opcoes.some((o) => o.valor === valor)) {
            erros.push(`Valor inválido para ${caracteristica.rotulo}.`);
            continue;
        }

        resultado[caracteristica.chave] = valor;
    }

    const rotina = textoOuNulo(entrada.rotina, LIMITES_DO_AMBIENTE.rotina);
    if (rotina) resultado.rotina = rotina;

    return { valor: resultado, erros };
}

/**
 * Mapa de acessibilidade física. A empresa envia, por item, só `situacao` e `detalhe`; a `origem` é
 * decidida AQUI, nunca pelo cliente:
 *  - um item novo ou alterado fica "declarado";
 *  - um item que já estava "verificado" e NÃO mudou (mesma situação e mesmo detalhe) continua verificado.
 * Alterar o que foi verificado derruba a verificação: a moderação conferiu outra coisa.
 */
export function normalizarAcessibilidadeFisica(entrada, atual = {}) {
    const erros = [];
    const resultado = {};

    if (entrada === undefined || entrada === null) return { valor: ehObjeto(atual) ? atual : {}, erros, mudou: false };

    if (!ehObjeto(entrada)) return { valor: {}, erros: ["O mapa de acessibilidade física deve ser um objeto."], mudou: false };

    const conhecidos = new Set(ITENS_FISICOS.map((i) => i.chave));

    for (const chave of Object.keys(entrada)) {
        if (!conhecidos.has(chave)) erros.push(`Item desconhecido: ${chave}.`);
    }

    for (const item of ITENS_FISICOS) {
        const dado = entrada[item.chave];

        if (dado === undefined || dado === null) continue;

        if (!ehObjeto(dado) || !SITUACOES_FISICAS.some((s) => s.valor === dado.situacao)) {
            erros.push(`Situação inválida para ${item.rotulo}.`);
            continue;
        }

        const detalhe = textoOuNulo(dado.detalhe, LIMITES_DO_AMBIENTE.detalheFisico);
        const anterior = ehObjeto(atual) ? atual[item.chave] : undefined;
        const igual = anterior && anterior.situacao === dado.situacao && (anterior.detalhe ?? null) === detalhe;
        const mantemVerificacao = Boolean(igual && anterior.origem === "verificado");

        resultado[item.chave] = {
            situacao: dado.situacao,
            origem: mantemVerificacao ? "verificado" : "declarado",
            ...(detalhe ? { detalhe } : {}),
            ...(mantemVerificacao && anterior.verificadoEm ? { verificadoEm: anterior.verificadoEm } : {})
        };
    }

    return { valor: resultado, erros, mudou: JSON.stringify(resultado) !== JSON.stringify(atual ?? {}) };
}

/**
 * A moderação marca (ou desmarca) itens como verificados. Só vale para itens que existem e têm
 * situação. Devolve o novo mapa e as chaves que de fato mudaram.
 */
export function aplicarVerificacao(atual, chaves, verificado, agora = new Date()) {
    const mapa = ehObjeto(atual) ? { ...atual } : {};
    const alteradas = [];

    for (const chave of chaves) {
        const item = mapa[chave];

        if (!item || !SITUACOES_FISICAS.some((s) => s.valor === item.situacao)) continue;

        const novaOrigem = verificado ? "verificado" : "declarado";
        if (item.origem === novaOrigem) continue;

        const { verificadoEm: _antiga, ...resto } = item;
        mapa[chave] = verificado ? { ...resto, origem: "verificado", verificadoEm: agora.toISOString() } : { ...resto, origem: "declarado" };
        alteradas.push(chave);
    }

    return { valor: mapa, alteradas };
}

/** Adaptações da entrevista: só chaves do recorte permitido, sem repetir. Chave fora da lista é erro. */
export function normalizarEntrevista(entrada) {
    if (entrada === undefined || entrada === null) return { valor: [], erros: [] };

    if (!Array.isArray(entrada)) return { valor: [], erros: ["As adaptações da entrevista devem ser uma lista."] };

    const erros = entrada.filter((c) => typeof c !== "string" || !CHAVES_DE_ENTREVISTA.includes(c)).map((c) => `Adaptação de entrevista inválida: ${String(c).slice(0, 40)}.`);
    const pedidas = new Set(entrada.filter((c) => typeof c === "string"));
    const valor = OPCOES_DE_ENTREVISTA.filter((o) => pedidas.has(o.chave)).map((o) => o.chave);

    return { valor, erros };
}

export function observacaoDeEntrevista(valor) {
    return textoOuNulo(valor, LIMITES_DO_AMBIENTE.observacaoEntrevista);
}
