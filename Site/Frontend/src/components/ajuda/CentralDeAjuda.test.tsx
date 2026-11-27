import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { PERGUNTAS, perguntasDe } from "@/dados/perguntasAjuda";
import { COMECE_POR_AQUI, imagemDoPrint, PUBLICOS, TEMAS_DE_AJUDA, TUTORIAIS, tutoriaisDe } from "@/dados/tutoriaisAjuda";
import { textosDoCadastro } from "@/components/cadastro/idioma";
import { DICIONARIOS } from "@/i18n/dicionarios";
import { combinaComABusca, palavrasDaBusca } from "@/lib/buscaNaAjuda";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * A Central de Ajuda: cada área mostra só o que é dela, a busca acha com e sem acento, cada tutorial
 * mostra os passos em ordem com prints descritos, e nada aparece como chave de tradução crua.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search,
    replace: _replace,
    ...resto
  }: {
    children: React.ReactNode;
    to: string;
    search?: Record<string, string | undefined>;
    replace?: boolean;
  }) => {
    const consulta = new URLSearchParams(
      Object.entries(search ?? {}).filter(([, v]) => v !== undefined) as [string, string][],
    ).toString();
    return (
      <a href={consulta ? `${to}?${consulta}` : to} {...resto}>
        {children}
      </a>
    );
  },
}));
vi.mock("@/hooks/useVoz", () => ({ useVoz: () => ({ suportado: true }) }));
vi.mock("@/hooks/useLeituraDestacada", () => ({ useLeituraDestacada: () => ({ ler: vi.fn() }) }));

const { CentralDeAjuda } = await import("./CentralDeAjuda");

afterEach(cleanup);

const enderecos = () => screen.queryAllByRole("link").map((a) => a.getAttribute("href") ?? "");
const buscar = (texto: string) => fireEvent.change(screen.getByRole("searchbox"), { target: { value: texto } });

describe("as duas áreas", () => {
  it.each(PUBLICOS)("a área %s lista os seus tutoriais e nenhum exclusivo da outra", (publico) => {
    render(<CentralDeAjuda publico={publico} />);

    const links = enderecos();
    for (const t of TUTORIAIS) {
      const href = `/ajuda?tema=${t.tema}&publico=${publico}`;
      if (t.publicos.includes(publico)) expect(links).toContain(href);
      else expect(links.some((l) => l.includes(`tema=${t.tema}&`))).toBe(false);
    }
  });

  it("marca a área escolhida e oferece a outra", () => {
    render(<CentralDeAjuda publico="empresa" />);

    const escolha = screen.getByRole("navigation", { name: "Escolha a sua área de ajuda" });
    expect(within(escolha).getByRole("link", { name: /Para empresas/ })).toHaveAttribute("aria-current", "page");
    expect(within(escolha).getByRole("link", { name: /Para candidatos/ })).toHaveAttribute("href", "/ajuda?publico=candidato");
    expect(within(escolha).getByRole("link", { name: /Para candidatos/ })).not.toHaveAttribute("aria-current");
  });

  it.each(PUBLICOS)("%s: o 'comece por aqui' só aponta para tutoriais da própria área", (publico) => {
    const daArea = tutoriaisDe(publico).map((t) => t.tema);

    for (const tema of COMECE_POR_AQUI[publico]) expect(daArea).toContain(tema);
  });

  it.each(PUBLICOS)("%s: toda pergunta que aponta um tutorial aponta um da própria área", (publico) => {
    const daArea = tutoriaisDe(publico).map((t) => t.tema);

    for (const p of perguntasDe(publico)) if (p.tema) expect(daArea, p.id).toContain(p.tema);
  });

  it("os temas e a lista de tutoriais são os mesmos, e cada tutorial tem área", () => {
    expect(TUTORIAIS.map((t) => t.tema).sort()).toEqual([...TEMAS_DE_AJUDA].sort());
    for (const t of TUTORIAIS) expect(t.publicos.length).toBeGreaterThan(0);
  });

  it("toda pergunta tem pergunta e resposta nos três idiomas", () => {
    for (const idioma of Object.values(DICIONARIOS)) {
      for (const p of PERGUNTAS) {
        expect((idioma as Record<string, string>)[p.pergunta], p.pergunta).toBeTruthy();
        expect((idioma as Record<string, string>)[p.resposta], p.resposta).toBeTruthy();
      }
    }
  });
});

describe("busca", () => {
  it("ignora acentos, maiúsculas e a ordem das palavras", () => {
    expect(combinaComABusca(["Esqueci a minha senha. Currículo."], palavrasDaBusca("CURRICULO senha"))).toBe(true);
    expect(combinaComABusca(["Esqueci a minha senha"], palavrasDaBusca("senha vaga"))).toBe(false);
    expect(palavrasDaBusca("  a ?  ")).toEqual([]);
  });

  it("mostra os resultados, anuncia quantos são e já abre as respostas", () => {
    const { container } = render(<CentralDeAjuda />);

    buscar("curriculo");

    expect(screen.getByRole("status")).toHaveTextContent(/\d+ resultados?/);
    expect(enderecos()).toContain("/ajuda?tema=perfil&publico=candidato");
    expect(enderecos()).not.toContain("/ajuda?tema=google&publico=candidato");
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("quando a resposta está na outra área, oferece ir até ela", () => {
    render(<CentralDeAjuda publico="candidato" />);

    buscar("encerrar vaga reabrir");

    expect(screen.getByRole("status")).toHaveTextContent("Nada encontrado");
    expect(screen.getByRole("link", { name: /na área de empresas/ })).toHaveAttribute("href", "/ajuda?publico=empresa");
  });

  it("limpar volta ao conteúdo da área e devolve o foco ao campo", () => {
    render(<CentralDeAjuda />);
    buscar("senha");
    expect(screen.queryByRole("heading", { name: "Comece por aqui" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar a busca" }));

    expect(screen.getByRole("heading", { name: "Comece por aqui" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});

describe("página inicial", () => {
  it.each(PUBLICOS)("%s: sem violação de acessibilidade e sem chave crua", async (publico) => {
    const { container } = render(
      <main>
        <CentralDeAjuda publico={publico} />
      </main>,
    );

    expect(container.textContent).not.toMatch(/\bajuda\.[a-zA-Z]/);
    expect(container.textContent).not.toMatch(/\{var\d\}/);
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it("oferece o contato com a equipe", () => {
    render(<CentralDeAjuda />);

    expect(screen.getByRole("link", { name: /Falar com a equipe/ })).toHaveAttribute("href", "/fale-conosco");
  });
});

describe.each(TUTORIAIS.map((t) => [t.tema, t] as const))("tutorial %s", (tema, tutorial) => {
  const publico = tutorial.publicos[0];

  it("mostra os passos em ordem, cada um com botão de ouvir, e cada print descrito e ampliável", () => {
    const { container } = render(<CentralDeAjuda tema={tema} publico={publico} />);

    const passos = container.querySelectorAll("li[id^='passo-']");
    expect(passos).toHaveLength(tutorial.passos.length);
    expect(screen.getAllByRole("button", { name: /Ouvir o passo/ })).toHaveLength(tutorial.passos.length);

    const comPrint = tutorial.passos.filter((p) => p.print);
    const imagens = [...passos].flatMap((li) => [...li.querySelectorAll("img")]);
    expect(imagens).toHaveLength(comPrint.length);
    for (const imagem of imagens) {
      expect(imagem.getAttribute("alt")!.length).toBeGreaterThan(20);
      expect(imagem).toHaveAttribute("loading", "lazy");
    }
    expect(screen.queryAllByRole("button", { name: /Ampliar a imagem do passo/ })).toHaveLength(comPrint.length);
  });

  it("diz onde a pessoa está, leva à tela de verdade e não deixa chave crua", () => {
    const { container } = render(<CentralDeAjuda tema={tema} publico={publico} />);

    expect(screen.getByRole("navigation", { name: "Você está em" })).toBeInTheDocument();
    expect(container.querySelector(`a[href="${tutorial.acao.para}"]`)).not.toBeNull();
    const textos = [container.textContent, ...[...container.querySelectorAll("img")].map((i) => i.alt)].join(" ");
    expect(textos).not.toMatch(/\b(ajuda|retorno-google)\.[a-zA-Z]/);
    expect(textos).not.toMatch(/\{var\d\}/);
  });

  it("não tem violação de acessibilidade", async () => {
    const { container } = render(
      <main>
        <CentralDeAjuda tema={tema} publico={publico} />
      </main>,
    );

    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});

describe("dentro de um tutorial", () => {
  it("ampliar abre o print grande numa janela, com a descrição", () => {
    render(<CentralDeAjuda tema="aprovacao" publico="empresa" />);

    fireEvent.click(screen.getByRole("button", { name: "Ampliar a imagem do passo 1" }));

    const janela = screen.getByRole("dialog", { name: "Imagem do passo 1" });
    expect(janela).toHaveTextContent("Sua empresa está em análise");
    expect(janela.querySelector("img")).not.toBeNull();
  });

  it("anterior e próximo seguem a ordem da área", () => {
    render(<CentralDeAjuda tema="publicar-vaga" publico="empresa" />);

    const vizinhos = screen.getByRole("navigation", { name: "Outros tutoriais" });
    expect(within(vizinhos).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/ajuda?tema=aprovacao&publico=empresa",
      "/ajuda?tema=gerenciar-vagas&publico=empresa",
    ]);
  });

  it("um tutorial de empresa aberto como candidato mostra a área de empresas", () => {
    render(<CentralDeAjuda tema="publicar-vaga" publico="candidato" />);

    const menu = screen.getByRole("navigation", { name: "Nesta área" });
    expect(within(menu).getByRole("link", { name: "Publicar uma vaga" })).toHaveAttribute("aria-current", "page");
    expect(within(menu).queryByRole("link", { name: /candidatar/ })).not.toBeInTheDocument();
  });

  it("um tutorial das duas áreas respeita a área de onde a pessoa veio", () => {
    render(<CentralDeAjuda tema="entrar" publico="empresa" />);

    expect(screen.getByRole("navigation", { name: "Você está em" })).toHaveTextContent("Para empresas");
  });
});

/**
 * Os textos em inglês e espanhol citam botões entre aspas curvas. O nome citado precisa ser o que a tela
 * mostra naquele idioma — se alguém renomear um botão, o tutorial não pode continuar mandando tocar no
 * nome antigo.
 */
describe.each(["en", "es"] as const)("nomes de botão citados em %s", (idioma) => {
  it("existem como texto da interface nesse idioma", () => {
    const dicionario = DICIONARIOS[idioma] as Record<string, string>;
    const rotulos = new Set([...Object.values(dicionario), ...Object.values(textosDoCadastro(idioma)).filter((v) => typeof v === "string")]);
    const faltando: string[] = [];

    for (const [chave, texto] of Object.entries(dicionario)) {
      if (!/^(ajuda\.|retorno-google\.tutorial)/.test(chave)) continue;
      for (const [, citado] of texto.matchAll(/“([^”]+)”/g)) {
        if (!rotulos.has(citado as string)) faltando.push(`${chave}: ${citado}`);
      }
    }

    expect(faltando).toEqual([]);
  });
});

describe("prints", () => {
  /** Largura e altura de um WebP, lidas do próprio arquivo (formato estendido ou simples com perda). */
  function tamanhoDoWebp(caminho: string): [number, number] {
    const b = readFileSync(caminho);
    const formato = b.toString("ascii", 12, 16);
    if (formato === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
    expect(formato).toBe("VP8 ");
    return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  }

  const usados = [...new Set(TUTORIAIS.flatMap((t) => t.passos).flatMap((p) => (p.print ? [p.print.nome] : [])))];

  it.each(["pt", "en", "es"] as const)("%s: cada passo tem o seu arquivo, e as medidas batem (senão a página pula)", (idioma) => {
    expect(usados.length).toBeGreaterThanOrEqual(28);

    for (const nome of usados) {
      const imagem = imagemDoPrint(nome, idioma);
      expect(imagem.src).toContain(`/${idioma}/${nome}`);
      expect({ nome, medidas: tamanhoDoWebp(resolve(process.cwd(), "src/assets/ajuda", idioma, `${nome}.webp`)) }).toEqual({
        nome,
        medidas: [imagem.largura, imagem.altura],
      });
    }
  });

  it("o gerador de prints e os tutoriais citam os mesmos nomes (nada sobra, nada falta)", () => {
    const passos = readFileSync(resolve(process.cwd(), "scripts/prints-da-ajuda/passos.mjs"), "utf8");
    const gerados = [...passos.matchAll(/nome: "([\w-]+)"/g)].map((m) => m[1]);

    expect(gerados.sort()).toEqual([...usados].sort());
  });

  it("um print que não existe é um erro claro, com o comando que resolve", () => {
    expect(() => imagemDoPrint("nao-existe", "pt")).toThrow(/npm run ajuda:prints/);
  });
});
