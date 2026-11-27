import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { NovaVagaDialog } from "./NovaVagaDialog";
import type { Vaga } from "@/types";

/**
 * O administrador criando vaga: o mesmo formulário da empresa, com a escolha da empresa que vai
 * receber a vaga. O que importa aqui é quem vê o seletor e o que vai no pedido — a conta de empresa
 * nunca escolhe empresa, e o administrador só escolhe entre as aprovadas.
 */

vi.mock("@/services/vagas.service", () => ({ default: { criar: vi.fn() } }));
vi.mock("@/services/admin.service", () => ({ listarEmpresas: vi.fn() }));

const { default: vagasService } = await import("@/services/vagas.service");
const { listarEmpresas } = await import("@/services/admin.service");

const EMPRESAS = {
    empresas: [
        { id: "emp-1", razaoSocial: "Padaria Estrela Ltda", nomeFantasia: "Padaria Estrela", statusAprovacao: "aprovada" },
        { id: "emp-2", razaoSocial: "Oficina Sol Ltda", nomeFantasia: null, statusAprovacao: "aprovada" },
    ],
    total: 2,
};

const vagaFake = { id: "v1", titulo: "Atendente", empresaId: "emp-1" } as Vaga;

function montar(ui: React.ReactElement) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["admin", "vagas", 1], { vagas: [], total: 0 });

    render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

    return queryClient;
}

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listarEmpresas).mockResolvedValue(EMPRESAS as never);
    vi.mocked(vagasService.criar).mockResolvedValue(vagaFake);
});

describe("administrador", () => {
    it("vê o seletor de empresa, só com as aprovadas, e a empresa sem nome fantasia aparece pela razão social", async () => {
        montar(<NovaVagaDialog comoAdministrador />);
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));

        const seletor = await screen.findByLabelText("Empresa");

        await waitFor(() => expect(within(seletor).getAllByRole("option")).toHaveLength(3));
        expect(within(seletor).getByRole("option", { name: "Padaria Estrela" })).toBeInTheDocument();
        expect(within(seletor).getByRole("option", { name: "Oficina Sol Ltda" })).toBeInTheDocument();
        expect(listarEmpresas).toHaveBeenCalledWith({ status: "aprovada", limit: 100 });
    });

    it("a escolha é obrigatória: sem empresa o formulário não envia", async () => {
        montar(<NovaVagaDialog comoAdministrador />);
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));

        expect(await screen.findByLabelText("Empresa")).toBeRequired();
    });

    it("manda o `empresaId` escolhido junto com a vaga", async () => {
        montar(<NovaVagaDialog comoAdministrador />);
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));

        const seletor = await screen.findByLabelText("Empresa");
        await waitFor(() => expect(within(seletor).getAllByRole("option")).toHaveLength(3));
        fireEvent.change(seletor, { target: { value: "emp-2" } });
        fireEvent.submit(document.querySelector("form") as HTMLFormElement);

        await waitFor(() => expect(vagasService.criar).toHaveBeenCalledTimes(1));
        expect(vi.mocked(vagasService.criar).mock.calls[0][0]).toMatchObject({ empresaId: "emp-2" });
    });

    it("diz que a criação fica registrada no log", async () => {
        montar(<NovaVagaDialog comoAdministrador />);
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));

        expect(await screen.findByText(/fica registrada no log/i)).toBeInTheDocument();
    });

    it("sem nenhuma empresa aprovada, explica o que fazer", async () => {
        vi.mocked(listarEmpresas).mockResolvedValue({ empresas: [], total: 0 } as never);
        montar(<NovaVagaDialog comoAdministrador />);
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));

        expect(await screen.findByText(/aprove uma empresa antes de criar a vaga/i)).toBeInTheDocument();
    });

    it("depois de criar, a lista de vagas do painel é atualizada", async () => {
        const queryClient = montar(<NovaVagaDialog comoAdministrador />);
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));

        const seletor = await screen.findByLabelText("Empresa");
        await waitFor(() => expect(within(seletor).getAllByRole("option")).toHaveLength(3));
        fireEvent.change(seletor, { target: { value: "emp-1" } });
        fireEvent.submit(document.querySelector("form") as HTMLFormElement);

        await waitFor(() => expect(queryClient.getQueryState(["admin", "vagas", 1])?.isInvalidated).toBe(true));
    });
});

describe("conta de empresa", () => {
    it("não vê seletor de empresa e nem pergunta quais existem", async () => {
        montar(<NovaVagaDialog />);
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));

        await screen.findByText("Publicar nova vaga");

        expect(screen.queryByLabelText("Empresa")).not.toBeInTheDocument();
        expect(listarEmpresas).not.toHaveBeenCalled();
    });

    it("o pedido não leva `empresaId`: a vaga é da empresa da sessão", async () => {
        montar(<NovaVagaDialog />);
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));
        await screen.findByText("Publicar nova vaga");

        fireEvent.submit(document.querySelector("form") as HTMLFormElement);

        await waitFor(() => expect(vagasService.criar).toHaveBeenCalledTimes(1));
        expect(vi.mocked(vagasService.criar).mock.calls[0][0]).not.toHaveProperty("empresaId");
    });
});
