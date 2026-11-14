import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";
import { AcessibilidadeProvider } from "@/contexts/AcessibilidadeProvider";

/**
 * O axe varre a árvore inteira e, nas telas grandes, uma varredura passa dos 5 s que o Vitest dá por
 * padrão — com a suíte toda rodando em paralelo, dava falha por tempo numa máquina ocupada e passava
 * sozinha logo depois. O limite aqui é por arquivo, e não global: nos outros testes um teste de 5 s
 * continua sendo sinal de que algo travou.
 */
vi.setConfig({ testTimeout: 30_000 });

/**
 * Axe nas telas PÚBLICAS — as que qualquer pessoa abre sem ter conta, e que a suíte de
 * acessibilidade não cobria. A auditoria de 14/11/2026 apontou isto: dez das doze telas públicas
 * não passavam por verificação automática nenhuma, justamente as primeiras que alguém encontra.
 *
 * O que o axe pega aqui: nome acessível, papel, rótulo, atributo ARIA, id repetido, lista, título,
 * imagem. O que ele NÃO pega, e por isso continua dependendo de gente: contraste, tamanho de alvo,
 * ordem de leitura e tudo que precisa de layout — o jsdom não tem layout (ver
 * `lib/verificarAcessibilidade.ts`).
 *
 * Passar aqui não quer dizer que a tela é acessível. Quer dizer que ela não tem os erros que uma
 * máquina consegue achar sozinha.
 */

const { estado, navegar, servicos, toast } = vi.hoisted(() => ({
  estado: {
    busca: {} as Record<string, unknown>,
    parametros: {} as Record<string, string>,
    usuario: null as null | Record<string, unknown>,
    autenticado: false,
  },
  navegar: vi.fn(),
  servicos: {
    publico: { home: vi.fn() },
    autenticacao: { entrar: vi.fn(), solicitarRecuperacao: vi.fn(), redefinirSenha: vi.fn(), confirmarEmail: vi.fn(), reenviarConfirmacao: vi.fn() },
    contato: { enviar: vi.fn() },
    vagas: { detalhar: vi.fn(), listarMinhasCandidaturas: vi.fn(), listarFavoritos: vi.fn() },
    mensagens: { iniciarConversa: vi.fn() },
    ambiente: { midia: vi.fn() },
    candidaturaRascunho: { obter: vi.fn() },
  },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  // `createFileRoute` devolve as próprias opções, mais os ganchos que o componente chama.
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({
    ...opcoes,
    useSearch: () => estado.busca,
    useParams: () => estado.parametros,
  }),
  Link: ({ children, to, search: _s, params: _p, ...resto }: { children?: ReactNode; to?: string; search?: unknown; params?: unknown }) => (
    <a href={typeof to === "string" ? to : "#"} {...(resto as object)}>
      {children}
    </a>
  ),
  Navigate: () => null,
  useNavigate: () => navegar,
  useRouter: () => ({ invalidate: vi.fn() }),
  useRouterState: () => ({ location: { pathname: "/vaga/v1", href: "/vaga/v1", search: {} } }),
}));

vi.mock("@/hooks/useSessao", () => ({
  useSessao: () => ({
    usuario: estado.usuario,
    autenticado: estado.autenticado,
    inicializado: true,
    entrar: vi.fn(),
    sair: vi.fn(),
    recarregar: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLeituraDestacada", () => ({ useLeituraDestacada: () => ({ ler: vi.fn(), parar: vi.fn() }) }));
vi.mock("@/hooks/useVoz", () => ({ useVoz: () => ({ falar: vi.fn(), parar: vi.fn(), falando: false, disponivel: false, escolha: null, definirEscolha: vi.fn(), limparEscolha: vi.fn() }) }));
vi.mock("@/hooks/useEstadoDaSeguranca", () => ({ useEstadoDaSeguranca: () => ({ data: undefined, isLoading: false }) }));
// O botão "Traduzir" fala com um serviço de fora; aqui ele fica parado, devolvendo o texto original.
vi.mock("@/hooks/useTraducao", () => ({
  useTraducao: () => ({
    estado: "parado",
    texto: (original: string) => original,
    alternar: vi.fn(),
    origem: "pt",
    destino: "pt",
    mensagem: null,
    ocupado: false,
    precisaDeAutorizacao: false,
    autorizar: vi.fn(),
    recusar: vi.fn(),
    viaServicoOnline: false,
  }),
}));

vi.mock("@/services/publico.service", () => ({ publicoService: servicos.publico, default: servicos.publico }));
vi.mock("@/services/autenticacao.service", () => ({ default: servicos.autenticacao, autenticacaoService: servicos.autenticacao }));
vi.mock("@/services/contato.service", () => ({ default: servicos.contato, contatoService: servicos.contato }));
vi.mock("@/services/vagas.service", () => ({ default: servicos.vagas, vagasService: servicos.vagas }));
vi.mock("@/services/mensagens.service", () => ({ default: servicos.mensagens, mensagensService: servicos.mensagens }));
vi.mock("@/services/ambiente.service", () => ({ ambienteService: servicos.ambiente, default: servicos.ambiente }));
vi.mock("@/services/candidaturaRascunho.service", () => ({ default: servicos.candidaturaRascunho, candidaturaRascunhoService: servicos.candidaturaRascunho }));
vi.mock("sonner", () => ({ toast, Toaster: () => null }));

const { Route: RotaInicio } = await import("@/routes/index");
const { Route: RotaEntrar } = await import("@/routes/entrar");
const { Route: RotaSobreNos } = await import("@/routes/sobre-nos");
const { Route: RotaFaleConosco } = await import("@/routes/fale-conosco");
const { Route: RotaRecuperar } = await import("@/routes/recuperar-senha");
const { Route: RotaRedefinir } = await import("@/routes/redefinir-senha");
const { Route: RotaConfirmar } = await import("@/routes/confirmar-email");
const { Route: RotaTermos } = await import("@/routes/termos");
const { Route: RotaPrivacidade } = await import("@/routes/privacidade");
const { Route: RotaVaga } = await import("@/routes/vaga.$vagaId");

type ComComponente = { component: () => ReactNode };

const telaDe = (rota: unknown) => (rota as ComComponente).component;

const VAGA = {
  id: "v1",
  titulo: "Pessoa atendente",
  descricao: "Atendimento ao público numa loja de bairro, com treinamento.",
  requisitos: "Vontade de aprender.",
  modalidade: "presencial",
  tipoContrato: "clt",
  status: "aberta",
  cidade: "São Paulo",
  estado: "SP",
  publicoAlvo: "pcd",
  criadoEm: "2026-11-01T12:00:00Z",
  empresa: { id: "e1", nomeFantasia: "Loja do Bairro", verificada: true },
  recursos: [],
  deficiencias: [],
};

const HOME = {
  vagas: [VAGA],
  totalVagas: 1,
  empresas: [{ id: "e1", nomeFantasia: "Loja do Bairro", logo: null }],
  totalEmpresas: 1,
  totalCandidatos: 10,
};

function montar(Tela: () => ReactNode) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  // O provedor de verdade, e nao um dublê: estas telas leem as preferências para decidir o que
  // mostrar, e trocar isso por um objeto fixo esconderia justamente o que se quer verificar.
  return render(
    <QueryClientProvider client={cliente}>
      <AcessibilidadeProvider>
        <Tela />
      </AcessibilidadeProvider>
    </QueryClientProvider>,
  );
}

const semViolacao = async () => {
  const violacoes = await violacoesDeAcessibilidade(document.body);

  expect(violacoes).toEqual([]);
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  estado.busca = {};
  estado.parametros = { vagaId: "v1" };
  estado.usuario = null;
  estado.autenticado = false;
  servicos.publico.home.mockResolvedValue(HOME);
  servicos.vagas.detalhar.mockResolvedValue(VAGA);
  servicos.vagas.listarMinhasCandidaturas.mockResolvedValue([]);
  servicos.vagas.listarFavoritos.mockResolvedValue([]);
  servicos.ambiente.midia.mockResolvedValue(null);
  servicos.candidaturaRascunho.obter.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("axe: as telas que qualquer pessoa abre", () => {
  it("página inicial, com as vagas carregadas", async () => {
    montar(telaDe(RotaInicio));
    await waitFor(() => expect(servicos.publico.home).toHaveBeenCalled());
    await semViolacao();
  });

  it("página inicial enquanto carrega", async () => {
    servicos.publico.home.mockReturnValue(new Promise(() => {}));
    montar(telaDe(RotaInicio));
    await semViolacao();
  });

  it("entrar", async () => {
    montar(telaDe(RotaEntrar));
    await semViolacao();
  });

  it("sobre nós", async () => {
    montar(telaDe(RotaSobreNos));
    await semViolacao();
  });

  it("fale conosco", async () => {
    montar(telaDe(RotaFaleConosco));
    await semViolacao();
  });

  it("recuperar senha", async () => {
    montar(telaDe(RotaRecuperar));
    await semViolacao();
  });

  it("redefinir senha, com o token no endereço", async () => {
    estado.busca = { token: "um-token-qualquer" };
    montar(telaDe(RotaRedefinir));
    await semViolacao();
  });

  it("confirmar e-mail, com o e-mail no endereço", async () => {
    estado.busca = { email: "maria@exemplo.com" };
    montar(telaDe(RotaConfirmar));
    await semViolacao();
  });

  it("termos de uso", async () => {
    montar(telaDe(RotaTermos));
    await semViolacao();
  });

  it("aviso de privacidade", async () => {
    montar(telaDe(RotaPrivacidade));
    await semViolacao();
  });

  it("detalhe da vaga, carregada", async () => {
    montar(telaDe(RotaVaga));
    await waitFor(() => expect(servicos.vagas.detalhar).toHaveBeenCalled());
    await semViolacao();
  });

  it("detalhe da vaga quando a vaga não existe", async () => {
    servicos.vagas.detalhar.mockRejectedValue(new Error("404"));
    montar(telaDe(RotaVaga));
    await semViolacao();
  });
});
