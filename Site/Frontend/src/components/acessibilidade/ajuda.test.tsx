import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Vaga } from "@/types";

/**
 * As telas de ajuda do Bloco 1: Ferramentas de leitura (Onde estou?, Explique esta página,
 * Glossário, histórico, ajustes rápidos), o resumo simples da vaga, "Ouvir" e a dica de campo. Os
 * contextos são simulados; o DOM, o diálogo do Radix e o `localStorage` são os de verdade.
 */

const { ler, salvarPrefs, preferencias, rota, voz } = vi.hoisted(() => ({
  ler: vi.fn(),
  salvarPrefs: vi.fn(),
  preferencias: { readingRuler: false, focusMode: false, readingMode: false, persistentToasts: false },
  rota: { caminho: "/vaga/abc" },
  voz: { suportado: true },
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) => select({ location: { pathname: rota.caminho } }),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/hooks/useAcessibilidade", () => ({ useAcessibilidade: () => ({ preferencias, rascunho: preferencias, salvar: salvarPrefs }) }));
vi.mock("@/hooks/useVoz", () => ({ useVoz: () => voz }));
vi.mock("@/hooks/useLeituraDestacada", () => ({ useLeituraDestacada: () => ({ ler }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { FerramentasDeLeitura } = await import("./FerramentasDeLeitura");
const { TextoOuvivel } = await import("./TextoOuvivel");
const { DicaDeCampoBotao } = await import("./DicaDeCampoBotao");
const { ResumoVagaSimples } = await import("@/components/vagas/ResumoVagaSimples");
const { CHAVE_HISTORICO, lerHistorico } = await import("@/lib/historicoInstrucoes");

const vaga: Vaga = {
  id: "v1",
  titulo: "Assistente Administrativo",
  descricao: "Profissional responsável pela organização de documentos. Atende o público.",
  requisitos: "- Ensino médio\n- Excel básico",
  beneficios: "Vale-refeição; Plano de saúde",
  modalidade: "hibrido",
  contrato: "clt",
  status: "aberta",
  empresa: { id: "e1", nomeFantasia: "Grupo Aurora" },
};

function abrirFerramentas() {
  render(<FerramentasDeLeitura />);
  act(() => screen.getByRole("button", { name: "Ferramentas de leitura e ajuda" }).click());
  return screen.getByRole("dialog");
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  rota.caminho = "/vaga/abc";
  voz.suportado = true;
  Object.assign(preferencias, { readingRuler: false, focusMode: false, readingMode: false, persistentToasts: false });
  document.title = "Detalhes da vaga — ACESSO";
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("FerramentasDeLeitura", () => {
  it("o botão fixo tem nome acessível mesmo sem o texto (celular)", () => {
    render(<FerramentasDeLeitura />);

    const botao = screen.getByRole("button", { name: "Ferramentas de leitura e ajuda" });
    expect(botao.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("abre com o menu: as quatro ferramentas e os ajustes rápidos", () => {
    const dialogo = abrirFerramentas();

    for (const nome of ["Onde estou?", "Explique esta página", "Glossário", "Meu histórico de instruções"]) {
      expect(within(dialogo).getByRole("button", { name: new RegExp(nome) }), nome).toBeTruthy();
    }
    for (const rotulo of ["Régua de leitura", "Modo foco", "Modo leitura", "Manter avisos até eu fechar"]) {
      expect(within(dialogo).getByRole("switch", { name: rotulo }), rotulo).toBeTruthy();
    }
  });

  it("Onde estou? usa a página lida ANTES de abrir o diálogo", () => {
    document.body.innerHTML = `<main><h1>Vaga de analista</h1><h2>Requisitos</h2><button type="submit">Candidatar-se</button></main><div id="alvo"></div>`;
    render(<FerramentasDeLeitura />, { container: document.getElementById("alvo")! });
    act(() => screen.getByRole("button", { name: "Ferramentas de leitura e ajuda" }).click());

    act(() => screen.getByRole("button", { name: /Onde estou\?/ }).click());

    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByText("Você está na página: Vaga de analista.")).toBeTruthy();
    expect(within(dialogo).getByText(/Ação principal desta tela: Candidatar-se/)).toBeTruthy();
  });

  it("Explique esta página mostra a explicação da rota atual", () => {
    rota.caminho = "/vagas";
    abrirFerramentas();

    act(() => screen.getByRole("button", { name: /Explique esta página/ }).click());

    expect(screen.getByText(/filtrar por cidade, modalidade/)).toBeTruthy();
  });

  it("página sem explicação escrita não inventa uma", () => {
    rota.caminho = "/admin/usuarios";
    abrirFerramentas();

    act(() => screen.getByRole("button", { name: /Explique esta página/ }).click());

    expect(screen.getByText(/Ainda não temos uma explicação escrita/)).toBeTruthy();
  });

  it("Glossário destaca os termos que aparecem na página e deixa buscar os outros", () => {
    document.body.innerHTML = `<main><p>Vaga CLT, trabalho híbrido.</p></main><div id="alvo"></div>`;
    render(<FerramentasDeLeitura />, { container: document.getElementById("alvo")! });
    act(() => screen.getByRole("button", { name: "Ferramentas de leitura e ajuda" }).click());
    act(() => screen.getByRole("button", { name: /Glossário/ }).click());

    const dialogo = screen.getByRole("dialog");
    const daPagina = within(dialogo).getByRole("region", { name: "Termos que aparecem nesta página" });
    expect(within(daPagina).getByRole("heading", { name: "CLT" })).toBeTruthy();
    expect(within(daPagina).getByRole("heading", { name: "Híbrido" })).toBeTruthy();
    expect(within(daPagina).queryByRole("heading", { name: "PJ" })).toBeNull();

    fireEvent.change(within(dialogo).getByLabelText("Buscar um termo"), { target: { value: "banco" } });
    expect(within(dialogo).getByRole("heading", { name: "Banco de horas" })).toBeTruthy();
    expect(within(dialogo).queryByRole("heading", { name: "CLT" })).toBeNull();

    fireEvent.change(within(dialogo).getByLabelText("Buscar um termo"), { target: { value: "zzzz" } });
    expect(within(dialogo).getByRole("status").textContent).toContain('Nenhum termo encontrado para "zzzz"');
  });

  it("a busca do glossário ignora acento", () => {
    abrirFerramentas();
    act(() => screen.getByRole("button", { name: /Glossário/ }).click());

    fireEvent.change(screen.getByLabelText("Buscar um termo"), { target: { value: "periodo de experiencia" } });

    expect(screen.getByRole("heading", { name: "Período de experiência" })).toBeTruthy();
  });

  it("salvar uma explicação a põe no histórico, e o histórico deixa remover e apagar tudo", () => {
    rota.caminho = "/vagas";
    abrirFerramentas();
    act(() => screen.getByRole("button", { name: /Explique esta página/ }).click());

    act(() => screen.getByRole("button", { name: "Salvar para consultar depois" }).click());
    expect(lerHistorico()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Salvo no histórico" }).hasAttribute("disabled")).toBe(true);

    act(() => screen.getByRole("button", { name: /Voltar ao menu/ }).click());
    act(() => screen.getByRole("button", { name: /Meu histórico de instruções/ }).click());
    expect(screen.getByRole("heading", { name: "Página: Vagas" })).toBeTruthy();

    act(() => screen.getByRole("button", { name: "Apagar todo o histórico" }).click());
    expect(lerHistorico()).toHaveLength(1); // pede confirmação antes
    act(() => screen.getByRole("button", { name: "Sim, apagar tudo" }).click());
    expect(lerHistorico()).toHaveLength(0);
    expect(window.localStorage.getItem(CHAVE_HISTORICO)).toBeNull();
    expect(screen.getByText(/Você ainda não salvou nada/)).toBeTruthy();
  });

  it("os ajustes rápidos gravam a preferência na hora", () => {
    const dialogo = abrirFerramentas();

    act(() => within(dialogo).getByRole("switch", { name: "Régua de leitura" }).click());

    expect(salvarPrefs).toHaveBeenCalledWith(expect.objectContaining({ readingRuler: true, focusMode: false }));
  });

  it("tem um caminho para todas as configurações de acessibilidade", () => {
    const dialogo = abrirFerramentas();

    expect(within(dialogo).getByRole("link", { name: /Todas as configurações de acessibilidade/ }).getAttribute("href")).toBe(
      "/configuracoes/acessibilidade",
    );
  });
});

describe("TextoOuvivel", () => {
  it("lê só o conteúdo, sem o texto do próprio botão", () => {
    render(
      <TextoOuvivel rotulo="Ouvir a descrição">
        <p>Conteúdo da vaga.</p>
      </TextoOuvivel>,
    );

    act(() => screen.getByRole("button", { name: "Ouvir a descrição" }).click());

    expect(ler).toHaveBeenCalledTimes(1);
    const alvo = ler.mock.calls[0][0] as HTMLElement;
    expect(alvo.textContent).toBe("Conteúdo da vaga.");
    expect(alvo.textContent).not.toContain("Ouvir");
  });

  it("navegador sem voz: mostra o texto e esconde o botão", () => {
    voz.suportado = false;
    render(
      <TextoOuvivel rotulo="Ouvir a descrição">
        <p>Conteúdo.</p>
      </TextoOuvivel>,
    );

    expect(screen.getByText("Conteúdo.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ouvir a descrição" })).toBeNull();
  });
});

describe("ResumoVagaSimples", () => {
  it("começa fechado e abre com o botão, que informa o estado", () => {
    render(<ResumoVagaSimples vaga={vaga} />);
    const botao = screen.getByRole("button", { name: /Explique esta vaga de forma simples/ });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("O que você vai fazer")).toBeNull();

    act(() => botao.click());

    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("O que você vai fazer")).toBeTruthy();
    expect(screen.getByText(/Você vai ser responsável pela organização de documentos/)).toBeTruthy();
  });

  it("o que a empresa não informou aparece como tal, sem suposição", () => {
    render(<ResumoVagaSimples vaga={vaga} />);
    act(() => screen.getByRole("button", { name: /Explique esta vaga de forma simples/ }).click());

    const salario = screen.getByText("Salário").closest("div")!;
    expect(within(salario).getByText("A empresa não informou.")).toBeTruthy();
    const etapas = screen.getByText("Etapas da seleção").closest("div")!;
    expect(within(etapas).getByText("A empresa não informou.")).toBeTruthy();
  });

  it("Ouvir resumo lê a lista de seções com destaque", () => {
    render(<ResumoVagaSimples vaga={vaga} />);
    act(() => screen.getByRole("button", { name: /Explique esta vaga de forma simples/ }).click());

    act(() => screen.getByRole("button", { name: "Ouvir resumo" }).click());

    const alvo = ler.mock.calls[0][0] as HTMLElement;
    expect(alvo.tagName).toBe("DL");
    expect(alvo.textContent).toContain("Assistente Administrativo");
  });

  it("deixa salvar o resumo no histórico", () => {
    render(<ResumoVagaSimples vaga={vaga} />);
    act(() => screen.getByRole("button", { name: /Explique esta vaga de forma simples/ }).click());

    act(() => screen.getByRole("button", { name: "Salvar para consultar depois" }).click());

    expect(lerHistorico()[0].titulo).toBe("Vaga: Assistente Administrativo");
    expect(lerHistorico()[0].texto).toContain("Etapas da seleção: A empresa não informou.");
  });
});

describe("DicaDeCampoBotao", () => {
  it("abre a orientação e o exemplo sem mexer em nenhum campo", () => {
    render(
      <form>
        <textarea aria-label="Sobre mim" defaultValue="" />
        <DicaDeCampoBotao dica="biografia" nomeDoCampo="Sobre mim" />
      </form>,
    );
    const botao = screen.getByRole("button", { name: /Como preencher/ });
    expect(botao.getAttribute("aria-expanded")).toBe("false");

    act(() => botao.click());

    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/duas ou três frases bastam/i)).toBeTruthy();
    expect(screen.getByText(/este é só uma ilustração/)).toBeTruthy();
    expect((screen.getByLabelText("Sobre mim") as HTMLTextAreaElement).value).toBe("");
  });

  it("o botão não envia o formulário e diz de qual campo é a dica", () => {
    const aoEnviar = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={aoEnviar}>
        <DicaDeCampoBotao dica="tituloProfissional" nomeDoCampo="Título profissional" />
      </form>,
    );

    const botao = screen.getByRole("button", { name: "Como preencher: Título profissional" });
    act(() => botao.click());

    expect(aoEnviar).not.toHaveBeenCalled();
  });
});
