import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * A tela `/retorno-google`: o que a pessoa vê e para onde vai depois que o Google devolve o
 * navegador ao Site. O roteador, o serviço do Google e a sessão são simulados; o componente da rota
 * é renderizado de verdade.
 *
 * O "depois de autenticar" não é testado aqui: ele é `iniciarSessao`, do contexto da sessão (ver
 * `SessaoContext.test.tsx`), e a tela só decide o que mostrar e para onde ir com o que ele devolve.
 */

const { busca, navegar, iniciarSessao, concluir } = vi.hoisted(() => ({
  busca: { codigo: undefined as string | undefined, erro: undefined as string | undefined },
  navegar: vi.fn(),
  iniciarSessao: vi.fn(),
  concluir: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  useNavigate: () => navegar,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ iniciarSessao }) }));
vi.mock("@/services/google.service", () => ({ default: { concluir } }));

const { Route } = await import("./retorno-google");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

function abrir(parametros: { codigo?: string; erro?: string }) {
  busca.codigo = parametros.codigo;
  busca.erro = parametros.erro;
  return render(<Tela />);
}

/** O que o backend devolve em `entrar`: o usuário vem crua, com `tipoUsuario` (nunca `tipo`). */
const sessaoDoBackend = () => ({
  desfecho: "entrar" as const,
  token: "token-de-acesso",
  refreshToken: "token-de-renovacao",
  usuario: { id: "u1", nome: "Ana", tipoUsuario: "candidato" },
});

/** O que `iniciarSessao` devolve depois de normalizar: já com `tipo`. */
const usuarioNormalizado = (extra: Record<string, unknown> = {}) => ({
  id: "u1",
  nome: "Ana",
  tipo: "candidato",
  tipoUsuario: "candidato",
  cadastroConcluidoEm: "2026-10-01T10:00:00Z",
  ...extra,
});

/** Erro como o axios o entrega: com a resposta do servidor. */
const erroDoServidor = (status: number, mensagem: string) => ({ response: { status, data: { mensagem } } });

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/retorno-google");
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
    expect(concluir).toHaveBeenCalledWith("codigo-de-entrega", false);
  });

  it("tira o código da barra de endereço assim que o lê", () => {
    window.history.replaceState(null, "", "/retorno-google?codigo=codigo-de-entrega");
    concluir.mockReturnValue(new Promise(() => undefined));

    abrir({ codigo: "codigo-de-entrega" });

    expect(window.location.search).not.toContain("codigo");
    expect(window.location.pathname).toBe("/retorno-google");
  });

  it("sem código e sem erro, explica o que houve em vez de ficar carregando para sempre", () => {
    abrir({});

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(/Não encontramos o código de entrada do Google/)).toBeInTheDocument();
    expect(concluir).not.toHaveBeenCalled();
  });
});

describe("desfecho entrar", () => {
  it("começa a sessão pela rotina única e vai ao destino da pessoa, trocando a tela de passagem no histórico", async () => {
    concluir.mockResolvedValue(sessaoDoBackend());
    iniciarSessao.mockResolvedValue(usuarioNormalizado());
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(iniciarSessao).toHaveBeenCalledWith(sessaoDoBackend());
    expect(navegar).toHaveBeenCalledWith({ to: "/feed", replace: true });
  });

  it("leva quem não terminou o cadastro a retomá-lo (achado 5)", async () => {
    concluir.mockResolvedValue(sessaoDoBackend());
    iniciarSessao.mockResolvedValue(usuarioNormalizado({ cadastroConcluidoEm: null }));
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({ to: "/cadastro/candidato", search: { retomar: true }, replace: true });
  });

  it("leva o administrador ao painel (achado 5)", async () => {
    concluir.mockResolvedValue(sessaoDoBackend());
    iniciarSessao.mockResolvedValue(usuarioNormalizado({ tipo: "administrador", tipoUsuario: "administrador" }));
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({ to: "/admin", replace: true });
  });

  it("troca a tela de passagem no histórico, sem deixá-la para o botão Voltar (achado 12)", async () => {
    concluir.mockResolvedValue(sessaoDoBackend());
    iniciarSessao.mockResolvedValue(usuarioNormalizado());
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith(expect.objectContaining({ replace: true }));
  });

  it("depois de falhar na troca de rede, mostra a falha genérica e não começa sessão", async () => {
    concluir.mockRejectedValue(new Error("rede"));
    abrir({ codigo: "c" });

    expect(await screen.findByText(/Não foi possível concluir a entrada com o Google/)).toBeInTheDocument();
    expect(iniciarSessao).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("mostra o motivo que o servidor mandou para uma conta bloqueada (achado 4)", async () => {
    concluir.mockRejectedValue(erroDoServidor(403, "Conta bloqueada: spam"));
    abrir({ codigo: "c" });

    expect(await screen.findByText("Conta bloqueada: spam")).toBeInTheDocument();
    expect(iniciarSessao).not.toHaveBeenCalled();
  });

  it("mostra a mensagem do servidor para o código expirado", async () => {
    concluir.mockRejectedValue(erroDoServidor(400, "Sessão do Google expirada. Tente entrar novamente."));
    abrir({ codigo: "c" });

    expect(await screen.findByText("Sessão do Google expirada. Tente entrar novamente.")).toBeInTheDocument();
  });

  it("não mostra mensagem de erro interno do servidor, só o texto genérico", async () => {
    concluir.mockRejectedValue(erroDoServidor(500, "Erro interno do servidor."));
    abrir({ codigo: "c" });

    expect(await screen.findByText(/Não foi possível concluir a entrada com o Google/)).toBeInTheDocument();
    expect(screen.queryByText("Erro interno do servidor.")).not.toBeInTheDocument();
  });
});

describe("desfecho entrar com conta pausada (achado 4)", () => {
  beforeEach(() => {
    concluir.mockResolvedValueOnce({ desfecho: "entrar", contaPausada: true });
    iniciarSessao.mockResolvedValueOnce({ contaPausada: true });
  });

  it("avisa que a conta está pausada e oferece reativá-la", async () => {
    abrir({ codigo: "c" });

    expect(await screen.findByRole("heading", { name: "Sua conta está pausada" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Reativar minha conta" })).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("reativa reenviando o mesmo código com a confirmação, e segue ao destino", async () => {
    concluir.mockResolvedValueOnce(sessaoDoBackend());
    iniciarSessao.mockResolvedValueOnce(usuarioNormalizado());
    abrir({ codigo: "codigo-de-entrega" });

    fireEvent.click(await screen.findByRole("button", { name: "Reativar minha conta" }));

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/feed", replace: true }));
    expect(concluir).toHaveBeenLastCalledWith("codigo-de-entrega", true);
  });

  it("se a reativação falhar, mostra o motivo", async () => {
    concluir.mockRejectedValueOnce(erroDoServidor(400, "Sessão do Google expirada. Tente entrar novamente."));
    abrir({ codigo: "c" });

    fireEvent.click(await screen.findByRole("button", { name: "Reativar minha conta" }));

    expect(await screen.findByText("Sessão do Google expirada. Tente entrar novamente.")).toBeInTheDocument();
  });

  it("deixa voltar ao login sem reativar", async () => {
    abrir({ codigo: "c" });

    expect(await screen.findByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/entrar");
  });
});

describe("desfecho entrar com e-mail por confirmar", () => {
  it("pede para confirmar o e-mail, sem criar sessão", async () => {
    concluir.mockResolvedValue({ desfecho: "entrar", emailNaoVerificado: true, email: "rh@empresa.com" });
    iniciarSessao.mockResolvedValue({ emailNaoVerificado: true, email: "rh@empresa.com" });
    abrir({ codigo: "c" });

    expect(await screen.findByRole("heading", { name: "Confirme seu e-mail" })).toBeInTheDocument();
    expect(screen.getByText(/rh@empresa\.com/)).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe("desfecho conflito", () => {
  it("diz que a conta já existe, mostra o e-mail e leva ao login por senha", async () => {
    concluir.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
    abrir({ codigo: "c" });

    expect(await screen.findByRole("heading", { name: "Esta conta já existe no ACESSO" })).toBeInTheDocument();
    expect(screen.getByText(/ana@exemplo\.com/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar com e-mail e senha" })).toHaveAttribute("href", "/entrar");
    expect(iniciarSessao).not.toHaveBeenCalled();
  });

  it("não promete uma tela de vincular que não existe", async () => {
    concluir.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
    abrir({ codigo: "c" });

    await screen.findByRole("heading", { name: "Esta conta já existe no ACESSO" });
    expect(screen.queryByText(/vincular o Google nas configurações/i)).not.toBeInTheDocument();
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
    expect(iniciarSessao).not.toHaveBeenCalled();
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

  it("mostra a recusa do servidor quando o Google não confirmou o e-mail, antes de pedir qualquer dado", async () => {
    concluir.mockRejectedValue(erroDoServidor(400, "O Google não confirmou o e-mail desta conta. Faça o cadastro com e-mail e senha."));
    abrir({ codigo: "c" });

    expect(await screen.findByText(/O Google não confirmou o e-mail desta conta/)).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });
});
