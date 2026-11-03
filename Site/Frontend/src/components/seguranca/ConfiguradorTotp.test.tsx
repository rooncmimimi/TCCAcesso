import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

/**
 * Configuração da verificação em duas etapas: nada é ativado antes do código ser confirmado, a chave
 * aparece em texto (para quem não lê o QR code), os códigos de recuperação aparecem uma vez e a pessoa só
 * conclui depois de dizer que os guardou. O servidor e o desenho do QR code são simulados.
 */

const { iniciar, ativar, toast, aQrCode } = vi.hoisted(() => ({
  iniciar: vi.fn(),
  ativar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  aQrCode: { toDataURL: vi.fn() },
}));

vi.mock("qrcode", () => ({ default: aQrCode }));
vi.mock("@/services/totp.service", async (original) => ({
  ...(await original<typeof import("@/services/totp.service")>()),
  totpService: { iniciar, ativar },
  default: { iniciar, ativar },
}));
vi.mock("sonner", () => ({ toast }));

const { ConfiguradorTotp } = await import("./ConfiguradorTotp");

const CONFIGURACAO = {
  segredo: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  segredoAgrupado: "JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP",
  uri: "otpauth://totp/ACESSO:ana%40exemplo.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=ACESSO",
  configuracao: "selo-da-configuracao",
  troca: false,
};
const CODIGOS = ["AAAAA-BBBBB", "CCCCC-DDDDD", "EEEEE-FFFFF", "GGGGG-HHHHH", "JJJJJ-KKKKK", "LLLLL-MMMMM", "NNNNN-PPPPP", "QQQQQ-RRRRR", "SSSSS-TTTTT", "UUUUU-VVVVV"];

const campo = () => document.getElementById("codigo-ativacao") as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  aQrCode.toDataURL.mockResolvedValue("data:image/png;base64,QR");
  Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});

afterEach(cleanup);

async function comecar(aoConcluir = vi.fn()) {
  iniciar.mockResolvedValue(CONFIGURACAO);
  render(<ConfiguradorTotp aoConcluir={aoConcluir} />);
  fireEvent.click(screen.getByRole("button", { name: /Começar/ }));
  await screen.findByTestId("chave-totp");
  return aoConcluir;
}

describe("começar", () => {
  it("explica o que vem e não gera nada antes do clique", () => {
    render(<ConfiguradorTotp aoConcluir={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Ative a verificação em duas etapas" })).toBeInTheDocument();
    expect(screen.getByText(/Google Authenticator ou o Microsoft Authenticator/)).toBeInTheDocument();
    expect(iniciar).not.toHaveBeenCalled();
  });

  it("mostra a chave em texto (agrupada), o QR code com texto alternativo e o link para abrir o aplicativo", async () => {
    await comecar();

    expect(screen.getByTestId("chave-totp")).toHaveTextContent(CONFIGURACAO.segredoAgrupado);
    expect(await screen.findByRole("img", { name: /QR code para o aplicativo autenticador/ })).toHaveAttribute("src", "data:image/png;base64,QR");
    expect(screen.getByRole("link", { name: "Abrir no aplicativo" })).toHaveAttribute("href", CONFIGURACAO.uri);
  });

  it("o QR code é desenhado no navegador a partir do endereço do servidor (nenhum serviço de terceiros)", async () => {
    await comecar();

    await waitFor(() => expect(aQrCode.toDataURL).toHaveBeenCalledWith(CONFIGURACAO.uri, expect.objectContaining({ width: 224 })));
  });

  it("sem conseguir desenhar o QR code, a chave em texto continua servindo", async () => {
    aQrCode.toDataURL.mockRejectedValue(new Error("canvas indisponível"));
    await comecar();

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("chave-totp")).toBeInTheDocument();
  });

  it("copiar a chave usa a chave inteira, sem espaços", async () => {
    await comecar();

    fireEvent.click(screen.getByRole("button", { name: /Copiar chave/ }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(CONFIGURACAO.segredo));
    expect(toast.success).toHaveBeenCalled();
  });

  it("falha ao começar: mostra o erro e deixa tentar de novo", async () => {
    iniciar.mockRejectedValue({ response: { data: { mensagem: "A verificação em duas etapas não está disponível agora." } } });
    render(<ConfiguradorTotp aoConcluir={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Começar/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("não está disponível agora");
    expect(screen.getByRole("button", { name: /Começar/ })).toBeEnabled();
  });

  it("clique duplo em Começar gera a chave uma vez só", async () => {
    let resolver: (valor: unknown) => void = () => {};
    iniciar.mockReturnValue(new Promise((r) => (resolver = r)));
    render(<ConfiguradorTotp aoConcluir={vi.fn()} />);

    const botao = screen.getByRole("button", { name: /Começar/ });
    fireEvent.click(botao);
    fireEvent.click(botao);

    expect(iniciar).toHaveBeenCalledTimes(1);
    resolver(CONFIGURACAO);
    await screen.findByTestId("chave-totp");
  });
});

describe("confirmar com o primeiro código", () => {
  it("campo com rótulo, ajuda e preenchimento de código de uso único", async () => {
    await comecar();

    expect(document.querySelector('label[for="codigo-ativacao"]')).toHaveTextContent("Código de 6 números do aplicativo");
    expect(campo()).toHaveAttribute("autocomplete", "one-time-code");
    expect(campo()).toHaveAccessibleDescription("O código muda a cada 30 segundos. Digite o que estiver aparecendo agora.");
  });

  it("código incompleto: avisa e não chama o servidor", async () => {
    await comecar();

    fireEvent.change(campo(), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e ativar" }));

    expect(await screen.findByText("Digite os 6 números que o aplicativo mostra.")).toBeInTheDocument();
    expect(ativar).not.toHaveBeenCalled();
  });

  it("código recusado: mostra o erro, limpa o campo e mantém a chave na tela", async () => {
    ativar.mockRejectedValue({ response: { data: { mensagem: "Código incorreto. Confira se o aplicativo mostra o código desta conta e tente de novo." } } });
    await comecar();

    fireEvent.change(campo(), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e ativar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Código incorreto");
    expect(campo()).toHaveValue("");
    expect(screen.getByTestId("chave-totp")).toBeInTheDocument();
  });

  it("envia o selo da configuração e o código", async () => {
    ativar.mockResolvedValue({ codigosRecuperacao: CODIGOS });
    await comecar();

    fireEvent.change(campo(), { target: { value: "123 456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e ativar" }));

    await screen.findByRole("heading", { name: "Verificação em duas etapas ativada" });
    expect(ativar).toHaveBeenCalledWith("selo-da-configuracao", "123 456");
  });
});

describe("códigos de recuperação", () => {
  async function ativada(aoConcluir = vi.fn()) {
    ativar.mockResolvedValue({ codigosRecuperacao: CODIGOS });
    await comecar(aoConcluir);
    fireEvent.change(campo(), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e ativar" }));
    await screen.findByRole("heading", { name: "Verificação em duas etapas ativada" });
    return aoConcluir;
  }

  it("mostra os dez códigos e avisa que aparecem só desta vez", async () => {
    await ativada();

    const lista = screen.getByRole("list", { name: "Códigos de recuperação" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(10);
    expect(within(lista).getByText("AAAAA-BBBBB")).toBeInTheDocument();
    expect(screen.getByText(/Eles aparecem só desta vez/)).toBeInTheDocument();
  });

  it("a chave do aplicativo some da tela depois de ativada", async () => {
    await ativada();

    expect(screen.queryByTestId("chave-totp")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(CONFIGURACAO.segredo);
    expect(document.body.textContent).not.toContain("JBSW");
  });

  it("só conclui depois de marcar que guardou os códigos", async () => {
    const aoConcluir = await ativada();
    const concluir = screen.getByRole("button", { name: "Concluir" });

    expect(concluir).toBeDisabled();
    fireEvent.click(concluir);
    expect(aoConcluir).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /Guardei meus códigos de recuperação/ }));
    expect(concluir).toBeEnabled();
    fireEvent.click(concluir);

    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });

  it("copiar leva todos os códigos, um por linha", async () => {
    await ativada();

    fireEvent.click(screen.getByRole("button", { name: /Copiar códigos/ }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(CODIGOS.join("\n")));
  });
});

describe("troca de aparelho (configuração já pronta)", () => {
  it("começa direto no passo de conectar o aplicativo e avisa que o antigo deixa de funcionar", () => {
    render(<ConfiguradorTotp aoConcluir={vi.fn()} configuracaoInicial={{ ...CONFIGURACAO, troca: true }} />);

    expect(screen.getByTestId("chave-totp")).toBeInTheDocument();
    expect(screen.getByText(/o aparelho antigo deixa de funcionar/)).toBeInTheDocument();
    expect(iniciar).not.toHaveBeenCalled();
  });
});

describe("cancelar", () => {
  it("existe quando o chamador permite, no começo e no passo do código", async () => {
    const aoCancelar = vi.fn();
    iniciar.mockResolvedValue(CONFIGURACAO);
    render(<ConfiguradorTotp aoConcluir={vi.fn()} aoCancelar={aoCancelar} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });

  it("não existe quando é obrigatório (sem aoCancelar)", () => {
    render(<ConfiguradorTotp aoConcluir={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });
});
