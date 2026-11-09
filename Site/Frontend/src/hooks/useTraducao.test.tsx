import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * "Traduzir" de publicações, comentários e vagas: só no clique, original sempre à mão, aviso claro quando o navegador não traduz,
 * e nenhuma tradução presa ao texto antigo. O motor é falso (o real depende do Chrome); o motor real é testado à parte.
 */

const { servico } = vi.hoisted(() => ({ servico: { obter: vi.fn(), salvar: vi.fn() } }));

vi.mock("@/services/acessibilidade.service", () => ({ acessibilidadeService: servico, default: servico }));

const { useTraducao, limparMemoriaDeTraducao } = await import("./useTraducao");
const { ControleDeTraducao } = await import("@/components/traducao/ControleDeTraducao");
const { IdiomaProvider } = await import("@/contexts/IdiomaProvider");
const { CHAVE_IDIOMA } = await import("@/i18n/armazenamento");
import type { MotorDeTraducao } from "@/i18n/tradutorDoNavegador";
const { ErroDeTraducao } = await import("@/i18n/tradutorDoNavegador");

function motorFalso(extra: Partial<MotorDeTraducao> = {}): MotorDeTraducao & { traduzir: ReturnType<typeof vi.fn> } {
  return {
    disponivel: () => true,
    detectar: vi.fn(async () => "en" as const),
    traduzir: vi.fn(async (textos: string[]) => textos.map((t) => `[traduzido] ${t}`)),
    ...extra,
  } as never;
}

function Tela({ motor, texto = "Hello world, this is a post", conteudo = "publicacao" }: { motor: MotorDeTraducao; texto?: string; conteudo?: "publicacao" | "comentario" | "vaga" }) {
  const traducao = useTraducao({ corpo: texto }, motor);

  return (
    <div>
      <p data-testid="texto">{traducao.texto("corpo")}</p>
      <ControleDeTraducao traducao={traducao} conteudo={conteudo} />
    </div>
  );
}

const renderizar = (ui: ReactNode) => render(<IdiomaProvider>{ui}</IdiomaProvider>);
const botao = () => screen.getByRole("button");

beforeEach(() => {
  window.localStorage.clear();
  limparMemoriaDeTraducao();
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["pt-BR"]);
  servico.obter.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("o fluxo", () => {
  it("começa no original e NÃO traduz sozinho", () => {
    const motor = motorFalso();
    renderizar(<Tela motor={motor} />);

    expect(screen.getByTestId("texto").textContent).toBe("Hello world, this is a post");
    expect(motor.detectar).not.toHaveBeenCalled();
    expect(motor.traduzir).not.toHaveBeenCalled();
  });

  it("o botão diz o que traduz e para quê (nome acessível), e o texto visível é curto", () => {
    renderizar(<Tela motor={motorFalso()} />);

    expect(botao()).toHaveAccessibleName("Traduzir a publicação para português");
    expect(botao()).toHaveTextContent("Traduzir");
  });

  it("no clique: detecta o idioma, traduz para o do site, e mostra de onde para onde", async () => {
    const motor = motorFalso();
    renderizar(<Tela motor={motor} />);

    fireEvent.click(botao());

    await waitFor(() => expect(screen.getByTestId("texto")).toHaveTextContent("[traduzido] Hello world, this is a post"));
    expect(motor.traduzir).toHaveBeenCalledWith(["Hello world, this is a post"], "en", "pt", expect.any(Function));
    expect(screen.getByRole("status")).toHaveTextContent("Traduzido do inglês para o português");
    expect(botao()).toHaveTextContent("Ver original");
  });

  it("'Ver original' volta ao texto escrito, sem chamar o motor de novo; traduzir outra vez usa a memória", async () => {
    const motor = motorFalso();
    renderizar(<Tela motor={motor} />);

    fireEvent.click(botao());
    await waitFor(() => expect(botao()).toHaveTextContent("Ver original"));

    fireEvent.click(botao());
    expect(screen.getByTestId("texto").textContent).toBe("Hello world, this is a post");

    fireEvent.click(botao());
    await waitFor(() => expect(screen.getByTestId("texto")).toHaveTextContent("[traduzido]"));
    expect(motor.traduzir).toHaveBeenCalledTimes(1);
  });

  it("o destino é o idioma do site: em inglês, traduz PARA o inglês e os textos da interface também mudam", async () => {
    window.localStorage.setItem(CHAVE_IDIOMA, "en");
    const motor = motorFalso({ detectar: vi.fn(async () => "pt" as const) });
    renderizar(<Tela motor={motor} texto="Olá a todos, esta é uma publicação" />);

    expect(botao()).toHaveAccessibleName("Translate the post to English");

    fireEvent.click(botao());

    await waitFor(() => expect(motor.traduzir).toHaveBeenCalledWith(["Olá a todos, esta é uma publicação"], "pt", "en", expect.any(Function)));
    expect(await screen.findByText("Translated from Portuguese to English")).toBeInTheDocument();
  });

  it("o nome do botão acompanha o tipo de conteúdo (comentário, vaga)", () => {
    const { unmount } = renderizar(<Tela motor={motorFalso()} conteudo="comentario" />);
    expect(botao()).toHaveAccessibleName("Traduzir o comentário para português");
    unmount();

    renderizar(<Tela motor={motorFalso()} conteudo="vaga" />);
    expect(botao()).toHaveAccessibleName("Traduzir a vaga para português");
  });
});

describe("quando não dá", () => {
  it("navegador sem tradutor: explica o que fazer, em vez de um botão mudo", async () => {
    renderizar(<Tela motor={motorFalso({ disponivel: () => false })} />);

    fireEvent.click(botao());

    expect(await screen.findByText(/Seu navegador ainda não traduz textos sozinho/)).toBeInTheDocument();
    expect(screen.getByTestId("texto").textContent).toBe("Hello world, this is a post");
  });

  it("o texto já está no idioma da pessoa: avisa e não traduz", async () => {
    const motor = motorFalso({ detectar: vi.fn(async () => "pt" as const) });
    renderizar(<Tela motor={motor} />);

    fireEvent.click(botao());

    expect(await screen.findByText("Este texto já está no seu idioma.")).toBeInTheDocument();
    expect(motor.traduzir).not.toHaveBeenCalled();
  });

  it("sem detector, supõe inglês (para português) e traduz, dizendo só o destino", async () => {
    const motor = motorFalso({ detectar: vi.fn(async () => null) });
    renderizar(<Tela motor={motor} />);

    fireEvent.click(botao());

    await waitFor(() => expect(motor.traduzir).toHaveBeenCalledWith(expect.anything(), "en", "pt", expect.any(Function)));
    expect(await screen.findByText("Traduzido para o português")).toBeInTheDocument();
  });

  it("falha do motor: mensagem de erro e o original continua na tela", async () => {
    const motor = motorFalso({ traduzir: vi.fn(async () => Promise.reject(new ErroDeTraducao("falhou"))) } as never);
    renderizar(<Tela motor={motor} />);

    fireEvent.click(botao());

    expect(await screen.findByText("Não foi possível traduzir agora. Tente de novo em instantes.")).toBeInTheDocument();
    expect(screen.getByTestId("texto").textContent).toBe("Hello world, this is a post");
    expect(botao()).toHaveTextContent("Traduzir");
  });

  it("enquanto traduz: botão desabilitado e texto 'Traduzindo…'; ao baixar o modelo: 'Preparando…'", async () => {
    let terminar: (v: string[]) => void = () => undefined;
    let preparar: () => void = () => undefined;
    const motor = motorFalso({
      traduzir: vi.fn((_t: string[], _o, _d, aoPreparar?: () => void) => {
        preparar = aoPreparar ?? (() => undefined);

        return new Promise<string[]>((resolve) => {
          terminar = resolve;
        });
      }),
    } as never);
    renderizar(<Tela motor={motor} />);

    fireEvent.click(botao());
    await waitFor(() => expect(botao()).toHaveTextContent("Traduzindo…"));
    expect(botao()).toBeDisabled();

    preparar();
    await waitFor(() => expect(botao()).toHaveTextContent("Preparando a tradução"));

    terminar(["pronto"]);
    await waitFor(() => expect(screen.getByTestId("texto")).toHaveTextContent("pronto"));
  });
});

describe("a tradução nunca fica presa ao texto antigo", () => {
  it("o texto mudou (publicação editada): volta ao original e ao botão 'Traduzir'", async () => {
    const motor = motorFalso();
    const { rerender } = renderizar(<Tela motor={motor} texto="Hello there everyone" />);

    fireEvent.click(botao());
    await waitFor(() => expect(botao()).toHaveTextContent("Ver original"));

    rerender(
      <IdiomaProvider>
        <Tela motor={motor} texto="Edited text for everyone" />
      </IdiomaProvider>,
    );

    await waitFor(() => expect(botao()).toHaveTextContent("Traduzir"));
    expect(screen.getByTestId("texto")).toHaveTextContent("Edited text for everyone");
  });

  it("o idioma do site mudou no meio: a tradução antiga deixa de valer", async () => {
    const motor = motorFalso();
    renderizar(<Tela motor={motor} />);

    fireEvent.click(botao());
    await waitFor(() => expect(botao()).toHaveTextContent("Ver original"));

    window.localStorage.setItem(CHAVE_IDIOMA, "es");
    cleanup();
    renderizar(<Tela motor={motor} />);

    expect(botao()).toHaveTextContent("Traducir");
    expect(screen.getByTestId("texto")).toHaveTextContent("Hello world");
  });

  it("um clique antigo que termina depois de o texto mudar não escreve a tradução velha", async () => {
    let terminar: (v: string[]) => void = () => undefined;
    const motor = motorFalso({
      traduzir: vi.fn(() => new Promise<string[]>((resolve) => (terminar = resolve))),
    } as never);
    const { rerender } = renderizar(<Tela motor={motor} texto="Hello there everyone" />);

    fireEvent.click(botao());
    await waitFor(() => expect(botao()).toHaveTextContent("Traduzindo…"));

    rerender(
      <IdiomaProvider>
        <Tela motor={motor} texto="Another text altogether" />
      </IdiomaProvider>,
    );
    terminar(["tradução velha"]);

    await waitFor(() => expect(botao()).toHaveTextContent("Traduzir"));
    expect(screen.getByTestId("texto")).toHaveTextContent("Another text altogether");
    expect(screen.getByTestId("texto")).not.toHaveTextContent("tradução velha");
  });
});

/**
 * Traduzir por um serviço fora do aparelho faz o texto sair dele. Isso não acontece sem a pessoa saber:
 * ela é perguntada uma vez, na própria tela, e a resposta fica guardada neste navegador.
 */
describe("quando a tradução precisa sair do aparelho", () => {
  const motorQueSai = () => motorFalso({ saiDoAparelho: async () => true });
  const autorizar = () => screen.getByRole("button", { name: /mesmo assim|anyway|todos os modos/i });
  const recusar = () => screen.getByRole("button", { name: /^agora não$|^not now$|^ahora no$/i });

  it("o primeiro clique pergunta em vez de traduzir, e diz que o texto sai do aparelho", async () => {
    const motor = motorQueSai();

    renderizar(<Tela motor={motor} />);
    fireEvent.click(screen.getByRole("button", { name: /traduzir a publicação/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/sai do seu aparelho/i));
    expect(motor.traduzir).not.toHaveBeenCalled();
    expect(screen.getByTestId("texto")).toHaveTextContent("Hello world, this is a post");
  });

  it("autorizando: traduz, avisa que veio de um serviço online e não pergunta de novo", async () => {
    const motor = motorQueSai();

    renderizar(<Tela motor={motor} />);
    fireEvent.click(screen.getByRole("button", { name: /traduzir a publicação/i }));
    await waitFor(() => expect(autorizar()).toBeInTheDocument());
    fireEvent.click(autorizar());

    await waitFor(() => expect(screen.getByTestId("texto")).toHaveTextContent("[traduzido] Hello world, this is a post"));
    expect(screen.getByRole("status")).toHaveTextContent(/serviço online/i);

    // Outra publicação, na mesma pessoa e no mesmo navegador: já está autorizado.
    cleanup();
    const outro = motorQueSai();

    renderizar(<Tela motor={outro} texto="Another post entirely written in English" />);
    fireEvent.click(screen.getByRole("button", { name: /traduzir a publicação/i }));

    await waitFor(() => expect(outro.traduzir).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /mesmo assim|anyway|todos os modos/i })).not.toBeInTheDocument();
  });

  it("recusando: volta ao normal, nada é traduzido e nada fica guardado", async () => {
    const motor = motorQueSai();

    renderizar(<Tela motor={motor} />);
    fireEvent.click(screen.getByRole("button", { name: /traduzir a publicação/i }));
    await waitFor(() => expect(recusar()).toBeInTheDocument());
    fireEvent.click(recusar());

    expect(motor.traduzir).not.toHaveBeenCalled();
    expect(screen.getByTestId("texto")).toHaveTextContent("Hello world, this is a post");
    expect(screen.queryByRole("button", { name: /mesmo assim|anyway|todos os modos/i })).not.toBeInTheDocument();

    // E dá para pedir de novo: recusar uma vez não tranca o recurso.
    fireEvent.click(screen.getByRole("button", { name: /traduzir a publicação/i }));
    await waitFor(() => expect(autorizar()).toBeInTheDocument());
  });

  it("motor que traduz no próprio aparelho não pergunta nada", async () => {
    const motor = motorFalso();

    renderizar(<Tela motor={motor} />);
    fireEvent.click(screen.getByRole("button", { name: /traduzir a publicação/i }));

    await waitFor(() => expect(screen.getByTestId("texto")).toHaveTextContent("[traduzido]"));
    expect(screen.getByRole("status")).not.toHaveTextContent(/serviço online/i);
  });
});
