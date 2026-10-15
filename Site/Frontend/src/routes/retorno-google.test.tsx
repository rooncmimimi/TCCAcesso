import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * A tela `/retorno-google`: o que a pessoa vê e para onde vai depois que o Google devolve o
 * navegador ao Site. O roteador, o serviço do Google e a sessão são simulados; o componente da rota
 * é renderizado de verdade.
 *
 * Os testes marcados com `it.fails` descrevem o comportamento correto de falhas já confirmadas na
 * auditoria do login com Google (achados 4, 5 e 12). Cada etapa do plano que as corrige troca o
 * `it.fails` por `it`.
 */

const { busca, navegar, recarregar, definirTokens, concluir } = vi.hoisted(() => ({
  busca: { codigo: undefined as string | undefined, erro: undefined as string | undefined },
  navegar: vi.fn(),
  recarregar: vi.fn(async () => undefined),
  definirTokens: vi.fn(),
  concluir: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  useNavigate: () => navegar,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ recarregar }) }));
vi.mock("@/services/api", () => ({ definirTokens }));
vi.mock("@/services/google.service", () => ({ default: { concluir } }));

const { Route } = await import("./retorno-google");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

function abrir(parametros: { codigo?: string; erro?: string }) {
  busca.codigo = parametros.codigo;
  busca.erro = parametros.erro;
  return render(<Tela />);
}

/** O que o backend devolve em `entrar`: o usuário vem crua, com `tipoUsuario` (nunca `tipo`). */
const sessaoDoBackend = (usuario: Record<string, unknown> = {}) => ({
  desfecho: "entrar" as const,
  token: "token-de-acesso",
  refreshToken: "token-de-renovacao",
  usuario: { id: "u1", nome: "Ana", tipoUsuario: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z", ...usuario },
});

beforeEach(() => {
  vi.clearAllMocks();
});

// O `vitest.config.ts` não liga `globals`, então o Testing Library não limpa a tela sozinho.
afterEach(cleanup);

describe("quando o Google devolve um erro", () => {
  it("mostra que a pessoa cancelou, sem trocar nenhum código", () => {
    abrir({ erro: "cancelado" });

    expect(screen.getByText("Você cancelou a entrada com o Google.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/entrar");
    expect(concluir).not.toHaveBeenCalled();
  });

  it("mostra a mensagem genérica de falha", () => {
    abrir({ erro: "falha" });

    expect(screen.getByText(/Não foi possível concluir a entrada com o Google/)).toBeInTheDocument();
    expect(concluir).not.toHaveBeenCalled();
  });

  it("coloca o foco no título do aviso, para o leitor de tela anunciá-lo", () => {
    abrir({ erro: "cancelado" });
    expect(screen.getByRole("heading", { name: "Não deu certo" })).toHaveFocus();
  });
});

describe("enquanto confirma", () => {
  it("anuncia o carregamento como status e troca o código uma vez só", async () => {
    concluir.mockReturnValue(new Promise(() => undefined));
    const { rerender } = abrir({ codigo: "codigo-de-entrega" });

    expect(screen.getByRole("status")).toHaveTextContent("Confirmando sua conta Google…");
    rerender(<Tela />);
    expect(concluir).toHaveBeenCalledTimes(1);
    expect(concluir).toHaveBeenCalledWith("codigo-de-entrega");
  });

  it("sem código e sem erro, só mostra o carregamento", () => {
    abrir({});
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(concluir).not.toHaveBeenCalled();
  });
});

describe("desfecho entrar", () => {
  it("guarda os tokens, recarrega a sessão e vai ao feed", async () => {
    concluir.mockResolvedValue(sessaoDoBackend());
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(definirTokens).toHaveBeenCalledWith("token-de-acesso", "token-de-renovacao");
    expect(recarregar).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith({ to: "/feed" });
  });

  it("depois de falhar na troca, mostra a falha e não guarda token nenhum", async () => {
    concluir.mockRejectedValue(new Error("rede"));
    abrir({ codigo: "c" });

    expect(await screen.findByText(/Não foi possível concluir a entrada com o Google/)).toBeInTheDocument();
    expect(definirTokens).not.toHaveBeenCalled();
  });

  // Achado 5: o backend manda `tipoUsuario`, a tela lê `usuario.tipo`, que não existe nessa resposta.
  it.fails("leva quem não terminou o cadastro a retomá-lo (achado 5)", async () => {
    concluir.mockResolvedValue(sessaoDoBackend({ cadastroConcluidoEm: null }));
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({ to: "/cadastro/candidato", search: { retomar: true } });
  });

  it.fails("leva o administrador ao painel (achado 5)", async () => {
    concluir.mockResolvedValue(sessaoDoBackend({ tipoUsuario: "administrador" }));
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({ to: "/admin" });
  });

  // Achado 12: sem `replace`, o botão Voltar reabre a tela com o código já usado.
  it.fails("troca a tela de passagem no histórico, sem deixá-la para o botão Voltar (achado 12)", async () => {
    concluir.mockResolvedValue(sessaoDoBackend());
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith(expect.objectContaining({ replace: true }));
  });

  // Achado 4: a resposta de conta pausada não traz token nem usuário.
  it.fails("avisa que a conta está pausada e oferece reativá-la (achado 4)", async () => {
    concluir.mockResolvedValue({ desfecho: "entrar", contaPausada: true });
    abrir({ codigo: "c" });

    expect(await screen.findByText(/pausada/i)).toBeInTheDocument();
  });

  it.fails("mostra o motivo que o servidor mandou para uma conta bloqueada (achado 4)", async () => {
    concluir.mockRejectedValue({ response: { status: 403, data: { mensagem: "Conta bloqueada: spam" } } });
    abrir({ codigo: "c" });

    expect(await screen.findByText(/Conta bloqueada: spam/)).toBeInTheDocument();
  });

  // Achado 6: o login por senha aplica as preferências da conta; este caminho não. O jeito certo
  // de testar depende da rotina única que a etapa 3 do plano cria.
  it.todo("aplica as preferências de acessibilidade da conta ao entrar com Google (achado 6)");
});

describe("desfecho conflito", () => {
  it("diz que a conta já existe, mostra o e-mail e leva ao login por senha", async () => {
    concluir.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
    abrir({ codigo: "c" });

    expect(await screen.findByRole("heading", { name: "Esta conta já existe no ACESSO" })).toBeInTheDocument();
    expect(screen.getByText(/ana@exemplo\.com/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar com e-mail e senha" })).toHaveAttribute("href", "/entrar");
    expect(definirTokens).not.toHaveBeenCalled();
  });
});

describe("desfecho cadastrar", () => {
  it("segue ao cadastro de candidato levando o código, sem deixar a passagem no histórico", async () => {
    concluir.mockResolvedValue({
      desfecho: "cadastrar",
      tipoConta: null,
      perfil: { email: "ana@exemplo.com", nome: "Ana" },
      codigo: "codigo-do-cadastro",
    });
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({
      to: "/cadastro/candidato",
      search: { google: "codigo-do-cadastro", depois: undefined },
      replace: true,
    });
    expect(definirTokens).not.toHaveBeenCalled();
  });

  it("preserva a intenção de seguir para o cadastro da empresa", async () => {
    concluir.mockResolvedValue({
      desfecho: "cadastrar",
      tipoConta: "empresa",
      perfil: { email: "ana@exemplo.com", nome: "Ana" },
      codigo: "codigo-do-cadastro",
    });
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar.mock.calls[0][0].search).toEqual({ google: "codigo-do-cadastro", depois: "empresa" });
  });
});
