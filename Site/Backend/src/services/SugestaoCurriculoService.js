import OpenRouterService from "./OpenRouterService.js";

/**
 * Completa, com IA, **só o que a leitura por regras deixou em branco** no rascunho do currículo.
 *
 * Por que existe: `parsearCurriculo` lê bem o que está escrito de forma reconhecível (empresa,
 * período, curso), mas muito currículo não diz o cargo em lugar nenhum — ele está implícito no que
 * a pessoa descreve ter feito. Esses campos ficavam vazios e a pessoa redigitava. Aqui um modelo
 * lê o mesmo texto e propõe o que falta.
 *
 * ----------------------------------------------------------------------------------------------
 * AS TRÊS REGRAS QUE SEGURAM ISTO
 *
 * 1. **Só preenche buraco.** O que as regras já leram nunca é sobrescrito: a IA não "corrige" o
 *    que está no papel. Sem buraco nenhum, o modelo nem é chamado.
 *
 * 2. **Copiar exige prova; deduzir é declarado.** Empresa, datas, curso e instituição são FATOS:
 *    só entram se o texto devolvido aparecer mesmo no currículo (`apareceNoTexto`). Cargo, título
 *    profissional e escolaridade são DEDUÇÃO — não estão escritos lá — e por isso voltam marcados
 *    em `deduzidos`, para a tela mostrar que aquilo é palpite a conferir.
 *
 * 3. **Nada sensível.** O prompt proíbe e o código recusa qualquer sugestão que fale de
 *    deficiência, diagnóstico, saúde, religião, raça, idade ou gênero. Isso não é campo de
 *    currículo, e muito menos coisa que um modelo deva inferir de quem está procurando emprego.
 *
 * Antes de sair daqui, o texto perde o que não interessa ao cargo: CPF, RG, endereço, telefone,
 * e-mail e data de nascimento (`semDadosPessoais`). O que vai ao provedor é a parte profissional.
 */

/** Teto do que é enviado: currículo é de uma a duas páginas, e isso cobre com folga. */
const MAX_CARACTERES_ENVIADOS = 6000;

/** A resposta é um JSON pequeno; o resto do orçamento de tokens é desperdício. */
const MAX_TOKENS_RESPOSTA = 700;

const MAX_CARGO = 70;
const MAX_NOME = 120;

/** As mesmas opções do formulário: escolaridade fora desta lista não é preenchida. */
export const ESCOLARIDADES = [
    "Ensino fundamental",
    "Ensino médio",
    "Ensino técnico",
    "Ensino superior cursando",
    "Ensino superior completo",
    "Pós-graduação",
    "Mestrado",
    "Doutorado"
];

/** Assunto que nenhuma sugestão pode tocar, venha de onde vier. */
const PROIBIDAS = [
    "deficien", "diagnostic", "transtorno", "autis", "sindrome", "doenca", "saude", "cadeirante",
    "surdo", "cego", "mobilidade reduzida", "laudo", "cid ", "medicament", "religi", "evangelic",
    "catolic", "umbanda", "candomble", "judeu", "muculman", "raca", "negro", "branco", "pardo",
    "indigena", "genero", "orientacao sexual", "casado", "solteiro", "gravid", "anos de idade"
];

const INSTRUCOES = {
    pt: `Você recebe o texto de um currículo e uma lista do que NÃO foi possível ler automaticamente.
Responda APENAS com um JSON válido, sem markdown e sem explicação.

Formato:
{"tituloProfissional":null,"escolaridade":null,"experiencias":[{"indice":0,"cargo":null,"empresa":null,"dataInicio":null,"dataFim":null}],"formacoes":[{"indice":0,"curso":null,"instituicao":null}]}

Regras obrigatórias:
- Use null sempre que não tiver certeza. Null é a resposta certa quando o currículo não deixa claro.
- empresa, curso, instituicao e as datas devem ser COPIADOS do texto, exatamente como aparecem lá. Nunca escreva um nome que não esteja no currículo.
- Datas no formato AAAA-MM.
- cargo e tituloProfissional podem ser deduzidos do que a pessoa descreve ter feito, em no máximo 4 palavras, usando o nome comum da ocupação no Brasil.
- escolaridade, se preencher, deve ser exatamente uma destas: ${ESCOLARIDADES.join(" | ")}.
- NUNCA mencione deficiência, diagnóstico, saúde, religião, raça, idade, gênero ou estado civil.
- Não invente experiência, empresa, curso ou data que não esteja escrita.`,
    en: `You receive the text of a CV and a list of what could not be read automatically.
Answer ONLY with valid JSON, no markdown and no explanation.

Format:
{"tituloProfissional":null,"escolaridade":null,"experiencias":[{"indice":0,"cargo":null,"empresa":null,"dataInicio":null,"dataFim":null}],"formacoes":[{"indice":0,"curso":null,"instituicao":null}]}

Mandatory rules:
- Use null whenever you are not sure. Null is the right answer when the CV is not clear.
- empresa, curso, instituicao and the dates must be COPIED from the text, exactly as they appear. Never write a name that is not in the CV.
- Dates in YYYY-MM format.
- cargo and tituloProfissional may be inferred from what the person describes having done, in at most 4 words, using the common Brazilian name for the occupation, written in Portuguese.
- escolaridade, if filled, must be exactly one of: ${ESCOLARIDADES.join(" | ")}.
- NEVER mention disability, diagnosis, health, religion, race, age, gender or marital status.
- Do not invent experience, company, course or date that is not written.`,
    es: `Recibes el texto de un currículum y una lista de lo que no se pudo leer automáticamente.
Responde SOLO con un JSON válido, sin markdown y sin explicación.

Formato:
{"tituloProfissional":null,"escolaridade":null,"experiencias":[{"indice":0,"cargo":null,"empresa":null,"dataInicio":null,"dataFim":null}],"formacoes":[{"indice":0,"curso":null,"instituicao":null}]}

Reglas obligatorias:
- Usa null siempre que no tengas certeza. Null es la respuesta correcta cuando el currículum no lo deja claro.
- empresa, curso, instituicao y las fechas deben ser COPIADOS del texto, tal como aparecen. Nunca escribas un nombre que no esté en el currículum.
- Fechas en formato AAAA-MM.
- cargo y tituloProfissional pueden deducirse de lo que la persona describe haber hecho, en 4 palabras como máximo, con el nombre común de la ocupación en Brasil, escrito en portugués.
- escolaridade, si la completas, debe ser exactamente una de: ${ESCOLARIDADES.join(" | ")}.
- NUNCA menciones discapacidad, diagnóstico, salud, religión, raza, edad, género ni estado civil.
- No inventes experiencia, empresa, curso ni fecha que no esté escrita.`
};

const normalizar = (texto) =>
    String(texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

/**
 * O texto que sai do servidor. Tira o que identifica a pessoa e não ajuda em nada a deduzir cargo:
 * CPF, RG, endereço, CEP, telefone, e-mail e data de nascimento.
 */
/** Cabeçalhos que marcam onde começa a parte profissional do currículo. */
const PRIMEIRA_SECAO =
    /^\s*(resumo|objetivo|perfil|sobre mim|experi[êe]ncia|hist[óo]rico|forma[çc][ãa]o|educa[çc][ãa]o|escolaridade|compet[êe]ncias|habilidades|qualifica[çc][õo]es|cursos|idiomas)\b/im;

export function semDadosPessoais(texto) {
    const completo = String(texto ?? "");

    // O bloco do topo (nome, endereço, contato) não ajuda a deduzir cargo nenhum. Quando dá para
    // saber onde a parte profissional começa, só ela é enviada; o resto nem sai daqui.
    const inicio = completo.search(PRIMEIRA_SECAO);

    return String(inicio > 0 ? completo.slice(inicio) : completo)
        .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento]")
        .replace(/\b\d{1,2}\.?\d{3}\.?\d{3}-?[0-9xX]\b/g, "[documento]")
        .replace(/\b\d{5}-?\d{3}\b/g, "[cep]")
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-mail]")
        .replace(/\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g, "[telefone]")
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, "[data]")
        .replace(/^.*\b(rua|avenida|av\.|travessa|alameda|estrada|rodovia)\b.*$/gim, "[endereço]")
        .replace(/^.*\b(nascimento|nasci)\b.*$/gim, "[nascimento]");
}

const temAssuntoProibido = (valor) => {
    const limpo = normalizar(valor);

    return PROIBIDAS.some((palavra) => limpo.includes(palavra));
};

/** Um FATO só entra se estiver escrito no currículo. É o que impede o modelo de inventar empresa. */
const apareceNoTexto = (valor, textoNormalizado) => {
    const limpo = normalizar(valor);

    return limpo.length >= 2 && textoNormalizado.includes(limpo);
};

const textoLimpo = (valor, maximo) => {
    if (typeof valor !== "string") return "";

    const limpo = valor.replace(/\s+/g, " ").trim();

    return limpo && limpo.length <= maximo && !temAssuntoProibido(limpo) ? limpo : "";
};

/** `AAAA-MM` (o que o prompt pede) vira a data do formulário; qualquer outra coisa é descartada. */
function dataValida(valor, textoNormalizado) {
    if (typeof valor !== "string") return "";

    const encontro = valor.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
    if (!encontro) return "";

    const [, ano, mes] = encontro;
    const anoNumero = Number(ano);
    const mesNumero = Number(mes);

    if (mesNumero < 1 || mesNumero > 12) return "";
    if (anoNumero < 1950 || anoNumero > new Date().getFullYear() + 10) return "";

    // O ano precisa estar escrito no currículo: data é fato, não dedução.
    return textoNormalizado.includes(ano) ? `${ano}-${mes}-01` : "";
}

/** Primeiro JSON da resposta, tolerando ```json e texto em volta. */
function lerJson(resposta) {
    const semCerca = String(resposta ?? "").replace(/```(?:json)?/gi, " ");
    const inicio = semCerca.indexOf("{");
    const fim = semCerca.lastIndexOf("}");

    if (inicio < 0 || fim <= inicio) return null;

    try {
        return JSON.parse(semCerca.slice(inicio, fim + 1));
    } catch {
        return null;
    }
}

/** O que ficou em branco, do jeito que o prompt entende. Vazio significa: não chame a IA. */
export function mapearLacunas(rascunho) {
    const experiencias = (rascunho.experiencias ?? [])
        .map((e, indice) => ({
            indice,
            faltam: ["cargo", "empresa", "dataInicio", "dataFim"].filter((campo) => !e[campo]),
            texto: [e.cargo, e.empresa, e.descricaoSugerida].filter(Boolean).join(" — ").slice(0, 400)
        }))
        .filter((e) => e.faltam.length > 0);

    const formacoes = (rascunho.formacoes ?? [])
        .map((f, indice) => ({
            indice,
            faltam: ["curso", "instituicao"].filter((campo) => !f[campo]),
            texto: [f.curso, f.instituicao, f.descricaoSugerida].filter(Boolean).join(" — ").slice(0, 200)
        }))
        .filter((f) => f.faltam.length > 0);

    return { experiencias, formacoes };
}

class SugestaoCurriculoService {
    disponivel() {
        return OpenRouterService.disponivel();
    }

    /**
     * Devolve o rascunho com as lacunas preenchidas e a lista do que foi **deduzido** (para a tela
     * marcar). Nunca lança por causa do modelo: se a IA falhar ou responder qualquer coisa, volta o
     * rascunho como estava — a importação por regras continua valendo.
     */
    async completar({ texto, rascunho, idioma = "pt" }) {
        const lacunas = mapearLacunas(rascunho);
        const semLacunas = lacunas.experiencias.length === 0 && lacunas.formacoes.length === 0;
        const faltaTitulo = !rascunho.tituloProfissional;

        if (!this.disponivel() || (semLacunas && !faltaTitulo)) {
            return { rascunho, deduzidos: null, usouIa: false };
        }

        const enviado = semDadosPessoais(texto).slice(0, MAX_CARACTERES_ENVIADOS);
        const instrucao = INSTRUCOES[idioma] ?? INSTRUCOES.pt;
        const prompt = [
            instrucao,
            "",
            "Lacunas a preencher:",
            JSON.stringify(lacunas),
            "",
            "Currículo:",
            enviado
        ].join("\n");

        let resposta;

        try {
            resposta = await OpenRouterService.gerarTextoSobreTexto(prompt, {
                maxTokens: MAX_TOKENS_RESPOSTA,
                aceitar: (conteudo) => lerJson(conteudo) !== null
            });
        } catch {
            // Serviço fora, sem cota, sem chave: a importação continua valendo sem a IA.
            return { rascunho, deduzidos: null, usouIa: false };
        }

        const sugerido = lerJson(resposta.texto);

        if (!sugerido) return { rascunho, deduzidos: null, usouIa: false };

        return this.aplicar({ rascunho, sugerido, texto: enviado });
    }

    /** Conferência e mistura: o que não passa na conferência é simplesmente ignorado. */
    aplicar({ rascunho, sugerido, texto }) {
        const noTexto = normalizar(texto);
        const deduzidos = { tituloProfissional: false, escolaridade: false, experiencias: {}, formacoes: {} };

        const experiencias = (rascunho.experiencias ?? []).map((item, indice) => {
            const proposta = (sugerido.experiencias ?? []).find((e) => Number(e?.indice) === indice);
            if (!proposta) return item;

            const novo = { ...item };
            const marcados = [];

            // Dedução declarada: o cargo quase nunca está escrito, por isso ele é permitido aqui.
            if (!novo.cargo) {
                const cargo = textoLimpo(proposta.cargo, MAX_CARGO);
                if (cargo) {
                    novo.cargo = cargo;
                    marcados.push("cargo");
                }
            }

            // Fatos: só entram se estiverem no currículo.
            if (!novo.empresa) {
                const empresa = textoLimpo(proposta.empresa, MAX_NOME);
                if (empresa && apareceNoTexto(empresa, noTexto)) novo.empresa = empresa;
            }

            if (!novo.dataInicio) novo.dataInicio = dataValida(proposta.dataInicio, noTexto);
            if (!novo.dataFim && !novo.atual) novo.dataFim = dataValida(proposta.dataFim, noTexto);

            if (marcados.length) deduzidos.experiencias[indice] = marcados;

            return novo;
        });

        const formacoes = (rascunho.formacoes ?? []).map((item, indice) => {
            const proposta = (sugerido.formacoes ?? []).find((f) => Number(f?.indice) === indice);
            if (!proposta) return item;

            const novo = { ...item };

            if (!novo.curso) {
                const curso = textoLimpo(proposta.curso, MAX_NOME);
                if (curso && apareceNoTexto(curso, noTexto)) novo.curso = curso;
            }

            if (!novo.instituicao) {
                const instituicao = textoLimpo(proposta.instituicao, MAX_NOME);
                if (instituicao && apareceNoTexto(instituicao, noTexto)) novo.instituicao = instituicao;
            }

            return novo;
        });

        const titulo = rascunho.tituloProfissional || textoLimpo(sugerido.tituloProfissional, MAX_CARGO);
        if (!rascunho.tituloProfissional && titulo) deduzidos.tituloProfissional = true;

        const escolaridadeProposta = textoLimpo(sugerido.escolaridade, 40);
        const escolaridade =
            rascunho.escolaridade ||
            (ESCOLARIDADES.find((opcao) => normalizar(opcao) === normalizar(escolaridadeProposta)) ?? "");
        if (!rascunho.escolaridade && escolaridade) deduzidos.escolaridade = true;

        return {
            rascunho: {
                ...rascunho,
                tituloProfissional: titulo || "",
                escolaridade: escolaridade || "",
                experiencias,
                formacoes
            },
            deduzidos,
            usouIa: true
        };
    }
}

export default new SugestaoCurriculoService();
