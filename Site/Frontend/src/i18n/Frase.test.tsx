import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Frase } from "./Frase";
import { montarFrase } from "./montarFrase";
import { DICIONARIOS } from "./dicionarios";

describe("montarFrase", () => {
  it("devolve o texto inteiro quando não há marca", () => {
    const pedacos = montarFrase("Nada para montar aqui.", []);

    expect(pedacos).toHaveLength(1);
  });

  it("separa o antes, o conteúdo da marca e o depois", () => {
    const vistos: string[] = [];

    montarFrase("Abra uma <1>vaga</1> para se candidatar.", [
      (texto) => {
        vistos.push(texto);

        return texto;
      },
    ]);

    expect(vistos).toEqual(["vaga"]);
  });

  it("aceita a marca em outra posição da frase, que é o motivo de isto existir", () => {
    const ordem: string[] = [];
    const partes = [
      (texto: string) => {
        ordem.push(`um:${texto}`);

        return texto;
      },
      (texto: string) => {
        ordem.push(`dois:${texto}`);

        return texto;
      },
    ];

    montarFrase("<2>Depois</2> vem <1>antes</1>.", partes);

    expect(ordem).toEqual(["dois:Depois", "um:antes"]);
  });

  it("não perde o texto de uma marca sem parte correspondente", () => {
    const { container } = render(<p>{montarFrase("Fica <9>visível</9> assim.", [])}</p>);

    expect(container.textContent).toBe("Fica visível assim.");
  });

  it("monta duas vezes o mesmo texto sem embaralhar (o regex guarda estado)", () => {
    const primeira = render(<p>{montarFrase("Um <1>link</1> aqui.", [(t) => t])}</p>).container.textContent;
    const segunda = render(<p>{montarFrase("Um <1>link</1> aqui.", [(t) => t])}</p>).container.textContent;

    expect(segunda).toBe(primeira);
    expect(primeira).toBe("Um link aqui.");
  });
});

describe("Frase", () => {
  it("renderiza a parte como elemento de verdade, no lugar que o texto manda", () => {
    render(
      <p>
        <Frase chave="perfil.formularioRecursoDialog.camposObrigatorios" partes={[(texto) => <a href="/vagas">{texto}</a>]} />
      </p>,
    );

    // A marca `<1>asterisco</1>` virou o elemento que `partes[0]` devolveu, no meio da frase.
    const parte = screen.getByText("asterisco");

    expect(parte.tagName).toBe("A");
    expect(parte.parentElement?.textContent).toContain("são obrigatórios");
  });

  it("preenche as variáveis antes de separar as marcas", () => {
    const { container } = render(<p>{montarFrase("Enviamos para alguem@exemplo.com <1>um link</1>.", [(t) => t])}</p>);

    expect(container.textContent).toContain("alguem@exemplo.com");
  });
});

describe("as marcas do dicionário", () => {
  it("cada chave com marca tem as mesmas marcas nos três idiomas", () => {
    const marcasDe = (texto: string) => [...texto.matchAll(/<(\d+)>/g)].map((m) => m[1]).sort();
    const comMarca = Object.entries(DICIONARIOS.pt).filter(([, valor]) => /<\d+>/.test(valor));

    expect(comMarca.length).toBeGreaterThan(0);

    for (const [chave, pt] of comMarca) {
      const esperadas = marcasDe(pt);

      for (const idioma of ["en", "es"] as const) {
        const valor = DICIONARIOS[idioma][chave as keyof typeof DICIONARIOS.pt];

        expect(marcasDe(valor), `${chave} em ${idioma}`).toEqual(esperadas);
      }
    }
  });

  it("toda marca aberta é fechada", () => {
    for (const [idioma, dicionario] of Object.entries(DICIONARIOS)) {
      for (const [chave, valor] of Object.entries(dicionario)) {
        for (const abertura of valor.matchAll(/<(\d+)>/g)) {
          expect(valor, `${chave} em ${idioma}`).toContain(`</${abertura[1]}>`);
        }
      }
    }
  });
});
