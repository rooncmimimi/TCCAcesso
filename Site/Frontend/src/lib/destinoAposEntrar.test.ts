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

  // Etapa 6: quem criou a conta direto pelo Google ainda não informou os dados pessoais.
  it("leva candidato com dados pessoais pendentes a completá-los, antes de qualquer outra etapa", () => {
    expect(destinoAposEntrar({ tipo: "candidato", cadastroConcluidoEm: null, dadosPessoaisPendentes: true })).toEqual({
      to: "/cadastro/dados",
    });
  });

  it("os dados pessoais pendentes vêm antes de retomar o cadastro", () => {
    expect(
      destinoAposEntrar({ tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z", dadosPessoaisPendentes: true }),
    ).toEqual({ to: "/cadastro/dados" });
  });

  it.each([false, undefined])("sem pendência (%j), segue como antes", (pendente) => {
    expect(destinoAposEntrar({ tipo: "candidato", cadastroConcluidoEm: null, dadosPessoaisPendentes: pendente })).toEqual({
      to: "/cadastro/candidato",
      search: { retomar: true },
    });
  });

  it.each(["empresa", "administrador"] as const)("conta de %s não é mandada para os dados de candidato", (tipo) => {
    expect(destinoAposEntrar({ tipo, cadastroConcluidoEm: null, dadosPessoaisPendentes: true }).to).not.toBe("/cadastro/dados");
  });
  // Bloco 1: verificação em duas etapas obrigatória para administradores.
  it("administrador sem a verificação configurada vai direto à configuração, antes do painel", () => {
    expect(destinoAposEntrar({ tipo: "administrador", cadastroConcluidoEm: null, mfaExigido: true, mfaConfigurado: false })).toEqual({
      to: "/configurar-verificacao",
    });
  });

  it("administrador com a verificação configurada vai ao painel", () => {
    expect(destinoAposEntrar({ tipo: "administrador", cadastroConcluidoEm: null, mfaExigido: true, mfaConfigurado: true })).toEqual({ to: "/admin" });
  });

  it.each([[undefined, undefined], [false, false], [false, undefined]])(
    "recurso desligado ou servidor antigo (exigido=%j, configurado=%j): o painel, como antes",
    (exigido, configurado) => {
      expect(destinoAposEntrar({ tipo: "administrador", cadastroConcluidoEm: null, mfaExigido: exigido, mfaConfigurado: configurado })).toEqual({ to: "/admin" });
    },
  );

  it("candidato nunca é levado à configuração obrigatória", () => {
    expect(destinoAposEntrar({ tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z", mfaExigido: true, mfaConfigurado: false })).toEqual({ to: "/feed" });
  });
});
