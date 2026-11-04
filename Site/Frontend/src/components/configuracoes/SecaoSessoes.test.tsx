import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Configurações → Segurança → Dispositivos e sessões: cada dispositivo com o que a pessoa precisa para reconhecê-lo, a
 * atual sempre primeiro e sem botão de encerrar, e o encerramento das outras com confirmação. O servidor é simulado.
 */

const { servico, toast } = vi.hoisted(() => ({
  servico: { listarSessoes: vi.fn(), encerrarSessao: vi.fn(), encerrarOutrasSessoes: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/autenticacao.service", () => ({ autenticacaoService: servico, default: servico }));
vi.mock("sonner", () => ({ toast }));

const { SecaoSessoes } = await import("./SecaoSessoes");

const UA_NOTEBOOK = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_ANDROID = "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0";

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const sessao = (extra: Partial<Record<string, unknown>> = {}) => ({
  id: "s1",
  userAgent: UA_NOTEBOOK,
  ip: "177.10.0.1",
  criadoEm: horasAtras(1),
  iniciadaEm: horasAtras(48),
  ultimoUsoEm: horasAtras(1),
  expiraEm: horasAtras(-700),
  atual: false,
  ...extra,
});

function renderizar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SecaoSessoes />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("a lista", () => {
  it("mostra navegador e sistema, IP, quando entrou e a última atividade de cada dispositivo", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "a", atual: true }), sessao({ id: "b", userAgent: UA_IPHONE, ip: "177.10.0.2", ultimoUsoEm: horasAtras(3) })]);
    renderizar();

    const lista = await screen.findByRole("list", { name: "Dispositivos conectados à sua conta" });
    const itens = within(lista).getAllByRole("listitem");

    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent("Chrome · Windows");
    expect(itens[1]).toHaveTextContent("Safari · iOS");
    expect(itens[1]).toHaveTextContent("IP 177.10.0.2");
    expect(itens[1]).toHaveTextContent(/Entrou em \d{2}\/\d{2}\/\d{4}/);
    expect(itens[1]).toHaveTextContent("última atividade há 3 horas");
  });

  it("a sessão atual vem primeiro, diz 'em uso agora' e NÃO tem botão de encerrar", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "b", userAgent: UA_IPHONE, ultimoUsoEm: horasAtras(0.1) }), sessao({ id: "a", atual: true, ultimoUsoEm: horasAtras(20) })]);
    renderizar();

    const itens = within(await screen.findByRole("list")).getAllByRole("listitem");

    expect(itens[0]).toHaveTextContent("Esta sessão");
    expect(itens[0]).toHaveTextContent("em uso agora");
    expect(within(itens[0]).queryByRole("button", { name: /Encerrar/ })).not.toBeInTheDocument();
    expect(within(itens[1]).getByRole("button", { name: /Encerrar sessão em Safari · iOS/ })).toBeInTheDocument();
  });

  it("as outras ficam da mais recente para a mais antiga", async () => {
    servico.listarSessoes.mockResolvedValue([
      sessao({ id: "antiga", userAgent: UA_IPHONE, ultimoUsoEm: horasAtras(100) }),
      sessao({ id: "atual", atual: true }),
      sessao({ id: "recente", userAgent: UA_ANDROID, ultimoUsoEm: horasAtras(2) }),
    ]);
    renderizar();

    const itens = within(await screen.findByRole("list")).getAllByRole("listitem");

    expect(itens.map((i) => i.textContent)).toEqual([
      expect.stringContaining("Esta sessão"),
      expect.stringContaining("Firefox · Android"),
      expect.stringContaining("Safari · iOS"),
    ]);
  });

  it("servidor antigo (sem as datas novas): cai no criadoEm, sem 'NaN' nem texto quebrado", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "a", atual: true, iniciadaEm: undefined, ultimoUsoEm: undefined })]);
    renderizar();

    const item = within(await screen.findByRole("list")).getByRole("listitem");

    expect(item).toHaveTextContent(/Entrou em \d{2}\/\d{2}\/\d{4}/);
    expect(item.textContent).not.toMatch(/NaN|undefined|Invalid/);
  });

  it("user-agent ausente: 'Dispositivo desconhecido'", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ atual: true, userAgent: null })]);
    renderizar();

    expect(await screen.findByText("Dispositivo desconhecido")).toBeInTheDocument();
  });

  it("HTML válido: o selo (div) não fica dentro de parágrafo", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ atual: true })]);
    const { container } = renderizar();

    await screen.findByRole("list");

    expect(container.querySelector("p div")).toBeNull();
  });

  it("estados: carregando, erro com nova tentativa e vazio", async () => {
    servico.listarSessoes.mockReturnValueOnce(new Promise(() => {}));
    const primeiro = renderizar();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando sessões");
    primeiro.unmount();

    servico.listarSessoes.mockRejectedValueOnce(new Error("rede"));
    const segundo = renderizar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar suas sessões");
    servico.listarSessoes.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Nenhuma sessão ativa encontrada.")).toBeInTheDocument();
    segundo.unmount();
  });
});

describe("encerrar", () => {
  it("uma sessão: chama o servidor com o id dela e avisa", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "a", atual: true }), sessao({ id: "b", userAgent: UA_IPHONE })]);
    servico.encerrarSessao.mockResolvedValue(undefined);
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: /Encerrar sessão em Safari · iOS/ }));

    await waitFor(() => expect(servico.encerrarSessao).toHaveBeenCalledWith("b"));
    expect(toast.success).toHaveBeenCalledWith("Sessão encerrada.");
  });

  it("falha ao encerrar: mostra o erro do servidor", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "a", atual: true }), sessao({ id: "b", userAgent: UA_IPHONE })]);
    servico.encerrarSessao.mockRejectedValue({ response: { data: { mensagem: "Sessão não encontrada." } } });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: /Encerrar sessão em/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Sessão não encontrada."));
  });

  it("as outras: pede confirmação dizendo quantos dispositivos perdem o acesso, e só então encerra", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "a", atual: true }), sessao({ id: "b", userAgent: UA_IPHONE }), sessao({ id: "c", userAgent: UA_ANDROID })]);
    servico.encerrarOutrasSessoes.mockResolvedValue(undefined);
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Encerrar as outras" }));
    const dialogo = await screen.findByRole("alertdialog");

    expect(dialogo).toHaveTextContent("Os outros 2 dispositivos conectados à sua conta perdem o acesso agora e precisarão entrar novamente.");
    expect(servico.encerrarOutrasSessoes).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Encerrar as outras" }));

    await waitFor(() => expect(servico.encerrarOutrasSessoes).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith("As outras sessões foram encerradas.");
  });

  it("cancelar a confirmação não encerra nada", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "a", atual: true }), sessao({ id: "b", userAgent: UA_IPHONE })]);
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Encerrar as outras" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(servico.encerrarOutrasSessoes).not.toHaveBeenCalled();
  });

  it("sem outras sessões: não há botão de encerrar as outras, e a página diz isso", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "a", atual: true })]);
    renderizar();

    expect(await screen.findByText("Nenhuma outra sessão ativa além desta.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Encerrar as outras" })).not.toBeInTheDocument();
  });

  it("com um único outro dispositivo, a confirmação fala no singular", async () => {
    servico.listarSessoes.mockResolvedValue([sessao({ id: "a", atual: true }), sessao({ id: "b", userAgent: UA_IPHONE })]);
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Encerrar as outras" }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent("O outro dispositivo conectado à sua conta perde o acesso agora e precisará entrar novamente.");
  });
});
