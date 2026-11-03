import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Configurações → Segurança → Verificação em duas etapas. O que importa: o administrador não tem como
 * desativar (e vê por quê), candidato e empresa ativam e desativam, toda ação sensível pede senha e código,
 * e a seção some quando o recurso está desligado. O servidor é simulado.
 */

const { sessao, servico, toast } = vi.hoisted(() => ({
  sessao: { usuario: { id: "u1", tipo: "candidato", temSenha: true } as Record<string, unknown>, recarregar: vi.fn() },
  servico: { estado: vi.fn(), iniciar: vi.fn(), ativar: vi.fn(), regenerarCodigos: vi.fn(), desativar: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,QR") } }));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => sessao }));
vi.mock("@/services/totp.service", async (original) => ({
  ...(await original<typeof import("@/services/totp.service")>()),
  totpService: servico,
  default: servico,
}));
vi.mock("sonner", () => ({ toast }));

const { SecaoVerificacaoEmDuasEtapas } = await import("./SecaoVerificacaoEmDuasEtapas");

const estado = (extra = {}) => ({ mfaDisponivel: true, mfaConfigurado: false, mfaExigido: false, codigosRestantes: 0, confirmadoEm: null, ...extra });
const CONFIGURACAO = { segredo: "S".repeat(32), segredoAgrupado: "SSSS SSSS", uri: "otpauth://totp/x", configuracao: "selo", troca: true };

function renderizar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SecaoVerificacaoEmDuasEtapas />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessao.usuario = { id: "u1", tipo: "candidato", temSenha: true };
  sessao.recarregar.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("disponibilidade", () => {
  it("recurso desligado no servidor: a seção nem aparece", async () => {
    servico.estado.mockResolvedValue(estado({ mfaDisponivel: false }));
    const { container } = renderizar();

    await waitFor(() => expect(servico.estado).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("mostra que está carregando", () => {
    servico.estado.mockReturnValue(new Promise(() => {}));
    renderizar();

    expect(screen.getByRole("status")).toHaveTextContent("Carregando a verificação em duas etapas");
  });

  it("erro ao carregar: avisa, sem esconder o resto da página", async () => {
    servico.estado.mockRejectedValue(new Error("rede"));
    renderizar();

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar a verificação em duas etapas");
  });
});

describe("candidato ou empresa sem a verificação", () => {
  beforeEach(() => servico.estado.mockResolvedValue(estado()));

  it("explica e oferece ativar, sem nenhum botão de desativar", async () => {
    renderizar();

    expect(await screen.findByRole("button", { name: "Ativar verificação em duas etapas" })).toBeInTheDocument();
    expect(screen.getByText("Desativada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desativar" })).not.toBeInTheDocument();
  });

  it("ativar abre o configurador, e cancelar volta", async () => {
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Ativar verificação em duas etapas" }));
    expect(screen.getByRole("heading", { name: "Ative a verificação em duas etapas" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByRole("button", { name: "Ativar verificação em duas etapas" })).toBeInTheDocument();
  });
});

describe("com a verificação ativa", () => {
  it("candidata: mostra o estado, os códigos que restam e as três ações", async () => {
    servico.estado.mockResolvedValue(estado({ mfaConfigurado: true, codigosRestantes: 10 }));
    renderizar();

    expect(await screen.findByText("Ativada")).toBeInTheDocument();
    expect(screen.getByText(/Códigos de recuperação restantes:/)).toHaveTextContent("10");
    for (const nome of ["Gerar novos códigos de recuperação", "Trocar de aparelho", "Desativar"]) {
      expect(screen.getByRole("button", { name: nome })).toBeInTheDocument();
    }
    expect(screen.queryByText(/obrigatória para administradores/)).not.toBeInTheDocument();
  });

  it("restando poucos códigos, avisa como status", async () => {
    servico.estado.mockResolvedValue(estado({ mfaConfigurado: true, codigosRestantes: 2 }));
    renderizar();

    await screen.findByText("Ativada");
    expect(screen.getByRole("status")).toHaveTextContent(/Restam poucos: gere novos/);
  });

  it("ADMINISTRADOR: diz que é obrigatória e NÃO tem botão de desativar", async () => {
    sessao.usuario = { id: "a1", tipo: "administrador", temSenha: true };
    servico.estado.mockResolvedValue(estado({ mfaConfigurado: true, mfaExigido: true, codigosRestantes: 9 }));
    renderizar();

    expect(await screen.findByText(/É obrigatória para administradores e não pode ser desativada/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desativar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocar de aparelho" })).toBeInTheDocument();
    expect(screen.getByText(/outro administrador para reiniciar/)).toBeInTheDocument();
    expect(screen.getByText(/único administrador pede à equipe técnica/)).toBeInTheDocument();
  });
});

describe("administrador com a verificação opcional (o padrão de hoje)", () => {
  beforeEach(() => {
    sessao.usuario = { id: "a1", tipo: "administrador", temSenha: true };
    servico.estado.mockResolvedValue(estado({ mfaConfigurado: true, mfaExigido: false, codigosRestantes: 10 }));
  });

  it("sem a obrigatoriedade, pode desativar (com senha e código) e não vê o aviso de 'obrigatória'", async () => {
    renderizar();

    expect(await screen.findByRole("button", { name: "Desativar" })).toBeInTheDocument();
    expect(screen.queryByText(/obrigatória para administradores/)).not.toBeInTheDocument();
  });

  it("continua vendo como recuperar o acesso se perder o aplicativo", async () => {
    renderizar();

    expect(await screen.findByText(/outro administrador para reiniciar/)).toBeInTheDocument();
  });

  it("ainda não ativou: a seção oferece ativar, sem dizer que é obrigatório", async () => {
    servico.estado.mockResolvedValue(estado({ mfaConfigurado: false, mfaExigido: false }));
    renderizar();

    expect(await screen.findByRole("button", { name: "Ativar verificação em duas etapas" })).toBeInTheDocument();
    expect(screen.queryByText(/obrigatória/)).not.toBeInTheDocument();
  });
});

describe("desativar (candidato ou empresa)", () => {
  beforeEach(() => servico.estado.mockResolvedValue(estado({ mfaConfigurado: true, codigosRestantes: 10 })));

  const abrir = async () => {
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: "Desativar" }));
    return screen.getByRole("dialog");
  };

  it("pede senha e código, e sem senha nem chama o servidor", async () => {
    const dialogo = await abrir();

    expect(within(dialogo).getByLabelText("Senha atual")).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText(/Código do aplicativo ou de recuperação/), { target: { value: "123456" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desativar" }));

    expect(await within(dialogo).findByText("Informe a sua senha atual.")).toBeInTheDocument();
    expect(servico.desativar).not.toHaveBeenCalled();
  });

  it("sem código, também não chama o servidor", async () => {
    const dialogo = await abrir();

    fireEvent.change(within(dialogo).getByLabelText("Senha atual"), { target: { value: "Senha@123" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desativar" }));

    expect(await within(dialogo).findByText("Informe o código do aplicativo ou um código de recuperação.")).toBeInTheDocument();
    expect(servico.desativar).not.toHaveBeenCalled();
  });

  it("com senha e código, desativa, relê o perfil e confirma", async () => {
    servico.desativar.mockResolvedValue(undefined);
    const dialogo = await abrir();

    fireEvent.change(within(dialogo).getByLabelText("Senha atual"), { target: { value: "Senha@123" } });
    fireEvent.change(within(dialogo).getByLabelText(/Código do aplicativo ou de recuperação/), { target: { value: " 123456 " } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desativar" }));

    await waitFor(() => expect(servico.desativar).toHaveBeenCalledWith({ senhaAtual: "Senha@123", codigo: "123456" }));
    await waitFor(() => expect(sessao.recarregar).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Verificação em duas etapas desativada.");
  });

  it("o servidor recusa: o erro aparece no diálogo, que continua aberto, e o código é limpo", async () => {
    servico.desativar.mockRejectedValue({ response: { data: { mensagem: "Senha atual incorreta." } } });
    const dialogo = await abrir();

    fireEvent.change(within(dialogo).getByLabelText("Senha atual"), { target: { value: "errada" } });
    fireEvent.change(within(dialogo).getByLabelText(/Código do aplicativo ou de recuperação/), { target: { value: "123456" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desativar" }));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("Senha atual incorreta.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/Código do aplicativo ou de recuperação/)).toHaveValue("");
    expect(sessao.recarregar).not.toHaveBeenCalled();
  });

  it("conta que entra só pelo Google (sem senha) prova só com o código", async () => {
    sessao.usuario = { id: "u1", tipo: "candidato", temSenha: false };
    servico.desativar.mockResolvedValue(undefined);
    const dialogo = await abrir();

    expect(within(dialogo).queryByLabelText("Senha atual")).not.toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText(/Código do aplicativo ou de recuperação/), { target: { value: "123456" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desativar" }));

    await waitFor(() => expect(servico.desativar).toHaveBeenCalledWith({ codigo: "123456" }));
  });

  it("cancelar fecha sem chamar nada", async () => {
    const dialogo = await abrir();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(servico.desativar).not.toHaveBeenCalled();
  });
});

describe("novos códigos de recuperação", () => {
  it("pede senha e código e mostra os novos, avisando que os antigos deixaram de valer", async () => {
    servico.estado.mockResolvedValue(estado({ mfaConfigurado: true, codigosRestantes: 1 }));
    servico.regenerarCodigos.mockResolvedValue(["AAAAA-BBBBB", "CCCCC-DDDDD"]);
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Gerar novos códigos de recuperação" }));
    const dialogo = screen.getByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Senha atual"), { target: { value: "Senha@123" } });
    fireEvent.change(within(dialogo).getByLabelText(/Código do aplicativo ou de recuperação/), { target: { value: "123456" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Gerar códigos" }));

    expect(await screen.findByRole("heading", { name: "Novos códigos de recuperação" })).toBeInTheDocument();
    expect(servico.regenerarCodigos).toHaveBeenCalledWith({ senhaAtual: "Senha@123", codigo: "123456" });
    expect(screen.getByText("AAAAA-BBBBB")).toBeInTheDocument();
    expect(screen.getByText("Os códigos anteriores deixaram de valer.")).toBeInTheDocument();
  });
});

describe("trocar de aparelho", () => {
  it("confere senha e código no diálogo e só então mostra a chave nova", async () => {
    servico.estado.mockResolvedValue(estado({ mfaConfigurado: true, codigosRestantes: 10 }));
    servico.iniciar.mockResolvedValue(CONFIGURACAO);
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Trocar de aparelho" }));
    const dialogo = screen.getByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Senha atual"), { target: { value: "Senha@123" } });
    fireEvent.change(within(dialogo).getByLabelText(/Código do aplicativo ou de recuperação/), { target: { value: "123456" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));

    expect(await screen.findByTestId("chave-totp")).toBeInTheDocument();
    expect(servico.iniciar).toHaveBeenCalledWith({ senhaAtual: "Senha@123", codigo: "123456" });
    expect(screen.getByText(/o aparelho antigo deixa de funcionar/)).toBeInTheDocument();
  });

  it("senha ou código errados: o erro fica no diálogo e nenhuma chave é mostrada", async () => {
    servico.estado.mockResolvedValue(estado({ mfaConfigurado: true, codigosRestantes: 10 }));
    servico.iniciar.mockRejectedValue({ response: { data: { mensagem: "Código incorreto ou já usado. Confira o aplicativo e tente de novo." } } });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: "Trocar de aparelho" }));
    const dialogo = screen.getByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Senha atual"), { target: { value: "Senha@123" } });
    fireEvent.change(within(dialogo).getByLabelText(/Código do aplicativo ou de recuperação/), { target: { value: "000000" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("Código incorreto");
    expect(screen.queryByTestId("chave-totp")).not.toBeInTheDocument();
  });
});
