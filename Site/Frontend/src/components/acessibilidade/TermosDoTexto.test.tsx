import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/acessibilidade/TextoOuvivel", () => ({
  TextoOuvivel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { TermosDoTexto } = await import("./TermosDoTexto");

afterEach(cleanup);

describe("TermosDoTexto", () => {
  it("não mostra nada quando o texto não usa nenhum termo do glossário", () => {
    const { container } = render(<TermosDoTexto texto="Atender clientes e organizar arquivos." />);

    expect(container).toBeEmptyDOMElement();
  });

  it("não mostra nada com texto vazio ou ausente", () => {
    const { container, rerender } = render(<TermosDoTexto texto="" />);
    expect(container).toBeEmptyDOMElement();

    rerender(<TermosDoTexto texto={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista os termos encontrados em um bloco fechado e com a explicação", () => {
    render(<TermosDoTexto texto="Contratação CLT, modalidade presencial." />);

    const bloco = screen.getByText(/Termos deste texto \(CLT, Presencial\)/).closest("details");
    expect(bloco).not.toBeNull();
    expect(bloco).not.toHaveAttribute("open");
    expect(screen.getByText(/contrato de trabalho com carteira assinada/)).toBeInTheDocument();
  });
});
