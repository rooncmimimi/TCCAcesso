import { describe, expect, it } from "vitest";

import { casaCom, explicacaoDaPagina, EXPLICACOES } from "./explicacoesPaginas";

describe("casaCom", () => {
  it("compara o caminho inteiro, ignorando barra final, consulta e âncora", () => {
    expect(casaCom("/vagas", "/vagas")).toBe(true);
    expect(casaCom("/vagas", "/vagas/")).toBe(true);
    expect(casaCom("/vagas", "/vagas?cidade=sp#topo")).toBe(true);
    expect(casaCom("/vagas", "/vaga")).toBe(false);
    expect(casaCom("/vagas", "/vagas/extra")).toBe(false);
  });

  it(":id vale por um trecho, mas não por trecho vazio nem por vários", () => {
    expect(casaCom("/vaga/:id", "/vaga/abc-123")).toBe(true);
    expect(casaCom("/vaga/:id", "/vaga/")).toBe(false);
    expect(casaCom("/vaga/:id", "/vaga")).toBe(false);
    expect(casaCom("/vaga/:id", "/vaga/abc/editar")).toBe(false);
  });

  it("* no fim vale pelo resto, mas só se houver algo depois", () => {
    expect(casaCom("/cadastro/*", "/cadastro/candidato")).toBe(true);
    expect(casaCom("/cadastro/*", "/cadastro/candidato/dados")).toBe(true);
    expect(casaCom("/cadastro/*", "/cadastro")).toBe(false);
  });

  it("a raiz casa só com a raiz", () => {
    expect(casaCom("/", "/")).toBe(true);
    expect(casaCom("/", "")).toBe(true);
    expect(casaCom("/", "/vagas")).toBe(false);
  });
});

describe("explicacaoDaPagina", () => {
  it.each([
    ["/", "Página inicial"],
    ["/entrar", "Entrar"],
    ["/cadastro", "Criar conta"],
    ["/cadastro/candidato", "Criar conta"],
    ["/vagas", "Vagas"],
    ["/vaga/9f2c", "Detalhes da vaga"],
    ["/feed", "Publicações"],
    ["/dashboard/candidato", "Painel da pessoa candidata"],
    ["/dashboard/empresa", "Painel da empresa"],
    ["/perfil", "Meu perfil"],
    ["/perfil/u-1", "Perfil"],
    ["/configuracoes/acessibilidade", "Configurações de acessibilidade"],
    ["/configuracoes/senha", "Configurações"],
    ["/configuracoes", "Configurações"],
  ])("%s é explicada como %s", (caminho, nome) => {
    expect(explicacaoDaPagina(caminho)?.nome).toBe(nome);
  });

  it("a explicação específica vence a genérica (acessibilidade antes de configurações)", () => {
    expect(explicacaoDaPagina("/configuracoes/acessibilidade")?.texto).toContain("régua de leitura");
  });

  it("página desconhecida não ganha explicação inventada", () => {
    expect(explicacaoDaPagina("/rota-que-nao-existe")).toBeNull();
    expect(explicacaoDaPagina("/admin/usuarios")).toBeNull();
  });

  it("todas as explicações têm nome e texto completos", () => {
    for (const e of EXPLICACOES) {
      expect(e.nome.length, e.padrao).toBeGreaterThan(2);
      expect(e.texto.trim().endsWith("."), e.padrao).toBe(true);
    }
  });
});
