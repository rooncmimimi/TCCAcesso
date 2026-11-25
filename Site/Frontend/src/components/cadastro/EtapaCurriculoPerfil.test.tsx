import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * A importação do currículo falhando: cada motivo com a sua mensagem.
 *
 * Antes, qualquer falha dizia "não foi possível ler este arquivo" — inclusive quando o pedido nem
 * saía do celular. Quem estava sem sinal trocava de currículo e falhava de novo, pelo mesmo motivo.
 * O servidor, quando responde, explica melhor do que qualquer texto do Site (PDF escaneado, arquivo
 * protegido, .doc antigo): a mensagem dele continua vindo na frente.
 */

const { importarCurriculo, avisoErro } = vi.hoisted(() => ({
  importarCurriculo: vi.fn(),
  avisoErro: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: avisoErro, success: vi.fn() } }));
vi.mock("@/services/perfil.service", () => ({ perfilService: { importarCurriculo } }));
vi.mock("@/components/acessibilidade/DitadoParaCampo", () => ({ DitadoParaCampo: () => null }));

const { EtapaCurriculoPerfil } = await import("./EtapaCurriculoPerfil");
const { textosDoCadastro } = await import("./idioma");

const t = textosDoCadastro("pt");

/** Um PDF de mentira, do tamanho e do tipo certos: o que falha nos testes é o envio, nunca o formato. */
function pdfDeTeste(aoLer?: () => Promise<ArrayBuffer>) {
  const arquivo = new File([new Uint8Array(2048)], "curriculo.pdf", { type: "application/pdf" });

  // jsdom não implementa `arrayBuffer` em File; aqui ele também é o ponto onde se simula o arquivo
  // que o aparelho não consegue abrir.
  Object.defineProperty(arquivo, "arrayBuffer", {
    value: aoLer ?? (() => Promise.resolve(new ArrayBuffer(2048))),
  });

  return arquivo;
}

function escolherArquivo(arquivo: File) {
  const campo = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(campo, "files", { value: [arquivo], configurable: true });
  fireEvent.change(campo);
}

const montar = () => render(<EtapaCurriculoPerfil candidatoId="c1" t={t} aoConcluir={() => {}} />);

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(cleanup);

describe("importação do currículo: por que falhou", () => {
  it("sem resposta do servidor: fala de conexão, e não do arquivo", async () => {
    importarCurriculo.mockRejectedValue({ isAxiosError: true, message: "Network Error" });
    montar();

    escolherArquivo(pdfDeTeste());

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(t.curriculoSemConexao));
    expect(avisoErro).not.toHaveBeenCalledWith(t.erroCurriculo);
  });

  it("envio interrompido por demora: diz que parou no meio", async () => {
    importarCurriculo.mockRejectedValue({ isAxiosError: true, code: "ECONNABORTED" });
    montar();

    escolherArquivo(pdfDeTeste());

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(t.curriculoDemorou));
  });

  it("o arquivo não abre no aparelho: ensina a baixar da nuvem, e nem chega a enviar", async () => {
    montar();

    escolherArquivo(pdfDeTeste(() => Promise.reject(new DOMException("NotReadableError"))));

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(t.curriculoNaoAbriu));
    expect(importarCurriculo).not.toHaveBeenCalled();
  });

  it("o servidor explicou o motivo: é a explicação dele que aparece", async () => {
    const doServidor = "Não foi possível extrair texto deste PDF — ele pode ser uma imagem escaneada.";
    importarCurriculo.mockRejectedValue({ isAxiosError: true, response: { data: { mensagem: doServidor } } });
    montar();

    escolherArquivo(pdfDeTeste());

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(doServidor));
  });

  it("formato recusado: mensagem de erro, não a dica que está embaixo do botão", async () => {
    montar();

    escolherArquivo(new File([new Uint8Array(10)], "curriculo.doc", { type: "application/msword" }));

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(t.curriculoFormatoInvalido));
    expect(avisoErro).not.toHaveBeenCalledWith(t.curriculoFormatos);
    expect(importarCurriculo).not.toHaveBeenCalled();
  });

  it("deu certo: o rascunho preenche a tela e nenhum aviso de erro aparece", async () => {
    importarCurriculo.mockResolvedValue({
      resumo: "Analista de Marketing com 5 anos de experiência.",
      habilidades: ["Excel", "Power BI"],
      experiencias: [{ cargo: "Analista", empresa: "Exemplo", descricaoSugerida: "Campanhas" }],
      formacoes: [],
    });
    montar();

    escolherArquivo(pdfDeTeste());

    await waitFor(() => expect(screen.getByText(t.curriculoLido)).toBeInTheDocument());
    expect(avisoErro).not.toHaveBeenCalled();
  });
});
