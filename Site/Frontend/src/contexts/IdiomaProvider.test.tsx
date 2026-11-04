import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

/**
 * O idioma do site: quem manda (escolha do aparelho, navegador, português), o `lang` do documento, e a sincronização com a conta
 * (a da conta vale no login; sem idioma nela, a escolha do aparelho sobe; servidor sem o recurso, só o aparelho). O servidor é simulado.
 */

const { servico } = vi.hoisted(() => ({ servico: { obter: vi.fn(), salvar: vi.fn() } }));

vi.mock("@/services/acessibilidade.service", () => ({ acessibilidadeService: servico, default: servico }));

const { IdiomaProvider } = await import("./IdiomaProvider");
const { SessaoContext } = await import("./SessaoContext");
const { useIdioma } = await import("@/hooks/useIdioma");
const { CHAVE_IDIOMA } = await import("@/i18n/armazenamento");

let ultimo: ReturnType<typeof useIdioma>;

function Sonda() {
  ultimo = useIdioma();

  return (
    <p>
      {ultimo.idioma}|{ultimo.t("cabecalho.entrar")}|{ultimo.salvoNaConta ? "conta" : "aparelho"}
    </p>
  );
}

function renderizar(usuarioId: string | null = null) {
  const sessao = { usuario: usuarioId ? { id: usuarioId } : null } as never;

  return render(
    <SessaoContext.Provider value={sessao}>
      <IdiomaProvider>
        <Sonda />
      </IdiomaProvider>
    </SessaoContext.Provider>,
  );
}

function navegadorEm(...idiomas: string[]) {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(idiomas);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  document.documentElement.lang = "";
  navegadorEm("pt-BR");
  servico.obter.mockResolvedValue({});
  servico.salvar.mockImplementation(async (corpo) => corpo);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("quem manda", () => {
  it("sem escolha, vale o idioma do navegador, se for um dos três", () => {
    navegadorEm("en-GB");
    renderizar();

    expect(screen.getByText("en|Sign in|aparelho")).toBeInTheDocument();
  });

  it("navegador em outro idioma (francês): português", () => {
    navegadorEm("fr-FR");
    renderizar();

    expect(screen.getByText("pt|Entrar|aparelho")).toBeInTheDocument();
  });

  it("a escolha do aparelho vale mais que o navegador", () => {
    navegadorEm("en-US");
    window.localStorage.setItem(CHAVE_IDIOMA, "es");
    renderizar();

    expect(screen.getByText("es|Entrar|aparelho")).toBeInTheDocument();
  });

  it("valor corrompido no armazenamento é ignorado", () => {
    window.localStorage.setItem(CHAVE_IDIOMA, "klingon");
    renderizar();

    expect(screen.getByText(/^pt\|/)).toBeInTheDocument();
  });

  it("o atributo lang do documento acompanha (leitor de tela e tradutor do navegador)", () => {
    window.localStorage.setItem(CHAVE_IDIOMA, "en");
    renderizar();

    expect(document.documentElement.lang).toBe("en-US");
  });
});

describe("trocar", () => {
  it("muda os textos na hora, o lang, e guarda no aparelho", async () => {
    renderizar();

    act(() => ultimo.trocar("es"));

    expect(await screen.findByText("es|Entrar|aparelho")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("es-ES");
    expect(window.localStorage.getItem(CHAVE_IDIOMA)).toBe("es");
  });

  it("um idioma que não existe é ignorado", () => {
    renderizar();

    act(() => ultimo.trocar("fr" as never));

    expect(screen.getByText(/^pt\|/)).toBeInTheDocument();
    expect(window.localStorage.getItem(CHAVE_IDIOMA)).toBeNull();
  });

  it("visitante: nunca fala com o servidor", () => {
    renderizar(null);

    act(() => ultimo.trocar("en"));

    expect(servico.obter).not.toHaveBeenCalled();
    expect(servico.salvar).not.toHaveBeenCalled();
  });

  it("com sessão e o recurso ligado: grava na conta e passa a dizer 'conta'", async () => {
    servico.obter.mockResolvedValue({ idioma: "pt" });
    renderizar("u1");
    await screen.findByText("pt|Entrar|conta");

    act(() => ultimo.trocar("en"));

    expect(await screen.findByText("en|Sign in|conta")).toBeInTheDocument();
    expect(servico.salvar).toHaveBeenCalledWith({ idioma: "en" });
  });

  it("com sessão mas servidor sem o recurso (a resposta não traz idioma): fica só no aparelho", async () => {
    servico.salvar.mockResolvedValue({ tema: "claro" });
    renderizar("u1");
    await waitFor(() => expect(servico.obter).toHaveBeenCalled());

    act(() => ultimo.trocar("en"));

    await waitFor(() => expect(servico.salvar).toHaveBeenCalled());
    expect(screen.getByText("en|Sign in|aparelho")).toBeInTheDocument();
  });

  it("falha ao gravar na conta não desfaz a troca", async () => {
    servico.obter.mockResolvedValue({ idioma: "pt" });
    servico.salvar.mockRejectedValue(new Error("fora do ar"));
    renderizar("u1");
    await screen.findByText("pt|Entrar|conta");

    act(() => ultimo.trocar("es"));

    expect(await screen.findByText("es|Entrar|aparelho")).toBeInTheDocument();
  });
});

describe("ao entrar numa conta", () => {
  it("o idioma da conta vale (e fica guardado no aparelho)", async () => {
    window.localStorage.setItem(CHAVE_IDIOMA, "pt");
    servico.obter.mockResolvedValue({ idioma: "en" });
    renderizar("u1");

    expect(await screen.findByText("en|Sign in|conta")).toBeInTheDocument();
    expect(window.localStorage.getItem(CHAVE_IDIOMA)).toBe("en");
    expect(servico.salvar).not.toHaveBeenCalled();
  });

  it("conta sem idioma e a pessoa já escolheu neste aparelho (ex.: no cadastro): a escolha sobe", async () => {
    window.localStorage.setItem(CHAVE_IDIOMA, "es");
    servico.obter.mockResolvedValue({ idioma: null });
    renderizar("u1");

    await waitFor(() => expect(servico.salvar).toHaveBeenCalledWith({ idioma: "es" }));
    expect(await screen.findByText("es|Entrar|conta")).toBeInTheDocument();
  });

  it("conta sem idioma e nenhuma escolha no aparelho: nada é gravado (o navegador não vira 'escolha')", async () => {
    navegadorEm("en-US");
    servico.obter.mockResolvedValue({ idioma: null });
    renderizar("u1");

    expect(await screen.findByText("en|Sign in|conta")).toBeInTheDocument();
    expect(servico.salvar).not.toHaveBeenCalled();
  });

  it("servidor sem o recurso: o idioma do aparelho segue e nada é gravado", async () => {
    window.localStorage.setItem(CHAVE_IDIOMA, "en");
    servico.obter.mockResolvedValue({ tema: "claro" });
    renderizar("u1");

    await waitFor(() => expect(servico.obter).toHaveBeenCalled());

    expect(screen.getByText("en|Sign in|aparelho")).toBeInTheDocument();
    expect(servico.salvar).not.toHaveBeenCalled();
  });

  it("falha ao ler a conta não derruba nem muda o idioma", async () => {
    window.localStorage.setItem(CHAVE_IDIOMA, "es");
    servico.obter.mockRejectedValue(new Error("sem rede"));
    renderizar("u1");

    await waitFor(() => expect(servico.obter).toHaveBeenCalled());

    expect(screen.getByText("es|Entrar|aparelho")).toBeInTheDocument();
  });
});

describe("sem provedor", () => {
  it("os componentes seguem em português e `trocar` não faz nada", () => {
    const Solta = () => {
      const { t, idioma, trocar } = useIdioma();
      trocar("en");

      return <p>{idioma}|{t("cabecalho.entrar")}</p>;
    };

    render(<Solta />);

    expect(screen.getByText("pt|Entrar")).toBeInTheDocument();
  });
});
