import { describe, it, expect, afterEach, vi } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

import clienteApi from "@/services/api";
import { definirIdioma } from "@/i18n";

/** Toda chamada à API leva o idioma da interface em `Accept-Language`; o servidor escreve nele os erros e avisos. */

const cabecalhosEnviados: Array<string | undefined> = [];

const adaptadorFalso: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    cabecalhosEnviados.push(String(config.headers.get("Accept-Language") ?? ""));
    return { data: {}, status: 200, statusText: "OK", headers: {}, config };
};

afterEach(() => {
    definirIdioma("pt", "conta");
    cabecalhosEnviados.length = 0;
    vi.restoreAllMocks();
});

describe("Accept-Language", () => {
    it.each(["pt", "en", "es"] as const)("envia %s quando a interface está nesse idioma", async (idioma) => {
        definirIdioma(idioma, "conta");

        await clienteApi.get("/qualquer", { adapter: adaptadorFalso });

        expect(cabecalhosEnviados).toEqual([idioma]);
    });

    it("acompanha a troca de idioma sem recarregar a página", async () => {
        definirIdioma("en", "conta");
        await clienteApi.get("/a", { adapter: adaptadorFalso });

        definirIdioma("es");
        await clienteApi.get("/b", { adapter: adaptadorFalso });

        expect(cabecalhosEnviados).toEqual(["en", "es"]);
    });
});
