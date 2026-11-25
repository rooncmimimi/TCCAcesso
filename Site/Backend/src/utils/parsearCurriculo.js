/**
 * Parser heurístico de currículo, sem IA: só regex e posição das linhas. Sempre produz um rascunho
 * e nunca grava nada sozinho; quem chama decide o que confirmar.
 *
 * **O que mudou, e por quê.** Antes, cargo, empresa, datas, curso e instituição vinham sempre em
 * branco: o texto inteiro da seção virava uma `descricaoSugerida` só, e a pessoa redigitava tudo. Em
 * um currículo comum — "Empresa (SIGLA) 12/2024 - 04/2026" seguido dos marcadores do que foi feito —
 * essas informações estão escritas de um jeito reconhecível, e deixar de lê-las era desperdiçar o
 * arquivo que a pessoa acabou de enviar.
 *
 * **O limite continua o mesmo: não inventar.** Cada campo só é preenchido quando o texto diz aquilo
 * com clareza (uma data no formato de data, um nome com marca de empresa, um curso com palavra de
 * curso). Na dúvida, o campo fica vazio e o trecho vai inteiro para `descricaoSugerida` — como era
 * antes —, porque um campo errado custa mais do que um campo vazio: a pessoa não confere o que já
 * parece preenchido.
 *
 * Nunca procura nem devolve CPF. Currículo é texto não confiável: um número de 11 dígitos pode ser
 * de outra pessoa (uma referência), estar errado ou ser coincidência. O CPF do candidato nunca deve
 * ser preenchido a partir daqui, então nem tentamos extrair.
 */

const CABECALHOS = {
    // Captura e descarta: evita que telefone, endereço e afins caiam na seção anterior.
    contato: ["dados pessoais", "contato", "informacoes pessoais", "dados de contato", "identificacao"],
    resumo: ["resumo", "objetivo", "sobre mim", "perfil profissional", "sumario", "apresentacao"],
    experiencias: [
        "experiencia profissional",
        "experiencias profissionais",
        "experiencia",
        "historico profissional",
        "atuacao profissional",
        "trajetoria profissional"
    ],
    formacoes: ["formacao academica", "formacao educacional", "formacao", "educacao", "escolaridade"],
    // Cursos e idiomas não são formação acadêmica nem experiência. Sem este cabeçalho, eles caíam
    // na seção anterior e viravam "experiências" ou "formações" que não existem.
    cursos: [
        "cursos",
        "cursos extracurriculares",
        "cursos complementares",
        "formacao complementar",
        "qualificacoes complementares",
        "certificacoes",
        "certificados",
        "idiomas"
    ],
    habilidades: ["habilidades", "competencias", "skills", "conhecimentos", "qualificacoes"]
};

const MAX_ITENS_POR_SECAO = 6;
const MAX_HABILIDADES = 25;
const MAX_CARACTERES_ITEM = 500;

/** Marcador de lista: a linha é descrição do item anterior, nunca título de um item novo. */
const MARCADOR = /^\s*[-–—•·*▪◦o]\s+/;

/** Palavras que denunciam um cargo. Sem uma delas, o parser não chuta qual metade da linha é o cargo. */
const PALAVRAS_DE_CARGO = [
    "analista", "assistente", "auxiliar", "aux ", "aux.", "estagiario", "estagiaria", "aprendiz",
    "jovem aprendiz", "trainee", "desenvolvedor", "desenvolvedora", "programador", "programadora",
    "engenheiro", "engenheira", "tecnico", "tecnica", "operador", "operadora", "atendente",
    "vendedor", "vendedora", "consultor", "consultora", "gerente", "coordenador", "coordenadora",
    "supervisor", "supervisora", "diretor", "diretora", "designer", "estoquista", "almoxarife",
    "recepcionista", "secretario", "secretaria", "motorista", "professor", "professora", "instrutor",
    "instrutora", "monitor", "monitora", "assessor", "assessora", "especialista", "administrador",
    "administradora", "contador", "contadora", "advogado", "advogada", "enfermeiro", "enfermeira",
    "cuidador", "cuidadora", "porteiro", "zelador", "cozinheiro", "cozinheira", "garcom", "caixa",
    "repositor", "promotor", "conferente", "soldador", "mecanico", "eletricista", "pedreiro",
    "costureira", "manicure", "barbeiro", "cabeleireiro", "freelancer", "autonomo"
];

/** Marcas de nome de empresa. Servem para decidir qual metade da linha é a empresa. */
const MARCAS_DE_EMPRESA = [
    "ltda", "s/a", "s.a", " sa ", "me ", " me", "eireli", "mei", "epp", "industria", "industrias",
    "comercio", "equipamentos", "tecnologia", "tecnologias", "solucoes", "servicos", "grupo",
    "consultoria", "transportes", "distribuidora", "supermercado", "mercado", "banco", "hospital",
    "clinica", "prefeitura", "associacao", "fundacao", "cooperativa", "construtora", "logistica",
    "telecom", "seguros", "imobiliaria", "restaurante", "padaria", "farmacia", "loja", "lojas"
];

/** Palavras de curso: o lado da linha que tem uma delas é o curso, e não a instituição. */
const PALAVRAS_DE_CURSO = [
    "ensino", "tecnico", "tecnologo", "bacharelado", "bacharel", "licenciatura", "graduacao",
    "superior", "mestrado", "doutorado", "pos-graduacao", "pos graduacao", "mba", "curso",
    "formacao", "especializacao", "analise e desenvolvimento", "fundamental", "medio"
];

/** Marcas de instituição de ensino. */
const MARCAS_DE_INSTITUICAO = [
    "etec", "fatec", "senai", "senac", "sesi", "universidade", "faculdade", "instituto", "escola",
    "colegio", "centro universitario", "unip", "uninove", "usp", "unicamp", "unesp", "puc", "ifsp",
    "estadual", "federal", "anhanguera", "estacio", "mackenzie"
];

/** Situação do curso: diz se está em andamento, mas não é nome de instituição. */
const SITUACOES = [
    "cursando", "em andamento", "incompleto", "trancado", "interrompido", "concluido", "completo",
    "concluida", "finalizado", "previsto", "prev", "conclusao", "concl", "inicio", "formado"
];

const EM_ANDAMENTO = ["cursando", "em andamento", "prev", "previsto", "andamento", "incompleto", "atual"];

const MESES = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12
};

const AGORA = ["atual", "atualmente", "presente", "momento", "hoje", "em curso"];

function normalizar(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

const contemAlguma = (texto, palavras) => {
    const limpo = ` ${normalizar(texto)} `;

    return palavras.some((palavra) => limpo.includes(palavra.trim() ? ` ${palavra.trim()}` : palavra));
};

function identificarCabecalho(linha) {
    const limpa = normalizar(linha).replace(/[:\-–—&|]+$/, "").trim();
    if (!limpa || limpa.length > 45) return null; // cabeçalho é curto: evita casar com um parágrafo inteiro

    // A chave mais longa ganha: "formacao complementar" é curso, não formação acadêmica.
    let melhor = null;

    for (const [secao, chaves] of Object.entries(CABECALHOS)) {
        for (const chave of chaves) {
            if ((limpa === chave || limpa.startsWith(`${chave} `) || limpa.startsWith(chave)) &&
                (!melhor || chave.length > melhor.chave.length)) {
                melhor = { secao, chave };
            }
        }
    }

    return melhor?.secao ?? null;
}

/* ------------------------------------------------------------------ datas */

/**
 * Datas como aparecem em currículo: `12/2024`, `2024`, `ago/2025`, `08.2025` e "atual".
 * Devolve `YYYY-MM-DD` (dia 1) porque o formulário usa `<input type="date">`; mês desconhecido vira
 * janeiro, que é o que o próprio campo mostraria.
 */
function lerDatas(texto) {
    const achadas = [];
    // `(?<!\d)` antes do mês: sem isso, "2019 - 2021" casava como mês 19 do ano 2021, engolia os
    // dois anos e sobrava "Atendente 2019" no nome do cargo.
    // O mês por extenso é uma lista fechada: aceitar qualquer palavra fazia "Atendente 2019" virar
    // "mês Atendente de 2019", comendo o ano e deixando o resto no nome do cargo.
    const padrao =
        /(?<!\d)(0?[1-9]|1[0-2])\s*[\/.-]\s*((?:19|20)\d{2})(?!\d)|\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?\s*[\/.-]?\s*(?:de\s+)?((?:19|20)\d{2})\b|\b((?:19|20)\d{2})\b/gi;

    let encontro;

    while ((encontro = padrao.exec(texto)) !== null) {
        const [, mesNumero, anoDoMes, mesNome, anoDoNome, anoSozinho] = encontro;

        if (mesNumero && Number(mesNumero) >= 1 && Number(mesNumero) <= 12) {
            achadas.push({ ano: Number(anoDoMes), mes: Number(mesNumero), trecho: encontro[0] });
        } else if (mesNome) {
            const mes = MESES[normalizar(mesNome).slice(0, 3)];
            if (mes) achadas.push({ ano: Number(anoDoNome), mes, trecho: encontro[0] });
        } else if (anoSozinho) {
            const ano = Number(anoSozinho);
            if (ano >= 1950 && ano <= 2100) achadas.push({ ano, mes: 1, trecho: encontro[0] });
        }
    }

    return achadas.filter((d) => d.ano >= 1950 && d.ano <= 2100);
}

const paraIso = (data) => `${data.ano}-${String(data.mes).padStart(2, "0")}-01`;

/** Tira da linha o que já foi lido como data (e o traço que ligava as duas), sobrando o nome. */
function semAsDatas(linha, datas) {
    let resto = linha;

    for (const data of datas) resto = resto.replace(data.trecho, " ");

    for (const agora of AGORA) {
        resto = resto.replace(new RegExp(`\\b${agora}\\b`, "gi"), " ");
    }

    return resto
        .replace(/\(\s*\)/g, " ")
        .replace(/[\s]*[-–—|•·]+[\s]*$/g, "")
        .replace(/^[\s]*[-–—|•·]+[\s]*/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/[\s,;:|–—-]+$/g, "")
        .trim();
}

/* ------------------------------------------------------- itens de uma seção */

/**
 * Uma linha abre um item novo? É a decisão central do parser, e ela se apoia em como currículo é
 * escrito: título é curto e costuma trazer a data; o que a pessoa fez vem em marcador ou em frase.
 *
 * Isso resolve os dois formatos que aparecem na prática — o que separa os itens por linha em branco
 * e o que usa marcadores — sem precisar de um deles.
 */
function ehTitulo(linha, temDatas) {
    if (MARCADOR.test(linha)) return false;
    if (temDatas) return true;

    const limpa = linha.trim();
    const palavras = limpa.split(/\s+/).length;

    if (/[.;]$/.test(limpa)) return false; // frase terminada é descrição

    // "Realização de...", "Separação de...", "Utilização de...": o que a pessoa fazia, não onde.
    // Sem isto, um currículo que lista as tarefas em linhas soltas (sem marcador e sem data) virava
    // uma experiência por tarefa — foi o que aconteceu com o currículo em DOCX deste relato.
    if (/^[\wÀ-ü]+(ção|ções|mento|mentos|agem|ância|ência)\s+(de|do|da|dos|das|no|na|em)\b/i.test(limpa)) {
        return false;
    }

    const temSeparador = /\s[-–—|@]\s|\bna\b|\bno\b/i.test(limpa);

    return palavras <= 5 || (temSeparador && palavras <= 10);
}

/** Divide as linhas de uma seção em itens: cada um com a linha de título e as linhas de descrição. */
function dividirEmItens(linhas) {
    const itens = [];
    let atual = null;

    for (const bruta of linhas) {
        const linha = bruta.replace(/\s+/g, " ").trim();

        if (!linha) continue;

        const datas = lerDatas(linha);

        if (!atual || ehTitulo(linha, datas.length > 0)) {
            atual = { titulo: linha, datas, descricao: [] };
            itens.push(atual);
        } else {
            atual.descricao.push(linha.replace(MARCADOR, "").trim());
        }
    }

    return itens;
}

/* ----------------------------------------------------------- experiências */

/** Tira do fim do nome a cidade ou o estado: "Alpina (ITEMM), SBC" é a empresa "Alpina (ITEMM)". */
function semLocal(nome) {
    const partes = nome.split(",");
    if (partes.length < 2) return nome.trim();

    const ultima = partes[partes.length - 1].trim();
    const ehLocal = /^[A-ZÀ-Ü]{2,4}$/.test(ultima) || /\b[-–]\s*[A-Z]{2}$/.test(ultima) || ultima.split(/\s+/).length <= 3;

    return (ehLocal ? partes.slice(0, -1).join(",") : nome).trim();
}

/**
 * Separa cargo e empresa de uma linha de título.
 *
 * Só preenche quando um dos lados se identifica: palavra de cargo de um lado, marca de empresa do
 * outro. Linha sem separador vira só empresa quando parece nome de empresa, e só cargo quando parece
 * cargo. Nada disso acontecendo, os dois ficam vazios — o texto continua visível na descrição.
 */
function separarCargoEEmpresa(titulo) {
    const nome = semLocal(titulo);
    if (!nome) return { cargo: "", empresa: "" };

    // "em" não entra como separador: ele aparece no meio de frase ("em serviços variados") e
    // partiria uma linha que é texto corrido, não "cargo em empresa".
    const partes = nome
        .split(/\s+[-–—|]\s+|\s+(?:na|no|@)\s+|:\s+/i)
        .map((parte) => parte.trim())
        .filter(Boolean);

    if (partes.length >= 2) {
        const [a, b] = partes;
        const aCargo = contemAlguma(a, PALAVRAS_DE_CARGO);
        const bCargo = contemAlguma(b, PALAVRAS_DE_CARGO);
        const aEmpresa = contemAlguma(a, MARCAS_DE_EMPRESA);
        const bEmpresa = contemAlguma(b, MARCAS_DE_EMPRESA);

        if (aCargo && !bCargo) return { cargo: a, empresa: b };
        if (bCargo && !aCargo) return { cargo: b, empresa: a };
        if (aEmpresa && !bEmpresa) return { cargo: b, empresa: a };
        if (bEmpresa && !aEmpresa) return { cargo: a, empresa: b };

        // Sem nenhum sinal, o costume ("Cargo - Empresa") só vale se os dois lados forem nomes
        // curtos. Em frase comprida, a chance de errar é maior do que a de acertar, e campo errado
        // custa mais que campo vazio.
        const curtos = [a, b].every((parte) => parte.split(/\s+/).length <= 5);

        return curtos ? { cargo: a, empresa: b } : { cargo: "", empresa: "" };
    }

    // Frase comprida não é nome de nada — nem quando contém uma palavra que também aparece em nome
    // de empresa ("serviços", "comércio"). Ela fica inteira na descrição, que é onde continua
    // servindo para alguma coisa.
    if (nome.split(/\s+/).length > 6) return { cargo: "", empresa: "" };

    if (contemAlguma(nome, PALAVRAS_DE_CARGO) && !contemAlguma(nome, MARCAS_DE_EMPRESA)) {
        return { cargo: nome, empresa: "" };
    }

    return { cargo: "", empresa: nome };
}

function montarExperiencia(item) {
    const { cargo, empresa } = separarCargoEEmpresa(semAsDatas(item.titulo, item.datas));
    const atual = AGORA.some((palavra) => normalizar(item.titulo).includes(palavra));
    const [inicio, fim] = item.datas;

    // Sem nada reconhecido, devolve o item como era antes: texto bruto, campos vazios.
    const descricao = [cargo || empresa || item.datas.length ? "" : item.titulo, ...item.descricao]
        .filter(Boolean)
        .join("\n");

    return {
        cargo,
        empresa,
        dataInicio: inicio ? paraIso(inicio) : "",
        dataFim: !atual && fim ? paraIso(fim) : "",
        atual,
        descricaoSugerida: descricao.slice(0, MAX_CARACTERES_ITEM)
    };
}

/* -------------------------------------------------------------- formações */

function montarFormacao(item) {
    // O que vem entre parênteses é situação e data ("(Início: 08/2025 | Prev. 12/2026)"), não nome.
    const parenteses = item.titulo.match(/\(([^)]*)\)/g)?.join(" ") ?? "";
    const semParenteses = item.titulo.replace(/\([^)]*\)/g, " ").replace(/\s{2,}/g, " ").trim();
    const datas = lerDatas(`${semParenteses} ${parenteses}`);
    const nome = semAsDatas(semParenteses, lerDatas(semParenteses));

    const partes = nome
        .split(/\s+[-–—|]\s+|:\s*/)
        .map((parte) => parte.trim())
        .filter((parte) => parte && !SITUACOES.includes(normalizar(parte)));

    let curso = "";
    let instituicao = "";

    if (partes.length >= 2) {
        const [a, b] = partes;
        const aCurso = contemAlguma(a, PALAVRAS_DE_CURSO);
        const bCurso = contemAlguma(b, PALAVRAS_DE_CURSO);
        const aInst = contemAlguma(a, MARCAS_DE_INSTITUICAO);
        const bInst = contemAlguma(b, MARCAS_DE_INSTITUICAO);

        if (bInst && !aInst) [curso, instituicao] = [a, b];
        else if (aInst && !bInst) [curso, instituicao] = [b, a];
        else if (aCurso && !bCurso) [curso, instituicao] = [a, b];
        else if (bCurso && !aCurso) [curso, instituicao] = [b, a];
        else [curso, instituicao] = [a, b]; // costume: "Curso - Instituição"
    } else if (partes.length === 1) {
        const unico = partes[0];
        if (contemAlguma(unico, MARCAS_DE_INSTITUICAO) && !contemAlguma(unico, PALAVRAS_DE_CURSO)) instituicao = unico;
        else curso = unico;
    }

    const emAndamento =
        EM_ANDAMENTO.some((palavra) => normalizar(item.titulo).includes(palavra)) ||
        (datas.length > 0 && datas[datas.length - 1].ano > new Date().getFullYear());

    return {
        instituicao,
        curso,
        dataFim: !emAndamento && datas.length ? paraIso(datas[datas.length - 1]) : "",
        emAndamento,
        descricaoSugerida: [curso || instituicao ? "" : item.titulo, ...item.descricao]
            .filter(Boolean)
            .join("\n")
            .slice(0, MAX_CARACTERES_ITEM)
    };
}

/* ------------------------------------------------------------ habilidades */

/**
 * Lista de habilidades a partir do texto da seção.
 *
 * Três sujeiras que apareciam e saíram: o marcador no começo da linha, o rótulo da categoria
 * ("Sistemas e Ferramentas: ...") e a quebra de linha do PDF no meio de um item ("Resolução de" +
 * "Problemas"). Lista dentro de parênteses vira item solto: "Pacote Office (Excel, Word)" são três.
 */
function extrairHabilidades(linhas) {
    const juntadas = [];

    for (const bruta of linhas) {
        const linha = bruta.replace(/\s+/g, " ").trim();
        if (!linha) continue;

        // Quebra de linha do PDF no meio de um item: a linha de cima termina em vírgula ou numa
        // palavra de ligação ("Resolução de" + "Problemas"), ou esta começa em minúscula.
        const anterior = juntadas[juntadas.length - 1] ?? "";
        const continua = /(,|\b(?:de|da|do|dos|das|e|em|para|com|a|o|no|na)\.?)$/i.test(anterior) || /^[a-zà-ü]/.test(linha);

        if (juntadas.length && continua && !MARCADOR.test(bruta)) {
            juntadas[juntadas.length - 1] += ` ${linha}`;
        } else {
            juntadas.push(linha);
        }
    }

    const itens = [];

    for (const linha of juntadas) {
        const semMarcador = linha.replace(MARCADOR, "");
        const semRotulo = semMarcador.replace(/^[^:]{3,45}:\s*/, "");
        const listaAberta = semRotulo.replace(/\(([^)]*,[^)]*)\)/g, ", $1");

        for (const pedaco of listaAberta.split(/[,;|•·]/)) {
            const item = pedaco
                .replace(/[()]/g, "")
                .replace(/^[\s.-]+|[\s.;-]+$/g, "")
                .trim();

            if (item.length >= 2 && item.length <= 80) itens.push(item);
        }
    }

    return [...new Set(itens)].slice(0, MAX_HABILIDADES);
}

/* ------------------------------------------------------------------ parse */

export function parsearCurriculo(textoCompleto) {
    const linhas = String(textoCompleto ?? "").split("\n");
    const secoes = { contato: [], resumo: [], experiencias: [], formacoes: [], cursos: [], habilidades: [] };

    let secaoAtual = null;

    for (const linha of linhas) {
        const cabecalho = identificarCabecalho(linha);

        if (cabecalho) {
            secaoAtual = cabecalho;
            continue;
        }

        if (secaoAtual) secoes[secaoAtual].push(linha);
    }

    const email = textoCompleto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
    const telefone = textoCompleto.match(/\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/)?.[0] ?? null;
    const linkedin = textoCompleto.match(/(https?:\/\/)?(www\.)?linkedin\.com\/[^\s,)]+/i)?.[0] ?? null;
    const github = textoCompleto.match(/(https?:\/\/)?(www\.)?github\.com\/[^\s,)]+/i)?.[0] ?? null;

    const experiencias = dividirEmItens(secoes.experiencias).slice(0, MAX_ITENS_POR_SECAO).map(montarExperiencia);
    const formacoes = dividirEmItens(secoes.formacoes).slice(0, MAX_ITENS_POR_SECAO).map(montarFormacao);
    const habilidades = extrairHabilidades(secoes.habilidades);

    const resumo =
        secoes.resumo
            .map((linha) => linha.replace(MARCADOR, "").trim())
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 2000) || null;

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
