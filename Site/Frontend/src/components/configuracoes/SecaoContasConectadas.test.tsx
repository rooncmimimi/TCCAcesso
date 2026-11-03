import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { webcrypto } from "node:crypto";
import type { ReactNode } from "react";

/**
 * "Contas conectadas" em Configurações → Segurança (achados 7 e 20): vincular e desvincular o Google
 * de uma conta que já existe, sempre com a senha atual, e o tratamento do retorno do Google.
 *
 * A sessão e o serviço HTTP são simulados; a seção, o diálogo e o armazenamento da aba
 * (`lib/googleNavegador`) são os de verdade.
 */

const { usuarioDaSessao, conta, iniciarVinculo, vincular, desvincular, avisoSucesso, avisoErro } = vi.hoisted(() => ({
  usuarioDaSessao: { tipo: "candidato" as string, temSenha: undefined as boolean | undefined },
  conta: vi.fn(),
  iniciarVinculo: vi.fn(),
  vincular: vi.fn(),
  desvincular: vi.fn(),
  avisoSucesso: vi.fn(),
  avisoErro: vi.fn(),
}));

vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ usuario: usuarioDaSessao }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("sonner", () => ({ toast: { success: avisoSucesso, error: avisoErro } }));
vi.mock("@/services/google.service", async (original) => ({
  ...(await original<typeof import("@/services/google.service")>()),
  default: { conta, iniciarVinculo, vincular, desvincular },
}));

const { SecaoContasConectadas } = await import("./SecaoContasConectadas");
const { lerVinculo, prepararVinculo } = await import("@/lib/googleNavegador");

const irParaOGoogle = vi.fn();

function abrir() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <SecaoContasConectadas />
    </QueryClientProvider>,
  );
}

const erroDoServidor = (status: number, mensagem: string) => ({ response: { status, data: { mensagem } } });

beforeEach(() => {
  vi.clearAllMocks();
  usuarioDaSessao.tipo = "candidato";
  usuarioDaSessao.temSenha = undefined;
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/configuracoes/seguranca");
  vi.stubGlobal("crypto", webcrypto);
  // O jsdom não navega; o que importa é para onde a seção mandaria o navegador. O resto da
  // `location` continua sendo a de verdade (o hash e a query mudam com `history.replaceState`).
  // Não dá para usar um Proxy da `Location` real: `assign` é uma propriedade não configurável dela.
  const real = window.location;
  vi.spyOn(window, "location", "get").mockReturnValue({
    assign: irParaOGoogle,
    get href() {
      return real.href;
    },
    get hash() {
      return real.hash;
    },
    get search() {
      return real.search;
    },
    get pathname() {
      return real.pathname;
    },
  } as unknown as Location);
  conta.mockResolvedValue({ disponivel: true, elegivel: true, vinculado: false });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("quando aparece", () => {
  it("não aparece para conta de empresa, e nem consulta o servidor", () => {
    usuarioDaSessao.tipo = "empresa";
    const { container } = abrir();

    expect(container).toBeEmptyDOMElement();
    expect(conta).not.toHaveBeenCalled();
  });

  it("não aparece para administrador", () => {
    usuarioDaSessao.tipo = "administrador";
    const { container } = abrir();
    expect(container).toBeEmptyDOMElement();
  });

  it("não aparece quando o Google não está configurado neste ambiente e não há vínculo", async () => {
    conta.mockResolvedValue({ disponivel: false, elegivel: true, vinculado: false });
    const { container } = abrir();

    await waitFor(() => expect(conta).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("continua aparecendo, para desvincular, mesmo sem o Google configurado", async () => {
    conta.mockResolvedValue({ disponivel: false, elegivel: true, vinculado: true });
    abrir();

    expect(await screen.findByRole("button", { name: "Desvincular conta Google" })).toBeInTheDocument();
  });

  it("anuncia o carregamento como status", () => {
    conta.mockReturnValue(new Promise(() => undefined));
    abrir();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando contas conectadas…");
  });

  it("se a consulta falhar, avisa e oferece tentar de novo", async () => {
    conta.mockRejectedValueOnce(new Error("rede"));
    abrir();

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar suas contas conectadas.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("button", { name: "Vincular conta Google" })).toBeInTheDocument();
  });
});

describe("estado do Google", () => {
  it("conta sem Google: diz que não está vinculada e oferece vincular", async () => {
    abrir();

    expect(await screen.findByText("Não vinculada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vincular conta Google" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desvincular conta Google" })).not.toBeInTheDocument();
  });

  it("conta com Google: diz que está vinculada e oferece desvincular", async () => {
    conta.mockResolvedValue({ disponivel: true, elegivel: true, vinculado: true });
    abrir();

    expect(await screen.findByText("Vinculada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desvincular conta Google" })).toBeInTheDocument();
  });
});

describe("vincular", () => {
  async function abrirDialogo() {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Vincular conta Google" }));
    return screen.findByLabelText("Senha atual");
  }

  it("pede a senha atual antes de abrir o Google, e explica por quê", async () => {
    await abrirDialogo();

    expect(screen.getByRole("dialog", { name: "Vincular conta Google" })).toBeInTheDocument();
    expect(screen.getByText(/confirme sua senha do ACESSO/)).toBeInTheDocument();
    expect(iniciarVinculo).not.toHaveBeenCalled();
  });

  it("não deixa enviar sem senha", async () => {
    await abrirDialogo();
    expect(screen.getByRole("button", { name: "Continuar para o Google" })).toBeDisabled();
  });

  it("com a senha, confirma no servidor e só então leva o navegador ao Google", async () => {
    iniciarVinculo.mockResolvedValue("https://accounts.google.com/y");
    const campo = await abrirDialogo();

    fireEvent.change(campo, { target: { value: "Senha@1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar para o Google" }));

    await waitFor(() => expect(irParaOGoogle).toHaveBeenCalledWith("https://accounts.google.com/y"));
    expect(iniciarVinculo).toHaveBeenCalledWith("Senha@1234");
  });

  it("com a senha errada, mostra o motivo no próprio diálogo e não sai do ACESSO", async () => {
    iniciarVinculo.mockRejectedValue(erroDoServidor(403, "Senha incorreta."));
    const campo = await abrirDialogo();

    fireEvent.change(campo, { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar para o Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Senha incorreta.");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(irParaOGoogle).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("devolve o foco ao campo da senha quando há erro, para corrigir sem procurá-lo", async () => {
    iniciarVinculo.mockRejectedValue(erroDoServidor(403, "Senha incorreta."));
    const campo = await abrirDialogo();

    fireEvent.change(campo, { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar para o Google" }));

    await screen.findByRole("alert");
    await waitFor(() => expect(campo).toHaveFocus());
  });

  it("mostra a mensagem pronta do navegador que não guarda o segredo da aba", async () => {
    const { ErroGoogleNavegador } = await import("@/lib/googleNavegador");
    iniciarVinculo.mockRejectedValue(new ErroGoogleNavegador());
    const campo = await abrirDialogo();

    fireEvent.change(campo, { target: { value: "Senha@1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar para o Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/navegador não deixa/);
  });

  it("cancelar fecha o diálogo sem chamar o servidor", async () => {
    await abrirDialogo();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(iniciarVinculo).not.toHaveBeenCalled();
  });

  it("não guarda a senha depois que o diálogo fecha", async () => {
    const campo = await abrirDialogo();
    fireEvent.change(campo, { target: { value: "Senha@1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Vincular conta Google" }));

    expect(await screen.findByLabelText("Senha atual")).toHaveValue("");
  });
});

// Etapa 6: conta criada pelo Google não tem senha, e o Google é o único jeito de entrar nela.
describe("conta sem senha (entra só pelo Google)", () => {
  beforeEach(() => {
    usuarioDaSessao.temSenha = false;
    conta.mockResolvedValue({ disponivel: true, elegivel: true, vinculado: true });
  });

  it("mostra que está vinculada, mas não oferece desvincular", async () => {
    abrir();

    expect(await screen.findByText("Vinculada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desvincular conta Google" })).not.toBeInTheDocument();
  });

  it("explica por quê e leva a definir a senha", async () => {
    abrir();

    expect(await screen.findByRole("note")).toHaveTextContent("desvincular o Google");
    expect(screen.getByRole("link", { name: "Definir senha" })).toHaveAttribute("href", "/configuracoes/senha");
  });

  it("com senha, o botão volta", async () => {
    usuarioDaSessao.temSenha = true;
    abrir();

    expect(await screen.findByRole("button", { name: "Desvincular conta Google" })).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("desvincular", () => {
  async function abrirDialogo() {
    conta.mockResolvedValue({ disponivel: true, elegivel: true, vinculado: true });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Desvincular conta Google" }));
    return screen.findByLabelText("Senha atual");
  }

  it("pede a senha e avisa que depois só se entra com e-mail e senha", async () => {
    await abrirDialogo();

    expect(screen.getByRole("dialog", { name: "Desvincular conta Google" })).toBeInTheDocument();
    expect(screen.getByText(/apenas com e-mail e senha/)).toBeInTheDocument();
  });

  it("com a senha, desvincula, avisa e atualiza o estado", async () => {
    desvincular.mockResolvedValue(undefined);
    const campo = await abrirDialogo();
    conta.mockResolvedValue({ disponivel: true, elegivel: true, vinculado: false });

    fireEvent.change(campo, { target: { value: "Senha@1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Desvincular" }));

    await waitFor(() => expect(desvincular).toHaveBeenCalledWith("Senha@1234"));
    await waitFor(() => expect(avisoSucesso).toHaveBeenCalledWith(expect.stringContaining("desvinculada")));
    expect(await screen.findByText("Não vinculada")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("com a senha errada, mostra o motivo no diálogo e mantém o vínculo", async () => {
    desvincular.mockRejectedValue(erroDoServidor(403, "Senha incorreta."));
    const campo = await abrirDialogo();

    fireEvent.change(campo, { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Desvincular" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Senha incorreta.");
    expect(avisoSucesso).not.toHaveBeenCalled();
    expect(screen.getByText("Vinculada")).toBeInTheDocument();
  });
});

describe("quando o Google devolve o navegador a esta tela", () => {
  /** Como o backend entrega: o código no fragmento; o erro, na query. */
  function voltarDoGoogle(parte: string) {
    window.history.replaceState(null, "", `/configuracoes/seguranca${parte}`);
  }

  it("com o código e o segredo desta aba, vincula, avisa e atualiza o estado", async () => {
    await prepararVinculo();
    vincular.mockResolvedValue(undefined);
    voltarDoGoogle("#codigo=codigo-de-entrega");
    abrir();

    await waitFor(() => expect(vincular).toHaveBeenCalledWith("codigo-de-entrega"));
    await waitFor(() => expect(avisoSucesso).toHaveBeenCalledWith(expect.stringContaining("Conta Google vinculada")));
  });

  it("tira o código da barra de endereço", async () => {
    await prepararVinculo();
    vincular.mockResolvedValue(undefined);
    voltarDoGoogle("#codigo=codigo-de-entrega");
    abrir();

    await waitFor(() => expect(vincular).toHaveBeenCalled());
    expect(window.location.hash).toBe("");
  });

  it("esquece o segredo da aba depois: o código é de uso único", async () => {
    await prepararVinculo();
    vincular.mockResolvedValue(undefined);
    voltarDoGoogle("#codigo=codigo-de-entrega");
    abrir();

    await waitFor(() => expect(avisoSucesso).toHaveBeenCalled());
    expect(lerVinculo()).toBeNull();
  });

  it("troca o código uma vez só, mesmo se a tela montar de novo", async () => {
    await prepararVinculo();
    vincular.mockResolvedValue(undefined);
    voltarDoGoogle("#codigo=codigo-de-entrega");
    const { unmount } = abrir();
    await waitFor(() => expect(vincular).toHaveBeenCalledTimes(1));
    unmount();

    abrir();

    expect(vincular).toHaveBeenCalledTimes(1);
  });

  it("sem o segredo desta aba (o endereço veio de outro navegador), não chama o servidor e explica", async () => {
    voltarDoGoogle("#codigo=codigo-de-entrega");
    abrir();

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(expect.stringContaining("não começou neste navegador")));
    expect(vincular).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  it("mostra o motivo que o servidor mandou quando recusa (por exemplo, Google já vinculado a outra conta)", async () => {
    await prepararVinculo();
    vincular.mockRejectedValue(erroDoServidor(409, "Esta conta Google já está vinculada a outro usuário."));
    voltarDoGoogle("#codigo=codigo-de-entrega");
    abrir();

    await waitFor(() =>
      expect(avisoErro).toHaveBeenCalledWith("Esta conta Google já está vinculada a outro usuário."),
    );
    expect(lerVinculo()).toBeNull();
  });

  it("não mostra detalhe de erro interno do servidor", async () => {
    await prepararVinculo();
    vincular.mockRejectedValue(erroDoServidor(500, "detalhe interno"));
    voltarDoGoogle("#codigo=codigo-de-entrega");
    abrir();

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(expect.stringContaining("Tente novamente")));
    expect(avisoErro).not.toHaveBeenCalledWith("detalhe interno");
  });

  it("quando a pessoa cancela no Google, avisa e esquece o segredo", async () => {
    await prepararVinculo();
    voltarDoGoogle("?erro=cancelado");
    abrir();

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith("Você cancelou a vinculação com o Google."));
    expect(vincular).not.toHaveBeenCalled();
    expect(lerVinculo()).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("quando o Google falha, avisa sem expor o motivo", async () => {
    voltarDoGoogle("?erro=falha");
    abrir();

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(expect.stringContaining("Não foi possível vincular")));
  });

  it("sem código nem erro na URL, não faz nada", async () => {
    abrir();

    await screen.findByText("Não vinculada");
    expect(vincular).not.toHaveBeenCalled();
    expect(avisoErro).not.toHaveBeenCalled();
  });
});
