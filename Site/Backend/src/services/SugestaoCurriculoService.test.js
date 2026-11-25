import { describe, it, expect, vi, beforeEach } from "vitest";

const { gerarTextoSobreTexto, disponivel } = vi.hoisted(() => ({
    gerarTextoSobreTexto: vi.fn(),
    disponivel: vi.fn(() => true)
}));

vi.mock("./OpenRouterService.js", () => ({ default: { gerarTextoSobreTexto, disponivel } }));

const { default: SugestaoCurriculoService, semDadosPessoais, mapearLacunas } = await import(
    "./SugestaoCurriculoService.js"
);

/**
 * A IA completando o rascunho do currículo.
 *
 * O que estes testes seguram é a fronteira entre **copiar** e **deduzir**: empresa, curso,
 * instituição e datas são fato e precisam estar escritos no currículo; cargo e título são dedução,
 * entram marcados e a pessoa confere. Nada sensível passa, e o que as regras já leram nunca é
 * sobrescrito.
 */

const CURRICULO = `EXPERIÊNCIA PROFISSIONAL
Alpina Equipamentos Industriais (ITEMM) 12/2024 - 04/2026
- Contagem e conferência de itens em estoque.
- Utilização do sistema SAP para controle de saldo.

FORMAÇÃO ACADÊMICA
Técnico em Desenvolvimento de Sistemas - ETEC`;

const rascunhoBase = () => ({
    tituloProfissional: "",
    escolaridade: "",
    experiencias: [
        {
            cargo: "",
            empresa: "Alpina Equipamentos Industriais (ITEMM)",
            dataInicio: "2024-12-01",
            dataFim: "",
            atual: false,
            descricaoSugerida: "Contagem e conferência de itens em estoque."
        }
    ],
    formacoes: [{ curso: "Técnico em Desenvolvimento de Sistemas", instituicao: "", dataFim: "", emAndamento: false }]
});

const responder = (objeto) => gerarTextoSobreTexto.mockResolvedValue({ texto: JSON.stringify(objeto), modelo: "x" });

beforeEach(() => {
    vi.resetAllMocks();
    disponivel.mockReturnValue(true);
});

describe("o que a IA pode preencher", () => {
    it("cargo é dedução: entra, e volta marcado para a pessoa conferir", async () => {
        responder({ experiencias: [{ indice: 0, cargo: "Auxiliar de Estoque" }] });

        const { rascunho, deduzidos, usouIa } = await SugestaoCurriculoService.completar({
            texto: CURRICULO,
            rascunho: rascunhoBase()
        });

        expect(usouIa).toBe(true);
        expect(rascunho.experiencias[0].cargo).toBe("Auxiliar de Estoque");
        expect(deduzidos.experiencias[0]).toContain("cargo");
    });

    it("instituição é fato: entra porque está escrita no currículo", async () => {
        responder({ formacoes: [{ indice: 0, instituicao: "ETEC" }] });

        const { rascunho } = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho: rascunhoBase() });

        expect(rascunho.formacoes[0].instituicao).toBe("ETEC");
    });

    it("escolaridade só vale se for uma das opções do formulário", async () => {
        responder({ escolaridade: "Ensino técnico" });

        const { rascunho, deduzidos } = await SugestaoCurriculoService.completar({
            texto: CURRICULO,
            rascunho: rascunhoBase()
        });

        expect(rascunho.escolaridade).toBe("Ensino técnico");
        expect(deduzidos.escolaridade).toBe(true);
    });
});

describe("o que a IA não consegue passar", () => {
    it("empresa que não está no currículo é recusada", async () => {
        const rascunho = rascunhoBase();
        rascunho.experiencias[0].empresa = "";
        responder({ experiencias: [{ indice: 0, empresa: "Google Brasil" }] });

        const resultado = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho });

        expect(resultado.rascunho.experiencias[0].empresa).toBe("");
    });

    it("data que não aparece no currículo é recusada", async () => {
        responder({ experiencias: [{ indice: 0, dataFim: "2019-07" }] });

        const { rascunho } = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho: rascunhoBase() });

        expect(rascunho.experiencias[0].dataFim).toBe("");
    });

    it("sugestão que fala de deficiência ou saúde é jogada fora", async () => {
        responder({ experiencias: [{ indice: 0, cargo: "Auxiliar (pessoa com deficiência)" }] });

        const { rascunho, deduzidos } = await SugestaoCurriculoService.completar({
            texto: CURRICULO,
            rascunho: rascunhoBase()
        });

        expect(rascunho.experiencias[0].cargo).toBe("");
        expect(deduzidos.experiencias[0]).toBeUndefined();
    });

    it("escolaridade fora da lista não entra", async () => {
        responder({ escolaridade: "Curso livre de informática" });

        const { rascunho } = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho: rascunhoBase() });

        expect(rascunho.escolaridade).toBe("");
    });

    it("não sobrescreve o que as regras já leram", async () => {
        responder({
            experiencias: [{ indice: 0, empresa: "ETEC", cargo: "Outro cargo" }],
            formacoes: [{ indice: 0, curso: "ETEC" }]
        });

        const rascunho = rascunhoBase();
        rascunho.experiencias[0].cargo = "Estoquista";

        const resultado = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho });

        expect(resultado.rascunho.experiencias[0].cargo).toBe("Estoquista");
        expect(resultado.rascunho.experiencias[0].empresa).toBe("Alpina Equipamentos Industriais (ITEMM)");
        expect(resultado.rascunho.formacoes[0].curso).toBe("Técnico em Desenvolvimento de Sistemas");
    });
});

describe("quando não dá, não atrapalha", () => {
    it("sem lacuna nenhuma, o modelo não é chamado", async () => {
        const rascunho = rascunhoBase();
        rascunho.tituloProfissional = "Auxiliar de Estoque";
        rascunho.experiencias[0].cargo = "Auxiliar de Estoque";
        rascunho.experiencias[0].dataFim = "2026-04-01";
        rascunho.formacoes[0].instituicao = "ETEC";

        const resultado = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho });

        expect(gerarTextoSobreTexto).not.toHaveBeenCalled();
        expect(resultado.usouIa).toBe(false);
    });

    it("serviço fora do ar: devolve o rascunho das regras, sem erro", async () => {
        gerarTextoSobreTexto.mockRejectedValue(new Error("503"));

        const resultado = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho: rascunhoBase() });

        expect(resultado.usouIa).toBe(false);
        expect(resultado.rascunho.experiencias[0].empresa).toBe("Alpina Equipamentos Industriais (ITEMM)");
    });

    it("resposta que não é JSON não derruba nada", async () => {
        gerarTextoSobreTexto.mockResolvedValue({ texto: "Claro! Aqui está o que encontrei:", modelo: "x" });

        const resultado = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho: rascunhoBase() });

        expect(resultado.usouIa).toBe(false);
    });

    it("sem chave configurada, nem tenta", async () => {
        disponivel.mockReturnValue(false);

        const resultado = await SugestaoCurriculoService.completar({ texto: CURRICULO, rascunho: rascunhoBase() });

        expect(gerarTextoSobreTexto).not.toHaveBeenCalled();
        expect(resultado.usouIa).toBe(false);
    });
});

describe("o que sai do servidor", () => {
    it("o bloco de identificação fica aqui: nome, documento, endereço e contato não são enviados", () => {
        const enviado = semDadosPessoais(`Fulano de Tal
CPF: 123.456.789-09
Rua das Flores, 100 - 09844-030
Cel.: (11) 95555-4444
E-mail: fulano@exemplo.com

RESUMO PROFISSIONAL
Trabalho com estoque há dois anos.`);

        expect(enviado).not.toContain("Fulano de Tal");
        expect(enviado).not.toContain("123.456.789");
        expect(enviado).not.toContain("95555-4444");
        expect(enviado).not.toContain("fulano@exemplo.com");
        expect(enviado).toContain("Trabalho com estoque");
    });

    it("sem cabeçalho de seção, o documento ainda perde os dados pessoais", () => {
        const enviado = semDadosPessoais("Fulano\nCPF 123.456.789-09\nTrabalhei na Alpina.");

        expect(enviado).not.toContain("123.456.789");
        expect(enviado).toContain("Alpina");
    });

    it("a lista de lacunas só aponta campo vazio", () => {
        const lacunas = mapearLacunas(rascunhoBase());

        expect(lacunas.experiencias[0].faltam).toEqual(["cargo", "dataFim"]);
        expect(lacunas.formacoes[0].faltam).toEqual(["instituicao"]);
    });
});
