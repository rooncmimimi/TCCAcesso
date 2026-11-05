import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CatalogoDeAdaptacoes, EscolhaDeCompartilhamento, MinhaAcessibilidade, PreviaDaCandidatura } from "@/types/adaptacoes";

/**
 * A candidatura em etapas: rascunho no servidor, nada compartilhado por padrão, prévia exata do que a
 * empresa recebe, autorização explícita antes do envio. O servidor é simulado; o que se confere aqui é
 * o que a tela manda e o que ela exige.
 */

const { servicoAdaptacoes, servicoMinha, servicoVagas, servicoAmbiente, toast } = vi.hoisted(() => ({
  servicoAdaptacoes: {
    obterRascunho: vi.fn(),
    salvarRascunho: vi.fn(),
    descartarRascunho: vi.fn(),
    previa: vi.fn(),
    enviar: vi.fn(),
  },
  servicoMinha: { catalogo: vi.fn(), obter: vi.fn() },
  servicoVagas: { detalhar: vi.fn() },
  servicoAmbiente: { catalogo: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/adaptacoes.service", () => ({ candidaturaAdaptacoesService: servicoAdaptacoes, minhaAcessibilidadeService: servicoMinha }));
vi.mock("@/services/vagas.service", () => ({ default: servicoVagas, vagasService: servicoVagas }));
vi.mock("@/services/ambiente.service", () => ({ ambienteService: servicoAmbiente }));
vi.mock("sonner", () => ({ toast }));

const { CandidaturaDialog, ESPERA_DO_RASCUNHO_NO_SERVIDOR_MS } = await import("./CandidaturaDialog");

const CATALOGO: CatalogoDeAdaptacoes = {
  grupos: [{ chave: "comunicacao", rotulo: "Comunicação" }, { chave: "aprendizagem", rotulo: "Aprendizagem" }],
  adaptacoes: [
    { chave: "legendas", grupo: "comunicacao", rotulo: "Legendas em vídeos e chamadas" },
    { chave: "tempo_adicional", grupo: "aprendizagem", rotulo: "Tempo adicional" },
  ],
  canaisPreferidos: [{ chave: "chat", rotulo: "Chat" }],
  canaisAEvitar: [{ chave: "ligacao", rotulo: "Ligações telefônicas" }],
  respostasDaEmpresa: [],
  termoVersao: "adaptacoes-2026-11",
};

const PERFIL: MinhaAcessibilidade = {
  adaptacoes: ["legendas"],
  observacao: "Prefiro frases curtas",
  comunicacao: { canaisPreferidos: ["chat"], canaisAEvitar: [], melhorHorario: null, observacao: null },
  privacidade: { exibirDeficienciaNoPerfil: false },
  deficiencias: [{ id: "d1", nome: "Deficiência auditiva" }],
};

function previaPara(escolha: EscolhaDeCompartilhamento): PreviaDaCandidatura {
  const itens = escolha.adaptacoes.length ? { adaptacoes: escolha.adaptacoes.map((chave) => ({ chave, rotulo: CATALOGO.adaptacoes.find((a) => a.chave === chave)!.rotulo })) } : {};

  return {
    vaga: { id: "v1", titulo: "Analista", empresa: "Acme" },
    dadosProfissionais: { nome: "Ana", emailDeContato: "ana@exemplo.com", tituloProfissional: "Analista", cidade: "SP", estado: "SP", escolaridade: null, biografia: true, experiencias: 2, formacoes: 1, habilidades: 3, curriculo: "cv.pdf" },
    adaptacoes: { itens, total: escolha.adaptacoes.length },
    naoCompartilhado: ["CPF", "Endereço e CEP"],
    termoVersao: CATALOGO.termoVersao,
  };
}

const aoFechar = vi.fn();
const aoEnviar = vi.fn();

function renderizar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <CandidaturaDialog vaga={{ id: "v1", titulo: "Analista" }} aberto aoFechar={aoFechar} aoEnviar={aoEnviar} />
    </QueryClientProvider>,
  );
}

const etapa = (n: number, titulo: string) => screen.findByText(`Etapa ${n} de 3 — ${titulo}`);

/** Espera a etapa 1 já carregada (o botão Continuar só habilita depois que catálogo, perfil e rascunho chegaram). */
const comecar = async () => {
  await etapa(1, "Mensagem");
  await screen.findByLabelText(/mensagem para a empresa/i);
};

beforeEach(() => {
  vi.clearAllMocks();
  servicoMinha.catalogo.mockResolvedValue(CATALOGO);
  servicoMinha.obter.mockResolvedValue(PERFIL);
  servicoAdaptacoes.obterRascunho.mockResolvedValue(null);
  servicoAdaptacoes.salvarRascunho.mockResolvedValue({ id: "r1" });
  servicoAdaptacoes.descartarRascunho.mockResolvedValue(undefined);
  servicoAdaptacoes.previa.mockImplementation(async (_vaga: string, escolha: EscolhaDeCompartilhamento) => previaPara(escolha));
  servicoAdaptacoes.enviar.mockResolvedValue({ id: "cd-1" });
  servicoVagas.detalhar.mockResolvedValue({ id: "v1", titulo: "Analista" });
  servicoAmbiente.catalogo.mockResolvedValue({ ambienteSensorial: [], itensFisicos: [], situacoesFisicas: [], origensFisicas: [], entrevista: [{ chave: "perguntas_por_escrito", rotulo: "Perguntas por escrito" }, { chave: "tempo_adicional", rotulo: "Tempo adicional na entrevista" }] });
});

afterEach(cleanup);

describe("começo e retomada", () => {
  it("sem rascunho, começa pela mensagem e não grava nada só por abrir", async () => {
    renderizar();

    await comecar();
    expect(servicoAdaptacoes.salvarRascunho).not.toHaveBeenCalled();
    expect(servicoAdaptacoes.enviar).not.toHaveBeenCalled();
  });

  it("com rascunho, volta na etapa e com o texto em que parou, e diz que continuou", async () => {
    servicoAdaptacoes.obterRascunho.mockResolvedValue({
      id: "r1", vagaId: "v1", mensagem: "Olá, tenho interesse", etapa: "adaptacoes", expiraEm: "x", atualizadoEm: "x",
      selecao: { adaptacoes: ["legendas"] },
    });
    renderizar();

    expect(await etapa(2, "Adaptações")).toBeInTheDocument();
    expect(screen.getByText(/continuamos de onde você parou/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /legendas/i })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(await screen.findByDisplayValue("Olá, tenho interesse")).toBeInTheDocument();
  });
});

describe("o que a vaga já oferece na entrevista", () => {
  const irParaAdaptacoes = async () => {
    renderizar();
    await comecar();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await etapa(2, "Adaptações");
  };

  it("mostra, na etapa de adaptações, o que a empresa informou, sem compartilhar nada da pessoa", async () => {
    servicoVagas.detalhar.mockResolvedValue({ id: "v1", titulo: "Analista", entrevistaAdaptacoes: ["perguntas_por_escrito", "tempo_adicional"], entrevistaObservacao: "Podemos remarcar sem custo." });

    await irParaAdaptacoes();

    const caixa = await screen.findByRole("region", { name: /o que esta vaga já oferece na entrevista/i });

    expect(caixa).toHaveTextContent("Perguntas por escrito");
    expect(caixa).toHaveTextContent("Tempo adicional na entrevista");
    expect(caixa).toHaveTextContent("Podemos remarcar sem custo.");
    expect(caixa).toHaveTextContent(/não compartilha nada seu/i);
    expect(servicoAdaptacoes.salvarRascunho).not.toHaveBeenCalled();
  });

  it("não mostra a caixa quando a empresa não informou nada", async () => {
    await irParaAdaptacoes();

    expect(screen.queryByRole("region", { name: /o que esta vaga já oferece/i })).not.toBeInTheDocument();
  });

  it("se os dados da vaga falharem, a etapa segue normalmente", async () => {
    servicoVagas.detalhar.mockRejectedValue(new Error("falha"));

    await irParaAdaptacoes();

    expect(screen.queryByRole("region", { name: /o que esta vaga já oferece/i })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /legendas/i })).toBeInTheDocument();
  });

  it("não aparece nas outras etapas", async () => {
    servicoVagas.detalhar.mockResolvedValue({ id: "v1", titulo: "Analista", entrevistaAdaptacoes: ["perguntas_por_escrito"] });

    renderizar();
    await comecar();

    expect(screen.queryByRole("region", { name: /o que esta vaga já oferece/i })).not.toBeInTheDocument();
  });
});

describe("nada é compartilhado por padrão", () => {
  it("o que está no perfil aparece só como lembrete: continua desmarcado", async () => {
    renderizar();
    await comecar();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));

    expect(await etapa(2, "Adaptações")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /legendas/i })).not.toBeChecked();
    expect(screen.getByText("do seu perfil")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /categoria de deficiência que declarei/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /minha observação sobre adaptações/i })).not.toBeChecked();
  });

  it("sem marcar nada: a prévia diz que nada será compartilhado, não pede autorização e o envio vai com aceita=false", async () => {
    renderizar();
    await comecar();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await etapa(2, "Adaptações");
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));

    expect(await etapa(3, "Revisar e enviar")).toBeInTheDocument();
    expect(await screen.findByText(/nenhuma informação de acessibilidade/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /autorizo/i })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /enviar candidatura/i }));

    await waitFor(() => expect(servicoAdaptacoes.enviar).toHaveBeenCalled());
    const [vagaId, corpo] = servicoAdaptacoes.enviar.mock.calls[0];
    expect(vagaId).toBe("v1");
    expect(corpo.compartilhar.adaptacoes).toEqual([]);
    expect(corpo.compartilhar.deficiencia).toBe(false);
    expect(corpo.aceita).toBe(false);
    await waitFor(() => expect(aoEnviar).toHaveBeenCalled());
  });
});

describe("autorização antes do envio", () => {
  async function ateARevisaoComLegendas() {
    renderizar();
    await comecar();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await etapa(2, "Adaptações");
    fireEvent.click(screen.getByRole("checkbox", { name: /legendas/i }));
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await etapa(3, "Revisar e enviar");
  }

  it("a prévia mostra exatamente o que foi marcado e o que nunca vai", async () => {
    await ateARevisaoComLegendas();

    expect(await screen.findByRole("heading", { name: /adaptações que você autorizou \(1\)/i })).toBeInTheDocument();
    expect(screen.getAllByText(/legendas em vídeos e chamadas/i).length).toBeGreaterThan(0);
    expect(screen.getByText("CPF")).toBeInTheDocument();
    expect(screen.getByText(/e-mail de contato: ana@exemplo.com/i)).toBeInTheDocument();
  });

  it("com algo marcado, o envio fica bloqueado até a pessoa autorizar, e só então vai com aceita=true", async () => {
    await ateARevisaoComLegendas();

    const botao = await screen.findByRole("button", { name: /enviar candidatura/i });
    expect(botao).toBeDisabled();
    expect(servicoAdaptacoes.enviar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /autorizo compartilhar/i }));
    expect(botao).toBeEnabled();
    fireEvent.click(botao);

    await waitFor(() => expect(servicoAdaptacoes.enviar).toHaveBeenCalled());
    expect(servicoAdaptacoes.enviar.mock.calls[0][1]).toMatchObject({ aceita: true, compartilhar: { adaptacoes: ["legendas"] } });
  });

  it("mudar a escolha depois de autorizar desfaz a autorização (a pessoa vê a nova prévia e confirma de novo)", async () => {
    await ateARevisaoComLegendas();
    fireEvent.click(await screen.findByRole("checkbox", { name: /autorizo compartilhar/i }));

    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    await etapa(2, "Adaptações");
    fireEvent.click(screen.getByRole("checkbox", { name: /tempo adicional/i }));
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await etapa(3, "Revisar e enviar");

    expect(await screen.findByRole("checkbox", { name: /autorizo compartilhar/i })).not.toBeChecked();
    expect(await screen.findByRole("button", { name: /enviar candidatura/i })).toBeDisabled();
  });

  it("sem a prévia (falha do servidor), a candidatura não pode ser enviada", async () => {
    servicoAdaptacoes.previa.mockRejectedValue(new Error("falhou"));
    renderizar();
    await comecar();
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await etapa(2, "Adaptações");
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await etapa(3, "Revisar e enviar");

    expect(await screen.findByText(/sem ela, a candidatura não pode ser enviada/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar candidatura/i })).toBeDisabled();
  });
});

describe("rascunho no servidor", () => {
  it("'Salvar e continuar depois' grava a etapa, a mensagem e as ESCOLHAS (não conteúdo) e fecha", async () => {
    renderizar();
    await comecar();
    fireEvent.change(screen.getByLabelText(/mensagem para a empresa/i), { target: { value: "Volto amanhã" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar e continuar depois/i }));

    await waitFor(() => expect(servicoAdaptacoes.salvarRascunho).toHaveBeenCalled());
    const [vagaId, corpo] = servicoAdaptacoes.salvarRascunho.mock.calls[0];
    expect(vagaId).toBe("v1");
    expect(corpo.mensagem).toBe("Volto amanhã");
    expect(corpo.etapa).toBe("mensagem");
    expect(corpo.selecao.adaptacoes).toEqual([]);
    expect(servicoAdaptacoes.enviar).not.toHaveBeenCalled();
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });

  it("salva sozinho, em silêncio, algum tempo depois de a pessoa digitar", async () => {
    renderizar();
    await comecar();
    fireEvent.change(screen.getByLabelText(/mensagem para a empresa/i), { target: { value: "Texto longo" } });

    expect(servicoAdaptacoes.salvarRascunho).not.toHaveBeenCalled();
    await waitFor(() => expect(servicoAdaptacoes.salvarRascunho).toHaveBeenCalledTimes(1), { timeout: ESPERA_DO_RASCUNHO_NO_SERVIDOR_MS + 2500 });
    expect(servicoAdaptacoes.salvarRascunho.mock.calls[0][1].mensagem).toBe("Texto longo");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("descartar o rascunho apaga no servidor e fecha", async () => {
    servicoAdaptacoes.obterRascunho.mockResolvedValue({ id: "r1", vagaId: "v1", mensagem: "x", etapa: "mensagem", expiraEm: "x", atualizadoEm: "x", selecao: {} });
    renderizar();
    await etapa(1, "Mensagem");

    fireEvent.click(await screen.findByRole("button", { name: /descartar rascunho/i }));

    await waitFor(() => expect(servicoAdaptacoes.descartarRascunho).toHaveBeenCalledWith("v1"));
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });
});
