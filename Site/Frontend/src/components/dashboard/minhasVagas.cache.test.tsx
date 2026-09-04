import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { NovaVagaDialog } from "./NovaVagaDialog";
import { EditarVagaDialog } from "./EditarVagaDialog";
import { CardVagaEmpresa } from "./CardVagaEmpresa";
import type { Vaga } from "@/types";

/**
 * Protege a correção da Etapa 2 para o cache de "minhas vagas": o dashboard
 * (`MinhasVagas.tsx`, queryKey ["minhas-vagas", status, pagina]) e o preview
 * do perfil da empresa (`PerfilEmpresa.tsx`, agora ["minhas-vagas", "perfil"])
 * são o MESMO recurso (`GET /vagas/minhas`) — antes, o perfil usava uma chave
 * isolada ("minhas-vagas-perfil") que nenhuma mutation invalidava, então a
 * lista do perfil ficava desatualizada depois de criar/editar/excluir uma
 * vaga pelo dashboard.
 *
 * Cada teste semeia o cache com dados nas DUAS formas de chave (dashboard e
 * perfil) antes da mutation e confirma que ambas ficam invalidadas depois —
 * comportamento real de cache, não só "a função foi chamada".
 */

vi.mock("@/services/vagas.service", () => ({
    default: {
        criar: vi.fn(),
        atualizar: vi.fn(),
        remover: vi.fn(),
        alterarStatus: vi.fn(),
    },
}));

// `CardVagaEmpresa` usa <Link> do TanStack Router só para o botão "Ver
// detalhes" — irrelevante para o que este arquivo testa (cache do React
// Query). Renderizar com o router real exigiria montar um RouterProvider
// inteiro só por causa desse link; um substituto simples evita esse custo
// sem mudar nada do que está sendo verificado.
vi.mock("@tanstack/react-router", () => ({
    Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <a {...props}>{children}</a>
    ),
}));

const { default: vagasService } = await import("@/services/vagas.service");

function criarQueryClientComCachePreExistente() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Forma do dashboard (MinhasVagas.tsx).
    queryClient.setQueryData(["minhas-vagas", "Aberta", 1], { vagas: [], total: 0 });
    // Forma do preview do perfil (PerfilEmpresa.tsx) — mesmo prefixo agora.
    queryClient.setQueryData(["minhas-vagas", "perfil"], { vagas: [], total: 0 });
    return queryClient;
}

function ambasAsListasEstaoInvalidadas(queryClient: QueryClient) {
    const dashboard = queryClient.getQueryState(["minhas-vagas", "Aberta", 1]);
    const perfil = queryClient.getQueryState(["minhas-vagas", "perfil"]);
    return Boolean(dashboard?.isInvalidated) && Boolean(perfil?.isInvalidated);
}

function renderComProvider(ui: React.ReactElement, queryClient: QueryClient) {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const vagaFake: Vaga = {
    id: "vaga-1",
    titulo: "Desenvolvedor(a) Frontend",
    descricao: "Descrição da vaga de teste com mais de vinte caracteres.",
    requisitos: null,
    beneficios: null,
    salario: null,
    modalidade: "Remoto",
    contrato: "CLT",
    cidade: null,
    estado: null,
    cargaHoraria: null,
    acessibilidade: null,
    exclusivaPcd: false,
    publicoAlvo: "pcd",
    recursosAcessibilidade: [],
    status: "Aberta",
    empresaId: "empresa-1",
    totalCandidaturas: 0,
    dataPublicacao: new Date().toISOString(),
    createdAt: new Date().toISOString(),
} as Vaga;

beforeEach(() => {
    vi.clearAllMocks();
});

describe("cache de minhas vagas — criar, editar e excluir atualizam as duas telas", () => {
    it("criar vaga invalida a lista do dashboard e a do perfil", async () => {
        // Arrange
        vi.mocked(vagasService.criar).mockResolvedValue(vagaFake);
        const queryClient = criarQueryClientComCachePreExistente();
        renderComProvider(<NovaVagaDialog />, queryClient);

        // Act — abre o diálogo e envia o formulário (fireEvent.submit
        // dispara o onSubmit diretamente, sem bloqueio de campo obrigatório
        // do jsdom — o mutationFn está mockado, o conteúdo dos campos não
        // importa para este teste, só o que acontece depois do sucesso).
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));
        const formulario = document.querySelector("form");
        expect(formulario).not.toBeNull();
        fireEvent.submit(formulario as HTMLFormElement);

        // Assert
        await waitFor(() => expect(vagasService.criar).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(ambasAsListasEstaoInvalidadas(queryClient)).toBe(true));
    });

    it("editar vaga invalida a lista do dashboard e a do perfil", async () => {
        // Arrange
        vi.mocked(vagasService.atualizar).mockResolvedValue(vagaFake);
        const queryClient = criarQueryClientComCachePreExistente();
        renderComProvider(
            <EditarVagaDialog vaga={vagaFake}>
                <button type="button">Editar</button>
            </EditarVagaDialog>,
            queryClient,
        );

        // Act
        fireEvent.click(screen.getByRole("button", { name: "Editar" }));
        const formulario = document.querySelector("form");
        expect(formulario).not.toBeNull();
        fireEvent.submit(formulario as HTMLFormElement);

        // Assert
        await waitFor(() => expect(vagasService.atualizar).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(ambasAsListasEstaoInvalidadas(queryClient)).toBe(true));
    });

    it("excluir vaga invalida a lista do dashboard e a do perfil", async () => {
        // Arrange
        vi.mocked(vagasService.remover).mockResolvedValue(undefined);
        const queryClient = criarQueryClientComCachePreExistente();
        renderComProvider(
            <CardVagaEmpresa vaga={vagaFake} selecionada={false} onVerCandidaturas={() => undefined} />,
            queryClient,
        );

        // Act
        fireEvent.click(screen.getByRole("button", { name: `Excluir vaga ${vagaFake.titulo}` }));
        fireEvent.click(screen.getByRole("button", { name: "Excluir vaga" }));

        // Assert
        await waitFor(() => expect(vagasService.remover).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(ambasAsListasEstaoInvalidadas(queryClient)).toBe(true));
    });
});
