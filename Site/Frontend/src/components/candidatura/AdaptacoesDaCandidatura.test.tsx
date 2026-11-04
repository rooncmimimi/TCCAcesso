import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AdaptacoesDaEmpresa, AdaptacoesDoCandidato } from "@/types/adaptacoes";

/**
 * As duas pontas da autorização: a empresa vê só a cópia e responde; a pessoa vê o que autorizou,
 * pode retirar (com a ressalva honesta) e não altera uma candidatura encerrada. Servidor simulado.
 */

const { servico, servicoMinha, toast } = vi.hoisted(() => ({
  servico: { responder: vi.fn(), retirar: vi.fn(), previa: vi.fn(), editar: vi.fn() },
  servicoMinha: { catalogo: vi.fn(), obter: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/adaptacoes.service", () => ({ candidaturaAdaptacoesService: servico, minhaAcessibilidadeService: servicoMinha }));
vi.mock("sonner", () => ({ toast }));

const { AdaptacoesPedidasEmpresa } = await import("./AdaptacoesPedidasEmpresa");
const { AdaptacoesDaMinhaCandidatura } = await import("./AdaptacoesDaMinhaCandidatura");

const itens = {
  adaptacoes: [{ chave: "legendas", rotulo: "Legendas em vídeos e chamadas" }, { chave: "tempo_adicional", rotulo: "Tempo adicional" }],
  outra: "Preciso das perguntas por escrito",
};

const paraEmpresa = (extra: Partial<AdaptacoesDaEmpresa> = {}): AdaptacoesDaEmpresa => ({
  versao: 1, finalidade: "processo_seletivo", autorizadoEm: "2026-11-01T12:00:00Z", itens, resposta: null, respostaMensagem: null, respondidoEm: null, ...extra,
});

const paraCandidato = (extra: Partial<AdaptacoesDoCandidato> = {}): AdaptacoesDoCandidato => ({
  estado: "ativa", versao: 1, finalidade: "processo_seletivo", autorizadoEm: "2026-11-01T12:00:00Z", retiradoEm: null, totalItens: 3, itens, resposta: null, respostaMensagem: null, respondidoEm: null, ...extra,
});

const comCliente = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  servicoMinha.catalogo.mockResolvedValue({ grupos: [], adaptacoes: [], canaisPreferidos: [], canaisAEvitar: [], respostasDaEmpresa: [], termoVersao: "x" });
  servicoMinha.obter.mockResolvedValue({ adaptacoes: [], observacao: null, comunicacao: { canaisPreferidos: [], canaisAEvitar: [], melhorHorario: null, observacao: null }, privacidade: { exibirDeficienciaNoPerfil: false }, deficiencias: [] });
});

afterEach(cleanup);

describe("a empresa", () => {
  it("vê exatamente o que foi autorizado, com o aviso de uso só para o processo seletivo", () => {
    comCliente(<AdaptacoesPedidasEmpresa candidaturaId="cd-1" nome="Ana" adaptacoes={paraEmpresa()} />);

    expect(screen.getByRole("heading", { name: /pedido de adaptação de ana/i })).toBeInTheDocument();
    expect(screen.getByText("Legendas em vídeos e chamadas")).toBeInTheDocument();
    expect(screen.getByText("Tempo adicional")).toBeInTheDocument();
    expect(screen.getByText(/preciso das perguntas por escrito/i)).toBeInTheDocument();
    expect(screen.getByText(/só nesta candidatura e só para o processo seletivo/i)).toBeInTheDocument();
  });

  it("oferece as quatro respostas e só envia com uma escolhida", async () => {
    servico.responder.mockResolvedValue(paraEmpresa({ resposta: "podemos_providenciar" }));
    comCliente(<AdaptacoesPedidasEmpresa candidaturaId="cd-1" nome="Ana" adaptacoes={paraEmpresa()} />);

    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("button", { name: /enviar resposta/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /podemos providenciar/i }));
    fireEvent.change(screen.getByLabelText(/mensagem \(opcional\)/i), { target: { value: "Teremos intérprete." } });
    fireEvent.click(screen.getByRole("button", { name: /enviar resposta/i }));

    await waitFor(() => expect(servico.responder).toHaveBeenCalledWith("cd-1", "podemos_providenciar", "Teremos intérprete."));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("mostra a resposta já dada e deixa atualizá-la", () => {
    comCliente(<AdaptacoesPedidasEmpresa candidaturaId="cd-1" nome="Ana" adaptacoes={paraEmpresa({ resposta: "precisamos_verificar", respostaMensagem: "Vamos ver." })} />);

    expect(screen.getByRole("radio", { name: /precisamos verificar/i })).toBeChecked();
    expect(screen.getByRole("button", { name: /atualizar resposta/i })).toBeInTheDocument();
    expect(screen.getByText(/última resposta enviada: precisamos verificar/i)).toBeInTheDocument();
  });
});

describe("a pessoa candidata", () => {
  function renderizar(adaptacoes: AdaptacoesDoCandidato, podeAlterar = true) {
    return comCliente(<AdaptacoesDaMinhaCandidatura candidaturaId="cd-1" vagaId="v1" tituloDaVaga="Analista" adaptacoes={adaptacoes} podeAlterar={podeAlterar} />);
  }

  it("vê a lista exata do que compartilhou e a resposta da empresa", () => {
    renderizar(paraCandidato({ resposta: "podemos_oferecer", respostaMensagem: "Sem problema." }));

    expect(screen.getByText("Legendas em vídeos e chamadas")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/resposta da empresa:\s*podemos oferecer essa adaptação\.\s*“sem problema\.”/i);
  });

  it("sem resposta, diz que a empresa ainda não respondeu", () => {
    renderizar(paraCandidato());

    expect(screen.getByText(/ainda não respondeu/i)).toBeInTheDocument();
  });

  it("retirar pede confirmação, avisa que o que já foi lido não se desfaz, e só então chama o servidor", async () => {
    servico.retirar.mockResolvedValue(paraCandidato({ estado: "retirada", itens: null }));
    renderizar(paraCandidato());

    fireEvent.click(screen.getByRole("button", { name: /retirar autorização/i }));

    expect(await screen.findByText(/o que já tiver lido|se ela já tiver lido ou copiado/i)).toBeInTheDocument();
    expect(servico.retirar).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: /retirar autorização/i }).at(-1)!);

    await waitFor(() => expect(servico.retirar).toHaveBeenCalledWith("cd-1"));
  });

  it("depois de retirada, mostra só o registro mínimo e nenhum item", () => {
    renderizar(paraCandidato({ estado: "retirada", itens: null, retiradoEm: "2026-11-02T10:00:00Z" }));

    expect(screen.getByText(/você retirou/i)).toBeInTheDocument();
    expect(screen.getByText(/a empresa não pode mais consultá-las/i)).toBeInTheDocument();
    expect(screen.queryByText("Legendas em vídeos e chamadas")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /alterar o que compartilho/i })).not.toBeInTheDocument();
  });

  it("candidatura encerrada: vê o que compartilhou, mas não altera nem retira por aqui", () => {
    renderizar(paraCandidato(), false);

    expect(screen.getByText("Tempo adicional")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /alterar o que compartilho/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retirar autorização/i })).not.toBeInTheDocument();
  });

  it("alterar abre o diálogo de edição", async () => {
    renderizar(paraCandidato());

    fireEvent.click(screen.getByRole("button", { name: /alterar o que compartilho/i }));

    expect(await screen.findByRole("heading", { name: /alterar o que compartilho: analista/i })).toBeInTheDocument();
  });
});
