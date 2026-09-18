import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { NovaVagaDialog } from "./NovaVagaDialog";
import { EditarVagaDialog } from "./EditarVagaDialog";
import { VagaEmpresaCard } from "./VagaEmpresaCard";
import type { Vaga } from "@/types";

/**
 * O dashboard (`MinhasVagas.tsx`, chave `["minhas-vagas", status, pagina]`) e a prévia do perfil da
 * empresa (`PerfilEmpresa.tsx`, `["minhas-vagas", "perfil"]`) mostram o mesmo recurso
 * (`GET /vagas/minhas`) e compartilham o prefixo. Cada teste preenche o cache nas duas formas antes
 * da mutation e confere que ambas foram invalidadas: testa o cache de verdade, e não só que a
 * função foi chamada.
 */

vi.mock("@/services/vagas.service", () => ({
    default: {
        criar: vi.fn(),
        atualizar: vi.fn(),
        remover: vi.fn(),
        alterarStatus: vi.fn(),
    },
}));

// `VagaEmpresaCard` usa <Link> do TanStack Router só para o botão "Ver
// detalhes": irrelevante para o que este arquivo testa (cache do React
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
    queryClient.setQueryData(["minhas-vagas", "aberta", 1], { vagas: [], total: 0 });
    // Forma da prévia do perfil (PerfilEmpresa.tsx), com o mesmo prefixo.
    queryClient.setQueryData(["minhas-vagas", "perfil"], { vagas: [], total: 0 });
    return queryClient;
}

function ambasAsListasEstaoInvalidadas(queryClient: QueryClient) {
    const dashboard = queryClient.getQueryState(["minhas-vagas", "aberta", 1]);
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
    modalidade: "remoto",
    contrato: "clt",
    cidade: null,
    estado: null,
    cargaHoraria: null,
    acessibilidade: null,
    publicoAlvo: "pcd",
    recursosAcessibilidade: [],
    status: "aberta",
    empresaId: "empresa-1",
    totalCandidaturas: 0,
    criadoEm: new Date().toISOString(),
} as Vaga;

beforeEach(() => {
    vi.clearAllMocks();
});

describe("cache de minhas vagas — criar, editar e excluir atualizam as duas telas", () => {
    it("criar vaga invalida a lista do dashboard e a do perfil", async () => {
        vi.mocked(vagasService.criar).mockResolvedValue(vagaFake);
        const queryClient = criarQueryClientComCachePreExistente();
        renderComProvider(<NovaVagaDialog />, queryClient);

        // Abre o diálogo e envia o formulário. `fireEvent.submit` chama o `onSubmit` direto, sem a
        // validação de campos obrigatórios do jsdom: o `mutationFn` está mockado e só importa o que
        // acontece depois do sucesso.
        fireEvent.click(screen.getByRole("button", { name: "Nova vaga" }));
        const formulario = document.querySelector("form");
        expect(formulario).not.toBeNull();
        fireEvent.submit(formulario as HTMLFormElement);

        await waitFor(() => expect(vagasService.criar).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(ambasAsListasEstaoInvalidadas(queryClient)).toBe(true));
    });

    it("editar vaga invalida a lista do dashboard e a do perfil", async () => {
        vi.mocked(vagasService.atualizar).mockResolvedValue(vagaFake);
        const queryClient = criarQueryClientComCachePreExistente();
        renderComProvider(
            <EditarVagaDialog vaga={vagaFake}>
                <button type="button">Editar</button>
            </EditarVagaDialog>,
            queryClient,
        );

        fireEvent.click(screen.getByRole("button", { name: "Editar" }));
        const formulario = document.querySelector("form");
        expect(formulario).not.toBeNull();
        fireEvent.submit(formulario as HTMLFormElement);

        await waitFor(() => expect(vagasService.atualizar).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(ambasAsListasEstaoInvalidadas(queryClient)).toBe(true));
    });

    it("excluir vaga invalida a lista do dashboard e a do perfil", async () => {
        vi.mocked(vagasService.remover).mockResolvedValue(undefined);
        const queryClient = criarQueryClientComCachePreExistente();
        renderComProvider(
            <VagaEmpresaCard vaga={vagaFake} selecionada={false} onVerCandidaturas={() => undefined} />,
            queryClient,
        );

        fireEvent.click(screen.getByRole("button", { name: `Excluir vaga ${vagaFake.titulo}` }));
        fireEvent.click(screen.getByRole("button", { name: "Excluir vaga" }));

        await waitFor(() => expect(vagasService.remover).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(ambasAsListasEstaoInvalidadas(queryClient)).toBe(true));
    });
});
