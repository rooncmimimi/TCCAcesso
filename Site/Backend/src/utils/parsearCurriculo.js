/**
 * Parser heurístico de currículo — sem IA, só regex/heurística posicional.
 * Sempre produz um RASCUNHO (nunca grava nada sozinho — quem chama decide
 * o que confirmar). Sempre honesto sobre incerteza: nunca inventa cargo,
 * empresa ou data quando o texto não permite extrair isso com confiança —
 * nesses casos, devolve o trecho como `descricaoSugerida` (texto bruto),
 * deixando os campos estruturados em branco para o usuário preencher.
 *
 * REGRA INEGOCIÁVEL: nunca procura nem devolve CPF. Currículo é texto não
 * confiável — um número de 11 dígitos pode ser de terceiro (referência),
 * estar errado, ou ser coincidência. O campo CPF do candidato nunca deve
 * ser preenchido a partir daqui, então nem tentamos extrair.
 */

const CABECALHOS = {
    resumo: ["resumo", "objetivo", "sobre mim", "perfil profissional", "sumario"],
    experiencias: [
        "experiencia profissional",
        "experiencias profissionais",
        "experiencia",
        "historico profissional",
        "atuacao profissional"
    ],
    formacoes: ["formacao academica", "formacao", "educacao", "escolaridade"],
    habilidades: ["habilidades", "competencias", "skills", "conhecimentos"]
};

const MAX_ITENS_POR_SECAO = 6;
const MAX_HABILIDADES = 25;
const MAX_CARACTERES_ITEM = 500;

function normalizar(texto) {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

function identificarCabecalho(linha) {
    const limpa = normalizar(linha).replace(/[:\-–—]+$/, "").trim();
    if (!limpa || limpa.length > 40) return null; // cabeçalho é curto — evita casar com um parágrafo inteiro

    for (const [secao, chaves] of Object.entries(CABECALHOS)) {
        if (chaves.some((chave) => limpa === chave || limpa.startsWith(chave))) {
            return secao;
        }
    }

    return null;
}

/** Quebra o texto em blocos por linha em branco — cada bloco é um item candidato. */
function dividirEmBlocos(texto) {
    return texto
        .split(/\n\s*\n/)
        .map((bloco) => bloco.replace(/\s+/g, " ").trim())
        .filter(Boolean);
}

function extrairHabilidades(texto) {
    return [
        ...new Set(
            texto
                .split(/[,•·\n|]/)
                .map((item) => item.replace(/\s+/g, " ").trim())
                .filter((item) => item.length >= 2 && item.length <= 80)
        )
    ].slice(0, MAX_HABILIDADES);
}

export function parsearCurriculo(textoCompleto) {
    const linhas = textoCompleto.split("\n");
    const secoes = { resumo: [], experiencias: [], formacoes: [], habilidades: [] };

    let secaoAtual = null;
    let bufferAtual = [];

    const fecharBuffer = () => {
        if (secaoAtual && bufferAtual.length) {
            secoes[secaoAtual].push(bufferAtual.join("\n"));
        }
        bufferAtual = [];
    };

    for (const linha of linhas) {
        const cabecalho = identificarCabecalho(linha);
        if (cabecalho) {
            fecharBuffer();
            secaoAtual = cabecalho;
            continue;
        }
        if (secaoAtual) bufferAtual.push(linha);
    }
    fecharBuffer();

    const email = textoCompleto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
    const telefone = textoCompleto.match(/\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/)?.[0] ?? null;
    const linkedin =
        textoCompleto.match(/(https?:\/\/)?(www\.)?linkedin\.com\/[^\s,)]+/i)?.[0] ?? null;
    const github = textoCompleto.match(/(https?:\/\/)?(www\.)?github\.com\/[^\s,)]+/i)?.[0] ?? null;

    const experiencias = dividirEmBlocos(secoes.experiencias.join("\n\n"))
        .slice(0, MAX_ITENS_POR_SECAO)
        .map((bloco) => ({
            cargo: "",
            empresa: "",
            dataInicio: "",
            dataFim: "",
            atual: false,
            descricaoSugerida: bloco.slice(0, MAX_CARACTERES_ITEM)
        }));

    const formacoes = dividirEmBlocos(secoes.formacoes.join("\n\n"))
        .slice(0, MAX_ITENS_POR_SECAO)
        .map((bloco) => ({
            instituicao: "",
            curso: "",
            dataFim: "",
            emAndamento: false,
            descricaoSugerida: bloco.slice(0, MAX_CARACTERES_ITEM)
        }));

    const habilidades = extrairHabilidades(secoes.habilidades.join("\n"));
    const resumo = secoes.resumo.join(" ").replace(/\s+/g, " ").trim().slice(0, 2000) || null;

    return {
        email,
        telefone,
        linkedin,
        github,
        resumo,
        experiencias,
        formacoes,
        habilidades,
        aviso:
            "Extração automática por palavras-chave, sem inteligência artificial — revise e complete cada campo antes de salvar."
    };
}
