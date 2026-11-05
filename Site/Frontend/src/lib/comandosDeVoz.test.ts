import { describe, expect, it } from "vitest";

import { EXEMPLOS_DE_COMANDOS, interpretarComando, normalizarFala, type ContextoDeVoz } from "@/lib/comandosDeVoz";

const logado: ContextoDeVoz = { autenticado: true, tipoDeUsuario: "candidato" };
const visitante: ContextoDeVoz = { autenticado: false, tipoDeUsuario: null };

describe("normalizarFala", () => {
  it("tira acento, pontuação, maiúsculas e espaços repetidos", () => {
    expect(normalizarFala("  Ir  para, VAGAS!  ")).toBe("ir para vagas");
    expect(normalizarFala("Candidatar-me")).toBe("candidatar me");
    expect(normalizarFala("Notificações")).toBe("notificacoes");
  });
});

describe("navegação", () => {
  it.each([
    ["ir para vagas", "/vagas"],
    ["Ir para as vagas", "/vagas"],
    ["abrir meu perfil", "/perfil"],
    ["abrir mensagens", "/mensagens"],
    ["mensagens", "/mensagens"],
    ["ir para notificações", "/notificacoes"],
    ["abrir minha acessibilidade", "/minha-acessibilidade"],
    ["abrir configurações de acessibilidade", "/configuracoes/acessibilidade"],
    ["ir para o início", "/feed"],
    ["abrir objetivos", "/objetivos"],
    ["abrir o dicionário de profissões", "/profissoes"],
    ["abrir a central de comunicação", "/comunicacao"],
    ["abrir o simulador", "/simulador"],
  ])("“%s” leva a %s", (fala, destino) => {
    expect(interpretarComando(fala, logado)).toMatchObject({ tipo: "navegar", para: destino });
  });

  it("visitante não é levado a áreas privadas, mas vai às públicas", () => {
    expect(interpretarComando("abrir meu perfil", visitante).tipo).toBe("desconhecido");
    expect(interpretarComando("abrir mensagens", visitante).tipo).toBe("desconhecido");
    expect(interpretarComando("ir para vagas", visitante)).toMatchObject({ tipo: "navegar", para: "/vagas" });
    expect(interpretarComando("abrir objetivos", visitante)).toMatchObject({ tipo: "navegar", para: "/objetivos" });
  });

  it("uma frase longa que só cita uma palavra não vira navegação por acaso", () => {
    expect(interpretarComando("eu gostaria muito de falar sobre as vagas da minha cidade", logado).tipo).toBe("desconhecido");
  });
});

describe("outros comandos", () => {
  it("voltar, próxima página, parar leitura e atalhos", () => {
    expect(interpretarComando("voltar", logado).tipo).toBe("voltar");
    expect(interpretarComando("página anterior", logado).tipo).toBe("voltar");
    expect(interpretarComando("próxima página", logado).tipo).toBe("proxima-pagina");
    expect(interpretarComando("parar leitura", logado).tipo).toBe("parar-leitura");
    expect(interpretarComando("pare de ler", logado).tipo).toBe("parar-leitura");
    expect(interpretarComando("mostrar atalhos", logado).tipo).toBe("atalhos");
  });

  it("pesquisar vagas com termo; sem termo só abre as vagas", () => {
    expect(interpretarComando("pesquisar vagas de atendente", logado)).toEqual({ tipo: "pesquisar-vagas", termo: "atendente" });
    expect(interpretarComando("buscar vagas para auxiliar administrativo", logado)).toEqual({ tipo: "pesquisar-vagas", termo: "auxiliar administrativo" });
    expect(interpretarComando("pesquisar atendente", logado)).toEqual({ tipo: "pesquisar-vagas", termo: "atendente" });
    expect(interpretarComando("pesquisar vagas", logado)).toMatchObject({ tipo: "navegar", para: "/vagas" });
  });

  it("limita o termo pesquisado", () => {
    const longo = "a".repeat(200);
    const r = interpretarComando(`pesquisar vagas de ${longo}`, logado);

    expect(r.tipo).toBe("pesquisar-vagas");
    expect((r as { termo: string }).termo.length).toBe(80);
  });

  it("candidatar-me só abre a candidatura", () => {
    expect(interpretarComando("candidatar-me", logado).tipo).toBe("candidatar");
    expect(interpretarComando("quero me candidatar", logado).tipo).toBe("candidatar");
    expect(interpretarComando("acompanhar minhas candidaturas", logado).tipo).not.toBe("candidatar");
  });

  it("modo leitura e modo foco, ligar e desligar", () => {
    expect(interpretarComando("ativar modo leitura", logado)).toMatchObject({ tipo: "preferencia", chave: "readingMode", valor: true });
    expect(interpretarComando("desativar modo leitura", logado)).toMatchObject({ tipo: "preferencia", chave: "readingMode", valor: false });
    expect(interpretarComando("ativar o modo foco", logado)).toMatchObject({ tipo: "preferencia", chave: "focusMode", valor: true });
    expect(interpretarComando("desligar modo foco", logado)).toMatchObject({ tipo: "preferencia", chave: "focusMode", valor: false });
  });
});

describe("segurança", () => {
  it.each(["excluir minha conta", "apagar publicação", "enviar candidatura", "publicar vaga", "remover currículo", "sair da conta", "deletar mensagem"])("recusa “%s”", (fala) => {
    const r = interpretarComando(fala, logado);

    expect(r.tipo).toBe("recusado");
    expect((r as { motivo: string }).motivo).toMatch(/com as mãos/);
  });

  it("frase vazia ou sem sentido não faz nada", () => {
    expect(interpretarComando("", logado).tipo).toBe("desconhecido");
    expect(interpretarComando("   ", logado).tipo).toBe("desconhecido");
    expect(interpretarComando("blá blá blá", logado).tipo).toBe("desconhecido");
  });

  it("todo exemplo mostrado à pessoa é de fato entendido (ou recusado de propósito)", () => {
    const entendidos = ["Ir para vagas", "Abrir meu perfil", "Abrir mensagens", "Pesquisar vagas de atendente", "Próxima página", "Voltar", "Candidatar-me", "Ativar modo leitura", "Ativar modo foco", "Parar leitura", "Mostrar atalhos"];

    for (const fala of entendidos) expect(interpretarComando(fala, logado).tipo, fala).not.toBe("desconhecido");
    expect(EXEMPLOS_DE_COMANDOS.length).toBeGreaterThanOrEqual(8);
  });
});
