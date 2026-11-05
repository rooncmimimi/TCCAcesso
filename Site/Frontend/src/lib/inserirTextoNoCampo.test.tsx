import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { inserirTextoNoCampo } from "@/lib/inserirTextoNoCampo";

afterEach(cleanup);

function Controlado() {
  const [v, setV] = useState("Olá");

  return (
    <>
      <textarea id="campo" aria-label="campo" value={v} maxLength={20} onChange={(e) => setV(e.target.value)} />
      <p data-testid="estado">{v}</p>
    </>
  );
}

describe("inserirTextoNoCampo", () => {
  it("acrescenta ao fim e um campo controlado do React percebe a mudança", () => {
    render(<Controlado />);

    expect(inserirTextoNoCampo("campo", "tudo bem")).toBe(true);
    expect(screen.getByTestId("estado").textContent).toBe("Olá tudo bem");
    expect((screen.getByLabelText("campo") as HTMLTextAreaElement).value).toBe("Olá tudo bem");
  });

  it("respeita o limite de caracteres do campo", () => {
    render(<Controlado />);

    inserirTextoNoCampo("campo", "um texto bem comprido que não cabe");

    expect(screen.getByTestId("estado").textContent).toHaveLength(20);
  });

  it("em campo vazio não põe espaço no começo; em campo não controlado também funciona", () => {
    document.body.innerHTML = `<textarea id="solto"></textarea>`;

    expect(inserirTextoNoCampo("solto", "primeira frase")).toBe(true);
    expect((document.getElementById("solto") as HTMLTextAreaElement).value).toBe("primeira frase");
  });

  it("dispara o evento input (formulários com rascunho e FormData percebem)", () => {
    document.body.innerHTML = `<textarea id="solto"></textarea>`;

    let avisos = 0;

    document.getElementById("solto")!.addEventListener("input", () => (avisos += 1));
    inserirTextoNoCampo("solto", "x");

    expect(avisos).toBe(1);
  });

  it("campo que não existe ou não é de texto: devolve falso e não quebra", () => {
    document.body.innerHTML = `<div id="d"></div>`;

    expect(inserirTextoNoCampo("nao-existe", "x")).toBe(false);
    expect(inserirTextoNoCampo("d", "x")).toBe(false);
  });
});
