import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { descreverElemento } from "@/lib/leitorSemantico";
import { listarParadas } from "@/lib/cursorDeLeitura";
import { VOCABULARIOS, mensagemSemVoz, vocabularioDoSite, vocabularioPara } from "@/lib/vocabularioDeLeitura";

/** Monta o HTML numa página com `<html lang>` definido, como o IdiomaProvider faz. */
function pagina(lang: string, html: string) {
  document.documentElement.lang = lang;
  document.body.innerHTML = html;
}

beforeEach(() => {
  document.documentElement.lang = "";
});

afterEach(() => {
  document.documentElement.lang = "";
  document.body.innerHTML = "";
});

describe("vocabulários", () => {
  it("os três idiomas têm todas as palavras preenchidas", () => {
    for (const [idioma, v] of Object.entries(VOCABULARIOS)) {
      for (const grupo of [v.funcao, v.estado]) {
        for (const [chave, valor] of Object.entries(grupo)) expect(valor.trim().length, `${idioma}.${chave}`).toBeGreaterThan(1);
      }

      expect(v.erro.length, idioma).toBeGreaterThan(2);
      expect(v.imagem.length, idioma).toBeGreaterThan(2);
      expect(v.fimDaPagina.length, idioma).toBeGreaterThan(5);
      expect(v.inicioDaPagina.length, idioma).toBeGreaterThan(5);
      expect(v.titulo("2").includes("2"), idioma).toBe(true);
      expect(v.titulo(null).includes("2"), idioma).toBe(false);
    }
  });

  it("o estado desativado e o desabilitado não se confundem em nenhum idioma", () => {
    for (const [idioma, v] of Object.entries(VOCABULARIOS)) expect(v.estado.desativado, idioma).not.toBe(v.estado.desabilitado);
  });

  it("o idioma do texto vence; na dúvida, vale o do site", () => {
    expect(vocabularioPara("Sign in to see the jobs that are open for you.", "pt-BR").funcao.botao).toBe("button");
    expect(vocabularioPara("Veja as vagas abertas para o seu perfil e a sua cidade.", "en-US").funcao.botao).toBe("botão");
    expect(vocabularioPara("Entrar", "en-US").funcao.botao).toBe("button");
    expect(vocabularioPara("Entrar", "es-ES").funcao.botao).toBe("botón");
    expect(vocabularioDoSite("es-ES").fimDaPagina).toBe("Fin de la página.");
  });

  it("o aviso de falta de voz sai no idioma do site, citando o idioma que falta", () => {
    expect(mensagemSemVoz("en", "pt")).toBe("Seu aparelho não tem uma voz em inglês. A leitura usará outra voz e pode soar estranha.");
    expect(mensagemSemVoz("pt", "en")).toBe("Your device has no Portuguese voice. The reading will use another voice and may sound odd.");
    expect(mensagemSemVoz("pt", "es")).toBe("Su dispositivo no tiene una voz en portugués. La lectura usará otra voz y puede sonar extraña.");
  });
});

describe("a narração dos controles fala o idioma do texto", () => {
  it("site em inglês, tela em inglês: tudo em inglês", () => {
    pagina("en-US", `<button id="b">Sign in to your account</button><a id="l" href="/x">See the jobs that are open</a>`);

    expect(descreverElemento(document.getElementById("b") as HTMLElement)).toBe("Sign in to your account, button.");
    expect(descreverElemento(document.getElementById("l") as HTMLElement)).toBe("See the jobs that are open, link.");
  });

  it("site em espanhol, tela em espanhol: tudo em espanhol", () => {
    pagina("es-ES", `<button id="b">Iniciar sesión en su cuenta</button><input id="c" type="checkbox" aria-label="Acepto los términos y condiciones" checked />`);

    expect(descreverElemento(document.getElementById("b") as HTMLElement)).toBe("Iniciar sesión en su cuenta, botón.");
    expect(descreverElemento(document.getElementById("c") as HTMLElement)).toBe("Acepto los términos y condiciones, casilla de verificación.");
  });

  it("site em inglês, mas a tela ainda em português (não traduzida): a frase fica toda em português", () => {
    pagina("en-US", `<button id="b">Ouvir a ficha de Atendente, com atividades e rotina</button>`);

    expect(descreverElemento(document.getElementById("b") as HTMLElement)).toBe("Ouvir a ficha de Atendente, com atividades e rotina, botão.");
  });

  it("nome curto numa tela em português, com o site em inglês: a frase fica em português (a tela manda, não o site)", () => {
    pagina(
      "en-US",
      `<main><h1>Dicionário de profissões</h1><p>Descubra o que cada profissão faz no dia a dia, com ferramentas, habilidades e um exemplo de rotina. Você pode ouvir cada ficha em voz alta.</p><button id="b">Ouvir a ficha de Atendente</button><a id="l" href="/x">Sobre nós</a></main>`,
    );

    expect(descreverElemento(document.getElementById("b") as HTMLElement)).toBe("Ouvir a ficha de Atendente, botão.");
    expect(descreverElemento(document.getElementById("l") as HTMLElement)).toBe("Sobre nós, link.");
  });

  it("nome curto e ambíguo segue o idioma do site", () => {
    pagina("en-US", `<button id="b">Entrar</button>`);
    expect(descreverElemento(document.getElementById("b") as HTMLElement)).toBe("Entrar, button.");

    pagina("es-ES", `<button id="b">Entrar</button>`);
    expect(descreverElemento(document.getElementById("b") as HTMLElement)).toBe("Entrar, botón.");
  });

  it("os estados também vêm no idioma (marcado, expandido, com erro, desabilitado)", () => {
    pagina(
      "en-US",
      `<button id="e" aria-expanded="false">Show the details of the job</button>
       <input id="i" aria-label="Your email address for the account" aria-invalid="true" aria-describedby="d" /><p id="d">Enter a valid email address.</p>
       <button id="x" disabled>Send the message to the company</button>`,
    );

    expect(descreverElemento(document.getElementById("e") as HTMLElement)).toBe("Show the details of the job, button, collapsed.");
    expect(descreverElemento(document.getElementById("i") as HTMLElement)).toBe("Your email address for the account, text field, with an error. Error: Enter a valid email address.");
    expect(descreverElemento(document.getElementById("x") as HTMLElement)).toBe("Send the message to the company, button, disabled.");
  });

  it("imagem: o prefixo acompanha o idioma da descrição", () => {
    pagina("pt-BR", `<img id="a" src="x.png" alt="A team of people working together at the office" /><img id="b" src="x.png" alt="Equipe de pessoas trabalhando juntas no escritório" />`);

    expect(descreverElemento(document.getElementById("a") as HTMLElement)).toBe("Image: A team of people working together at the office.");
    expect(descreverElemento(document.getElementById("b") as HTMLElement)).toBe("Imagem: Equipe de pessoas trabalhando juntas no escritório.");
  });

  it("português continua exatamente como era (sem lang no documento)", () => {
    pagina("", `<button id="b">Salvar as alterações do perfil</button>`);

    expect(descreverElemento(document.getElementById("b") as HTMLElement)).toBe("Salvar as alterações do perfil, botão.");
  });
});

describe("o cursor de leitura anuncia os títulos no idioma do título", () => {
  it("título em inglês e em português na mesma tela", () => {
    pagina("en-US", `<main><h1>Open jobs for you and your team</h1><h2>Vagas abertas para a sua cidade e o seu perfil</h2><p>Text of the page that is here.</p></main>`);

    const falas = listarParadas(document.querySelector("main") as HTMLElement).map((p) => p.fala);

    expect(falas[0]).toBe("Heading level 1: Open jobs for you and your team.");
    expect(falas[1]).toBe("Título de nível 2: Vagas abertas para a sua cidade e o seu perfil.");
  });
});
