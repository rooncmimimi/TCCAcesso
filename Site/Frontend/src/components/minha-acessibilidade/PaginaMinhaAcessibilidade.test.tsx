import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CatalogoDeAdaptacoes, MinhaAcessibilidade } from "@/types/adaptacoes";

/** Minha Acessibilidade: privada, sem diagnóstico, com a exibição da categoria desligada por padrão. Servidor simulado. */

const { servico, toast } = vi.hoisted(() => ({
  servico: { catalogo: vi.fn(), obter: vi.fn(), salvarAdaptacoes: vi.fn(), salvarComunicacao: vi.fn(), salvarPrivacidade: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/services/adaptacoes.service", () => ({ minhaAcessibilidadeService: servico }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }));
vi.mock("sonner", () => ({ toast }));

const { PaginaMinhaAcessibilidade } = await import("./PaginaMinhaAcessibilidade");

const CATALOGO: CatalogoDeAdaptacoes = {
  grupos: [{ chave: "comunicacao", rotulo: "Comunicação" }, { chave: "ambiente", rotulo: "Ambiente" }],
  adaptacoes: [
    { chave: "legendas", grupo: "comunicacao", rotulo: "Legendas em vídeos e chamadas" },
    { chave: "ambiente_silencioso", grupo: "ambiente", rotulo: "Ambiente silencioso" },
  ],
  canaisPreferidos: [{ chave: "chat", rotulo: "Chat" }, { chave: "email", rotulo: "E-mail" }],
  canaisAEvitar: [{ chave: "ligacao", rotulo: "Ligações telefônicas" }, { chave: "chat", rotulo: "Chat" }],
  respostasDaEmpresa: [],
  termoVersao: "adaptacoes-2026-11",
};

const MINHA: MinhaAcessibilidade = {
  adaptacoes: [],
  observacao: null,
  comunicacao: { canaisPreferidos: [], canaisAEvitar: [], melhorHorario: null, observacao: null },
  privacidade: { exibirDeficienciaNoPerfil: false },
  deficiencias: [{ id: "d1", nome: "Deficiência visual" }],
};

function renderizar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <PaginaMinhaAcessibilidade />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  servico.catalogo.mockResolvedValue(CATALOGO);
  servico.obter.mockResolvedValue(MINHA);
});

afterEach(cleanup);

describe("o que a página promete e pede", () => {
  it("diz que é privada, que nada vai para empresas sozinho e que não precisa de diagnóstico", async () => {
    renderizar();

    expect(await screen.findByText(/só você vê esta página/i)).toBeInTheDocument();
    expect(screen.getByText(/nada daqui é enviado a uma empresa sozinho/i)).toBeInTheDocument();
    expect(screen.getByText(/não precisa informar diagnóstico/i)).toBeInTheDocument();
    expect(screen.getByText(/não escreva diagnóstico, laudo/i)).toBeInTheDocument();
    expect(screen.getByText(/já tiver visto não pode ser apagado/i)).toBeInTheDocument();
  });

  it("mostra as adaptações do catálogo por grupo, tudo desmarcado quando a pessoa nunca marcou", async () => {
    renderizar();

    expect(await screen.findByRole("group", { name: "Comunicação" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Ambiente" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /legendas/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /salvar adaptações/i })).toBeDisabled();
  });
});

describe("adaptações", () => {
  it("salva só o que foi marcado, com a observação aparada", async () => {
    servico.salvarAdaptacoes.mockResolvedValue({ ...MINHA, adaptacoes: ["legendas"], observacao: "Frases curtas" });
    renderizar();

    fireEvent.click(await screen.findByRole("checkbox", { name: /legendas/i }));
    // Há duas observações na página (adaptações e comunicação); a primeira é a das adaptações.
    fireEvent.change(screen.getAllByLabelText(/observação \(opcional\)/i)[0], { target: { value: "  Frases curtas " } });
    fireEvent.click(screen.getByRole("button", { name: /salvar adaptações/i }));

    await waitFor(() => expect(servico.salvarAdaptacoes).toHaveBeenCalledWith({ adaptacoes: ["legendas"], observacao: "Frases curtas" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Adaptações salvas."));
  });

  it("mostra o que já estava salvo", async () => {
    servico.obter.mockResolvedValue({ ...MINHA, adaptacoes: ["ambiente_silencioso"], observacao: "Sem barulho" });
    renderizar();

    expect(await screen.findByRole("checkbox", { name: /ambiente silencioso/i })).toBeChecked();
    expect(screen.getByDisplayValue("Sem barulho")).toBeInTheDocument();
  });
});

describe("preferências de comunicação", () => {
  it("um canal não pode ser preferido e evitado ao mesmo tempo: avisa e bloqueia o salvar", async () => {
    renderizar();

    const preferidos = await screen.findByRole("group", { name: "Canais que eu prefiro" });
    const evitar = screen.getByRole("group", { name: "Canais que eu prefiro evitar" });
    fireEvent.click(within(preferidos).getByRole("checkbox", { name: "Chat" }));
    fireEvent.click(within(evitar).getByRole("checkbox", { name: "Chat" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/não pode estar entre os preferidos e os evitados/i);
    expect(screen.getByRole("button", { name: /salvar preferências/i })).toBeDisabled();

    fireEvent.click(within(evitar).getByRole("checkbox", { name: "Chat" }));
    expect(screen.getByRole("button", { name: /salvar preferências/i })).toBeEnabled();
  });

  it("salva canais, horário e observação, sem vazio disfarçado", async () => {
    servico.salvarComunicacao.mockResolvedValue(MINHA);
    renderizar();

    const preferidos = await screen.findByRole("group", { name: "Canais que eu prefiro" });
    fireEvent.click(within(preferidos).getByRole("checkbox", { name: "E-mail" }));
    fireEvent.change(screen.getByLabelText(/melhor horário para contato/i), { target: { value: "Depois das 14h" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar preferências/i }));

    await waitFor(() =>
      expect(servico.salvarComunicacao).toHaveBeenCalledWith({ canaisPreferidos: ["email"], canaisAEvitar: [], melhorHorario: "Depois das 14h", observacao: null }),
    );
  });
});

describe("privacidade da categoria de deficiência", () => {
  it("nasce DESLIGADA e explica que não compartilha nada nem libera outras informações", async () => {
    renderizar();

    const chave = await screen.findByRole("switch", { name: /mostrar a categoria de deficiência no meu perfil público/i });

    expect(chave).not.toBeChecked();
    expect(screen.getByText(/ligar isto não compartilha nenhuma outra informação/i)).toBeInTheDocument();
    expect(screen.getByText(/categoria declarada:/i)).toHaveTextContent("Deficiência visual");
    expect(servico.salvarPrivacidade).not.toHaveBeenCalled();
  });

  it("ligar chama só a rota de privacidade, e não mexe em adaptações nem comunicação", async () => {
    servico.salvarPrivacidade.mockResolvedValue({ ...MINHA, privacidade: { exibirDeficienciaNoPerfil: true } });
    renderizar();

    fireEvent.click(await screen.findByRole("switch", { name: /mostrar a categoria/i }));

    await waitFor(() => expect(servico.salvarPrivacidade).toHaveBeenCalledWith(true));
    expect(servico.salvarAdaptacoes).not.toHaveBeenCalled();
    expect(servico.salvarComunicacao).not.toHaveBeenCalled();
  });

  it("sem categoria declarada, diz isso", async () => {
    servico.obter.mockResolvedValue({ ...MINHA, deficiencias: [] });
    renderizar();

    expect(await screen.findByText(/você não declarou nenhuma categoria/i)).toBeInTheDocument();
  });
});

describe("erro ao carregar", () => {
  it("avisa e oferece tentar de novo", async () => {
    servico.obter.mockRejectedValue(new Error("falhou"));
    renderizar();

    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível carregar/i);
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
