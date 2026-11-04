import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { CHAVE_DO_SIMULADOR } from "@/hooks/useProgressoDoSimulador";

/**
 * O simulador é treino: com vaga fictícia, sem criar candidatura, sem enviar nada a empresa e sem
 * ler o perfil real. O teste chega ao ponto de fazer o cliente HTTP falhar se for chamado.
 */

const { cliente } = vi.hoisted(() => ({
  cliente: {
    get: vi.fn(() => Promise.reject(new Error("O simulador NÃO pode chamar o servidor"))),
    post: vi.fn(() => Promise.reject(new Error("O simulador NÃO pode chamar o servidor"))),
    put: vi.fn(() => Promise.reject(new Error("O simulador NÃO pode chamar o servidor"))),
    patch: vi.fn(() => Promise.reject(new Error("O simulador NÃO pode chamar o servidor"))),
    delete: vi.fn(() => Promise.reject(new Error("O simulador NÃO pode chamar o servidor"))),
  },
}));

vi.mock("@/services/api", () => ({ default: cliente, clienteApi: cliente }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }));
vi.mock("@/components/acessibilidade/TextoOuvivel", () => ({ TextoOuvivel: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const { PaginaSimulador } = await import("./PaginaSimulador");

const chamadasAoServidor = () => Object.values(cliente).reduce((total, fn) => total + fn.mock.calls.length, 0);

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("é treino", () => {
  it("avisa logo no começo que a vaga é inventada, nada é enviado e nenhuma candidatura real é criada", () => {
    render(<PaginaSimulador />);

    expect(screen.getByRole("note")).toHaveTextContent(/isto é um treino/i);
    expect(screen.getByRole("note")).toHaveTextContent(/nenhuma candidatura de verdade é criada/i);
  });

  it("não há nota, aprovação nem reprovação", () => {
    render(<PaginaSimulador />);

    expect(screen.getByText(/não há nota, aprovação nem reprovação/i)).toBeInTheDocument();
  });

  it("percorre a candidatura inteira e a entrevista sem NENHUMA chamada ao servidor", () => {
    render(<PaginaSimulador />);

    fireEvent.click(screen.getAllByRole("button", { name: /^começar$/i })[0]);
    for (let i = 0; i < 6; i += 1) fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    expect(screen.getByText(/nada disto foi enviado e nenhuma candidatura de verdade foi criada/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /terminar o treino/i }));

    fireEvent.click(screen.getAllByRole("button", { name: /^começar$/i })[1]);
    fireEvent.change(screen.getByLabelText(/sua resposta/i), { target: { value: "Trabalhei dois anos em atendimento porque gosto de pessoas." } });
    for (let i = 0; i < 5; i += 1) fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));

    expect(chamadasAoServidor()).toBe(0);
  });
});

describe("simulação de candidatura", () => {
  function iniciar() {
    render(<PaginaSimulador />);
    fireEvent.click(screen.getAllByRole("button", { name: /^começar$/i })[0]);
  }

  it("começa lendo a vaga fictícia e diz em que etapa está", () => {
    iniciar();

    expect(screen.getByText("Etapa 1 de 7 — Ler a vaga")).toBeInTheDocument();
    expect(screen.getByText(/empresa fictícia/i)).toBeInTheDocument();
  });

  it("classificar um requisito explica o porquê (não pontua)", () => {
    iniciar();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));

    const planilhas = screen.getByRole("group", { name: "Conhecer planilhas" });
    fireEvent.click(planilhas.querySelectorAll("input")[0]);

    expect(screen.getAllByRole("status").some((s) => /o texto da vaga aponta para o outro lado/i.test(s.textContent ?? ""))).toBe(true);
    fireEvent.click(planilhas.querySelectorAll("input")[1]);
    expect(screen.getAllByRole("status").some((s) => /isso mesmo/i.test(s.textContent ?? ""))).toBe(true);
  });

  it("pausar guarda o progresso e continuar volta exatamente onde parou", () => {
    iniciar();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    fireEvent.change(screen.getByLabelText(/^apresentação$/i), { target: { value: "Meu texto de treino" } });

    fireEvent.click(screen.getByRole("button", { name: /pausar e continuar depois/i }));

    expect(screen.getByRole("button", { name: /continuar de onde parei/i })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /continuar de onde parei/i })[0]);

    expect(screen.getByText("Etapa 3 de 7 — Apresentação")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Meu texto de treino")).toBeInTheDocument();
  });

  it("o progresso fica só neste navegador (localStorage), nunca no servidor", () => {
    iniciar();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));

    const guardado = JSON.parse(window.localStorage.getItem(CHAVE_DO_SIMULADOR) ?? "{}");

    expect(guardado.passoCandidatura).toBe(1);
    expect(chamadasAoServidor()).toBe(0);
  });

  it("a revisão mostra a candidatura de treino e diz que nada foi enviado", () => {
    iniciar();
    for (let i = 0; i < 6; i += 1) fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));

    expect(screen.getByRole("heading", { name: /sua candidatura de treino/i })).toBeInTheDocument();
    // Apresentação e pedido de adaptação ainda em branco.
    expect(screen.getAllByText(/você não escreveu ainda/i, { selector: "dd" })).toHaveLength(2);
  });
});

describe("simulação de entrevista", () => {
  function iniciar() {
    render(<PaginaSimulador />);
    fireEvent.click(screen.getAllByRole("button", { name: /^começar$/i })[1]);
  }

  it("mostra a primeira pergunta, com orientações e exemplo para consultar", () => {
    iniciar();

    expect(screen.getByText("Etapa 1 de 6 — Fale um pouco sobre você.")).toBeInTheDocument();
    expect(screen.getByText(/orientações e um exemplo/i)).toBeInTheDocument();
    expect(screen.getByText(/invente a sua resposta/i)).toBeInTheDocument();
  });

  it("dá sugestões de melhoria sem nota e sem julgar a pessoa", () => {
    iniciar();
    fireEvent.change(screen.getByLabelText(/sua resposta/i), { target: { value: "Sou Ana." } });

    const retorno = screen.getByRole("heading", { name: /sugestões para a sua resposta/i }).closest("section")!;

    expect(retorno).toHaveTextContent(/ideias para melhorar/i);
    expect(retorno).toHaveTextContent(/isto é um treino, sem nota/i);
    expect(retorno.textContent).not.toMatch(/\d+\s*\/\s*10|\bpontos?\b|aprovad|reprovad|eliminat/i);
  });

  it("uma resposta com exemplo e motivo mostra o que já está bom", () => {
    iniciar();
    fireEvent.change(screen.getByLabelText(/sua resposta/i), {
      target: { value: "Sou a Ana e trabalhei dois anos em atendimento porque gosto de ajudar as pessoas a resolver o que precisam no balcão." },
    });

    expect(screen.getByText(/o que já está bom/i)).toBeInTheDocument();
  });

  it("pausar e continuar mantém a pergunta e a resposta", () => {
    iniciar();
    fireEvent.change(screen.getByLabelText(/sua resposta/i), { target: { value: "Resposta da primeira" } });
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /pausar e continuar depois/i }));
    // Só a entrevista tem progresso: o botão de retomar é o único.
    fireEvent.click(screen.getByRole("button", { name: /continuar de onde parei/i }));

    expect(screen.getByText(/^Etapa 2 de 6/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByDisplayValue("Resposta da primeira")).toBeInTheDocument();
  });
});

describe("recomeçar", () => {
  it("apaga o que foi escrito e volta ao começo", () => {
    render(<PaginaSimulador />);
    fireEvent.click(screen.getAllByRole("button", { name: /^começar$/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /pausar e continuar depois/i }));

    fireEvent.click(screen.getByRole("button", { name: /apagar o que escrevi e recomeçar/i }));

    expect(window.localStorage.getItem(CHAVE_DO_SIMULADOR)).toBeNull();
    expect(screen.getAllByRole("button", { name: /^começar$/i })).toHaveLength(2);
  });
});
