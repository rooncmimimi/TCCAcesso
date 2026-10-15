import { describe, it, expect } from "vitest";

import { destinoAposEntrar } from "./destinoAposEntrar";

describe("destinoAposEntrar", () => {
  it("leva candidato com cadastro concluído ao feed", () => {
    expect(destinoAposEntrar({ tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z" })).toEqual({ to: "/feed" });
  });

  it.each([null, undefined, ""])("leva candidato com cadastro por terminar (%j) a retomá-lo", (valor) => {
    expect(destinoAposEntrar({ tipo: "candidato", cadastroConcluidoEm: valor })).toEqual({
      to: "/cadastro/candidato",
      search: { retomar: true },
    });
  });

  it("leva o administrador ao painel, mesmo sem data de cadastro concluído", () => {
    expect(destinoAposEntrar({ tipo: "administrador", cadastroConcluidoEm: null })).toEqual({ to: "/admin" });
  });

  it("leva a empresa ao feed, mesmo sem data de cadastro concluído (o cadastro de empresa é outro fluxo)", () => {
    expect(destinoAposEntrar({ tipo: "empresa", cadastroConcluidoEm: null })).toEqual({ to: "/feed" });
  });
});
