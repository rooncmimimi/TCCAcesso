import { describe, it, expect } from "vitest";
import { temTraducao, traduzir, traduzirCorpo } from "./traduzir.js";
import { executarComIdioma } from "./idioma.js";

describe("traduzir", () => {
    it("traduz uma mensagem exata para inglês e espanhol", () => {
        expect(traduzir("Usuário não encontrado.", "en")).toBe("User not found.");
        expect(traduzir("Usuário não encontrado.", "es")).toBe("Usuario no encontrado.");
    });

    it("em português devolve o texto como está", () => {
        expect(traduzir("Usuário não encontrado.", "pt")).toBe("Usuário não encontrado.");
        expect(traduzir("Texto que ninguém cadastrou.", "pt")).toBe("Texto que ninguém cadastrou.");
    });

    it("texto sem tradução volta em português, nunca vazio nem quebrado", () => {
        expect(traduzir("Texto que ninguém cadastrou.", "en")).toBe("Texto que ninguém cadastrou.");
    });

    it("valores que não são texto passam sem erro", () => {
        expect(traduzir(null, "en")).toBeNull();
        expect(traduzir(undefined, "es")).toBeUndefined();
        expect(traduzir(42, "en")).toBe(42);
    });

    it("usa o idioma da requisição quando não recebe um", () => {
        expect(traduzir("Erro de validação.")).toBe("Erro de validação.");
        executarComIdioma("en", () => {
            expect(traduzir("Erro de validação.")).toBe("Validation error.");
        });
    });

    describe("mensagens com partes variáveis", () => {
        it("recoloca o pedaço variável na frase traduzida", () => {
            expect(traduzir("O campo titulo deve ter no máximo 120 caracteres.", "en")).toBe(
                "The titulo field must have at most 120 characters."
            );
            expect(traduzir("O campo titulo deve ter no máximo 120 caracteres.", "es")).toBe(
                "El campo titulo debe tener como máximo 120 caracteres."
            );
        });

        it("não mexe no que a pessoa escreveu (título de vaga, motivo do moderador)", () => {
            expect(
                traduzir('Sua vaga "Analista de Sistemas" foi ocultada pela moderação e não aparece mais nas buscas.', "en")
            ).toBe('Your job "Analista de Sistemas" was hidden by moderation and no longer appears in searches.');
            expect(traduzir("Sua conta foi bloqueada pela moderação do ACESSO. Motivo: spam repetido", "es")).toBe(
                "Tu cuenta fue bloqueada por la moderación de ACESSO. Motivo: spam repetido"
            );
        });

        it("traduz o status que vem dentro da frase", () => {
            expect(
                traduzir('Sua candidatura para a vaga "Dev" foi atualizada para Em análise.', "en")
            ).toBe('Your application for the job "Dev" was updated to Under review.');
        });

        it("traduz a lista de campos separada por vírgula", () => {
            expect(
                traduzir("Para concluir o cadastro, preencha: país, data de nascimento, cidade, estado.", "es")
            ).toBe("Para completar el registro, rellena: país, fecha de nacimiento, ciudad, estado.");
        });

        it("traduz o nome de quem agiu sem alterá-lo", () => {
            expect(traduzir("Ana Souza curtiu sua publicação.", "en")).toBe("Ana Souza liked your post.");
            expect(traduzir("Ana Souza respondeu ao seu comentário: concordo!\ncom certeza", "en")).toBe(
                "Ana Souza replied to your comment: concordo!\ncom certeza"
            );
        });

        it("marcador numérico só casa dígitos e traduz a frase composta do log de auditoria", () => {
            expect(
                traduzir(
                    "Pedro removeu uma publicação de Ana. A publicação continha: texto; 1 imagem; 12 curtidas; 3 comentários.",
                    "en"
                )
            ).toBe("Pedro removed a post by Ana. The post contained: text; 1 image; 12 likes; 3 comments.");
            expect(traduzir("muitas imagem", "en")).toBe("muitas imagem");
        });

        it("quando dois padrões servem ao mesmo texto, vence o mais específico", () => {
            // A prévia da resposta contém "comentou:", que casaria com o padrão mais curto.
            expect(traduzir("Bruno respondeu ao seu comentário: ela comentou: oi", "en")).toBe(
                "Bruno replied to your comment: ela comentou: oi"
            );
            expect(traduzir("Bruno comentou: oi", "en")).toBe("Bruno commented: oi");
        });

        it("traduz o motivo das sugestões de quem seguir", () => {
            expect(traduzir("Também está em Recife", "en")).toBe("Also in Recife");
            expect(traduzir("Atua como Designer", "es")).toBe("Trabaja como Designer");
        });
    });
});

describe("temTraducao", () => {
    it("reconhece mensagem exata, mensagem com padrão e texto desconhecido", () => {
        expect(temTraducao("Usuário não encontrado.")).toBe(true);
        expect(temTraducao("O campo senha deve ser booleano.")).toBe(true);
        expect(temTraducao("Isto não está no catálogo.")).toBe(false);
        expect(temTraducao(undefined)).toBe(false);
    });
});

describe("traduzirCorpo", () => {
    it("traduz mensagem e erros[].mensagem, preservando o resto do corpo", () => {
        const corpo = {
            sucesso: false,
            mensagem: "Erro de validação.",
            erros: [{ campo: "email", mensagem: "Informe um endereço de e-mail válido." }],
            detalhes: { codigo: "X" }
        };

        expect(traduzirCorpo(corpo, "en")).toEqual({
            sucesso: false,
            mensagem: "Validation error.",
            erros: [{ campo: "email", mensagem: "Enter a valid email address." }],
            detalhes: { codigo: "X" }
        });
    });

    it("não altera o objeto original", () => {
        const corpo = { mensagem: "Erro de validação.", erros: [{ campo: "a", mensagem: "Token inválido." }] };

        traduzirCorpo(corpo, "es");

        expect(corpo.mensagem).toBe("Erro de validação.");
        expect(corpo.erros[0].mensagem).toBe("Token inválido.");
    });

    it("não toca em corpos que não são objeto (lista, texto)", () => {
        const lista = [{ mensagem: "Erro de validação." }];

        expect(traduzirCorpo(lista, "en")).toBe(lista);
        expect(traduzirCorpo("texto", "en")).toBe("texto");
        expect(traduzirCorpo(null, "en")).toBeNull();
    });

    it("em português o corpo sai igual", () => {
        const corpo = { mensagem: "Erro de validação.", erros: [{ campo: "a", mensagem: "Token inválido." }] };

        expect(traduzirCorpo(corpo, "pt")).toEqual(corpo);
    });

    it("a mensagem padrão em inglês da biblioteca de validação vira texto do idioma, português inclusive", () => {
        const corpo = { mensagem: "Erro de validação.", erros: [{ campo: "x", mensagem: "Invalid value" }] };

        expect(traduzirCorpo(corpo, "pt").erros[0].mensagem).toBe("Valor inválido.");
        expect(traduzirCorpo(corpo, "en").erros[0].mensagem).toBe("Invalid value.");
        expect(traduzirCorpo(corpo, "es").erros[0].mensagem).toBe("Valor no válido.");
    });

    it("não traduz campos de conteúdo que por acaso se chamem diferente de mensagem", () => {
        const corpo = { conversa: { mensagem: "Usuário não encontrado." }, titulo: "Usuário não encontrado." };

        expect(traduzirCorpo(corpo, "en")).toEqual(corpo);
    });
});

describe("o que uma pessoa escreveu nunca é traduzido", () => {
    it("a prévia de um comentário que parece outra frase do catálogo fica como foi escrita", () => {
        expect(traduzir("Bruno respondeu ao seu comentário: ela comentou: oi", "en")).toBe(
            "Bruno replied to your comment: ela comentou: oi"
        );
        expect(traduzir("Ana comentou: Usuário não encontrado.", "es")).toBe("Ana comentó: Usuário não encontrado.");
        expect(traduzir("Ana comentou: cidade", "en")).toBe("Ana commented: cidade");
    });

    it("o nome e o título só são recolocados, sem tradução", () => {
        expect(traduzir("Pendente curtiu sua publicação.", "en")).toBe("Pendente liked your post.");
        expect(traduzir('Sua vaga "Aberta" foi ocultada pela moderação e não aparece mais nas buscas.', "es")).toBe(
            'Tu vacante "Aberta" fue ocultada por la moderación y ya no aparece en las búsquedas.'
        );
        expect(traduzir("Sua conta foi bloqueada pela moderação do ACESSO. Motivo: Em análise", "en")).toBe(
            "Your account was blocked by ACESSO moderation. Reason: Em análise"
        );
    });

    it("só os marcadores {=x} do catálogo traduzem o valor (status, campos, itens do log)", () => {
        expect(traduzir('Sua candidatura para a vaga "Aprovada" foi atualizada para Rejeitada.', "en")).toBe(
            'Your application for the job "Aprovada" was updated to Rejected.'
        );
        expect(traduzir("Para concluir o cadastro, preencha: cidade.", "en")).toBe(
            "To finish your registration, fill in: city."
        );
    });
});
