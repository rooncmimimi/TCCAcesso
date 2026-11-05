import { describe, expect, it } from "vitest";

import { PREFERENCIAS_PADRAO } from "@/contexts/AcessibilidadeContext";
import { normalizarPreferencias } from "@/lib/preferenciasMotoras";

describe("normalizarPreferencias", () => {
  it("sem nada salvo, devolve o padrão", () => {
    expect(normalizarPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
    expect(normalizarPreferencias(undefined)).toEqual(PREFERENCIAS_PADRAO);
  });

  it("preferências antigas (sem as novas) ganham o padrão das novas e mantêm as velhas", () => {
    const r = normalizarPreferencias({ darkMode: true, fontScale: 1.2 });

    expect(r.darkMode).toBe(true);
    expect(r.fontScale).toBe(1.2);
    expect(r.scanSpeed).toBe(PREFERENCIAS_PADRAO.scanSpeed);
    expect(r.shortcuts).toBe(true);
    expect(r.scanning).toBe(false);
  });

  it("mantém valores válidos", () => {
    const r = normalizarPreferencias({ scanning: true, scanSpeed: 3, scanKey: "F8", tremorGuard: true, tremorDelay: 1200, targetSize: "maior", scanGroups: false, shortcuts: false });

    expect(r).toMatchObject({ scanning: true, scanSpeed: 3, scanKey: "F8", tremorGuard: true, tremorDelay: 1200, targetSize: "maior", scanGroups: false, shortcuts: false });
  });

  it("corta números fora da faixa e descarta tipos errados", () => {
    const r = normalizarPreferencias({ scanSpeed: 99, tremorDelay: 5, scanKey: 42 as never, targetSize: "gigante" as never, scanning: "sim" as never, shortcuts: 1 as never });

    expect(r.scanSpeed).toBe(5);
    expect(r.tremorDelay).toBe(300);
    expect(r.scanKey).toBe("");
    expect(r.targetSize).toBe("padrao");
    expect(r.scanning).toBe(false);
    expect(r.shortcuts).toBe(true);
  });

  it("NaN e Infinity voltam ao padrão", () => {
    expect(normalizarPreferencias({ scanSpeed: Number.NaN }).scanSpeed).toBe(PREFERENCIAS_PADRAO.scanSpeed);
    expect(normalizarPreferencias({ tremorDelay: Number.POSITIVE_INFINITY }).tremorDelay).toBe(PREFERENCIAS_PADRAO.tremorDelay);
  });
});
