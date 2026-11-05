import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { PREFERENCIAS_PADRAO, type PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

/**
 * Bloco 4: proteção contra tremores, atalhos de teclado, comandos de voz, central de comunicação,
 * frases prontas, dicionário de profissões e navegação por objetivos. Preferências, navegação, sessão
 * e voz são simuladas; o que se confere é o que a pessoa vê e o que de fato acontece.
 */

const { estado, navegar, voz, toast } = vi.hoisted(() => ({
  estado: { prefs: null as unknown as PreferenciasAcessibilidade, salvar: null as unknown as (p: PreferenciasAcessibilidade) => void, usuario: null as null | { tipo: string }, autenticado: false },
  navegar: vi.fn(),
  voz: { falar: vi.fn(), parar: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/useAcessibilidade", () => ({
  useAcessibilidade: () => ({ preferencias: estado.prefs, rascunho: estado.prefs, salvar: estado.salvar, definir: vi.fn() }),
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ usuario: estado.usuario, autenticado: estado.autenticado }) }));
vi.mock("@/hooks/useVoz", () => ({ useVoz: () => voz }));
vi.mock("@/components/acessibilidade/TextoOuvivel", () => ({ TextoOuvivel: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navegar,
  Link: ({ children, to, search: _s, ...resto }: { children: React.ReactNode; to: string; search?: unknown }) => (
    <a href={to} {...(resto as object)}>
      {children}
    </a>
  ),
}));

const { useGuardaDeAcionamentos } = await import("@/hooks/useGuardaDeAcionamentos");
const { useAtalhosDeTeclado, abrirAjudaDeAtalhos } = await import("@/hooks/useAtalhosDeTeclado");
const { AvisoDeCliqueIgnorado } = await import("@/components/acessibilidade/AvisoDeCliqueIgnorado");
const { AjudaDeAtalhos } = await import("@/components/acessibilidade/AjudaDeAtalhos");
const { ComandosDeVoz } = await import("@/components/acessibilidade/ComandosDeVoz");
const { pedirComandoDeVoz } = await import("@/hooks/useComandoDeVoz");
const { CentralDeComunicacao } = await import("@/components/comunicacao/CentralDeComunicacao");
const { FrasesProntas } = await import("@/components/mensagens/FrasesProntas");
const { DicionarioDeProfissoes } = await import("@/components/profissoes/DicionarioDeProfissoes");
const { NavegacaoPorObjetivos } = await import("@/components/objetivos/NavegacaoPorObjetivos");
const { SecaoMotricidade } = await import("@/components/acessibilidade/SecaoMotricidade");

const preferencias = (extra: Partial<PreferenciasAcessibilidade> = {}): PreferenciasAcessibilidade => ({ ...PREFERENCIAS_PADRAO, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  estado.prefs = preferencias();
  estado.salvar = vi.fn();
  estado.usuario = null;
  estado.autenticado = false;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

/* ------------------------------------------------------------------ proteção contra tremores */

function Guarda() {
  useGuardaDeAcionamentos();

  return (
    <>
      <button onClick={() => (window as unknown as { cliques: string[] }).cliques.push("a")}>A</button>
      <button onClick={() => (window as unknown as { cliques: string[] }).cliques.push("b")}>B</button>
      <button data-permite-repeticao onClick={() => (window as unknown as { cliques: string[] }).cliques.push("mais")}>
        Mais
      </button>
      <form data-testid="formulario" onSubmit={(e) => { e.preventDefault(); (window as unknown as { cliques: string[] }).cliques.push("envio"); }}>
        <button type="submit">Enviar</button>
      </form>
      <AvisoDeCliqueIgnorado />
    </>
  );
}

describe("proteção contra tremores", () => {
  let relogio = 0;

  beforeEach(() => {
    relogio = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => relogio);
    (window as unknown as { cliques: string[] }).cliques = [];
  });

  const cliques = () => (window as unknown as { cliques: string[] }).cliques;

  it("ligada: o segundo toque no mesmo botão dentro do intervalo é ignorado, com aviso visível", () => {
    estado.prefs = preferencias({ tremorGuard: true, tremorDelay: 700 });
    render(<Guarda />);

    fireEvent.click(screen.getByRole("button", { name: "A" }));
    relogio += 200;
    fireEvent.click(screen.getByRole("button", { name: "A" }));

    expect(cliques()).toEqual(["a"]);
    expect(screen.getByRole("status").textContent).toMatch(/Toque repetido ignorado/);
  });

  it("outro botão não é afetado, e depois do intervalo o mesmo botão volta a funcionar", () => {
    estado.prefs = preferencias({ tremorGuard: true, tremorDelay: 700 });
    render(<Guarda />);

    fireEvent.click(screen.getByRole("button", { name: "A" }));
    relogio += 100;
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    relogio += 800;
    fireEvent.click(screen.getByRole("button", { name: "A" }));

    expect(cliques()).toEqual(["a", "b", "a"]);
  });

  it("botões marcados para repetição (+ e −) nunca são bloqueados", () => {
    estado.prefs = preferencias({ tremorGuard: true, tremorDelay: 2000 });
    render(<Guarda />);

    fireEvent.click(screen.getByRole("button", { name: "Mais" }));
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));

    expect(cliques()).toEqual(["mais", "mais"]);
  });

  it("desligada: cliques repetidos passam normalmente", () => {
    render(<Guarda />);

    fireEvent.click(screen.getByRole("button", { name: "A" }));
    fireEvent.click(screen.getByRole("button", { name: "A" }));

    expect(cliques()).toEqual(["a", "a"]);
  });

  it("o envio duplicado do mesmo formulário é evitado para todos, mesmo com a proteção desligada", () => {
    render(<Guarda />);

    const formulario = screen.getByTestId("formulario");

    fireEvent.submit(formulario);
    relogio += 100;
    fireEvent.submit(formulario);
    relogio += 600;
    fireEvent.submit(formulario);

    expect(cliques()).toEqual(["envio", "envio"]);
  });
});

/* ---------------------------------------------------------------------- atalhos de teclado */

function Atalhos() {
  useAtalhosDeTeclado();

  return (
    <>
      <input aria-label="campo" />
      <AjudaDeAtalhos />
    </>
  );
}

const teclar = (key: string, alvo: Element = document.body) => act(() => void fireEvent.keyDown(alvo, { key }));

describe("atalhos de teclado", () => {
  beforeEach(() => {
    estado.autenticado = true;
    estado.usuario = { tipo: "candidato" };
  });

  it("G e depois V levam às vagas; G e M, às mensagens", () => {
    render(<Atalhos />);

    teclar("g");
    teclar("v");
    teclar("g");
    teclar("m");

    expect(navegar).toHaveBeenNthCalledWith(1, { to: "/vagas" });
    expect(navegar).toHaveBeenNthCalledWith(2, { to: "/mensagens" });
  });

  it("enquanto a pessoa digita em um campo, nada acontece", () => {
    render(<Atalhos />);

    const campo = screen.getByLabelText("campo");

    teclar("g", campo);
    teclar("v", campo);
    teclar("?", campo);

    expect(navegar).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("? abre a lista de atalhos com as teclas em texto; Esc fecha", () => {
    render(<Atalhos />);
    teclar("?");

    const dialogo = screen.getByRole("dialog");

    expect(within(dialogo).getByText("Ir para as vagas")).toBeTruthy();
    expect(within(dialogo).getByText("G depois V")).toBeTruthy();
    expect(within(dialogo).getByText("Abrir a pesquisa")).toBeTruthy();
  });

  it("a lista também abre por código (menu de ajuda e comando de voz)", () => {
    render(<Atalhos />);
    act(() => abrirAjudaDeAtalhos());

    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("com um diálogo aberto, os atalhos de navegação não agem", () => {
    render(<Atalhos />);
    teclar("?");
    teclar("g", screen.getByRole("dialog"));
    teclar("v", screen.getByRole("dialog"));

    expect(navegar).not.toHaveBeenCalled();
  });

  it("desligados nas preferências: nenhuma tecla faz nada", () => {
    estado.prefs = preferencias({ shortcuts: false });
    render(<Atalhos />);

    teclar("g");
    teclar("v");
    teclar("?");

    expect(navegar).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("o interruptor da lista desliga os atalhos (e o que fica salvo é só essa preferência)", () => {
    render(<Atalhos />);
    teclar("?");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("switch", { name: "Atalhos de teclado ligados" }));

    expect(estado.salvar).toHaveBeenCalledWith(expect.objectContaining({ shortcuts: false }));
  });

  it("visitante: só os atalhos públicos (a lista não mostra os privados)", () => {
    estado.autenticado = false;
    estado.usuario = null;
    render(<Atalhos />);

    teclar("g");
    teclar("m"); // mensagens: privado
    expect(navegar).not.toHaveBeenCalled();

    teclar("g");
    teclar("v");
    expect(navegar).toHaveBeenCalledWith({ to: "/vagas" });

    teclar("?");
    expect(within(screen.getByRole("dialog")).queryByText("Ir para as mensagens")).toBeNull();
  });
});

/* ------------------------------------------------------------------------ comandos de voz */

class ReconhecimentoFalso {
  static ultimo: ReconhecimentoFalso | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: { resultIndex: number; results: unknown[] }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() {
    ReconhecimentoFalso.ultimo = this;
  }
  ouvir(fala: string) {
    this.onresult?.({ resultIndex: 0, results: [[{ transcript: fala }]] });
    this.onend?.();
  }
}

describe("comandos de voz", () => {
  beforeEach(() => {
    estado.autenticado = true;
    estado.usuario = { tipo: "candidato" };
    ReconhecimentoFalso.ultimo = null;
  });

  const comecar = () => {
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = ReconhecimentoFalso;
    render(<ComandosDeVoz />);
    act(() => pedirComandoDeVoz());
  };

  it("não escuta sozinho: só quando é pedido, e mostra o microfone ligado com o botão Parar", () => {
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = ReconhecimentoFalso;
    render(<ComandosDeVoz />);

    expect(ReconhecimentoFalso.ultimo).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();

    act(() => pedirComandoDeVoz());

    expect(ReconhecimentoFalso.ultimo?.start).toHaveBeenCalledTimes(1);
    expect(ReconhecimentoFalso.ultimo?.continuous).toBe(false);
    expect(screen.getByRole("status").textContent).toMatch(/Microfone ligado/);
  });

  it("Parar interrompe na hora", () => {
    comecar();
    act(() => screen.getByRole("button", { name: /Parar/ }).click());

    expect(ReconhecimentoFalso.ultimo?.stop).toHaveBeenCalled();
    expect(screen.queryByText(/Microfone ligado/)).toBeNull();
  });

  it("“ir para vagas” navega e mostra o que foi ouvido e o que será feito", () => {
    comecar();
    act(() => ReconhecimentoFalso.ultimo!.ouvir("ir para vagas"));

    expect(navegar).toHaveBeenCalledWith({ to: "/vagas" });
    expect(screen.getByText(/Ouvi: “ir para vagas”/)).toBeTruthy();
    expect(screen.getByText(/Indo para as vagas/)).toBeTruthy();
  });

  it("pesquisar vagas leva o termo", () => {
    comecar();
    act(() => ReconhecimentoFalso.ultimo!.ouvir("pesquisar vagas de atendente"));

    expect(navegar).toHaveBeenCalledWith({ to: "/vagas", search: { q: "atendente" } });
  });

  it("ativar modo leitura grava só essa preferência", () => {
    comecar();
    act(() => ReconhecimentoFalso.ultimo!.ouvir("ativar modo leitura"));

    expect(estado.salvar).toHaveBeenCalledWith(expect.objectContaining({ readingMode: true }));
  });

  it("parar leitura chama a voz", () => {
    comecar();
    act(() => ReconhecimentoFalso.ultimo!.ouvir("parar leitura"));

    expect(voz.parar).toHaveBeenCalled();
  });

  it("comando destrutivo é recusado, com explicação, e nada acontece", () => {
    comecar();
    act(() => ReconhecimentoFalso.ultimo!.ouvir("excluir minha conta"));

    expect(navegar).not.toHaveBeenCalled();
    expect(estado.salvar).not.toHaveBeenCalled();
    expect(screen.getByText(/com as mãos/)).toBeTruthy();
  });

  it("frase desconhecida: não age e dá exemplos", () => {
    comecar();
    act(() => ReconhecimentoFalso.ultimo!.ouvir("blá blá blá"));

    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByText(/Não entendi “blá blá blá”/)).toBeTruthy();
  });

  it("candidatar-me só aciona o botão de candidatura que está na tela (que abre a revisão)", () => {
    document.body.insertAdjacentHTML("beforeend", `<main><button id="cand">Candidatar-se</button></main>`);

    const cliques: string[] = [];

    document.getElementById("cand")!.addEventListener("click", () => cliques.push("abriu"));
    comecar();
    act(() => ReconhecimentoFalso.ultimo!.ouvir("candidatar-me"));

    expect(cliques).toEqual(["abriu"]);
    expect(screen.getByText(/Revise e envie com as mãos/)).toBeTruthy();

    document.querySelector("main")?.remove();
  });

  it("sem suporte no navegador, avisa em vez de fingir", () => {
    render(<ComandosDeVoz />);
    act(() => pedirComandoDeVoz());

    expect(screen.getByText(/não oferece reconhecimento de voz/)).toBeTruthy();
  });

  it("erro do microfone aparece em texto", () => {
    comecar();
    act(() => ReconhecimentoFalso.ultimo!.onerror?.({ error: "not-allowed" }));
    act(() => ReconhecimentoFalso.ultimo!.onend?.());

    expect(screen.getByText(/não deixou usar o microfone/)).toBeTruthy();
  });
});

/* --------------------------------------------------------------- central de comunicação */

describe("central de comunicação", () => {
  it("mostra os cartões pedidos, em grupos", () => {
    render(<CentralDeComunicacao />);

    for (const frase of ["Preciso de um momento para responder.", "Poderia repetir a pergunta?", "Prefiro responder por escrito.", "Não compreendi a instrução.", "Preciso de ajuda.", "Gostaria de solicitar uma adaptação.", "Preciso de uma pausa."]) {
      expect(screen.getByText(frase), frase).toBeTruthy();
    }

    expect(screen.getByRole("heading", { name: "Para pedir adaptações" })).toBeTruthy();
  });

  it("Mostrar abre a frase em letras grandes, e Ouvir fala o texto do cartão", () => {
    render(<CentralDeComunicacao />);

    fireEvent.click(screen.getByRole("button", { name: "Mostrar em tela cheia: Preciso de uma pausa." }));

    const dialogo = screen.getByRole("dialog");

    expect(within(dialogo).getByText("Preciso de uma pausa.")).toBeTruthy();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Ouvir" }));
    expect(voz.falar).toHaveBeenCalledWith("Preciso de uma pausa.");

    // Há dois botões "Fechar": o da própria tela e o X do diálogo. Qualquer um fecha.
    fireEvent.click(within(dialogo).getAllByRole("button", { name: "Fechar" })[0]);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ouvir: Preciso de ajuda." }));
    expect(voz.falar).toHaveBeenLastCalledWith("Preciso de ajuda.");
  });

  it("Copiar usa a área de transferência e avisa; se negar, diz como fazer", async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);

    Object.assign(navigator, { clipboard: { writeText: escrever } });
    render(<CentralDeComunicacao />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar: Preciso de ajuda." }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(escrever).toHaveBeenCalledWith("Preciso de ajuda.");

    escrever.mockRejectedValue(new Error("negado"));
    fireEvent.click(screen.getByRole("button", { name: "Copiar: Preciso de ajuda." }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Selecione o texto/)));
  });

  it("a pessoa cria e remove os próprios cartões (ficam só no navegador)", () => {
    render(<CentralDeComunicacao />);

    expect(screen.getByText("Você ainda não criou nenhum cartão.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nova frase"), { target: { value: "Prefiro conversar por texto." } });
    fireEvent.click(screen.getByRole("button", { name: "Criar cartão" }));

    expect(screen.getByText("Prefiro conversar por texto.")).toBeTruthy();
    expect(window.localStorage.getItem("acesso:cartoes-comunicacao")).toContain("Prefiro conversar por texto.");

    fireEvent.click(screen.getByRole("button", { name: "Remover o cartão: Prefiro conversar por texto." }));
    expect(screen.queryByText("Prefiro conversar por texto.")).toBeNull();
  });

  it("cartão repetido é recusado com mensagem", () => {
    render(<CentralDeComunicacao />);

    const campo = screen.getByLabelText("Nova frase");

    fireEvent.change(campo, { target: { value: "Olá" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar cartão" }));
    fireEvent.change(campo, { target: { value: "olá" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar cartão" }));

    expect(screen.getByRole("alert").textContent).toMatch(/já tem um cartão/);
  });
});

describe("frases prontas no chat", () => {
  it("escolher uma frase só a entrega a quem chamou (a pessoa é quem envia)", () => {
    const aoEscolher = vi.fn();

    render(<FrasesProntas aoEscolher={aoEscolher} />);
    expect(screen.queryByRole("button", { name: "Poderia repetir a pergunta?" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Frases prontas" }));
    fireEvent.click(screen.getByRole("button", { name: "Poderia repetir a pergunta?" }));

    expect(aoEscolher).toHaveBeenCalledWith("Poderia repetir a pergunta?");
    expect(screen.getByText(/Você revisa e envia/)).toBeTruthy();
  });

  it("os cartões da própria pessoa aparecem primeiro", () => {
    window.localStorage.setItem("acesso:cartoes-comunicacao", JSON.stringify([{ id: "p1", texto: "Minha frase" }]));
    render(<FrasesProntas aoEscolher={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Frases prontas" }));

    const botoes = screen.getAllByRole("button").map((b) => b.textContent);

    expect(botoes.indexOf("Minha frase")).toBeGreaterThan(-1);
    expect(botoes.indexOf("Minha frase")).toBeLessThan(botoes.indexOf("Preciso de ajuda."));
  });
});

/* ------------------------------------------------------------------ dicionário de profissões */

describe("dicionário de profissões", () => {
  it("lista as profissões, cada uma com ilustração descrita em texto", () => {
    render(<DicionarioDeProfissoes />);

    expect(screen.getByRole("heading", { name: "Atendente" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /pessoa com fone de ouvido/ })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/profissões/);
  });

  it("a busca filtra na hora, sem acento, e avisa quando não acha nada", () => {
    render(<DicionarioDeProfissoes />);

    fireEvent.change(screen.getByLabelText(/Procurar uma profissão/), { target: { value: "ENFERMAGEM" } });
    expect(screen.getByRole("heading", { name: "Técnico de enfermagem" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Atendente" })).toBeNull();

    fireEvent.change(screen.getByLabelText(/Procurar uma profissão/), { target: { value: "astronauta" } });
    expect(screen.getByRole("status").textContent).toMatch(/Nenhuma profissão encontrada/);
  });

  it("a ficha traz atividades, ferramentas, habilidades e rotina, com aviso de que é exemplo", () => {
    render(<DicionarioDeProfissoes />);

    const ficha = screen.getByRole("heading", { name: "Operador de caixa" }).closest("article")!;

    expect(within(ficha).getByText("O que a pessoa faz")).toBeTruthy();
    expect(within(ficha).getByText("Ferramentas que usa")).toBeTruthy();
    expect(within(ficha).getByText("Habilidades que ajudam")).toBeTruthy();
    expect(within(ficha).getByText("Exemplo de um dia de trabalho")).toBeTruthy();
    expect(within(ficha).getByText(/exemplo geral/)).toBeTruthy();
    expect(within(ficha).getByRole("link", { name: /Procurar vagas de operador de caixa/ })).toBeTruthy();
  });
});

/* ------------------------------------------------------------------- navegação por objetivos */

describe("navegação por objetivos", () => {
  it("candidato vê os seis objetivos", () => {
    estado.autenticado = true;
    estado.usuario = { tipo: "candidato" };
    render(<NavegacaoPorObjetivos />);

    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(6);
    expect(screen.getByRole("button", { name: /Quero me candidatar/ })).toBeTruthy();
  });

  it("visitante vê só o caminho de começar; administrador vê um aviso", () => {
    render(<NavegacaoPorObjetivos />);
    expect(screen.getAllByRole("button")).toHaveLength(1);

    cleanup();
    estado.autenticado = true;
    estado.usuario = { tipo: "administrador" };
    render(<NavegacaoPorObjetivos />);
    expect(screen.getByRole("status").textContent).toMatch(/pessoas candidatas e empresas/);
  });

  it("escolher um objetivo mostra só os passos dele, com o próximo destacado; marcar avança", () => {
    estado.autenticado = true;
    estado.usuario = { tipo: "candidato" };
    render(<NavegacaoPorObjetivos />);

    fireEvent.click(screen.getByRole("button", { name: /Quero acompanhar minhas candidaturas/ }));

    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("0 de 3 passos feitos.")).toBeTruthy();
    expect(screen.getAllByText("Próximo passo")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Abrir meu painel/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox", { name: /Ver suas candidaturas/ }));

    expect(screen.getByText("1 de 3 passos feitos.")).toBeTruthy();
    expect(window.localStorage.getItem("acesso:objetivos-feitos")).toContain("painel");

    // O próximo passo agora é o segundo.
    const proximo = screen.getByText("Próximo passo").closest("li")!;

    expect(within(proximo).getByText(/Ler as mensagens das empresas/)).toBeTruthy();
  });

  it("Recomeçar limpa só o progresso daquele objetivo", () => {
    estado.autenticado = true;
    estado.usuario = { tipo: "candidato" };
    render(<NavegacaoPorObjetivos />);

    fireEvent.click(screen.getByRole("button", { name: /Quero acompanhar minhas candidaturas/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Ver suas candidaturas/ }));
    fireEvent.click(screen.getByRole("button", { name: "Recomeçar este objetivo" }));

    expect(screen.getByText("0 de 3 passos feitos.")).toBeTruthy();
  });
});

/* ---------------------------------------------------------------- configurações (motricidade) */

describe("seção de configurações de motricidade", () => {
  it("tem os controles principais e só mostra os detalhes quando o recurso está ligado", () => {
    render(<SecaoMotricidade />);

    expect(screen.getByRole("switch", { name: "Varredura com um botão" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Proteção contra tremores" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Atalhos de teclado" })).toBeTruthy();
    expect(screen.getByLabelText("Tamanho dos botões e das áreas de toque")).toBeTruthy();
    expect(screen.queryByText("Tecla extra para selecionar")).toBeNull();
    expect(screen.queryByRole("slider", { name: "Tempo em cada item" })).toBeNull();
  });

  it("com a varredura ligada aparecem velocidade, grupos e a escolha da tecla extra", () => {
    estado.prefs = preferencias({ scanning: true });
    render(<SecaoMotricidade />);

    expect(screen.getByRole("slider", { name: "Tempo em cada item" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Varrer por grupos" })).toBeTruthy();
    expect(screen.getByText("Tecla extra para selecionar")).toBeTruthy();
  });

  it("oferece o caminho para a central, o dicionário e os objetivos", () => {
    render(<SecaoMotricidade />);

    expect(screen.getByRole("link", { name: /Central de comunicação/ }).getAttribute("href")).toBe("/comunicacao");
    expect(screen.getByRole("link", { name: /Dicionário de profissões/ }).getAttribute("href")).toBe("/profissoes");
    expect(screen.getByRole("link", { name: /O que você quer fazer/ }).getAttribute("href")).toBe("/objetivos");
  });
});
