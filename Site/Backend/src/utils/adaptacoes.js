/**
 * Catálogo e regras das adaptações profissionais e da comunicação (Bloco 2).
 *
 * A lista é FECHADA e vive só aqui: o front-end a recebe pela API (`GET /minha-acessibilidade/catalogo`),
 * então não há segunda cópia para sair de sincronia. Chaves nunca mudam de significado depois de
 * publicadas, porque as cópias já autorizadas em candidaturas guardam chave e rótulo da época.
 *
 * Princípios (LGPD): descreve NECESSIDADES FUNCIONAIS, nunca diagnóstico; nada aqui é inferido de
 * outros dados; e nada é compartilhado sem a escolha explícita da pessoa, candidatura por candidatura.
 */

export const GRUPOS_DE_ADAPTACAO = [
    { chave: "comunicacao", rotulo: "Comunicação" },
    { chave: "ambiente", rotulo: "Ambiente" },
    { chave: "aprendizagem", rotulo: "Aprendizagem" },
    { chave: "tecnologia", rotulo: "Tecnologia" },
    { chave: "processo_seletivo", rotulo: "Processos seletivos" }
];

export const ADAPTACOES = [
    { chave: "instrucoes_escritas", grupo: "comunicacao", rotulo: "Instruções por escrito" },
    { chave: "interprete_libras", grupo: "comunicacao", rotulo: "Intérprete de Libras" },
    { chave: "legendas", grupo: "comunicacao", rotulo: "Legendas em vídeos e chamadas" },
    { chave: "comunicacao_alternativa", grupo: "comunicacao", rotulo: "Comunicação alternativa" },

    { chave: "ambiente_silencioso", grupo: "ambiente", rotulo: "Ambiente silencioso" },
    { chave: "iluminacao_ajustavel", grupo: "ambiente", rotulo: "Iluminação ajustável" },
    { chave: "acessibilidade_fisica", grupo: "ambiente", rotulo: "Acessibilidade física (rampa, elevador, banheiro acessível)" },
    { chave: "pausas", grupo: "ambiente", rotulo: "Possibilidade de pausas" },
    { chave: "modalidade_flexivel", grupo: "ambiente", rotulo: "Modalidade de trabalho flexível (remoto ou híbrido)" },

    { chave: "instrucoes_por_etapas", grupo: "aprendizagem", rotulo: "Instruções por etapas" },
    { chave: "exemplos_praticos", grupo: "aprendizagem", rotulo: "Exemplos práticos" },
    { chave: "tempo_adicional", grupo: "aprendizagem", rotulo: "Tempo adicional" },
    { chave: "orientacoes_objetivas", grupo: "aprendizagem", rotulo: "Orientações objetivas" },

    { chave: "leitor_de_tela", grupo: "tecnologia", rotulo: "Compatibilidade com leitor de tela" },
    { chave: "ampliacao_de_tela", grupo: "tecnologia", rotulo: "Ampliação de tela" },
    { chave: "teclado_adaptado", grupo: "tecnologia", rotulo: "Teclado adaptado" },
    { chave: "acionamento_alternativo", grupo: "tecnologia", rotulo: "Dispositivo de acionamento alternativo" },

    { chave: "entrevista_por_video", grupo: "processo_seletivo", rotulo: "Entrevista por vídeo" },
    { chave: "entrevista_por_texto", grupo: "processo_seletivo", rotulo: "Entrevista por texto" },
    { chave: "perguntas_antecipadas", grupo: "processo_seletivo", rotulo: "Receber as perguntas antes" },
    { chave: "local_acessivel", grupo: "processo_seletivo", rotulo: "Local de entrevista acessível" }
];

export const CANAIS_DE_COMUNICACAO = [
    { chave: "chat", rotulo: "Chat" },
    { chave: "email", rotulo: "E-mail" },
    { chave: "mensagem_escrita", rotulo: "Mensagem escrita" },
    { chave: "videochamada", rotulo: "Videochamada" },
    { chave: "libras", rotulo: "Comunicação em Libras" },
    { chave: "comunicacao_alternativa", rotulo: "Comunicação alternativa" }
];

export const CANAIS_A_EVITAR = [
    { chave: "ligacao", rotulo: "Ligações telefônicas" },
    { chave: "mensagem_de_audio", rotulo: "Mensagens de áudio" },
    { chave: "videochamada", rotulo: "Videochamada" },
    { chave: "chat", rotulo: "Chat" },
    { chave: "email", rotulo: "E-mail" }
];

/** Versão do texto de autorização mostrado à pessoa. Quem mudar o texto deve mudar a versão. */
export const VERSAO_DO_TERMO_DE_ADAPTACOES = "adaptacoes-2026-11";

export const RESPOSTAS_DA_EMPRESA = [
    { chave: "podemos_oferecer", rotulo: "Podemos oferecer essa adaptação" },
    { chave: "podemos_providenciar", rotulo: "Podemos providenciar" },
    { chave: "precisamos_verificar", rotulo: "Precisamos verificar" },
    { chave: "podemos_conversar", rotulo: "Podemos conversar sobre uma alternativa" }
];

export const LIMITES = {
    observacaoAdaptacao: 500,
    observacaoComunicacao: 300,
    melhorHorario: 120,
    outraNecessidade: 300,
    mensagemCandidatura: 2000,
    respostaDaEmpresa: 500
};

const rotuloDe = (lista, chave) => lista.find((item) => item.chave === chave)?.rotulo ?? null;

export const rotuloDaAdaptacao = (chave) => rotuloDe(ADAPTACOES, chave);
export const rotuloDoCanal = (chave) => rotuloDe(CANAIS_DE_COMUNICACAO, chave) ?? rotuloDe(CANAIS_A_EVITAR, chave);

export function respostaValida(chave) {
    return RESPOSTAS_DA_EMPRESA.some((r) => r.chave === chave);
}

/** Texto aparado, ou `null` se vazio. Nunca devolve mais que `maximo` caracteres (corta, não rejeita). */
export function textoOuNulo(valor, maximo) {
    if (typeof valor !== "string") return null;
    const limpo = valor.replace(/\s+/g, " ").trim();
    return limpo ? limpo.slice(0, maximo) : null;
}

/** Lista de chaves: só as do catálogo, sem repetir, na ordem do catálogo. */
function chavesValidas(entrada, catalogo) {
    if (!Array.isArray(entrada)) return [];
    const pedidas = new Set(entrada.filter((c) => typeof c === "string"));
    return catalogo.filter((item) => pedidas.has(item.chave)).map((item) => item.chave);
}

/** Detecta chaves fora do catálogo, para recusar o pedido em vez de ignorá-las em silêncio. */
export function chavesDesconhecidas(entrada, catalogo) {
    if (!Array.isArray(entrada)) return [];
    const conhecidas = new Set(catalogo.map((item) => item.chave));
    return entrada.filter((c) => typeof c !== "string" || !conhecidas.has(c));
}

export function normalizarPerfilDeAdaptacao(corpo = {}) {
    return {
        adaptacoes: chavesValidas(corpo.adaptacoes, ADAPTACOES),
        observacao: textoOuNulo(corpo.observacao, LIMITES.observacaoAdaptacao)
    };
}

export function normalizarPreferenciasDeComunicacao(corpo = {}) {
    return {
        canaisPreferidos: chavesValidas(corpo.canaisPreferidos, CANAIS_DE_COMUNICACAO),
        canaisAEvitar: chavesValidas(corpo.canaisAEvitar, CANAIS_A_EVITAR),
        melhorHorario: textoOuNulo(corpo.melhorHorario, LIMITES.melhorHorario),
        observacao: textoOuNulo(corpo.observacao, LIMITES.observacaoComunicacao)
    };
}

/** Um canal não pode estar entre os preferidos e entre os evitados. */
export function canaisEmConflito(preferidos, aEvitar) {
    const evitar = new Set(aEvitar);
    return preferidos.filter((c) => evitar.has(c));
}

/**
 * A escolha da pessoa, na candidatura, do que compartilhar. Tudo é opcional e começa DESLIGADO:
 * sem escolha, nada é compartilhado. Chaves de adaptação fora do catálogo são ignoradas aqui (a
 * validação da rota recusa o pedido antes).
 */
export function normalizarEscolha(corpo = {}) {
    const comunicacao = corpo.comunicacao && typeof corpo.comunicacao === "object" ? corpo.comunicacao : {};

    return {
        adaptacoes: chavesValidas(corpo.adaptacoes, ADAPTACOES),
        comunicacao: {
            canaisPreferidos: comunicacao.canaisPreferidos === true,
            canaisAEvitar: comunicacao.canaisAEvitar === true,
            melhorHorario: comunicacao.melhorHorario === true
        },
        deficiencia: corpo.deficiencia === true,
        observacaoDeAdaptacao: corpo.observacaoDeAdaptacao === true,
        observacaoDeComunicacao: corpo.observacaoDeComunicacao === true,
        outra: textoOuNulo(corpo.outra, LIMITES.outraNecessidade)
    };
}

export function escolhaVazia() {
    return normalizarEscolha({});
}

const comRotulo = (chaves, rotulo) => chaves.map((chave) => ({ chave, rotulo: rotulo(chave) ?? chave }));

/**
 * Monta a cópia que a empresa receberá. É a ÚNICA fonte do conteúdo: a prévia mostra exatamente
 * este retorno, e a candidatura grava exatamente este retorno. O servidor lê o perfil da pessoa
 * (nunca confia em conteúdo vindo do cliente) e inclui só o que a escolha liga.
 *
 * `deficiencias`: categorias declaradas, `{ id, nome }`. O texto livre do vínculo
 * (`observacoes`) NUNCA entra.
 */
export function montarCopiaDaCandidatura({ perfil, comunicacao, deficiencias = [] }, escolha) {
    const itens = {};

    if (escolha.adaptacoes.length > 0) {
        itens.adaptacoes = comRotulo(escolha.adaptacoes, rotuloDaAdaptacao);
    }

    const canais = {};
    if (escolha.comunicacao.canaisPreferidos && comunicacao?.canaisPreferidos?.length) {
        canais.canaisPreferidos = comRotulo(comunicacao.canaisPreferidos, rotuloDoCanal);
    }
    if (escolha.comunicacao.canaisAEvitar && comunicacao?.canaisAEvitar?.length) {
        canais.canaisAEvitar = comRotulo(comunicacao.canaisAEvitar, rotuloDoCanal);
    }
    if (escolha.comunicacao.melhorHorario && comunicacao?.melhorHorario) {
        canais.melhorHorario = comunicacao.melhorHorario;
    }
    if (Object.keys(canais).length > 0) {
        itens.comunicacao = canais;
    }

    if (escolha.deficiencia && deficiencias.length > 0) {
        itens.deficiencias = deficiencias.map((d) => ({ id: d.id, nome: d.nome }));
    }

    const observacoes = {};
    if (escolha.observacaoDeAdaptacao && perfil?.observacao) {
        observacoes.adaptacao = perfil.observacao;
    }
    if (escolha.observacaoDeComunicacao && comunicacao?.observacao) {
        observacoes.comunicacao = comunicacao.observacao;
    }
    if (Object.keys(observacoes).length > 0) {
        itens.observacoes = observacoes;
    }

    if (escolha.outra) {
        itens.outra = escolha.outra;
    }

    return { itens, total: contarItens(itens) };
}

/** Quantas informações a cópia leva (usado no registro mínimo que sobrevive à retirada). */
export function contarItens(itens) {
    if (!itens) return 0;

    return (
        (itens.adaptacoes?.length ?? 0) +
        (itens.comunicacao?.canaisPreferidos ? 1 : 0) +
        (itens.comunicacao?.canaisAEvitar ? 1 : 0) +
        (itens.comunicacao?.melhorHorario ? 1 : 0) +
        (itens.deficiencias?.length ? 1 : 0) +
        (itens.observacoes?.adaptacao ? 1 : 0) +
        (itens.observacoes?.comunicacao ? 1 : 0) +
        (itens.outra ? 1 : 0)
    );
}
