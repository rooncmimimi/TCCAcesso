import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Usuários no painel administrativo: continuam listados, com bloqueio e desbloqueio e link para o detalhe,
 * mas o administrador não exclui conta nem perfil. Quem exclui a conta é a própria pessoa.
 */

const { admin } = vi.hoisted(() => ({
  admin: { listarUsuarios: vi.fn(), ativarUsuario: vi.fn(), desativarUsuario: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ usuario: { id: "admin-1", tipo: "administrador" } }) }));
vi.mock("@/services/admin.service", () => ({
  listarUsuarios: admin.listarUsuarios,
  ativarUsuario: admin.ativarUsuario,
  desativarUsuario: admin.desativarUsuario,
}));

const { UsuariosTabela } = await import("./UsuariosTabela");

const usuarios = [
  { id: "u1", nome: "Carla Candidata", email: "carla@exemplo.com", tipoUsuario: "candidato", ativo: true, criadoEm: "2026-10-01T00:00:00Z" },
  { id: "u2", nome: "Eduardo Empresa", email: "empresa@exemplo.com", tipoUsuario: "empresa", ativo: false, criadoEm: "2026-10-02T00:00:00Z" },
  { id: "admin-1", nome: "Ana Admin", email: "admin@exemplo.com", tipoUsuario: "administrador", ativo: true, criadoEm: "2026-09-01T00:00:00Z" },
];

beforeEach(() => {
  vi.resetAllMocks();
  admin.listarUsuarios.mockResolvedValue({ usuarios, total: 3, pagina: 1, limite: 10, totalPaginas: 1 });
});

afterEach(cleanup);

function renderizar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={cliente}>
      <UsuariosTabela />
    </QueryClientProvider>,
  );
}

describe("tabela de usuários do painel", () => {
  it("não oferece excluir conta para ninguém", async () => {
    renderizar();

    await screen.findByText("Carla Candidata");
    expect(screen.queryByRole("button", { name: /Excluir/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Excluir conta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Excluir definitivamente/i)).not.toBeInTheDocument();
  });

  it("continua oferecendo bloquear e desbloquear, e o detalhe", async () => {
    renderizar();

    await screen.findByText("Carla Candidata");
    // O nome acessível inclui a pessoa ("Bloquear Carla Candidata"), para o leitor de tela saber de quem se trata.
    expect(screen.getByRole("button", { name: "Bloquear Carla Candidata" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desbloquear Eduardo Empresa" })).toBeInTheDocument();
    // O nome da pessoa é o link para o detalhe dela.
    expect(screen.getByRole("link", { name: "Carla Candidata" })).toBeInTheDocument();
  });
});

describe("serviço de administração", () => {
  it("não expõe mais a função de excluir usuário", async () => {
    const servico = await vi.importActual<Record<string, unknown>>("@/services/admin.service");

    expect(servico.removerUsuario).toBeUndefined();
    expect((servico.default as Record<string, unknown>).removerUsuario).toBeUndefined();
    expect(typeof servico.desativarUsuario).toBe("function");
  });
});
