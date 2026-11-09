import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * O campo de descrição de imagem: o botão "Descrever com IA" só aparece quando o servidor diz que
 * o recurso está configurado, e a sugestão é pedida no idioma do Site.
 *
 * Antes, o botão aparecia sempre: sem a chave da OpenRouter, a pessoa clicava e recebia um erro.
 */

const { servico } = vi.hoisted(() => ({
  servico: { sugerirDescricao: vi.fn(), sugestaoDeDescricaoDisponivel: vi.fn() },
}));

vi.mock("@/services/postagens.service", () => ({ postagensService: servico }));
vi.mock("@/services/api", () => ({
  extrairMensagemErro: (erro: unknown, padrao: string) => (erro as Error)?.message ?? padrao,
}));
vi.mock("@/hooks/useVoz", () => ({ useVoz: () => ({ falar: vi.fn() }) }));
vi.mock("@/hooks/useAcessibilidade", () => ({
  useAcessibilidade: () => ({ preferencias: { screenReader: false } }),
}));

const { CampoDescricaoImagem } = await import("./CampoDescricaoImagem");

const IMAGEM = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "foto.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.resetAllMocks();
  servico.sugestaoDeDescricaoDisponivel.mockResolvedValue(true);
});

afterEach(cleanup);

function renderizar(aoMudar = vi.fn()) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={cliente}>
      <CampoDescricaoImagem
        id="descricao-teste"
        value=""
        onChange={aoMudar}
        obterImagem={() => Promise.resolve(IMAGEM)}
      />
    </QueryClientProvider>,
  );

  return aoMudar;
}

describe("CampoDescricaoImagem: quando a IA não está configurada", () => {
  it("não oferece o botão, e vai direto para o campo de escrever", async () => {
    servico.sugestaoDeDescricaoDisponivel.mockResolvedValue(false);
    renderizar();

    expect(await screen.findByLabelText(/Descrição da imagem/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Descrever com IA/i })).not.toBeInTheDocument();
  });

  it("nem o atalho de voltar para a IA dentro do modo manual", async () => {
    servico.sugestaoDeDescricaoDisponivel.mockResolvedValue(false);
    renderizar();

    await screen.findByLabelText(/Descrição da imagem/i);
    expect(screen.queryByRole("button", { name: /Descrever com IA em vez disso/i })).not.toBeInTheDocument();
  });
});

describe("CampoDescricaoImagem: quando a IA está configurada", () => {
  it("oferece as duas formas com o mesmo peso", async () => {
    renderizar();

    expect(await screen.findByRole("button", { name: /Descrever com IA/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Escrever minha própria descrição/i })).toBeInTheDocument();
  });

  it("avisa que a imagem vai a um serviço externo, nomeando o botão", async () => {
    renderizar();

    expect(await screen.findByText(/serviço externo gratuito \(OpenRouter\)/i)).toBeInTheDocument();
  });

  it("pede a descrição no idioma do Site e devolve o texto para revisão", async () => {
    servico.sugerirDescricao.mockResolvedValue("Uma pessoa em cadeira de rodas ao lado de uma mesa.");
    const aoMudar = renderizar();

    fireEvent.click(await screen.findByRole("button", { name: /Descrever com IA/i }));

    await waitFor(() =>
      expect(servico.sugerirDescricao).toHaveBeenCalledWith(IMAGEM, "pt"),
    );
    expect(aoMudar).toHaveBeenCalledWith("Uma pessoa em cadeira de rodas ao lado de uma mesa.");
    expect(await screen.findByText(/revise antes de confirmar/i)).toBeInTheDocument();
  });

  it("quando a sugestão falha, mostra o motivo e deixa escrever à mão", async () => {
    servico.sugerirDescricao.mockRejectedValue(new Error("Limite de uso do serviço de sugestão foi atingido."));
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: /Descrever com IA/i }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(/Limite de uso do serviço de sugestão/i);
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Escrever minha própria descrição/i })).toBeInTheDocument();
  });
});
