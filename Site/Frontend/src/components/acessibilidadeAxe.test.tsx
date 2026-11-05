import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PREFERENCIAS_PADRAO, type PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";
import type { CatalogoDoAmbiente, MidiaDaVaga } from "@/types/ambiente";
import type { PostagemCompleta, Vaga } from "@/types";
import type { VagaAdmin } from "@/services/admin.service";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * Verificação automática (axe) dos recursos novos dos Blocos 3 e 4, no jsdom. Pega o que o axe sabe
 * pegar: nomes de botões e campos, rótulos, papéis e atributos ARIA, ids duplicados, listas, títulos,
 * imagens. NÃO pega contraste, tamanho de alvo nem ordem de leitura (sem layout), e não substitui o
 * teste com leitor de tela. O contraste e o alvo são conferidos no navegador de verdade.
 */

const { estado, navegar, voz, servicos } = vi.hoisted(() => ({
  estado: { prefs: null as unknown as PreferenciasAcessibilidade, salvar: null as unknown as (p: PreferenciasAcessibilidade) => void, usuario: null as null | { tipo: string }, autenticado: false },
  navegar: vi.fn(),
  voz: { falar: vi.fn(), parar: vi.fn() },
  servicos: {
    ambiente: { catalogo: vi.fn(), midia: vi.fn() },
    vagas: { detalhar: vi.fn() },
    postagens: { listar: vi.fn(), atualizarDescricaoAnexo: vi.fn() },
    admin: { verificarAcessibilidadeFisica: vi.fn() },
  },
}));

vi.mock("@/hooks/useAcessibilidade", () => ({ useAcessibilidade: () => ({ preferencias: estado.prefs, rascunho: estado.prefs, salvar: estado.salvar, definir: vi.fn() }) }));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ usuario: estado.usuario, autenticado: estado.autenticado }) }));
vi.mock("@/hooks/useVoz", () => ({ useVoz: () => voz }));
vi.mock("@/components/acessibilidade/TextoOuvivel", () => ({ TextoOuvivel: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/services/ambiente.service", () => ({ ambienteService: servicos.ambiente }));
vi.mock("@/services/vagas.service", () => ({ default: servicos.vagas, vagasService: servicos.vagas }));
vi.mock("@/services/postagens.service", () => ({ postagensService: servicos.postagens, default: servicos.postagens }));
vi.mock("@/services/admin.service", () => servicos.admin);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navegar,
  Link: ({ children, to, search: _s, ...resto }: { children: React.ReactNode; to: string; search?: unknown }) => (
    <a href={to} {...(resto as object)}>
      {children}
    </a>
  ),
}));

const { CentralDeComunicacao } = await import("@/components/comunicacao/CentralDeComunicacao");
const { FrasesProntas } = await import("@/components/mensagens/FrasesProntas");
const { DicionarioDeProfissoes } = await import("@/components/profissoes/DicionarioDeProfissoes");
const { NavegacaoPorObjetivos } = await import("@/components/objetivos/NavegacaoPorObjetivos");
const { SecaoMotricidade } = await import("@/components/acessibilidade/SecaoMotricidade");
const { BarraDeVarredura } = await import("@/components/acessibilidade/BarraDeVarredura");
const { AjudaDeAtalhos } = await import("@/components/acessibilidade/AjudaDeAtalhos");
const { abrirAjudaDeAtalhos } = await import("@/hooks/useAtalhosDeTeclado");
const { PlayerDeVideoAcessivel } = await import("@/components/vagas/PlayerDeVideoAcessivel");
const { SecaoAmbienteDaVaga } = await import("@/components/vagas/SecaoAmbienteDaVaga");
const { AmbienteDaVaga } = await import("@/components/vagas/AmbienteDaVaga");
const { AvaliadorDeVagaPainel } = await import("@/components/vagas/AvaliadorDeVagaPainel");
const { VideoDaVagaGestao } = await import("@/components/vagas/VideoDaVagaGestao");
const { ComparadorDeVagasTela } = await import("@/components/vagas/ComparadorDeVagasTela");
const { ExplicacaoDeRequisitos } = await import("@/components/acessibilidade/ExplicacaoDeRequisitos");
const { RevisaoDeTextoAlternativo } = await import("@/components/acessibilidade/RevisaoDeTextoAlternativo");
const { VerificarMapaFisicoDialog } = await import("@/components/admin/VerificarMapaFisicoDialog");
const { EntrevistaOferecida } = await import("@/components/candidatura/EntrevistaOferecida");
const { formularioVazio } = await import("@/lib/ambienteDaVagaForm");
const { adicionarNaComparacao } = await import("@/lib/listaDeComparacao");

const catalogo: CatalogoDoAmbiente = {
  ambienteSensorial: [{ chave: "ruido", rotulo: "Nível de ruído", opcoes: [{ valor: "baixo", rotulo: "Baixo" }, { valor: "alto", rotulo: "Alto" }] }],
  itensFisicos: [{ chave: "rampa", rotulo: "Rampa de acesso" }, { chave: "banheiro", rotulo: "Banheiro adaptado" }],
  situacoesFisicas: [{ valor: "sim", rotulo: "Sim" }, { valor: "parcial", rotulo: "Parcial" }, { valor: "nao", rotulo: "Não" }],
  origensFisicas: [],
  entrevista: [{ chave: "perguntas_por_escrito", rotulo: "Perguntas por escrito" }],
};

const midia: MidiaDaVaga = { id: "m", descricao: "A empresa se apresenta", transcricao: "Olá, somos a empresa e esta é a vaga.", legendaVtt: "WEBVTT\n\n00:00.000 --> 00:02.000\nOlá", video: { url: "https://exemplo.test/v.mp4", expiraEm: null, tipoMime: "video/mp4" } };

const vaga = (extra: Partial<Vaga> = {}) => ({ id: "v1", titulo: "Atendente", status: "aberta", modalidade: "presencial", empresa: { nomeFantasia: "Loja A" }, ...extra }) as unknown as Vaga;

const comCliente = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const verificar = async () => violacoesDeAcessibilidade(document.body);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  estado.prefs = { ...PREFERENCIAS_PADRAO };
  estado.salvar = vi.fn();
  estado.usuario = { tipo: "candidato" };
  estado.autenticado = true;
  servicos.ambiente.catalogo.mockResolvedValue(catalogo);
  servicos.ambiente.midia.mockResolvedValue(null);
  Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("axe: Bloco 4 (motricidade e comunicação)", () => {
  it("central de comunicação", async () => {
    render(<CentralDeComunicacao />);
    expect(await verificar()).toEqual([]);
  });

  it("central de comunicação com o cartão em tela cheia aberto", async () => {
    render(<CentralDeComunicacao />);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar em tela cheia: Preciso de ajuda." }));
    expect(await verificar()).toEqual([]);
  });

  it("frases prontas do chat", async () => {
    render(<FrasesProntas aoEscolher={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Frases prontas" }));
    expect(await verificar()).toEqual([]);
  });

  it("dicionário de profissões", async () => {
    render(<DicionarioDeProfissoes />);
    expect(await verificar()).toEqual([]);
  });

  it("navegação por objetivos, com um objetivo escolhido", async () => {
    render(<NavegacaoPorObjetivos />);
    fireEvent.click(screen.getByRole("button", { name: /Quero me candidatar/ }));
    expect(await verificar()).toEqual([]);
  });

  it("configurações de motricidade, com tudo ligado", async () => {
    estado.prefs = { ...PREFERENCIAS_PADRAO, scanning: true, tremorGuard: true };
    render(<SecaoMotricidade />);
    expect(await verificar()).toEqual([]);
  });

  it("lista de atalhos de teclado", async () => {
    render(<AjudaDeAtalhos />);
    act(() => abrirAjudaDeAtalhos());
    expect(await verificar()).toEqual([]);
  });

  it("painel da varredura: parado e em andamento", async () => {
    estado.prefs = { ...PREFERENCIAS_PADRAO, scanning: true };
    document.body.innerHTML = `<main><button>Salvar</button><a href="/x">Ir</a></main>`;
    render(<BarraDeVarredura />);
    expect(await verificar()).toEqual([]);

    act(() => screen.getByRole("button", { name: "Iniciar varredura" }).click());
    expect(await verificar()).toEqual([]);
  });
});

describe("axe: Bloco 3 (empresas e ambientes)", () => {
  it("player do vídeo em Libras, com legenda e transcrição", async () => {
    render(<PlayerDeVideoAcessivel midia={midia} tituloDaVaga="Atendente" />);
    expect(await verificar()).toEqual([]);
  });

  it("formulário do ambiente da vaga", async () => {
    comCliente(<SecaoAmbienteDaVaga valor={formularioVazio()} aoMudar={vi.fn()} origens={{ rampa: "verificado" }} />);
    await screen.findByLabelText("Nível de ruído");
    expect(await verificar()).toEqual([]);
  });

  it("ambiente da vaga na página de leitura", async () => {
    comCliente(<AmbienteDaVaga vaga={vaga({ entrevistaAdaptacoes: ["perguntas_por_escrito"], ambienteSensorial: { ruido: "baixo" }, acessibilidadeFisica: { rampa: { situacao: "sim", origem: "verificado" } } })} />);
    await screen.findByText("Perguntas por escrito");
    expect(await verificar()).toEqual([]);
  });

  it("avaliador de vaga depois de rodar", async () => {
    render(<AvaliadorDeVagaPainel obterDados={() => ({ titulo: "Atendente", descricao: "Atender.", requisitos: "Boa aparência", beneficios: "", acessibilidade: "", recursos: [], temVideoEmLibras: false, temLegenda: false, entrevista: [], ambienteInformado: false }) as never} />);
    fireEvent.click(screen.getByRole("button", { name: /Avaliar agora/ }));
    expect(await verificar()).toEqual([]);
  });

  it("gestão do vídeo da vaga (com vídeo)", async () => {
    servicos.ambiente.midia.mockResolvedValue(midia);
    comCliente(<VideoDaVagaGestao vagaId="v1" />);
    await screen.findByText(/Legenda em WebVTT/);
    expect(await verificar()).toEqual([]);
  });

  it("comparador de vagas", async () => {
    servicos.vagas.detalhar.mockImplementation(async (id: string) => vaga({ id, titulo: id === "a" ? "Vaga A" : "Vaga B", modalidade: id === "a" ? "remoto" : "presencial" }));
    adicionarNaComparacao("a");
    adicionarNaComparacao("b");
    comCliente(<ComparadorDeVagasTela />);
    await screen.findByRole("table");
    expect(await verificar()).toEqual([]);
  });

  it("explicação de requisitos aberta", async () => {
    render(<ExplicacaoDeRequisitos texto="Buscamos boa comunicação e proatividade." />);
    document.querySelector("details")!.setAttribute("open", "");
    expect(await verificar()).toEqual([]);
  });

  it("revisão de texto alternativo", async () => {
    servicos.postagens.listar.mockResolvedValue({ dados: [{ id: "p1", conteudo: "Escritório", anexos: [{ id: "a1", tipo: "imagem", url: "https://exemplo.test/i.png", descricao: null }] } as unknown as PostagemCompleta], total: 1 });
    comCliente(<RevisaoDeTextoAlternativo usuarioId="u1" />);
    await screen.findByLabelText("Descreva esta imagem");
    expect(await verificar()).toEqual([]);
  });

  it("verificação do mapa físico (administração)", async () => {
    const v: VagaAdmin = { id: "v1", titulo: "Atendente", status: "aberta", acessibilidadeFisica: { rampa: { situacao: "sim", origem: "verificado", verificadoEm: "2026-11-04T12:00:00Z" }, banheiro: { situacao: "parcial", origem: "declarado" } } };

    comCliente(<VerificarMapaFisicoDialog vaga={v} aoFechar={vi.fn()} />);
    await screen.findByText("Rampa de acesso:");
    expect(await verificar()).toEqual([]);
  });

  it("entrevista oferecida na candidatura", async () => {
    comCliente(<EntrevistaOferecida adaptacoes={["perguntas_por_escrito"]} observacao="Podemos remarcar." />);
    await screen.findByText("Perguntas por escrito");
    expect(await verificar()).toEqual([]);
  });
});
