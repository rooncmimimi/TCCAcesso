import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PREFERENCIAS_PADRAO } from "@/contexts/AcessibilidadeContext";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * Verificação automática (axe) das telas que **exigem login** — a parte que faltava, porque o ambiente de
 * desenvolvimento não tem conta de teste. Aqui elas são montadas com os serviços simulados, então dá para
 * varrê-las sem servidor: painel do candidato e da empresa, perfil, minhas vagas, candidaturas, notificações e
 * mensagens, cada uma nos estados que a pessoa vê (carregando, vazio, com dados e com erro).
 *
 * Vale o mesmo limite de sempre: o jsdom não tem layout, então contraste e tamanho de alvo não entram aqui (são
 * conferidos no navegador), e passar no axe não prova que a tela é acessível.
 */

const { estado, servicos, navegar } = vi.hoisted(() => ({
  estado: { usuario: null as null | Record<string, unknown>, autenticado: true },
  navegar: vi.fn(),
  servicos: {
    dashboard: { candidato: vi.fn(), empresa: vi.fn(), favoritos: vi.fn() },
    candidaturas: { minhas: vi.fn(), daVaga: vi.fn() },
    notificacoes: { listar: vi.fn(), contarNaoLidas: vi.fn(), marcarComoLida: vi.fn(), marcarTodas: vi.fn(), remover: vi.fn() },
    mensagens: { listarConversas: vi.fn(), listarMensagens: vi.fn(), contarNaoLidas: vi.fn(), marcarComoLidas: vi.fn(), enviar: vi.fn() },
    empresas: { minhaEmpresa: vi.fn(), vagasDaEmpresa: vi.fn() },
    postagens: { listarLinhaDoTempo: vi.fn(), listar: vi.fn() },
    seguidores: { contar: vi.fn(), listarSeguidores: vi.fn(), listarSeguindo: vi.fn() },
    ambiente: { catalogo: vi.fn(), midia: vi.fn() },
  },
}));

vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ usuario: estado.usuario, autenticado: estado.autenticado, sair: vi.fn() }) }));
vi.mock("@/hooks/useAcessibilidade", () => ({ useAcessibilidade: () => ({ preferencias: PREFERENCIAS_PADRAO, rascunho: PREFERENCIAS_PADRAO, salvar: vi.fn(), definir: vi.fn() }) }));
vi.mock("@/hooks/useVoz", () => ({ useVoz: () => ({ falar: vi.fn(), parar: vi.fn() }) }));
vi.mock("@/components/acessibilidade/TextoOuvivel", () => ({ TextoOuvivel: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/socket", () => ({ ouvirEvento: () => () => {} }));
vi.mock("@/services/dashboard.service", () => ({ dashboardService: servicos.dashboard, default: servicos.dashboard, candidaturasService: servicos.candidaturas }));
vi.mock("@/services/notificacoes.service", () => ({ default: servicos.notificacoes, notificacoesService: servicos.notificacoes }));
vi.mock("@/services/mensagens.service", () => ({ default: servicos.mensagens, mensagensService: servicos.mensagens }));
vi.mock("@/services/empresas.service", () => ({ empresasService: servicos.empresas, default: servicos.empresas }));
vi.mock("@/services/postagens.service", () => ({ postagensService: servicos.postagens, default: servicos.postagens }));
vi.mock("@/services/ambiente.service", () => ({ ambienteService: servicos.ambiente }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navegar,
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) => select({ location: { pathname: "/dashboard/candidato" } }),
  Link: ({ children, to, params: _p, search: _s, ...resto }: { children: React.ReactNode; to: string; params?: unknown; search?: unknown }) => (
    <a href={to} {...(resto as object)}>
      {children}
    </a>
  ),
  createFileRoute: () => (config: unknown) => config,
}));

const { MetricaCard } = await import("@/components/dashboard/MetricaCard");
const { Briefcase, FileText } = await import("lucide-react");
const { CandidaturasRecentes } = await import("@/components/dashboard/CandidaturasRecentes");
const { VagasFavoritas } = await import("@/components/dashboard/VagasFavoritas");
const { MinhasVagas } = await import("@/components/dashboard/MinhasVagas");
const { VagaEmpresaCard } = await import("@/components/dashboard/VagaEmpresaCard");
const { CandidaturasDaVaga } = await import("@/components/dashboard/CandidaturasDaVaga");
const { ListaConversas } = await import("@/components/mensagens/ListaConversas");
const { JanelaConversa } = await import("@/components/mensagens/JanelaConversa");
const { PerfilPessoal } = await import("@/components/perfil/PerfilPessoal");
const { PostagemCard } = await import("@/components/feed/PostagemCard");
const { FormularioPostagem } = await import("@/components/feed/FormularioPostagem");
const { PaginaMinhaAcessibilidade } = await import("@/components/minha-acessibilidade/PaginaMinhaAcessibilidade");
const { PaginaSimulador } = await import("@/components/simulador/PaginaSimulador");
const { PainelAcessibilidade } = await import("@/components/acessibilidade/PainelAcessibilidade");
const { EditarPerfilDialog } = await import("@/components/perfil/EditarPerfilDialog");
const { NovaVagaDialog } = await import("@/components/dashboard/NovaVagaDialog");
const { DenunciarDialog } = await import("@/components/moderacao/DenunciarDialog");
const { Button } = await import("@/components/ui/button");

const vazio = { dados: [], total: 0, pagina: 1, limite: 10, totalPaginas: 0 };

const vaga = (extra: Record<string, unknown> = {}) => ({
  id: "v1",
  titulo: "Atendente de loja",
  status: "aberta",
  modalidade: "presencial",
  cidade: "Campinas",
  estado: "SP",
  salario: 2200,
  publicoAlvo: "pcd",
  recursosAcessibilidade: ["interprete_libras"],
  empresa: { id: "e1", nomeFantasia: "Loja A", usuario: { id: "u9" } },
  criadoEm: "2026-11-01T12:00:00Z",
  ...extra,
});

const candidatura = (extra: Record<string, unknown> = {}) => ({
  id: "c1",
  status: "em_analise",
  criadoEm: "2026-11-02T12:00:00Z",
  vaga: vaga(),
  candidato: { id: "cand1", usuario: { id: "u1", nome: "Ana Souza" } },
  ...extra,
});

const paginado = (dados: unknown[]) => ({ dados, total: dados.length, pagina: 1, limite: 10, totalPaginas: 1 });

const comCliente = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{ui}</QueryClientProvider>);

const verificar = () => violacoesDeAcessibilidade(document.body);

beforeEach(() => {
  // O jsdom não implementa scrollIntoView, e a janela da conversa rola até a última mensagem ao abrir.
  Element.prototype.scrollIntoView = vi.fn();
  vi.clearAllMocks();
  window.localStorage.clear();
  estado.usuario = { id: "u1", nome: "Ana Souza", tipo: "candidato", email: "ana@exemplo.com" };
  estado.autenticado = true;

  servicos.dashboard.candidato.mockResolvedValue({ candidaturas: 3, candidaturasEmAnalise: 1, vagasFavoritas: 2, visualizacoesPerfil: 10 });
  servicos.dashboard.empresa.mockResolvedValue({ vagas: 4, vagasAbertas: 2, candidaturas: 7, candidaturasNovas: 3 });
  servicos.dashboard.favoritos.mockResolvedValue(paginado([vaga()]));
  servicos.candidaturas.minhas.mockResolvedValue(paginado([candidatura()]));
  servicos.candidaturas.daVaga.mockResolvedValue(paginado([candidatura()]));
  servicos.notificacoes.listar.mockResolvedValue(paginado([{ id: "n1", tipo: "vaga", titulo: "Sua candidatura avançou", descricao: "A empresa moveu a sua candidatura para entrevista.", lida: false, criadoEm: "2026-11-03T12:00:00Z" }]));
  servicos.notificacoes.contarNaoLidas.mockResolvedValue(1);
  servicos.mensagens.listarConversas.mockResolvedValue(paginado([{ id: "cv1", usuarioA: { id: "u1", nome: "Ana Souza" }, usuarioB: { id: "u2", nome: "Loja A" }, ultimaMensagem: "Boa tarde!", atualizadoEm: "2026-11-03T12:00:00Z" }]));
  servicos.mensagens.listarMensagens.mockResolvedValue(paginado([{ id: "m1", conteudo: "Boa tarde! Temos uma vaga para você.", remetenteId: "u2", criadoEm: "2026-11-03T12:00:00Z" }]));
  servicos.mensagens.contarNaoLidas.mockResolvedValue(0);
  servicos.empresas.minhaEmpresa.mockResolvedValue({ id: "e1", nomeFantasia: "Loja A", razaoSocial: "Loja A Ltda", statusAprovacao: "aprovada" });
  servicos.empresas.vagasDaEmpresa.mockResolvedValue(paginado([vaga()]));
  servicos.postagens.listarLinhaDoTempo.mockResolvedValue(vazio);
  servicos.postagens.listar.mockResolvedValue(vazio);
  servicos.ambiente.catalogo.mockResolvedValue({ ambienteSensorial: [], itensFisicos: [], situacoesFisicas: [], origensFisicas: [], entrevista: [] });
  servicos.ambiente.midia.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("axe: painel do candidato", () => {
  it("cartões de métrica", async () => {
    comCliente(
      <main>
        <h1>Painel</h1>
        <MetricaCard titulo="Candidaturas" valor={3} icon={FileText} />
        <MetricaCard titulo="Em análise" valor={1} icon={Briefcase} descricao="Esperando resposta da empresa." />
      </main>,
    );

    expect(await verificar()).toEqual([]);
  });

  it("candidaturas recentes: com dados, vazia e com erro", async () => {
    comCliente(<main><h1>Painel</h1><CandidaturasRecentes /></main>);
    await screen.findByText(/Atendente de loja/);
    expect(await verificar()).toEqual([]);

    cleanup();
    servicos.candidaturas.minhas.mockResolvedValue(vazio);
    comCliente(<main><h1>Painel</h1><CandidaturasRecentes /></main>);
    expect(await verificar()).toEqual([]);

    cleanup();
    servicos.candidaturas.minhas.mockRejectedValue(new Error("falha"));
    comCliente(<main><h1>Painel</h1><CandidaturasRecentes /></main>);
    expect(await verificar()).toEqual([]);
  });

  it("vagas favoritas", async () => {
    comCliente(<main><h1>Painel</h1><VagasFavoritas /></main>);
    await screen.findByText(/Atendente de loja/);

    expect(await verificar()).toEqual([]);
  });
});

describe("axe: painel da empresa", () => {
  beforeEach(() => {
    estado.usuario = { id: "u9", nome: "Loja A", tipo: "empresa", email: "loja@exemplo.com" };
  });

  it("minhas vagas, com as abas de status", async () => {
    comCliente(<main><h1>Minhas vagas</h1><MinhasVagas vagaSelecionada={null} onSelecionar={vi.fn()} /></main>);
    await screen.findByText(/Atendente de loja/);
    expect(await verificar()).toEqual([]);
  });

  it("cartão de vaga da empresa, como a lista o usa (dentro de um item de lista)", async () => {
    comCliente(
      <main>
        <h1>Vagas</h1>
        <ul>
          <li>
            <VagaEmpresaCard vaga={vaga() as never} selecionada={false} onVerCandidaturas={vi.fn()} />
          </li>
        </ul>
      </main>,
    );

    expect(await verificar()).toEqual([]);
  });

  it("candidaturas de uma vaga", async () => {
    comCliente(<main><h1>Candidaturas</h1><CandidaturasDaVaga vaga={vaga() as never} /></main>);
    await screen.findAllByText(/Ana Souza/);

    expect(await verificar()).toEqual([]);
  });
});

describe("axe: mensagens", () => {
  const conversa = { id: "cv1", usuarioA: { id: "u1", nome: "Ana Souza" }, usuarioB: { id: "u2", nome: "Loja A" }, ultimaMensagem: "Boa tarde!", atualizadoEm: "2026-11-03T12:00:00Z" };
  const mensagens = [
    { id: "m1", conteudo: "Boa tarde! Temos uma vaga para você.", remetenteId: "u2", criadoEm: "2026-11-03T12:00:00Z" },
    { id: "m2", conteudo: "Oi! Pode me contar mais sobre o horário?", remetenteId: "u1", criadoEm: "2026-11-03T12:05:00Z" },
  ];

  it("lista de conversas: com dados, vazia e com erro", async () => {
    comCliente(<main><h1>Mensagens</h1><ListaConversas conversas={[conversa] as never} usuarioId="u1" conversaSelecionadaId={null} carregando={false} erro={false} onSelecionar={vi.fn()} /></main>);
    expect(await verificar()).toEqual([]);

    cleanup();
    comCliente(<main><h1>Mensagens</h1><ListaConversas conversas={[]} usuarioId="u1" conversaSelecionadaId={null} carregando={false} erro={false} onSelecionar={vi.fn()} /></main>);
    expect(await verificar()).toEqual([]);

    cleanup();
    comCliente(<main><h1>Mensagens</h1><ListaConversas conversas={[]} usuarioId="u1" conversaSelecionadaId={null} carregando={false} erro mensagemErro="Não foi possível carregar." onSelecionar={vi.fn()} /></main>);
    expect(await verificar()).toEqual([]);
  });

  it("janela da conversa, com as frases prontas abertas e o ditado", async () => {
    comCliente(
      <main>
        <h1>Conversa</h1>
        <JanelaConversa conversa={conversa as never} usuarioId="u1" mensagens={mensagens as never} carregando={false} erro={false} enviando={false} contatoDigitando={false} onEnviar={vi.fn()} onDigitando={vi.fn()} />
      </main>,
    );

    expect(await verificar()).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Frases prontas" }));
    expect(await verificar()).toEqual([]);
  });

  it("janela da conversa quando o outro participante saiu (só o histórico)", async () => {
    comCliente(
      <main>
        <h1>Conversa</h1>
        <JanelaConversa conversa={{ ...conversa, usuarioB: null } as never} usuarioId="u1" mensagens={mensagens as never} carregando={false} erro={false} enviando={false} contatoDigitando={false} onEnviar={vi.fn()} onDigitando={vi.fn()} />
      </main>,
    );

    expect(await verificar()).toEqual([]);
  });
});

describe("axe: perfil", () => {
  it("o próprio perfil, carregando e com dados", async () => {
    comCliente(<PerfilPessoal />);
    expect(await verificar()).toEqual([]);

    await screen.findAllByText(/Ana Souza/);
    expect(await verificar()).toEqual([]);
  });
});

describe("axe: feed", () => {
  const postagem = {
    id: "p1",
    conteudo: "Hoje começamos a contratar para o time de atendimento. As vagas são para pessoas com deficiência.",
    criadoEm: "2026-11-03T12:00:00Z",
    publica: true,
    totalCurtidas: 2,
    totalComentarios: 1,
    curtiu: false,
    usuario: { id: "u2", nome: "Loja A", tipoUsuario: "empresa" },
    anexos: [{ id: "a1", url: "https://exemplo.test/foto.png", tipo: "imagem", descricao: "Equipe reunida na loja" }],
  };

  it("publicação com imagem descrita", async () => {
    comCliente(<main><h1>Publicações</h1><ul><li><PostagemCard postagem={postagem as never} /></li></ul></main>);

    expect(await verificar()).toEqual([]);
  });

  it("publicação com imagem SEM descrição (o caso que o Bloco 3 avisa)", async () => {
    comCliente(<main><h1>Publicações</h1><ul><li><PostagemCard postagem={{ ...postagem, anexos: [{ ...postagem.anexos[0], descricao: null }] } as never} /></li></ul></main>);

    expect(await verificar()).toEqual([]);
  });

  it("formulário de publicação", async () => {
    comCliente(<main><h1>Publicações</h1><FormularioPostagem /></main>);

    expect(await verificar()).toEqual([]);
  });
});

describe("axe: Minha Acessibilidade e simulador", () => {
  it("Minha Acessibilidade (carregando e carregada)", async () => {
    comCliente(<main><h1>Minha Acessibilidade</h1><PaginaMinhaAcessibilidade /></main>);
    expect(await verificar()).toEqual([]);

    await screen.findByText(/Comunicação|adapta|Salvar/i, {}, { timeout: 4000 }).catch(() => null);
    expect(await verificar()).toEqual([]);
  });

  it("simulador", async () => {
    comCliente(<main><h1>Simulador</h1><PaginaSimulador /></main>);

    expect(await verificar()).toEqual([]);
  });
});

describe("axe: configurações de acessibilidade", () => {
  it("o painel inteiro, com os blocos de leitura e motricidade", async () => {
    comCliente(<main><h1>Configurações de acessibilidade</h1><PainelAcessibilidade /></main>);

    expect(await verificar()).toEqual([]);
  });
});

describe("axe: os diálogos que a pessoa usa o tempo todo", () => {
  /** Abre o diálogo pelo gatilho e espera ele aparecer. */
  const abrir = async (nome: RegExp) => {
    fireEvent.click(screen.getByRole("button", { name: nome }));
    await screen.findByRole("dialog");
  };

  it("editar o meu perfil", async () => {
    comCliente(
      <main>
        <h1>Meu perfil</h1>
        <EditarPerfilDialog candidato={{ id: "c1", cidade: "Campinas", estado: "SP", biografia: "Trabalho com atendimento." } as never}>
          <Button>Editar perfil</Button>
        </EditarPerfilDialog>
      </main>,
    );

    await abrir(/Editar perfil/);
    expect(await verificar()).toEqual([]);
  });

  it("publicar uma vaga nova, com a seção de ambiente aberta", async () => {
    estado.usuario = { id: "u9", nome: "Loja A", tipo: "empresa" };
    comCliente(<main><h1>Minhas vagas</h1><NovaVagaDialog /></main>);

    await abrir(/Nova vaga|Publicar vaga/);
    expect(await verificar()).toEqual([]);

    const ambiente = screen.getByText(/Ambiente de trabalho e entrevista/);

    ambiente.closest("details")?.setAttribute("open", "");
    expect(await verificar()).toEqual([]);
  });

  it("denunciar um conteúdo", async () => {
    comCliente(
      <main>
        <h1>Vaga</h1>
        <DenunciarDialog open onOpenChange={vi.fn()} entidadeTipo="vaga" entidadeId="v1" nomeExibicao="Atendente de loja" autorUsuarioId="u9" autorNomeExibicao="Loja A" />
      </main>,
    );

    await screen.findByRole("dialog");
    expect(await verificar()).toEqual([]);
  });
});
