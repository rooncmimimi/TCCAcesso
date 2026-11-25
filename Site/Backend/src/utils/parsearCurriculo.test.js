import { describe, it, expect } from "vitest";

import { parsearCurriculo } from "./parsearCurriculo.js";

/**
 * O parser de currículo lendo os dois formatos que aparecem na prática: o que separa os itens com
 * marcadores e datas na linha do título, e o que separa por linha em branco, sem marcador nenhum.
 *
 * Os currículos daqui são inventados, no formato dos de verdade — nenhum dado de pessoa real.
 *
 * A regra que não pode cair: **não inventar**. Campo só é preenchido quando o texto diz aquilo com
 * clareza; na dúvida ele fica vazio e o trecho continua visível na descrição.
 */

const COM_MARCADORES = `
EXPERIÊNCIA PROFISSIONAL
Construtora Horizonte (CHZ) 03/2021 - 09/2024
- Conferência de notas fiscais de materiais.
- Apoio ao setor de compras.

FORMAÇÃO ACADÊMICA
Técnico em Edificações - ETEC (Início: 02/2020 | Concl. 12/2022)
Ensino Médio Completo - Escola Estadual Bela Vista (Concl. 12/2019)

COMPETÊNCIAS TÉCNICAS
- Sistemas: AutoCAD, Pacote Office (Excel Avançado, Word)
- Habilidades Gerais: Organização, Resolução de
Problemas

CURSOS EXTRACURRICULARES & IDIOMAS
- Curso de Excel (Carga horária: 20h | Concl. 05/2023)
- Idiomas: Inglês (Intermediário)
`;

const SEM_MARCADORES = `
OBJETIVO

Auxiliar Administrativo

EXPERIÊNCIA PROFISSIONAL

Transportes Aurora (TAU), SBC

Conferência de itens recebidos no estoque

Separação de materiais conforme as listas de pedido

Utilização do sistema interno para baixa de saldo

FORMAÇÃO EDUCACIONAL

Ensino Técnico - Cursando
`;

describe("o que o parser consegue ler", () => {
    it("currículo com marcadores: empresa e período saem da linha do título", () => {
        const { experiencias } = parsearCurriculo(COM_MARCADORES);

        expect(experiencias).toHaveLength(1);
        expect(experiencias[0].empresa).toBe("Construtora Horizonte (CHZ)");
        expect(experiencias[0].dataInicio).toBe("2021-03-01");
        expect(experiencias[0].dataFim).toBe("2024-09-01");
        expect(experiencias[0].descricaoSugerida).toContain("Conferência de notas fiscais");
        expect(experiencias[0].descricaoSugerida).toContain("Apoio ao setor de compras");
    });

    it("curso e instituição vão para os campos certos, e 'cursando' não vira data", () => {
        const { formacoes } = parsearCurriculo(COM_MARCADORES);

        expect(formacoes).toHaveLength(2);
        expect(formacoes[0]).toMatchObject({ curso: "Técnico em Edificações", instituicao: "ETEC" });
        expect(formacoes[0].dataFim).toBe("2022-12-01");
        expect(formacoes[1]).toMatchObject({
            curso: "Ensino Médio Completo",
            instituicao: "Escola Estadual Bela Vista",
        });
    });

    it("cursos e idiomas não entram na formação acadêmica", () => {
        const { formacoes } = parsearCurriculo(COM_MARCADORES);

        expect(formacoes.map((f) => `${f.curso} ${f.instituicao} ${f.descricaoSugerida}`).join(" ")).not.toContain(
            "Inglês",
        );
    });

    it("habilidades: sem o rótulo da categoria, sem parêntese e sem a quebra de linha do PDF", () => {
        const { habilidades } = parsearCurriculo(COM_MARCADORES);

        expect(habilidades).toContain("AutoCAD");
        expect(habilidades).toContain("Excel Avançado");
        expect(habilidades).toContain("Resolução de Problemas");
        expect(habilidades.some((h) => h.startsWith("Sistemas:"))).toBe(false);
        expect(habilidades.some((h) => h.includes("("))).toBe(false);
    });

    it("currículo sem marcador: as tarefas ficam na descrição, e não viram uma experiência cada", () => {
        const { experiencias } = parsearCurriculo(SEM_MARCADORES);

        expect(experiencias).toHaveLength(1);
        expect(experiencias[0].empresa).toBe("Transportes Aurora (TAU)");
        expect(experiencias[0].descricaoSugerida).toContain("Separação de materiais");
    });

    it("emprego atual: marca `atual` e não inventa data de saída", () => {
        const { experiencias } = parsearCurriculo(`
EXPERIÊNCIA
Analista de Suporte - Delta Tecnologia 05/2023 - atual
- Atendimento a chamados.
`);

        expect(experiencias[0]).toMatchObject({
            cargo: "Analista de Suporte",
            empresa: "Delta Tecnologia",
            dataInicio: "2023-05-01",
            dataFim: "",
            atual: true,
        });
    });

    it("a ordem invertida (empresa primeiro) também é entendida", () => {
        const { experiencias } = parsearCurriculo(`
EXPERIÊNCIA
Padaria Estrela - Atendente 2019 - 2021
`);

        expect(experiencias[0]).toMatchObject({ cargo: "Atendente", empresa: "Padaria Estrela" });
    });
});

describe("o que o parser se recusa a adivinhar", () => {
    it("linha sem data e sem marca de cargo ou empresa: campos vazios e o texto preservado", () => {
        const { experiencias } = parsearCurriculo(`
EXPERIÊNCIA
Trabalhei por conta própria durante alguns anos, em serviços variados para conhecidos.
`);

        expect(experiencias[0].cargo).toBe("");
        expect(experiencias[0].dataInicio).toBe("");
        expect(experiencias[0].descricaoSugerida).toContain("serviços variados");
    });

    it("nunca devolve CPF, mesmo quando ele está escrito no currículo", () => {
        const rascunho = parsearCurriculo("DADOS PESSOAIS\nCPF: 123.456.789-09\nEXPERIÊNCIA\nLoja Azul 2020 - 2021");

        expect(JSON.stringify(rascunho)).not.toContain("123.456.789");
    });

    it("telefone e e-mail saem do texto, de qualquer lugar do arquivo", () => {
        const rascunho = parsearCurriculo("Fulano\nSão Paulo, SP | (11) 95555-4444 | fulano@exemplo.com");

        expect(rascunho.telefone).toBe("(11) 95555-4444");
        expect(rascunho.email).toBe("fulano@exemplo.com");
    });

    it("texto vazio não quebra: devolve um rascunho vazio", () => {
        const rascunho = parsearCurriculo("");

        expect(rascunho.experiencias).toEqual([]);
        expect(rascunho.formacoes).toEqual([]);
        expect(rascunho.habilidades).toEqual([]);
        expect(rascunho.resumo).toBeNull();
    });
});
