import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { VagaAdmin } from "@/services/admin.service";

/**
 * Verificação do mapa físico pela moderação: só os itens informados, a confirmação de que a conferência
 * foi feita antes de marcar, e a ação só sobre o que foi escolhido. Servidor simulado.
 */

const { admin, ambiente, toast } = vi.hoisted(() => ({
  admin: { verificarAcessibilidadeFisica: vi.fn() },
  ambiente: { catalogo: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/admin.service", () => admin);
vi.mock("@/services/ambiente.service", () => ({ ambienteService: ambiente }));
vi.mock("sonner", () => ({ toast }));

const { VerificarMapaFisicoDialog } = await import("./VerificarMapaFisicoDialog");

const catalogo = {
  ambienteSensorial: [],
  itensFisicos: [{ chave: "rampa", rotulo: "Rampa de acesso" }, { chave: "elevador", rotulo: "Elevador" }, { chave: "banheiro", rotulo: "Banheiro adaptado" }],
  situacoesFisicas: [],
  origensFisicas: [],
  entrevista: [],
};

const vaga = (extra: Partial<VagaAdmin> = {}): VagaAdmin => ({
  id: "v1",
  titulo: "Atendente",
  status: "aberta",
  acessibilidadeFisica: {
    rampa: { situacao: "sim", origem: "verificado", verificadoEm: "2026-11-04T12:00:00Z" },
    banheiro: { situacao: "parcial", origem: "declarado", detalhe: "Só no térreo" },
  },
  ...extra,
});

const aoFechar = vi.fn();

function renderizar(v: VagaAdmin | null) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <VerificarMapaFisicoDialog vaga={v} aoFechar={aoFechar} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ambiente.catalogo.mockResolvedValue(catalogo);
  admin.verificarAcessibilidadeFisica.mockResolvedValue({ alteradas: ["banheiro"], acessibilidadeFisica: {} });
});

afterEach(cleanup);

describe("VerificarMapaFisicoDialog", () => {
  it("não aparece sem vaga escolhida", () => {
    renderizar(null);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lista só os itens que a empresa informou, dizendo em texto se estão verificados", async () => {
    renderizar(vaga());

    expect(await screen.findByText("Rampa de acesso:")).toBeTruthy();
    expect(screen.getByText("Banheiro adaptado:")).toBeTruthy();
    expect(screen.queryByText("Elevador:")).toBeNull();
    expect(screen.getByText("Só no térreo")).toBeTruthy();
    expect(screen.getByText(/Verificado em/)).toBeTruthy();
    expect(screen.getByText("Declarado pela empresa (não verificado)")).toBeTruthy();
  });

  it("para marcar como verificado exige escolher o item E confirmar que conferiu", async () => {
    renderizar(vaga());

    const marcar = (await screen.findByRole("button", { name: "Marcar como verificado" })) as HTMLButtonElement;

    expect(marcar.disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /Banheiro adaptado/ }));
    expect(marcar.disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /Conferi estes itens/ }));
    expect(marcar.disabled).toBe(false);

    fireEvent.click(marcar);

    await waitFor(() => expect(admin.verificarAcessibilidadeFisica).toHaveBeenCalledWith("v1", ["banheiro"], true));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/1 item\(ns\) marcado\(s\) como verificado/)));
  });

  it("escolher só um item já verificado não permite marcar de novo, mas permite voltar a declarado (sem a confirmação)", async () => {
    renderizar(vaga());

    const marcar = (await screen.findByRole("button", { name: "Marcar como verificado" })) as HTMLButtonElement;
    const desfazer = screen.getByRole("button", { name: /Voltar a “declarado”/ }) as HTMLButtonElement;

    fireEvent.click(screen.getByRole("checkbox", { name: /Rampa de acesso/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Conferi estes itens/ }));

    expect(marcar.disabled).toBe(true);
    expect(desfazer.disabled).toBe(false);

    fireEvent.click(desfazer);

    await waitFor(() => expect(admin.verificarAcessibilidadeFisica).toHaveBeenCalledWith("v1", ["rampa"], false));
  });

  it("sem itens informados, diz que não há o que verificar e não oferece os botões de ação", async () => {
    renderizar(vaga({ acessibilidadeFisica: {} }));

    expect(await screen.findByText(/Não há o que verificar/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Marcar como verificado" })).toBeNull();
  });

  it("mostra o erro do servidor e não finge que deu certo", async () => {
    admin.verificarAcessibilidadeFisica.mockRejectedValue(new Error("falhou"));

    renderizar(vaga());

    fireEvent.click(await screen.findByRole("checkbox", { name: /Banheiro adaptado/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Conferi estes itens/ }));
    fireEvent.click(screen.getByRole("button", { name: "Marcar como verificado" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
