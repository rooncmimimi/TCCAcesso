import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { PasswordInput } from "./password-input";

/**
 * Um único componente de senha com botão de mostrar e ocultar, usado no login, no cadastro, na
 * troca e na recuperação de senha.
 */

afterEach(cleanup);

describe("PasswordInput", () => {
  it("começa oculto (type=password) e alterna para texto visível ao clicar no botão", () => {
    render(<PasswordInput aria-label="Senha" />);

    const campo = screen.getByLabelText("Senha") as HTMLInputElement;
    expect(campo.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(campo.type).toBe("text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(campo.type).toBe("password");
  });

  it("o botão de alternar é alcançável por teclado (sem tabIndex negativo)", () => {
    render(<PasswordInput aria-label="Senha" />);

    const botao = screen.getByRole("button", { name: "Mostrar senha" });
    expect(botao).not.toHaveAttribute("tabindex", "-1");
  });

  it("repassa outras props para o campo (id, autoComplete, aria-invalid etc.)", () => {
    render(<PasswordInput aria-label="Nova senha" id="nova-senha" autoComplete="new-password" aria-invalid />);

    const campo = screen.getByLabelText("Nova senha");
    expect(campo).toHaveAttribute("id", "nova-senha");
    expect(campo).toHaveAttribute("autocomplete", "new-password");
    expect(campo).toHaveAttribute("aria-invalid", "true");
  });
});
