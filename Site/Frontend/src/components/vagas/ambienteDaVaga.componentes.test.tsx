import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CatalogoDoAmbiente, MidiaDaVaga } from "@/types/ambiente";
import type { PostagemCompleta, Vaga } from "@/types";

/**
 * Telas do Bloco 3: player do vídeo, formulário do ambiente, avaliador, gestão do vídeo, comparador,
 * botão de comparar e revisão de texto alternativo. Servidor simulado (nenhuma rede, nenhum banco).
 */

const { ambiente, vagas, postagens, toast } = vi.hoisted(() => ({
  ambiente: { catalogo: vi.fn(), midia: vi.fn(), enviarVideo: vi.fn(), enviarLegenda: vi.fn(), removerLegenda: vi.fn(), atualizarTextos: vi.fn(), removerMidia: vi.fn() },
  vagas: { detalhar: vi.fn() },
  postagens: { listar: vi.fn(), atualizarDescricaoAnexo: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/ambiente.service", () => ({ ambienteService: ambiente }));
vi.mock("@/services/vagas.service", () => ({ default: vagas, vagasService: vagas }));
vi.mock("@/services/postagens.service", () => ({ postagensService: postagens, default: postagens }));
// A leitura em voz tem testes próprios; aqui só interessa o texto.
vi.mock("@/components/acessibilidade/TextoOuvivel", () => ({ TextoOuvivel: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@tanstack/react-router", async (original) => {
  const real = await original<typeof import("@tanstack/react-router")>();

  return { ...real, Link: ({ children, to, ...resto }: { children: React.ReactNode; to: string }) => <a href={to} {...(resto as object)}>{children}</a> };
});

const { PlayerDeVideoAcessivel } = await import("./PlayerDeVideoAcessivel");
const { SecaoAmbienteDaVaga } = await import("./SecaoAmbienteDaVaga");
const { AmbienteDaVaga } = await import("./AmbienteDaVaga");
const { AvaliadorDeVagaPainel } = await import("./AvaliadorDeVagaPainel");
const { VideoDaVagaGestao } = await import("./VideoDaVagaGestao");
const { BotaoComparar } = await import("./BotaoComparar");
const { ComparadorDeVagasTela } = await import("./ComparadorDeVagasTela");
const { ExplicacaoDeRequisitos } = await import("@/components/acessibilidade/ExplicacaoDeRequisitos");
const { RevisaoDeTextoAlternativo } = await import("@/components/acessibilidade/RevisaoDeTextoAlternativo");
const { formularioVazio } = await import("@/lib/ambienteDaVagaForm");
const { limparComparacao, adicionarNaComparacao } = await import("@/lib/listaDeComparacao");

const catalogo: CatalogoDoAmbiente = {
  ambienteSensorial: [{ chave: "ruido", rotulo: "Nível de ruído", opcoes: [{ valor: "baixo", rotulo: "Baixo" }, { valor: "alto", rotulo: "Alto" }] }],
  itensFisicos: [{ chave: "rampa", rotulo: "Rampa de acesso" }],
  situacoesFisicas: [{ valor: "sim", rotulo: "Sim" }, { valor: "nao", rotulo: "Não" }],
  origensFisicas: [{ valor: "declarado", rotulo: "Declarado" }, { valor: "verificado", rotulo: "Verificado" }],
  entrevista: [{ chave: "perguntas_por_escrito", rotulo: "Perguntas por escrito" }],
};

const midia = (extra: Partial<MidiaDaVaga> = {}): MidiaDaVaga => ({
  id: "m1",
  descricao: "A empresa se apresenta",
  transcricao: "Olá, somos a empresa e esta é a vaga de atendimento.",
  legendaVtt: null,
  video: { url: "https://exemplo.test/v.mp4", expiraEm: null, tipoMime: "video/mp4" },
  ...extra,
});

const vaga = (extra: Partial<Vaga> = {}) => ({ id: "v1", titulo: "Atendente", status: "aberta", modalidade: "presencial", empresa: { nomeFantasia: "Loja A" }, ...extra }) as unknown as Vaga;

// O projeto não usa @testing-library/user-event (e não se acrescenta dependência): atalhos sobre fireEvent.
const userEvent = {
  setup: () => ({
    click: async (el: Element) => void fireEvent.click(el),
    type: async (el: Element, texto: string) => void fireEvent.change(el, { target: { value: texto } }),
    upload: async (el: Element, arquivo: File) => void fireEvent.change(el, { target: { files: [arquivo] } }),
  }),
};

const novoCliente =() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const comCliente = (ui: React.ReactElement) => render(<QueryClientProvider client={novoCliente()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  ambiente.catalogo.mockResolvedValue(catalogo);
  ambiente.midia.mockResolvedValue(null);
  Object.assign(URL, { createObjectURL: vi.fn(() => "blob:legenda"), revokeObjectURL: vi.fn() });
});

afterEach(cleanup);

describe("PlayerDeVideoAcessivel", () => {
  it("usa controles nativos, não toca sozinho nem repete, e mostra a transcrição", () => {
    render(<PlayerDeVideoAcessivel midia={midia()} tituloDaVaga="Atendente" />);

    const video = document.querySelector("video") as HTMLVideoElement;

    expect(video.controls).toBe(true);
    expect(video.autoplay).toBe(false);
    expect(video.loop).toBe(false);
    expect(video.getAttribute("aria-label")).toBe("Vídeo em Libras: Atendente");
    expect(screen.getByText(/esta é a vaga de atendimento/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ampliar o vídeo/ })).toBeTruthy();
  });

  it("liga a legenda como faixa de captions quando existe; senão avisa que não há legenda", () => {
    const { unmount } = render(<PlayerDeVideoAcessivel midia={midia()} tituloDaVaga="A" />);

    expect(document.querySelector("track")).toBeNull();
    expect(screen.getByText(/não tem legenda/)).toBeTruthy();
    unmount();

    render(<PlayerDeVideoAcessivel midia={midia({ legendaVtt: "WEBVTT\n\n00:00.000 --> 00:02.000\nOlá" })} tituloDaVaga="A" />);

    const faixa = document.querySelector("track") as HTMLTrackElement;

    expect(faixa.kind).toBe("captions");
    expect(faixa.getAttribute("src")).toBe("blob:legenda");
  });

  it("sem URL do vídeo, avisa e mantém a transcrição", () => {
    render(<PlayerDeVideoAcessivel midia={midia({ video: { url: null, expiraEm: null, tipoMime: "video/mp4" } })} tituloDaVaga="A" />);

    expect(document.querySelector("video")).toBeNull();
    expect(screen.getByRole("alert").textContent).toMatch(/transcrição abaixo/);
    expect(screen.getByText(/esta é a vaga de atendimento/)).toBeTruthy();
  });
});

describe("ExplicacaoDeRequisitos", () => {
  it("não aparece quando o texto não tem expressões conhecidas", () => {
    const { container } = render(<ExplicacaoDeRequisitos texto="Ensino médio completo." />);

    expect(container.innerHTML).toBe("");
  });

  it("explica as expressões encontradas, sem avaliar ninguém", () => {
    render(<ExplicacaoDeRequisitos texto="Buscamos boa comunicação e proatividade." />);

    expect(screen.getByText(/Entenda estas expressões/)).toBeTruthy();
    expect(screen.getAllByText(/Pode ser só uma preferência quando/).length).toBeGreaterThan(0);
  });
});

describe("SecaoAmbienteDaVaga", () => {
  it("começa em “Não informar” e devolve só o que a pessoa escolheu", async () => {
    const aoMudar = vi.fn();

    comCliente(<SecaoAmbienteDaVaga valor={formularioVazio()} aoMudar={aoMudar} />);

    const ruido = (await screen.findByLabelText("Nível de ruído")) as HTMLSelectElement;

    expect(ruido.value).toBe("");
    expect(within(ruido).getByRole("option", { name: "Não informar" })).toBeTruthy();

    fireEvent.change(ruido, { target: { value: "baixo" } });
    expect(aoMudar).toHaveBeenCalledWith(expect.objectContaining({ sensorial: { ruido: "baixo" } }));

    fireEvent.click(screen.getByLabelText("Perguntas por escrito"));
    expect(aoMudar).toHaveBeenLastCalledWith(expect.objectContaining({ entrevista: ["perguntas_por_escrito"] }));
  });

  it("mostra o selo de verificado com texto e deixa o detalhe desligado sem situação", async () => {
    comCliente(<SecaoAmbienteDaVaga valor={formularioVazio()} aoMudar={vi.fn()} origens={{ rampa: "verificado" }} />);

    await screen.findByRole("combobox", { name: /Rampa de acesso/ });

    expect(screen.getByText("verificado")).toBeTruthy();
    expect((screen.getByLabelText("Detalhe sobre Rampa de acesso (opcional)") as HTMLInputElement).disabled).toBe(true);
  });

  it("se o catálogo falhar, avisa que dá para publicar sem ele", async () => {
    ambiente.catalogo.mockRejectedValue(new Error("falha"));

    comCliente(<SecaoAmbienteDaVaga valor={formularioVazio()} aoMudar={vi.fn()} />);

    expect((await screen.findByRole("alert")).textContent).toMatch(/publicar a vaga sem elas/);
  });
});

describe("AmbienteDaVaga (leitura)", () => {
  it("diz que a empresa não informou, em vez de supor", async () => {
    comCliente(<AmbienteDaVaga vaga={vaga()} />);

    expect(await screen.findByText(/não informou quais adaptações a entrevista oferece/)).toBeTruthy();
  });

  it("mostra o que a empresa informou e marca declarado x verificado em texto", async () => {
    comCliente(
      <AmbienteDaVaga
        vaga={vaga({
          entrevistaAdaptacoes: ["perguntas_por_escrito"],
          ambienteSensorial: { ruido: "baixo" },
          acessibilidadeFisica: { rampa: { situacao: "sim", origem: "declarado" } },
        })}
      />,
    );

    expect(await screen.findByText("Perguntas por escrito")).toBeTruthy();
    expect(screen.getByText("Baixo")).toBeTruthy();
    expect(screen.getByText(/declarado pela empresa/i)).toBeTruthy();
  });
});

describe("AvaliadorDeVagaPainel", () => {
  it("avalia a pedido, em palavras, sem bloquear nada", async () => {
    const usuario = userEvent.setup();
    const obterDados = vi.fn(() => ({ titulo: "Atendente", descricao: "Atender clientes.", requisitos: "Boa aparência", beneficios: "", acessibilidade: "", recursos: [], temVideoEmLibras: false, temLegenda: false, entrevista: [], ambienteInformado: false }));

    render(<AvaliadorDeVagaPainel obterDados={obterDados as never} />);

    expect(screen.queryByRole("status")).toBeNull();
    await usuario.click(screen.getByRole("button", { name: /Avaliar agora/ }));

    const resultado = screen.getByRole("status");

    expect(obterDados).toHaveBeenCalledTimes(1);
    expect(within(resultado).getAllByText(/Pode melhorar\./).length).toBeGreaterThan(0);
    expect(within(resultado).getByText(/Boa aparência|boa aparência/i)).toBeTruthy();
    expect(within(resultado).getByText(/não é certificação|não substitui/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Avaliar de novo/ })).toBeTruthy();
  });
});

describe("VideoDaVagaGestao", () => {
  it("exige o arquivo e a transcrição antes de liberar o envio", async () => {
    const usuario = userEvent.setup();

    comCliente(<VideoDaVagaGestao vagaId="v1" />);

    const enviar = await screen.findByRole("button", { name: "Enviar vídeo" });

    expect((enviar as HTMLButtonElement).disabled).toBe(true);

    const arquivo = new File(["x"], "libras.mp4", { type: "video/mp4" });

    await usuario.upload(screen.getByLabelText("Arquivo de vídeo"), arquivo);
    expect((enviar as HTMLButtonElement).disabled).toBe(true);

    await usuario.type(screen.getByLabelText(/Transcrição do vídeo/), "Bom dia, esta é a apresentação da vaga.");
    expect((enviar as HTMLButtonElement).disabled).toBe(false);

    ambiente.enviarVideo.mockResolvedValue(midia());
    await usuario.click(enviar);

    await waitFor(() => expect(ambiente.enviarVideo).toHaveBeenCalledWith("v1", expect.objectContaining({ video: arquivo, transcricao: "Bom dia, esta é a apresentação da vaga." })));
  });

  it("recusa formato inválido com mensagem", async () => {
    comCliente(<VideoDaVagaGestao vagaId="v1" />);

    const campo = await screen.findByLabelText("Arquivo de vídeo");

    fireEvent.change(campo, { target: { files: [new File(["x"], "a.avi", { type: "video/x-msvideo" })] } });

    expect((await screen.findByRole("alert")).textContent).toMatch(/MP4 ou WEBM/);
  });

  it("recusa vídeo acima de 50 MB", async () => {
    comCliente(<VideoDaVagaGestao vagaId="v1" />);

    const grande = new File(["x"], "g.mp4", { type: "video/mp4" });

    Object.defineProperty(grande, "size", { value: 51 * 1024 * 1024 });
    fireEvent.change(await screen.findByLabelText("Arquivo de vídeo"), { target: { files: [grande] } });

    expect((await screen.findByRole("alert")).textContent).toMatch(/50 MB/);
  });

  it("com vídeo existente, oferece legenda e remoção", async () => {
    ambiente.midia.mockResolvedValue(midia());

    comCliente(<VideoDaVagaGestao vagaId="v1" />);

    expect(await screen.findByText(/Legenda em WebVTT/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remover o vídeo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remover a legenda" })).toBeNull();
  });
});

describe("comparador de vagas", () => {
  it("sem vagas escolhidas, orienta a escolher", () => {
    comCliente(<ComparadorDeVagasTela />);

    expect(screen.getByText(/ainda não escolheu vagas/)).toBeTruthy();
  });

  it("mostra as diferenças em texto e não dá nota nem diz qual é a melhor", async () => {
    ambiente.catalogo.mockResolvedValue(catalogo);
    vagas.detalhar.mockImplementation(async (id: string) =>
      id === "a" ? vaga({ id: "a", titulo: "Vaga A", modalidade: "remoto", ambienteSensorial: { ruido: "baixo" } }) : vaga({ id: "b", titulo: "Vaga B", modalidade: "presencial", ambienteSensorial: { ruido: "alto" } }),
    );
    adicionarNaComparacao("a");
    adicionarNaComparacao("b");

    comCliente(<ComparadorDeVagasTela />);

    const tabela = await screen.findByRole("table");

    expect(within(tabela).getAllByText("Diferente").length).toBeGreaterThan(0);
    expect(within(tabela).getAllByText(/Não informado/).length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toMatch(/\d+ (item diferente|itens diferentes)/);

    const texto = document.body.textContent ?? "";

    expect(texto).not.toMatch(/melhor vaga|vaga ideal|recomendad|pontuação|nota \d/i);
    expect(screen.getByText(/não diz qual vaga é a melhor/)).toBeTruthy();
  });

  it("o botão de comparar inclui, tira e respeita o limite de 3", async () => {
    const usuario = userEvent.setup();

    adicionarNaComparacao("x");
    adicionarNaComparacao("y");
    adicionarNaComparacao("z");

    render(<BotaoComparar vagaId="w" />);

    await usuario.click(screen.getByRole("button", { name: /Comparar esta vaga/ }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/3 vagas/));

    limparComparacao();
    cleanup();
    render(<BotaoComparar vagaId="w" />);

    const botao = screen.getByRole("button", { name: /Comparar esta vaga/ });

    expect(botao.getAttribute("aria-pressed")).toBe("false");
    await usuario.click(botao);
    expect(await screen.findByRole("button", { name: /Tirar da comparação/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver comparação \(1 de 3\)/ })).toBeTruthy();
  });
});

describe("RevisaoDeTextoAlternativo", () => {
  const post = (anexos: Array<{ id: string; tipo: string; descricao?: string | null }>) =>
    ({ id: "p1", conteudo: "Nosso escritório novo", anexos: anexos.map((a) => ({ url: "https://exemplo.test/i.png", ...a })) }) as unknown as PostagemCompleta;

  it("lista só as imagens sem descrição e salva o que a pessoa escreve", async () => {
    const usuario = userEvent.setup();

    postagens.listar.mockResolvedValue({ dados: [post([{ id: "a1", tipo: "imagem" }, { id: "a2", tipo: "imagem", descricao: "Já descrita" }])], total: 1 });
    postagens.atualizarDescricaoAnexo.mockResolvedValue(post([{ id: "a1", tipo: "imagem", descricao: "Rampa" }]));

    comCliente(<RevisaoDeTextoAlternativo usuarioId="u1" />);

    expect(await screen.findByText("1 imagem sem descrição.")).toBeTruthy();

    const salvar = screen.getByRole("button", { name: "Salvar descrição" });

    expect((salvar as HTMLButtonElement).disabled).toBe(true);

    await usuario.type(screen.getByLabelText("Descreva esta imagem"), "Rampa de acesso na entrada");
    await usuario.click(salvar);

    await waitFor(() => expect(postagens.atualizarDescricaoAnexo).toHaveBeenCalledWith("p1", "a1", "Rampa de acesso na entrada"));
  });

  it("quando tudo está descrito, diz isso", async () => {
    postagens.listar.mockResolvedValue({ dados: [post([{ id: "a1", tipo: "imagem", descricao: "ok" }])], total: 1 });

    comCliente(<RevisaoDeTextoAlternativo usuarioId="u1" />);

    expect(await screen.findByText(/já têm descrição/)).toBeTruthy();
  });
});
