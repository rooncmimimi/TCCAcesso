import { afterEach, describe, expect, it } from "vitest";

import { detectarIdiomaDoTexto, escolherVoz, idiomaDaTela, idiomaDoSite, idiomaParaFalar, localeParaFalar, type VozEscolhivel } from "@/lib/idiomaDaFala";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "";
});

describe("detectarIdiomaDoTexto", () => {
  it.each([
    ["Você vai organizar a agenda e atender os clientes da empresa.", "pt"],
    ["O que a pessoa faz: receber clientes, responder dúvidas e registrar pedidos.", "pt"],
    ["Preciso de um momento para responder, não compreendi a instrução.", "pt"],
    ["You will organize the schedule and help the customers of the company.", "en"],
    ["Sign in to see the jobs that are open for you and your team.", "en"],
    ["Usted va a organizar la agenda y atender a los clientes de la empresa.", "es"],
    ["Hay empleos abiertos para su perfil, pero también puede buscar más.", "es"],
  ])("“%s” é %s", (texto, esperado) => {
    expect(detectarIdiomaDoTexto(texto)).toBe(esperado);
  });

  it("texto curto, nome próprio ou palavra solta: não sabe", () => {
    expect(detectarIdiomaDoTexto("Entrar")).toBeNull();
    expect(detectarIdiomaDoTexto("ACESSO")).toBeNull();
    expect(detectarIdiomaDoTexto("Home page")).toBeNull();
    expect(detectarIdiomaDoTexto("")).toBeNull();
    expect(detectarIdiomaDoTexto("   ")).toBeNull();
  });

  it("uma palavra com letra exclusiva já indica o idioma", () => {
    expect(detectarIdiomaDoTexto("Botão")).toBe("pt");
    expect(detectarIdiomaDoTexto("Niño")).toBe("es");
  });

  it("mistura sem predomínio claro: não sabe, em vez de chutar", () => {
    expect(detectarIdiomaDoTexto("vaga empresa pessoa job and")).toBeNull();
    // Mas quando um lado predomina com clareza, ele vence mesmo havendo palavras do outro.
    expect(detectarIdiomaDoTexto("the vagas and the empresa")).toBe("en");
  });

  it("não inventa um idioma que o site não tem", () => {
    expect(detectarIdiomaDoTexto("Le chat est sur la table et il mange la souris")).toBeNull();
    expect(detectarIdiomaDoTexto("Der Hund ist im Garten und spielt mit dem Ball")).toBeNull();
  });
});

describe("idiomaDoSite e idiomaParaFalar", () => {
  it("lê o <html lang> e cai em português se não for um dos três", () => {
    expect(idiomaDoSite("en-US")).toBe("en");
    expect(idiomaDoSite("es-ES")).toBe("es");
    expect(idiomaDoSite("pt-BR")).toBe("pt");
    expect(idiomaDoSite("fr-FR")).toBe("pt");
    expect(idiomaDoSite("")).toBe("pt");
    expect(idiomaDoSite(undefined)).toBe("pt");
  });

  it("o texto manda; na dúvida, vale o idioma do site", () => {
    // Site em inglês, mas o texto na tela ainda está em português (tela não traduzida).
    expect(idiomaParaFalar("O que a pessoa faz: receber clientes e responder dúvidas.", "en-US")).toBe("pt");
    // Texto curto e ambíguo: vale o idioma do site.
    expect(idiomaParaFalar("Entrar", "en-US")).toBe("en");
    expect(idiomaParaFalar("Entrar", "es-ES")).toBe("es");
    expect(idiomaParaFalar("Sign in to see your jobs and the schedule.", "pt-BR")).toBe("en");
  });

  it("devolve o locale completo para a voz", () => {
    expect(localeParaFalar("Sign in to see the jobs that are open for you.", "pt-BR")).toBe("en-US");
    expect(localeParaFalar("Hay empleos abiertos para su perfil.", "pt-BR")).toBe("es-ES");
    expect(localeParaFalar("Entrar", "pt-BR")).toBe("pt-BR");
  });
});

describe("idiomaDaTela: a pista do que está em volta", () => {
  const PT = "<h1>Dicionário de profissões</h1><p>Descubra o que cada profissão faz no dia a dia, com ferramentas, habilidades e um exemplo de rotina. Você pode ouvir cada ficha em voz alta.</p>";
  const EN = "<h1>Open jobs</h1><p>See the jobs that are open for you and your team. Sign in to save the ones that you like and to apply with your profile.</p>";

  it("usa o idioma do texto do bloco principal da tela", () => {
    document.body.innerHTML = `<header><a id="a" href="/">Sobre nós</a></header><main>${PT}<button id="b">Ouvir</button></main>`;

    expect(idiomaDaTela(document.getElementById("b"))).toBe("pt");
    // Um elemento fora do main (cabeçalho) usa o main da página.
    expect(idiomaDaTela(document.getElementById("a"))).toBe("pt");
    expect(idiomaDaTela()).toBe("pt");
  });

  it("tela em inglês", () => {
    document.body.innerHTML = `<main>${EN}<button id="b">Save</button></main>`;

    expect(idiomaDaTela(document.getElementById("b"))).toBe("en");
  });

  it("um lang marcado de propósito vence o texto, mas o <html lang> não conta como pista", () => {
    document.documentElement.lang = "en-US";
    document.body.innerHTML = `<main>${PT}<div lang="es"><button id="b">Ver</button></div><button id="c">Ouvir</button></main>`;

    expect(idiomaDaTela(document.getElementById("b"))).toBe("es");
    expect(idiomaDaTela(document.getElementById("c"))).toBe("pt");
  });

  it("com um diálogo aberto, vale o texto do diálogo", () => {
    document.body.innerHTML = `<main>${PT}</main><div role="dialog"><p>Sign in to your account to see the jobs that are open for you and your team.</p><button id="b">Cancel</button></div>`;

    expect(idiomaDaTela(document.getElementById("b"))).toBe("en");
  });

  it("sem main ou sem texto que diga: null (quem chama cai no idioma do site)", () => {
    document.body.innerHTML = '<div><button id="b">Entrar</button></div>';
    expect(idiomaDaTela(document.getElementById("b"))).toBeNull();

    document.body.innerHTML = '<main><button id="b">Entrar</button></main>';
    expect(idiomaDaTela(document.getElementById("b"))).toBeNull();
  });

  it("idiomaParaFalar: texto, depois a tela, depois o site", () => {
    document.body.innerHTML = `<main>${PT}<button id="b">Ouvir</button></main>`;

    // Site em inglês, tela em português, texto curto ("Sobre nós"): fala em português.
    expect(idiomaParaFalar("Sobre nós", "en-US", document.getElementById("b"))).toBe("pt");
    // O texto, quando diz, vence a tela.
    expect(idiomaParaFalar("Sign in to see the jobs that are open for you and your team.", "pt-BR", document.getElementById("b"))).toBe("en");
    // Sem pista da tela, o site.
    document.body.innerHTML = '<div id="b"></div>';
    expect(idiomaParaFalar("Entrar", "es-ES", document.getElementById("b"))).toBe("es");
  });
});

describe("escolherVoz", () => {
  const voz = (lang: string, extra: Partial<VozEscolhivel> = {}) => ({ lang, localService: false, default: false, nome: `${lang}-${JSON.stringify(extra)}`, ...extra });

  it("prefere o mesmo locale ao mesmo idioma", () => {
    const vozes = [voz("pt-PT"), voz("pt-BR"), voz("en-US")];

    expect(escolherVoz(vozes, "pt-BR")?.lang).toBe("pt-BR");
  });

  it("aceita o mesmo idioma em outro país quando não há o locale exato", () => {
    expect(escolherVoz([voz("pt-PT"), voz("en-GB")], "pt-BR")?.lang).toBe("pt-PT");
    expect(escolherVoz([voz("en-GB")], "en-US")?.lang).toBe("en-GB");
  });

  it("aceita o formato com sublinhado de alguns Androids", () => {
    expect(escolherVoz([voz("pt_BR"), voz("en_US")], "en-US")?.lang).toBe("en_US");
  });

  it("dentro do mesmo locale, prefere a padrão, depois a local, depois a primeira", () => {
    const rede = voz("en-US", { localService: false });
    const local = voz("en-US", { localService: true });
    const padrao = voz("en-US", { default: true });

    expect(escolherVoz([rede, local, padrao], "en-US")).toBe(padrao);
    expect(escolherVoz([rede, local], "en-US")).toBe(local);
    expect(escolherVoz([rede, voz("en-US", { localService: false })], "en-US")).toBe(rede);
  });

  it("sem voz do idioma (ou sem nenhuma voz): null, para quem chama avisar", () => {
    expect(escolherVoz([voz("pt-BR")], "en-US")).toBeNull();
    expect(escolherVoz([], "pt-BR")).toBeNull();
  });
});
