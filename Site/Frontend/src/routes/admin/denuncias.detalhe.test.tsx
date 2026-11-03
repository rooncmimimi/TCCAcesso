import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Detalhe da denúncia na moderação: quem denunciou, o que foi denunciado (legível), o histórico de
 * tratamento e o "Atribuir a mim". A API de denúncias é simulada; a tela e o cache de consultas são os reais.
 */

const { denuncias, sessao } = vi.hoisted(() => ({
  denuncias: {
    obterDenuncia: vi.fn(),
    atribuirDenuncia: vi.fn(),
    obterContextoMensagem: vi.fn(),
    resolverDenuncia: vi.fn(),
    rejeitarDenuncia: vi.fn(),
    arquivarDenuncia: vi.fn(),
  },
  sessao: { usuario: { id: "admin-1", nome: "Ana Admin", tipo: "administrador" } as Record<string, unknown> | null },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useParams: () => ({ denunciaId: "d1" }) }),
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => sessao }));
vi.mock("@/services/denuncia.service", async (original) => ({
  ...(await original<typeof import("@/services/denuncia.service")>()),
  default: denuncias,
}));

const { Route } = await import("./denuncias.$denunciaId");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

const base = (extra: Record<string, unknown> = {}) => ({
  id: "d1",
  denuncianteId: "u-denunciante",
  entidadeTipo: "postagem",
  entidadeId: "p1",
  motivo: "assedio",
  descricao: "Está me perseguindo.",
  status: "pendente",
  administradorResponsavelId: null,
  administradorResponsavel: null,
  observacaoAdministrador: null,
  resolvidoEm: null,
  criadoEm: "2026-11-01T12:00:00.000Z",
  denunciante: { id: "u-denunciante", nome: "Carla Denunciante", email: "carla@exemplo.com" },
  previaEntidade: { id: "p1", conteudo: "Texto ofensivo da postagem", ativo: true, usuarioId: "u-autor", autor: { id: "u-autor", nome: "Davi Autor", tipoUsuario: "candidato" } },
  historico: [],
  ...extra,
});

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={cliente}>
      <Tela />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  sessao.usuario = { id: "admin-1", nome: "Ana Admin", tipo: "administrador" };
});

afterEach(cleanup);

describe("o que a moderação enxerga", () => {
  it("mostra quem denunciou, o motivo, a data, a descrição e o responsável", async () => {
    denuncias.obterDenuncia.mockResolvedValue(base());
    renderizar();

    expect(await screen.findByText("Carla Denunciante (carla@exemplo.com)")).toBeInTheDocument();
    expect(screen.getByText("Assédio")).toBeInTheDocument();
    expect(screen.getByText("Está me perseguindo.")).toBeInTheDocument();
    expect(screen.getByText("Ninguém atribuído")).toBeInTheDocument();
  });

  it("mostra o conteúdo denunciado em texto legível, com o autor, e não como JSON", async () => {
    denuncias.obterDenuncia.mockResolvedValue(base());
    renderizar();

    expect(await screen.findByText("Texto ofensivo da postagem")).toBeInTheDocument();
    expect(screen.getByText(/Davi Autor/)).toBeInTheDocument();
    expect(screen.queryByText(/"conteudo"/)).not.toBeInTheDocument();
  });

  it("mostra o histórico de tratamento em ordem, começando pelo registro da denúncia", async () => {
    denuncias.obterDenuncia.mockResolvedValue(
      base({
        status: "em_analise",
        historico: [
          { id: "h1", acao: "atribuir_denuncia", descricao: "Denúncia atribuída a Ana Admin.", criadoEm: "2026-11-01T13:00:00.000Z", administrador: { id: "admin-1", nome: "Ana Admin" } },
        ],
      }),
    );
    renderizar();

    const lista = await screen.findByRole("list", { name: "Histórico de tratamento" });
    const itens = within(lista).getAllByRole("listitem");

    expect(itens[0]).toHaveTextContent("Denúncia registrada por Carla Denunciante");
    expect(itens[1]).toHaveTextContent("Denúncia atribuída a Ana Admin.");
    expect(itens[1]).toHaveTextContent("Ana Admin");
  });
});

describe("Atribuir a mim", () => {
  it("atribui ao administrador autenticado e a tela passa a mostrá-lo como responsável logo após a confirmação da API", async () => {
    // A recarga que segue a atribuição fica pendente: o que aparece vem só do que a API confirmou ao atribuir.
    denuncias.obterDenuncia.mockResolvedValueOnce(base()).mockReturnValue(new Promise(() => {}));
    denuncias.atribuirDenuncia.mockResolvedValue(
      base({ status: "em_analise", administradorResponsavelId: "admin-1", administradorResponsavel: { id: "admin-1", nome: "Ana Admin" } }),
    );
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Atribuir a mim" }));

    await waitFor(() => expect(denuncias.atribuirDenuncia).toHaveBeenCalledWith("d1", { forcar: false }));
    // O responsável aparece com "(você)", e o botão dá lugar ao aviso.
    expect(await screen.findByText("Ana Admin (você)")).toBeInTheDocument();
    expect(screen.getByText("Você é o responsável por esta denúncia.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Atribuir a mim" })).not.toBeInTheDocument();
    expect(screen.getByText("Em análise")).toBeInTheDocument();
  });

  it("se a API recusar, o responsável não muda e o erro é mostrado", async () => {
    denuncias.obterDenuncia.mockResolvedValue(base());
    denuncias.atribuirDenuncia.mockRejectedValue({ response: { data: { mensagem: "Esta denúncia já está com Beto." } } });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Atribuir a mim" }));

    await waitFor(() => expect(denuncias.atribuirDenuncia).toHaveBeenCalled());
    expect(screen.getByText("Ninguém atribuído")).toBeInTheDocument();
  });

  it("quando está com outro administrador, pede confirmação antes de assumir, e assume com 'forcar'", async () => {
    const comBeto = base({ status: "em_analise", administradorResponsavelId: "admin-2", administradorResponsavel: { id: "admin-2", nome: "Beto Moderador" } });
    denuncias.obterDenuncia.mockResolvedValue(comBeto);
    denuncias.atribuirDenuncia.mockResolvedValue(
      base({ status: "em_analise", administradorResponsavelId: "admin-1", administradorResponsavel: { id: "admin-1", nome: "Ana Admin" } }),
    );
    renderizar();

    expect(await screen.findByText("Beto Moderador")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Assumir denúncia" }));

    // Ainda não chamou a API: antes vem a confirmação, que cita quem está com ela.
    expect(denuncias.atribuirDenuncia).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("Beto Moderador");

    fireEvent.click(within(dialogo).getByRole("button", { name: "Assumir" }));

    await waitFor(() => expect(denuncias.atribuirDenuncia).toHaveBeenCalledWith("d1", { forcar: true }));
  });

  it("quem já é o responsável não vê o botão", async () => {
    denuncias.obterDenuncia.mockResolvedValue(
      base({ status: "em_analise", administradorResponsavelId: "admin-1", administradorResponsavel: { id: "admin-1", nome: "Ana Admin" } }),
    );
    renderizar();

    expect(await screen.findByText("Ana Admin (você)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Atribuir a mim|Assumir denúncia/ })).not.toBeInTheDocument();
  });

  it("denúncia já encerrada não oferece atribuição nem outras ações", async () => {
    denuncias.obterDenuncia.mockResolvedValue(base({ status: "resolvida" }));
    renderizar();

    await screen.findByText("Resolvida");
    expect(screen.queryByRole("button", { name: /Atribuir a mim|Assumir denúncia|Resolver|Rejeitar|Arquivar/ })).not.toBeInTheDocument();
  });
});
