import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Importar o currículo pelo perfil: o que o servidor conseguiu ler precisa chegar preenchido à revisão.
 * A janela deixava cargo, empresa, datas e curso sempre em branco, e esses itens eram descartados ao
 * salvar por falta de campo obrigatório.
 */

const { importar } = vi.hoisted(() => ({ importar: vi.fn() }));

vi.mock("@/services/perfil.service", () => ({ perfilService: { importarCurriculo: importar } }));

const { ImportarCurriculoDialog } = await import("./ImportarCurriculoDialog");

afterEach(cleanup);

const rascunho = {
  email: null,
  telefone: null,
  linkedin: null,
  github: null,
  resumo: null,
  habilidades: [],
  aviso: "",
  experiencias: [
    { cargo: "Analista de Marketing", empresa: "Empresa Exemplo", dataInicio: "2020-01-01", dataFim: "2024-01-01", atual: true, descricaoSugerida: "Campanhas." },
  ],
  formacoes: [
    { instituicao: "Universidade Exemplo", curso: "Administração", dataFim: "2019-12-01", emAndamento: false, descricaoSugerida: "" },
  ],
};

describe("ImportarCurriculoDialog", () => {
  it("preenche a revisão com o que o servidor leu; emprego atual fica sem data de fim", async () => {
    importar.mockResolvedValue(rascunho);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ImportarCurriculoDialog candidatoId="c1">
          <button type="button">abrir</button>
        </ImportarCurriculoDialog>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "abrir" }));

    const campo = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(campo, { target: { files: [new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" })] } });

    expect(await screen.findByDisplayValue("Analista de Marketing")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Empresa Exemplo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2020-01-01")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("2024-01-01")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Universidade Exemplo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Administração")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2019-12-01")).toBeInTheDocument();
  });
});
