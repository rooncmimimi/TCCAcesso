import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import type { ReactNode } from "react";

/**
 * A tela `/retorno-google`: o que a pessoa vê e para onde vai depois que o Google devolve o
 * navegador ao Site. O roteador, o serviço do Google e a sessão são simulados; o componente da rota
 * é renderizado de verdade.
 *
 * O "depois de autenticar" não é testado aqui: ele é `iniciarSessao`, do contexto da sessão (ver
 * `SessaoContext.test.tsx`), e a tela só decide o que mostrar e para onde ir com o que ele devolve.
 *
 * O segredo que amarra o retorno à aba (`lib/googleNavegador`) é o de verdade, no `sessionStorage`
 * do jsdom: cada teste começa com a aba tendo iniciado um fluxo, salvo quando diz o contrário.
 */

const { busca, navegar, iniciarSessao, concluir, criarConta } = vi.hoisted(() => ({
  busca: { codigo: undefined as string | undefined, erro: undefined as string | undefined },
  navegar: vi.fn(),
  iniciarSessao: vi.fn(),
  concluir: vi.fn(),
  criarConta: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  useNavigate: () => navegar,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ iniciarSessao }) }));
// O resto do módulo (como `mensagemDeErroGoogle`) é o de verdade; só o serviço HTTP é simulado.
vi.mock("@/services/google.service", async (original) => ({
  ...(await original<typeof import("@/services/google.service")>()),
  default: { concluir, cadastrar: criarConta },
}));

const { Route } = await import("./retorno-google");
const { lerProva, lerVinculo, limparVinculo, prepararVinculo } = await import("@/lib/googleNavegador");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

/**
 * Abre a tela como o backend a entrega: o código no fragmento (`#codigo=`) e o erro na query.
 * `naQuery` simula o formato anterior, que a tela ainda aceita.
 */
function abrir(parametros: { codigo?: string; erro?: string; naQuery?: boolean }) {
  const naQuery = parametros.naQuery === true;
  busca.codigo = naQuery ? parametros.codigo : undefined;
  busca.erro = parametros.erro;

  const url = new URL("/retorno-google", window.location.origin);
  if (parametros.codigo && !naQuery) url.hash = `codigo=${parametros.codigo}`;
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);

  return render(<Tela />);
}

/** Uma prova com validade, como o servidor a devolve: o Site só lê o `exp` e o perfil. */
function provaDeTeste() {
  const corpo = Buffer.from(
    JSON.stringify({ perfil: { email: "ana@exemplo.com", nome: "Ana" }, exp: Math.floor(Date.now() / 1000) + 900 })
  ).toString("base64url");
  return `cabecalho.${corpo}.assinatura`;
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

beforeEach(async () => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/retorno-google");
  vi.stubGlobal("crypto", webcrypto);
  // A aba começou um fluxo: o segredo que o servidor vai pedir junto com o código existe.
  await prepararVinculo();
});

// O `vitest.config.ts` não liga `globals`, então o Testing Library não limpa a tela sozinho.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

  it("esquece o segredo da aba: o fluxo terminou", () => {
    abrir({ erro: "cancelado" });
    expect(lerVinculo()).toBeNull();
  });
});

// Achado 3 da auditoria: o código só vale no navegador que começou o fluxo.
describe("quando este navegador não começou o fluxo", () => {
  beforeEach(() => {
    limparVinculo();
  });

  it("explica o que houve e não chama o servidor", () => {
    abrir({ codigo: "codigo-de-entrega" });

    expect(screen.getByText(/não começou neste navegador/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/entrar");
    expect(concluir).not.toHaveBeenCalled();
  });

  it("tira o código da barra de endereço mesmo assim", () => {
    abrir({ codigo: "codigo-de-entrega" });
    expect(window.location.hash).toBe("");
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

  it("lê o código do fragmento da URL, que é onde o backend o coloca (achado 13)", () => {
    concluir.mockReturnValue(new Promise(() => undefined));

    abrir({ codigo: "codigo-do-fragmento" });

    expect(concluir).toHaveBeenCalledWith("codigo-do-fragmento", false);
  });

  it("tira o código do fragmento da barra de endereço assim que o lê", () => {
    concluir.mockReturnValue(new Promise(() => undefined));

    abrir({ codigo: "codigo-de-entrega" });

    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/retorno-google");
  });

  it("ainda aceita o formato anterior, com o código na query, e também o tira da barra", () => {
    window.history.replaceState(null, "", "/retorno-google?codigo=codigo-antigo");
    concluir.mockReturnValue(new Promise(() => undefined));

    busca.codigo = "codigo-antigo";
    busca.erro = undefined;
    render(<Tela />);

    expect(concluir).toHaveBeenCalledWith("codigo-antigo", false);
    expect(window.location.search).not.toContain("codigo");
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

  it("esquece o segredo da aba depois de entrar: o código foi gasto", async () => {
    concluir.mockResolvedValue(sessaoDoBackend());
    iniciarSessao.mockResolvedValue(usuarioNormalizado());
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(lerVinculo()).toBeNull();
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

  it("esquece o segredo da aba quando a troca falha: o caminho é voltar ao login e começar outro fluxo", async () => {
    concluir.mockRejectedValue(erroDoServidor(400, "Este código do Google já foi usado. Entre com o Google de novo."));
    abrir({ codigo: "c" });

    expect(await screen.findByText(/já foi usado/)).toBeInTheDocument();
    expect(lerVinculo()).toBeNull();
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

  // O servidor não gasta o código nesta resposta, e reativar o reenvia com o mesmo segredo.
  it("mantém o segredo da aba enquanto a pessoa decide reativar", async () => {
    abrir({ codigo: "c" });

    await screen.findByRole("heading", { name: "Sua conta está pausada" });
    expect(lerVinculo()).not.toBeNull();
  });

  it("esquece o segredo da aba depois que a reativação conclui", async () => {
    concluir.mockResolvedValueOnce(sessaoDoBackend());
    iniciarSessao.mockResolvedValueOnce(usuarioNormalizado());
    abrir({ codigo: "c" });

    fireEvent.click(await screen.findByRole("button", { name: "Reativar minha conta" }));

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(lerVinculo()).toBeNull();
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

  it("esquece o segredo da aba: não há o que reapresentar", async () => {
    concluir.mockResolvedValue({ desfecho: "entrar", emailNaoVerificado: true, email: "rh@empresa.com" });
    iniciarSessao.mockResolvedValue({ emailNaoVerificado: true, email: "rh@empresa.com" });
    abrir({ codigo: "c" });

    await screen.findByRole("heading", { name: "Confirme seu e-mail" });
    expect(lerVinculo()).toBeNull();
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

  it("esquece o segredo da aba: o conflito gastou o código", async () => {
    concluir.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
    abrir({ codigo: "c" });

    await screen.findByRole("heading", { name: "Esta conta já existe no ACESSO" });
    expect(lerVinculo()).toBeNull();
  });

  // Achado 7: a tela que o texto promete agora existe (Configurações, Segurança, Contas conectadas).
  it("aponta para a tela onde o Google pode ser vinculado depois de entrar com a senha", async () => {
    concluir.mockResolvedValue({ desfecho: "conflito", email: "ana@exemplo.com" });
    abrir({ codigo: "c" });

    await screen.findByRole("heading", { name: "Esta conta já existe no ACESSO" });
    expect(screen.getByText(/vincular o Google em Configurações, Segurança, Contas conectadas/)).toBeInTheDocument();
  });
});

describe("desfecho cadastrar", () => {
  const cadastrar = (extra: Record<string, unknown> = {}, prova = provaDeTeste()) => ({
    desfecho: "cadastrar",
    tipoConta: null,
    perfil: { email: "ana@exemplo.com", nome: "Ana" },
    prova,
    ...extra,
  });

  it("segue ao cadastro de candidato sem deixar a passagem no histórico", async () => {
    concluir.mockResolvedValue(cadastrar());
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({
      to: "/cadastro/candidato",
      search: { google: true, depois: undefined },
      replace: true,
    });
    expect(iniciarSessao).not.toHaveBeenCalled();
  });

  it("guarda a prova na aba, e não na URL do cadastro (achado 13)", async () => {
    const prova = provaDeTeste();
    concluir.mockResolvedValue(cadastrar({}, prova));
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(lerProva()).toBe(prova);
    expect(JSON.stringify(navegar.mock.calls[0][0])).not.toContain(prova);
  });

  it("esquece o segredo da aba: o código foi gasto", async () => {
    concluir.mockResolvedValue(cadastrar());
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(lerVinculo()).toBeNull();
  });

  it("não segue ao cadastro se a aba não consegue guardar a prova", async () => {
    concluir.mockResolvedValue(cadastrar());
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("cheio", "QuotaExceededError");
    });
    abrir({ codigo: "c" });

    expect(await screen.findByText(/Não foi possível concluir a entrada com o Google/)).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });

  // Etapa 6: com a criação sem senha ligada no servidor, a conta nasce no retorno do Google, sem tela de aceite.
  describe("com contaSemSenha", () => {
    const sessaoNova = { token: "t", refreshToken: "r", usuario: { id: "u9", nome: "Ana", tipoUsuario: "candidato" } };

    it("cria a conta na hora, abre a sessão e segue para os dados, sem passar por /cadastro/google", async () => {
      const prova = provaDeTeste();
      concluir.mockResolvedValue(cadastrar({ contaSemSenha: true }, prova));
      criarConta.mockResolvedValue(sessaoNova);
      iniciarSessao.mockResolvedValue(usuarioNormalizado());
      abrir({ codigo: "c" });

      await waitFor(() => expect(navegar).toHaveBeenCalled());
      expect(criarConta).toHaveBeenCalledWith(prova, expect.any(String));
      expect(iniciarSessao).toHaveBeenCalledWith(sessaoNova);
      expect(navegar).toHaveBeenCalledTimes(1);
      expect(navegar).toHaveBeenCalledWith({ to: "/cadastro/dados", search: { depois: undefined }, replace: true });
    });

    it("gasta a prova: ela não fica na aba depois que a conta nasceu", async () => {
      concluir.mockResolvedValue(cadastrar({ contaSemSenha: true }));
      criarConta.mockResolvedValue(sessaoNova);
      iniciarSessao.mockResolvedValue(usuarioNormalizado());
      abrir({ codigo: "c" });

      await waitFor(() => expect(navegar).toHaveBeenCalled());
      expect(lerProva()).toBeNull();
    });

    it("com 'Sou empresa', preserva a intenção", async () => {
      concluir.mockResolvedValue(cadastrar({ contaSemSenha: true, tipoConta: "empresa" }));
      criarConta.mockResolvedValue(sessaoNova);
      iniciarSessao.mockResolvedValue(usuarioNormalizado());
      abrir({ codigo: "c" });

      await waitFor(() => expect(navegar).toHaveBeenCalled());
      expect(navegar.mock.calls[0][0]).toEqual({ to: "/cadastro/dados", search: { depois: "empresa" }, replace: true });
    });

    it("se o servidor recusar criar a conta, cai em /cadastro/google com a prova ainda na aba, para tentar de novo", async () => {
      const prova = provaDeTeste();
      concluir.mockResolvedValue(cadastrar({ contaSemSenha: true }, prova));
      criarConta.mockRejectedValue(erroDoServidor(503, "Tente novamente"));
      abrir({ codigo: "c" });

      await waitFor(() => expect(navegar).toHaveBeenCalled());
      expect(iniciarSessao).not.toHaveBeenCalled();
      expect(navegar).toHaveBeenCalledWith({ to: "/cadastro/google", search: { depois: undefined }, replace: true });
      expect(lerProva()).toBe(prova);
    });
  });

  it.each([[false], [undefined]])("com contaSemSenha %j (chave desligada ou API antiga), segue o cadastro de sempre", async (contaSemSenha) => {
    concluir.mockResolvedValue(cadastrar({ contaSemSenha }));
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar.mock.calls[0][0].to).toBe("/cadastro/candidato");
    expect(navegar.mock.calls[0][0].search).toMatchObject({ google: true });
  });

  it("preserva a intenção de seguir para o cadastro da empresa", async () => {
    concluir.mockResolvedValue(cadastrar({ tipoConta: "empresa" }));
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar.mock.calls[0][0].search).toEqual({ google: true, depois: "empresa" });
  });

  it("mostra a recusa do servidor quando o Google não confirmou o e-mail, antes de pedir qualquer dado", async () => {
    concluir.mockRejectedValue(erroDoServidor(400, "O Google não confirmou o e-mail desta conta. Faça o cadastro com e-mail e senha."));
    abrir({ codigo: "c" });

    expect(await screen.findByText(/O Google não confirmou o e-mail desta conta/)).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe("aparelho que o servidor não reconhece (código por e-mail)", () => {
  it("o Google provou quem é, mas falta o código do e-mail: guarda o desafio e vai à tela do código, sem abrir sessão", async () => {
    concluir.mockResolvedValue(sessaoDoBackend());
    iniciarSessao.mockResolvedValue({
      verificacaoDispositivo: true,
      desafioDispositivo: "desafio-por-email",
      emailMascarado: "an***@exemplo.com",
      validadeEmMinutos: 15,
      reenvioEmSegundos: 60,
    });
    abrir({ codigo: "c" });

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/verificacao-de-dispositivo", replace: true }));

    const { lerVerificacao } = await import("@/lib/verificacaoDispositivo");

    expect(lerVerificacao()).toMatchObject({ desafio: "desafio-por-email", emailMascarado: "an***@exemplo.com", reenvioEmSegundos: 60 });
  });
});
