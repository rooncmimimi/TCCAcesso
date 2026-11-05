import { afterEach, describe, expect, it } from "vitest";

import { acaoPrincipal, coletarOndeEstou, etapaDoCadastro, frasesDeOndeEstou, nomeDaPagina, secaoAtual } from "./ondeEstou";

function pagina(html: string, titulo = "") {
  document.title = titulo;
  document.body.innerHTML = html;
}

/** O jsdom não faz layout: o teste diz onde cada elemento está na janela. */
function posicionar(el: Element | null, top: number) {
  (el as HTMLElement).getBoundingClientRect = () => ({ top, bottom: top + 20, height: 20, width: 100, left: 0, right: 100, x: 0, y: top, toJSON: () => ({}) });
}

afterEach(() => {
  document.title = "";
  document.body.innerHTML = "";
});

describe("nomeDaPagina", () => {
  it("usa o h1 do conteúdo", () => {
    pagina(`<main><h1>Vagas abertas</h1></main>`, "Outra coisa — ACESSO");

    expect(nomeDaPagina()).toBe("Vagas abertas");
  });

  it("sem h1, usa o título da aba sem o sufixo do site", () => {
    pagina(`<main><p>Oi</p></main>`, "Entrar — ACESSO");

    expect(nomeDaPagina()).toBe("Entrar");
  });

  it("sem nada, devolve null", () => {
    pagina(`<main></main>`);

    expect(nomeDaPagina()).toBeNull();
  });
});

describe("secaoAtual", () => {
  it("com foco no conteúdo, é o último título antes do elemento focado", () => {
    pagina(`
      <main>
        <h1>Vaga</h1>
        <h2>Descrição</h2><p>texto</p>
        <h2>Requisitos</h2><button id="b">Algo</button>
        <h2>Benefícios</h2>
      </main>
    `);
    document.getElementById("b")!.focus();

    expect(secaoAtual()).toBe("Requisitos");
  });

  it("sem foco, usa o terço de cima da janela", () => {
    pagina(`<main><h2 id="a">Descrição</h2><h2 id="b">Requisitos</h2><h2 id="c">Benefícios</h2></main>`);
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
    posicionar(document.getElementById("a"), -300);
    posicionar(document.getElementById("b"), 100);
    posicionar(document.getElementById("c"), 700);

    expect(secaoAtual()).toBe("Requisitos");
  });

  it("ignora títulos ocultos e devolve null sem nenhum título antes", () => {
    pagina(`<main><h2 hidden>Escondido</h2><p>texto</p></main>`);

    expect(secaoAtual()).toBeNull();
  });

  it("o foco dentro de um título conta como estar nele", () => {
    pagina(`<main><h2 tabindex="-1" id="t">Descrição</h2><h2>Depois</h2></main>`);
    document.getElementById("t")!.focus();

    expect(secaoAtual()).toBe("Descrição");
  });
});

describe("etapaDoCadastro", () => {
  it("lê a frase de etapa do indicador do cadastro", () => {
    pagina(`<main><p aria-live="polite">Etapa 2 de 5 — Dados pessoais</p></main>`);

    expect(etapaDoCadastro()).toBe("Etapa 2 de 5 — Dados pessoais");
  });

  it("entende o indicador em inglês e espanhol", () => {
    pagina(`<main><p aria-live="polite">Step 1 of 4 — Account</p></main>`);
    expect(etapaDoCadastro()).toBe("Step 1 of 4 — Account");

    pagina(`<main><p aria-live="polite">Paso 3 de 4 — Datos</p></main>`);
    expect(etapaDoCadastro()).toBe("Paso 3 de 4 — Datos");
  });

  it("fora do cadastro, ou com outro aviso ao vivo, é null", () => {
    pagina(`<main><p aria-live="polite">Salvo com sucesso</p></main>`);

    expect(etapaDoCadastro()).toBeNull();
  });
});

describe("acaoPrincipal", () => {
  it("prefere o que a página marcou como ação principal", () => {
    pagina(`<main><button type="submit">Enviar</button><button data-acao-principal>Candidatar-se</button></main>`);

    expect(acaoPrincipal()).toBe("Candidatar-se, botão");
  });

  it("senão, usa o botão de envio habilitado", () => {
    pagina(`<main><button type="submit" disabled>Bloqueado</button><button type="submit">Entrar</button></main>`);

    expect(acaoPrincipal()).toBe("Entrar, botão");
  });

  it("sem nenhum dos dois, não inventa uma ação", () => {
    pagina(`<main><button type="button">Outro</button><a href="/x">Link</a></main>`);

    expect(acaoPrincipal()).toBeNull();
  });
});

describe("frasesDeOndeEstou", () => {
  it("monta frases só com o que foi encontrado, na ordem página, etapa, seção, ação", () => {
    expect(frasesDeOndeEstou({ pagina: "Cadastro", etapa: "Etapa 2 de 5 — Dados", secao: "Endereço", acao: "Continuar, botão" })).toEqual([
      "Você está na página: Cadastro.",
      "Etapa 2 de 5 — Dados.",
      "Seção atual: Endereço.",
      "Ação principal desta tela: Continuar, botão.",
    ]);
  });

  it("não repete a seção quando ela é igual ao nome da página", () => {
    expect(frasesDeOndeEstou({ pagina: "Vagas", etapa: null, secao: "Vagas", acao: null })).toEqual(["Você está na página: Vagas."]);
  });

  it("não repete o ponto quando o título da página já termina em pontuação", () => {
    expect(frasesDeOndeEstou({ pagina: "Conectando talentos a oportunidades.", etapa: null, secao: "Quer saber mais?", acao: null })).toEqual([
      "Você está na página: Conectando talentos a oportunidades.",
      "Seção atual: Quer saber mais?",
    ]);
  });

  it("sem nada encontrado, não devolve frases", () => {
    expect(frasesDeOndeEstou({ pagina: null, etapa: null, secao: null, acao: null })).toEqual([]);
  });

  it("coletarOndeEstou reúne tudo da tela atual", () => {
    pagina(`<main><h1>Entrar</h1><h2>Seus dados</h2><button type="submit">Entrar</button></main>`);
    document.querySelector("button")!.focus();

    expect(frasesDeOndeEstou(coletarOndeEstou())).toEqual([
      "Você está na página: Entrar.",
      "Seção atual: Seus dados.",
      "Ação principal desta tela: Entrar, botão.",
    ]);
  });
});
