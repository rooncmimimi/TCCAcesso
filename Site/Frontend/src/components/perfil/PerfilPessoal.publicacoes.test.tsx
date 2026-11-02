import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * "Meu Perfil" não mostra mais o painel de publicações; o de outra pessoa continua mostrando a linha do
 * tempo dela. Nada é apagado: as publicações seguem no feed.
 *
 * O resto da tela (diálogos, seções, layout) é simulado; o que se testa é a condição do painel.
 */

const { sessao, perfil } = vi.hoisted(() => ({
  sessao: { usuario: { id: "eu", tipo: "candidato", nome: "Ana Souza" } as Record<string, unknown> },
  perfil: {
    meuCandidato: vi.fn(),
    perfilCompletoPorUsuario: vi.fn(),
    usuarioPublico: vi.fn(),
    enviarCurriculo: vi.fn(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/layouts/EstruturaApp", () => ({ EstruturaApp: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => sessao }));
vi.mock("@/hooks/useAcessibilidade", () => ({ useAcessibilidade: () => ({ preferencias: {} }) }));
vi.mock("@/services/perfil.service", () => ({ perfilService: perfil }));
vi.mock("@/services/empresas.service", () => ({ seguidoresService: { resumo: vi.fn(async () => ({ seguidores: 0, seguindo: 0 })) } }));
vi.mock("./EditarPerfilDialog", () => ({ EditarPerfilDialog: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("./SeguirButton", () => ({ SeguirButton: () => null }));
vi.mock("./EnviarMensagemButton", () => ({ EnviarMensagemButton: () => null }));
vi.mock("./BloquearUsuarioMenu", () => ({ BloquearUsuarioMenu: () => null }));
vi.mock("./SecaoRecursoPerfil", () => ({ SecaoRecursoPerfil: () => null }));
vi.mock("./SecaoDeficiencias", () => ({ SecaoDeficiencias: () => null }));
vi.mock("./BotoesCurriculo", () => ({ BotoesCurriculo: () => null }));
vi.mock("./ImportarCurriculoDialog", () => ({ ImportarCurriculoDialog: () => null }));
vi.mock("./ListaSeguidoresDialog", () => ({ ListaSeguidoresDialog: ({ children }: { children?: ReactNode }) => <>{children}</> }));
vi.mock("./LinhaDoTempoUsuario", () => ({
  LinhaDoTempoUsuario: ({ usuarioId }: { usuarioId?: string }) => <div data-testid="linha-do-tempo">timeline de {usuarioId}</div>,
}));

const { PerfilPessoal } = await import("./PerfilPessoal");

function renderizar(usuarioId?: string) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={cliente}>
      <PerfilPessoal usuarioId={usuarioId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  sessao.usuario = { id: "eu", tipo: "candidato", nome: "Ana Souza" };
  perfil.meuCandidato.mockResolvedValue({ id: "c-eu", usuarioId: "eu", usuario: { id: "eu", nome: "Ana Souza" } });
  perfil.perfilCompletoPorUsuario.mockResolvedValue({
    id: "c-outro",
    usuarioId: "outro",
    usuario: { id: "outro", nome: "Bruno Lima" },
  });
});

afterEach(cleanup);

describe("painel de publicações no perfil pessoal", () => {
  it("não aparece em Meu Perfil", async () => {
    renderizar();

    await waitFor(() => expect(perfil.meuCandidato).toHaveBeenCalled());
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Publicações" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("linha-do-tempo")).not.toBeInTheDocument();
  });

  it("não aparece quando o próprio id é passado na URL", async () => {
    renderizar("eu");

    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.queryByTestId("linha-do-tempo")).not.toBeInTheDocument();
  });

  it("continua aparecendo no perfil de outra pessoa, com a linha do tempo dela", async () => {
    renderizar("outro");

    expect(await screen.findByRole("heading", { name: "Publicações" })).toBeInTheDocument();
    expect(screen.getByTestId("linha-do-tempo")).toHaveTextContent("timeline de outro");
  });
});
