import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * As seções do Bloco 3 em Configurações → Segurança: dispositivos de confiança, atividade de segurança e "proteger minha conta
 * agora". Todas só aparecem com o recurso ligado no servidor. O servidor é simulado.
 */

const { servico, usuario, navegar, toast } = vi.hoisted(() => ({
  servico: {
    estado: vi.fn(),
    listarDispositivos: vi.fn(),
    removerDispositivo: vi.fn(),
    removerTodosDispositivos: vi.fn(),
    listarEventos: vi.fn(),
    protegerAgora: vi.fn(),
  },
  usuario: { temSenha: true as boolean | undefined },
  navegar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/seguranca.service", async (original) => ({
  ...(await original<typeof import("@/services/seguranca.service")>()),
  default: servico,
  segurancaService: servico,
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ usuario }) }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navegar }));
vi.mock("sonner", () => ({ toast }));

const { SecaoDispositivosConfiaveis } = await import("./SecaoDispositivosConfiaveis");
const { SecaoAtividadeDeSeguranca } = await import("./SecaoAtividadeDeSeguranca");
const { SecaoContaComprometida } = await import("./SecaoContaComprometida");

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const dispositivo = (extra: Partial<Record<string, unknown>> = {}) => ({
  id: "d1",
  rotulo: "Chrome · Windows",
  ip: "177.10.0.1",
  criadoEm: horasAtras(48),
  ultimoUsoEm: horasAtras(2),
  expiraEm: horasAtras(-24 * 80),
  atual: false,
  ...extra,
});

function renderizar(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  usuario.temSenha = true;
  servico.estado.mockResolvedValue({ habilitado: true, ativo: true });
  window.localStorage.clear();
});

afterEach(cleanup);

describe("com o recurso desligado", () => {
  it.each([
    ["dispositivos", <SecaoDispositivosConfiaveis key="a" />],
    ["atividade", <SecaoAtividadeDeSeguranca key="b" />],
    ["proteger", <SecaoContaComprometida key="c" />],
  ])("a seção de %s não aparece e não consulta nada além do estado", async (_nome, ui) => {
    servico.estado.mockResolvedValue({ habilitado: false, ativo: false });
    const { container } = renderizar(ui);

    await waitFor(() => expect(servico.estado).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(servico.listarDispositivos).not.toHaveBeenCalled();
    expect(servico.listarEventos).not.toHaveBeenCalled();
  });
});

describe("dispositivos de confiança", () => {
  it("lista cada aparelho com rótulo, quando ficou confiável, último uso e validade; o atual é marcado", async () => {
    servico.listarDispositivos.mockResolvedValue([dispositivo({ id: "a", atual: true }), dispositivo({ id: "b", rotulo: "Safari · iOS", ip: "177.10.0.2" })]);
    renderizar(<SecaoDispositivosConfiaveis />);

    const lista = await screen.findByRole("list", { name: "Dispositivos de confiança" });
    const itens = within(lista).getAllByRole("listitem");

    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent("Chrome · Windows");
    expect(itens[0]).toHaveTextContent("Este dispositivo");
    expect(itens[0]).toHaveTextContent("vale até");
    expect(itens[1]).toHaveTextContent("Safari · iOS");
    expect(itens[1]).not.toHaveTextContent("Este dispositivo");
  });

  it("sem aparelhos: explica como adicionar um", async () => {
    servico.listarDispositivos.mockResolvedValue([]);
    renderizar(<SecaoDispositivosConfiaveis />);

    expect(await screen.findByText(/Lembrar este dispositivo/)).toBeInTheDocument();
  });

  it("remover chama o servidor com o aparelho certo, avisa e recarrega a lista", async () => {
    servico.listarDispositivos.mockResolvedValue([dispositivo({ id: "b" })]);
    servico.removerDispositivo.mockResolvedValue(undefined);
    renderizar(<SecaoDispositivosConfiaveis />);

    fireEvent.click(await screen.findByRole("button", { name: /Remover a confiança em Chrome · Windows/ }));

    await waitFor(() => expect(servico.removerDispositivo).toHaveBeenCalledWith("b"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("A confiança neste dispositivo foi removida."));
    await waitFor(() => expect(servico.listarDispositivos).toHaveBeenCalledTimes(2));
  });

  it("remover O APARELHO ATUAL também esquece o token local", async () => {
    window.localStorage.setItem("acesso:dispositivoConfiavel", "token-do-aparelho");
    servico.listarDispositivos.mockResolvedValue([dispositivo({ id: "a", atual: true })]);
    servico.removerDispositivo.mockResolvedValue(undefined);
    renderizar(<SecaoDispositivosConfiaveis />);

    fireEvent.click(await screen.findByRole("button", { name: /Remover a confiança em Chrome · Windows/ }));

    await waitFor(() => expect(window.localStorage.getItem("acesso:dispositivoConfiavel")).toBeNull());
  });

  it("'Remover todos' só aparece com mais de um aparelho e pede confirmação", async () => {
    servico.listarDispositivos.mockResolvedValue([dispositivo({ id: "a" })]);
    const { unmount } = renderizar(<SecaoDispositivosConfiaveis />);
    await screen.findByRole("list", { name: "Dispositivos de confiança" });
    expect(screen.queryByRole("button", { name: /Remover todos/ })).not.toBeInTheDocument();
    unmount();

    servico.listarDispositivos.mockResolvedValue([dispositivo({ id: "a" }), dispositivo({ id: "b" })]);
    servico.removerTodosDispositivos.mockResolvedValue(2);
    renderizar(<SecaoDispositivosConfiaveis />);

    fireEvent.click(await screen.findByRole("button", { name: /Remover todos/ }));
    expect(servico.removerTodosDispositivos).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Remover todos" }));
    await waitFor(() => expect(servico.removerTodosDispositivos).toHaveBeenCalledTimes(1));
  });

  it("falha ao carregar: mostra o erro com botão para tentar de novo", async () => {
    servico.listarDispositivos.mockRejectedValue(new Error("x"));
    renderizar(<SecaoDispositivosConfiaveis />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os dispositivos de confiança.");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("recurso ligado mas sem e-mail no servidor: diz que está inativo", async () => {
    servico.estado.mockResolvedValue({ habilitado: true, ativo: false });
    servico.listarDispositivos.mockResolvedValue([]);
    renderizar(<SecaoDispositivosConfiaveis />);

    expect(await screen.findByText(/temporariamente inativa/)).toBeInTheDocument();
  });
});

describe("atividade de segurança", () => {
  it("lista do mais recente ao mais antigo, com texto legível, data, aparelho e IP", async () => {
    servico.listarEventos.mockResolvedValue([
      { id: "1", tipo: "senha_alterada", descricao: "A senha foi alterada.", ip: "177.10.0.1", dispositivo: "Chrome · Windows", criadoEm: horasAtras(1) },
      { id: "2", tipo: "dispositivo_novo_confirmado", descricao: "Você confirmou um dispositivo novo com o código enviado por e-mail.", ip: null, dispositivo: null, criadoEm: horasAtras(30) },
    ]);
    renderizar(<SecaoAtividadeDeSeguranca />);

    const lista = await screen.findByRole("list", { name: /Atividade de segurança, da mais recente/ });
    const itens = within(lista).getAllByRole("listitem");

    expect(itens[0]).toHaveTextContent("A senha foi alterada.");
    expect(itens[0]).toHaveTextContent("Chrome · Windows");
    expect(itens[0]).toHaveTextContent("IP 177.10.0.1");
    expect(itens[1]).toHaveTextContent("Você confirmou um dispositivo novo");
    expect(itens[1]).not.toHaveTextContent("IP");
  });

  it("sem eventos: diz que não há nada", async () => {
    servico.listarEventos.mockResolvedValue([]);
    renderizar(<SecaoAtividadeDeSeguranca />);

    expect(await screen.findByText("Nada registrado ainda.")).toBeInTheDocument();
  });
});

describe("proteger minha conta agora", () => {
  const abrir = async () => {
    renderizar(<SecaoContaComprometida />);
    fireEvent.click(await screen.findByRole("button", { name: "Proteger minha conta agora" }));
  };

  it("explica o que acontece", async () => {
    renderizar(<SecaoContaComprometida />);

    expect(await screen.findByText(/Encerra as outras sessões, remove a confiança nos dispositivos/)).toBeInTheDocument();
  });

  it("conta com senha: pede a senha atual e não chama o servidor sem ela", async () => {
    await abrir();

    fireEvent.click(await screen.findByRole("button", { name: "Proteger a conta" }));

    expect(await screen.findByText("Informe a sua senha atual.")).toBeInTheDocument();
    expect(servico.protegerAgora).not.toHaveBeenCalled();
  });

  it("com a senha: protege, avisa e leva à troca de senha", async () => {
    servico.protegerAgora.mockResolvedValue("ok");
    await abrir();

    fireEvent.change(document.getElementById("proteger-senha") as HTMLInputElement, { target: { value: "Senha@1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Proteger a conta" }));

    await waitFor(() => expect(servico.protegerAgora).toHaveBeenCalledWith("Senha@1234", null));
    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/configuracoes/senha" }));
    expect(toast.success).toHaveBeenCalled();
  });

  it("senha errada: mostra o erro do servidor, fica no diálogo e não navega", async () => {
    servico.protegerAgora.mockRejectedValue({ response: { status: 401, data: { mensagem: "Senha atual incorreta." } } });
    await abrir();

    fireEvent.change(document.getElementById("proteger-senha") as HTMLInputElement, { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Proteger a conta" }));

    expect(await screen.findByText("Senha atual incorreta.")).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("conta só do Google (sem senha): não pede senha", async () => {
    usuario.temSenha = false;
    servico.protegerAgora.mockResolvedValue("ok");
    await abrir();

    expect(document.getElementById("proteger-senha")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Proteger a conta" }));

    await waitFor(() => expect(servico.protegerAgora).toHaveBeenCalledWith(undefined, null));
  });
});
