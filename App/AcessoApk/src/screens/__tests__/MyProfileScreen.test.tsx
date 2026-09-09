/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockMeuCandidato = jest.fn();
const mockAtualizarUsuario = jest.fn();
const mockAtualizarDadosPessoais = jest.fn();
const mockListarExperiencias = jest.fn();
const mockCriarExperiencia = jest.fn();
const mockAtualizarExperiencia = jest.fn();
const mockRemoverExperiencia = jest.fn();
const mockListarFormacoes = jest.fn();
const mockCriarFormacao = jest.fn();
const mockRemoverFormacao = jest.fn();
const mockListarCertificados = jest.fn();
const mockCriarCertificado = jest.fn();
const mockRemoverCertificado = jest.fn();
const mockListarHabilidades = jest.fn();
const mockCriarHabilidade = jest.fn();
const mockAtualizarHabilidade = jest.fn();
const mockRemoverHabilidade = jest.fn();
const mockListarDeficiencias = jest.fn();
const mockVincularDeficiencia = jest.fn();
const mockDesvincularDeficiencia = jest.fn();
const mockRefreshUser = jest.fn();
// Retorno padrão (candidato) preservado como estava antes da Fase 18 — os
// testes existentes não passam `user` nenhum, então `user?.tipoUsuario` dá
// `undefined`, que já cai no ramo candidato por não ser `"empresa"`. Só o
// novo describe de roteamento (fim do arquivo) sobrescreve isto.
const mockUseAuth = jest.fn().mockReturnValue({ refreshUser: mockRefreshUser });

jest.mock("../../auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Fase 18: `MyProfileScreen` passou a rotear por `tipoUsuario` — quando é
// candidato (todo teste deste arquivo, exceto o describe de roteamento), a
// tela real de empresa nunca deveria ser tocada; mockado só para os testes
// existentes não dependerem, sem querer, de `EmpresaService` de verdade.
jest.mock("../../empresas", () => ({
  ...jest.requireActual("../../empresas"),
  EmpresaService: {
    meuPerfil: jest.fn(),
    atualizar: jest.fn(),
  },
}));

jest.mock("../../perfil", () => ({
  ...jest.requireActual("../../perfil"),
  PerfilService: {
    meuCandidato: (...a: unknown[]) => mockMeuCandidato(...a),
    atualizarUsuario: (...a: unknown[]) => mockAtualizarUsuario(...a),
    atualizarDadosPessoais: (...a: unknown[]) => mockAtualizarDadosPessoais(...a),
    listarExperiencias: (...a: unknown[]) => mockListarExperiencias(...a),
    criarExperiencia: (...a: unknown[]) => mockCriarExperiencia(...a),
    atualizarExperiencia: (...a: unknown[]) => mockAtualizarExperiencia(...a),
    removerExperiencia: (...a: unknown[]) => mockRemoverExperiencia(...a),
    listarFormacoes: (...a: unknown[]) => mockListarFormacoes(...a),
    criarFormacao: (...a: unknown[]) => mockCriarFormacao(...a),
    removerFormacao: (...a: unknown[]) => mockRemoverFormacao(...a),
    listarCertificados: (...a: unknown[]) => mockListarCertificados(...a),
    criarCertificado: (...a: unknown[]) => mockCriarCertificado(...a),
    removerCertificado: (...a: unknown[]) => mockRemoverCertificado(...a),
    listarHabilidades: (...a: unknown[]) => mockListarHabilidades(...a),
    criarHabilidade: (...a: unknown[]) => mockCriarHabilidade(...a),
    atualizarHabilidade: (...a: unknown[]) => mockAtualizarHabilidade(...a),
    removerHabilidade: (...a: unknown[]) => mockRemoverHabilidade(...a),
    listarDeficiencias: (...a: unknown[]) => mockListarDeficiencias(...a),
    vincularDeficiencia: (...a: unknown[]) => mockVincularDeficiencia(...a),
    desvincularDeficiencia: (...a: unknown[]) => mockDesvincularDeficiencia(...a),
  },
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { AccessibilityProvider } from "../../accessibility";
import { ThemeProvider } from "../../theme";
import { MyProfileScreen } from "../MyProfileScreen";

const candidatoBase = {
  id: "c1",
  usuarioId: "u1",
  cidade: "São Paulo",
  estado: "SP",
  tituloProfissional: "Desenvolvedora Front-end",
  biografia: null,
  necessidadesAcessibilidade: null,
  usuario: { id: "u1", nome: "Ana Beatriz", email: "ana@exemplo.com", telefone: "11999990000", tipoUsuario: "candidato" },
  deficiencias: [],
};

// O spy precisa existir ANTES da ação que dispara `Alert.alert` — criado só
// dentro do helper de confirmação, ele nunca capturaria a chamada real (o
// `jest.spyOn` só registra chamadas feitas DEPOIS de instalado).
let alertSpy: jest.SpyInstance;

function confirmarViaAlert(textoBotao: string) {
  const ultimaChamada = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const botoes = ultimaChamada[2] as { text: string; onPress?: () => void }[];
  const botao = botoes.find((b) => b.text === textoBotao);
  botao?.onPress?.();
}

async function renderTela() {
  const utils = await render(
    <AccessibilityProvider>
      <ThemeProvider>
        <MyProfileScreen />
      </ThemeProvider>
    </AccessibilityProvider>,
  );
  await waitFor(() => expect(utils.toJSON()).not.toBeNull());
  return utils;
}

function mockCargaPadrao(sobrescreve: Partial<Record<string, unknown>> = {}) {
  mockMeuCandidato.mockResolvedValue({ ...candidatoBase, ...sobrescreve });
  mockListarExperiencias.mockResolvedValue([]);
  mockListarFormacoes.mockResolvedValue([]);
  mockListarCertificados.mockResolvedValue([]);
  mockListarHabilidades.mockResolvedValue([]);
  mockListarDeficiencias.mockResolvedValue([]);
}

describe("MyProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert");
  });

  it("mostra loading e depois o perfil carregado", async () => {
    mockCargaPadrao();
    const { findByText } = await renderTela();

    expect(await findByText("Ana Beatriz")).toBeTruthy();
    expect(await findByText("Desenvolvedora Front-end")).toBeTruthy();
    expect(mockMeuCandidato).toHaveBeenCalled();
  });

  it("falha ao carregar mostra erro em tela cheia com 'Tentar novamente', que refaz a busca", async () => {
    const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
    mockMeuCandidato.mockRejectedValueOnce(erro);
    mockListarExperiencias.mockResolvedValue([]);
    mockListarFormacoes.mockResolvedValue([]);
    mockListarCertificados.mockResolvedValue([]);
    mockListarHabilidades.mockResolvedValue([]);
    mockListarDeficiencias.mockResolvedValue([]);
    const { findByText, getByRole } = await renderTela();

    expect(await findByText("Não foi possível carregar seu perfil")).toBeTruthy();

    mockMeuCandidato.mockResolvedValueOnce(candidatoBase);
    await act(async () => {
      fireEvent.press(getByRole("button", { name: "Tentar novamente" }));
    });

    expect(await findByText("Ana Beatriz")).toBeTruthy();
  });

  describe("dados pessoais", () => {
    it("editar, salvar chama atualizarUsuario e atualizarDadosPessoais, e volta pra visualização com o nome novo", async () => {
      mockCargaPadrao();
      mockAtualizarUsuario.mockResolvedValue({ ...candidatoBase.usuario, nome: "Ana B. Silva" });
      mockAtualizarDadosPessoais.mockResolvedValue({ ...candidatoBase, tituloProfissional: "Dev Sênior" });
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Ana Beatriz");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar dados pessoais" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Nome"), "Ana B. Silva");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Título profissional"), "Dev Sênior");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar" }));
      });

      expect(mockAtualizarUsuario).toHaveBeenCalledWith("u1", { nome: "Ana B. Silva", telefone: "11999990000" });
      expect(mockAtualizarDadosPessoais).toHaveBeenCalledWith("c1", expect.objectContaining({ tituloProfissional: "Dev Sênior" }));
      expect(await findByText("Ana B. Silva")).toBeTruthy();
      expect(await findByText("Dev Sênior")).toBeTruthy();
      // Achado da Fase 15: sem isto, o resto do app (Home, menu do Perfil) ficaria com o nome antigo.
      expect(mockRefreshUser).toHaveBeenCalled();
    });

    it("nome vazio não salva — mostra erro", async () => {
      mockCargaPadrao();
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Ana Beatriz");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar dados pessoais" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Nome"), "");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar" }));
      });

      expect(await findByText("O nome não pode ficar vazio.")).toBeTruthy();
      expect(mockAtualizarUsuario).not.toHaveBeenCalled();
    });

    it("cancelar descarta a edição", async () => {
      mockCargaPadrao();
      const { getByRole, getByLabelText, findByText, queryByLabelText } = await renderTela();
      await findByText("Ana Beatriz");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar dados pessoais" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Nome"), "Nome Descartado");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Cancelar" }));
      });

      expect(queryByLabelText("Nome")).toBeNull();
      expect(await findByText("Ana Beatriz")).toBeTruthy();
      expect(mockAtualizarUsuario).not.toHaveBeenCalled();
    });

    // Achado na auditoria da própria Fase 12: diferente do cadastro de
    // empresa, `PUT /candidatos/:id` não normaliza a UF — confirmado ao
    // vivo contra o backend local. Sem a correção, digitar "sp" gravaria
    // minúsculo, inconsistente com o resto do app (Vagas sempre mostra UF
    // maiúscula).
    it("normaliza o Estado para maiúsculo antes de salvar (o backend não faz isso sozinho)", async () => {
      mockCargaPadrao();
      mockAtualizarUsuario.mockResolvedValue(candidatoBase.usuario);
      mockAtualizarDadosPessoais.mockResolvedValue(candidatoBase);
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Ana Beatriz");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar dados pessoais" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Estado"), "sp");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar" }));
      });

      expect(mockAtualizarDadosPessoais).toHaveBeenCalledWith("c1", expect.objectContaining({ estado: "SP" }));
    });
  });

  describe("experiências", () => {
    it("estado vazio mostra a mensagem certa", async () => {
      mockCargaPadrao();
      const { findByText } = await renderTela();
      expect(await findByText("Nenhuma experiência cadastrada ainda.")).toBeTruthy();
    });

    it("adicionar experiência: exige cargo/empresa/data de início e depois cria e mostra na lista", async () => {
      mockCargaPadrao();
      mockCriarExperiencia.mockResolvedValue({
        id: "e1",
        cargo: "Desenvolvedora",
        empresa: "ACME",
        dataInicio: "2024-01-01",
        atual: true,
      });
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Nenhuma experiência cadastrada ainda.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar experiência" }));
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar experiência" }));
      });
      expect(await findByText("Preencha cargo, empresa e data de início.")).toBeTruthy();
      expect(mockCriarExperiencia).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.changeText(getByLabelText("Cargo"), "Desenvolvedora");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Empresa"), "ACME");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Data de início"), "2024-01-01");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar experiência" }));
      });

      expect(mockCriarExperiencia).toHaveBeenCalledWith(
        expect.objectContaining({ cargo: "Desenvolvedora", empresa: "ACME", dataInicio: "2024-01-01", atual: false }),
      );
      expect(await findByText("Desenvolvedora")).toBeTruthy();
    });

    it("marcar 'emprego atual' esconde o campo de data de término", async () => {
      mockCargaPadrao();
      const { getByRole, getByLabelText, queryByLabelText } = await renderTela();
      await waitFor(() => expect(mockMeuCandidato).toHaveBeenCalled());

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar experiência" }));
      });
      expect(getByLabelText("Data de término")).toBeTruthy();

      // `ToggleRow` usa `Switch` — o evento é `valueChange`, não `press` (sem `onPress`).
      await act(async () => {
        fireEvent(getByLabelText("Este é meu emprego atual"), "valueChange", true);
      });

      expect(queryByLabelText("Data de término")).toBeNull();
    });

    it("editar experiência existente pré-preenche o formulário e salva com atualizarExperiencia", async () => {
      mockCargaPadrao();
      mockListarExperiencias.mockResolvedValue([
        { id: "e1", cargo: "Dev", empresa: "ACME", dataInicio: "2023-01-01", dataFim: "2023-12-01", atual: false },
      ]);
      mockAtualizarExperiencia.mockResolvedValue({
        id: "e1",
        cargo: "Dev Pleno",
        empresa: "ACME",
        dataInicio: "2023-01-01",
        dataFim: "2023-12-01",
        atual: false,
      });
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Dev");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Editar" }));
      });
      expect(getByLabelText("Cargo").props.value).toBe("Dev");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Cargo"), "Dev Pleno");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar experiência" }));
      });

      expect(mockAtualizarExperiencia).toHaveBeenCalledWith("e1", expect.objectContaining({ cargo: "Dev Pleno" }));
      expect(await findByText("Dev Pleno")).toBeTruthy();
    });

    it("excluir pede confirmação e só remove se confirmado", async () => {
      mockCargaPadrao();
      mockListarExperiencias.mockResolvedValue([
        { id: "e1", cargo: "Dev", empresa: "ACME", dataInicio: "2023-01-01", atual: true },
      ]);
      mockRemoverExperiencia.mockResolvedValue(undefined);
      const { getByRole, findByText, queryByText } = await renderTela();
      await findByText("Dev");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Excluir" }));
      });
      expect(mockRemoverExperiencia).not.toHaveBeenCalled();

      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(mockRemoverExperiencia).toHaveBeenCalledWith("e1");
      await waitFor(() => expect(queryByText("Dev")).toBeNull());
    });
  });

  describe("formações", () => {
    it("adicionar formação exige instituição e curso, depois cria e mostra na lista", async () => {
      mockCargaPadrao();
      mockCriarFormacao.mockResolvedValue({ id: "f1", instituicao: "USP", curso: "ADS", emAndamento: true });
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Nenhuma formação cadastrada ainda.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar formação" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Instituição"), "USP");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Curso"), "ADS");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar formação" }));
      });

      expect(mockCriarFormacao).toHaveBeenCalledWith(expect.objectContaining({ instituicao: "USP", curso: "ADS" }));
      expect(await findByText("ADS")).toBeTruthy();
    });
  });

  describe("certificados", () => {
    it("adicionar certificado exige título, depois cria e mostra na lista", async () => {
      mockCargaPadrao();
      mockCriarCertificado.mockResolvedValue({ id: "cert1", titulo: "AWS Certified" });
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Nenhum certificado cadastrado ainda.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar certificado" }));
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar certificado" }));
      });
      expect(await findByText("Preencha o título do certificado.")).toBeTruthy();

      await act(async () => {
        fireEvent.changeText(getByLabelText("Título"), "AWS Certified");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar certificado" }));
      });

      expect(mockCriarCertificado).toHaveBeenCalledWith(expect.objectContaining({ titulo: "AWS Certified" }));
      expect(await findByText("AWS Certified")).toBeTruthy();
    });
  });

  describe("habilidades", () => {
    it("adicionar habilidade exige nome, depois cria e mostra como chip", async () => {
      mockCargaPadrao();
      mockCriarHabilidade.mockResolvedValue({ id: "h1", nome: "React", nivel: "Avançado" });
      const { getByRole, getByLabelText, findByText } = await renderTela();
      await findByText("Nenhuma habilidade cadastrada ainda.");

      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Adicionar habilidade" }));
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Habilidade"), "React");
      });
      await act(async () => {
        fireEvent.changeText(getByLabelText("Nível"), "Avançado");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar habilidade" }));
      });

      expect(mockCriarHabilidade).toHaveBeenCalledWith({ nome: "React", nivel: "Avançado" });
      expect(await findByText("React · Avançado")).toBeTruthy();
    });

    // Achado na auditoria da própria Fase 12: a versão inicial só tinha
    // criar/excluir — sem editar, a única forma de corrigir o nível de uma
    // habilidade era excluir e recriar. Corrigido: tocar no texto do chip edita.
    it("editar habilidade: tocar no chip abre o formulário pré-preenchido e salva com atualizarHabilidade", async () => {
      mockCargaPadrao();
      mockListarHabilidades.mockResolvedValue([{ id: "h1", nome: "React", nivel: "Básico" }]);
      mockAtualizarHabilidade.mockResolvedValue({ id: "h1", nome: "React", nivel: "Avançado" });
      const { getByLabelText, getByRole, findByText } = await renderTela();
      await findByText("React · Básico");

      await act(async () => {
        fireEvent.press(getByLabelText("Editar habilidade React"));
      });
      expect(getByLabelText("Nível").props.value).toBe("Básico");

      await act(async () => {
        fireEvent.changeText(getByLabelText("Nível"), "Avançado");
      });
      await act(async () => {
        fireEvent.press(getByRole("button", { name: "Salvar habilidade" }));
      });

      expect(mockAtualizarHabilidade).toHaveBeenCalledWith("h1", { nome: "React", nivel: "Avançado" });
      expect(await findByText("React · Avançado")).toBeTruthy();
    });

    it("remover habilidade pede confirmação e chama removerHabilidade", async () => {
      mockCargaPadrao();
      mockListarHabilidades.mockResolvedValue([{ id: "h1", nome: "React" }]);
      mockRemoverHabilidade.mockResolvedValue(undefined);
      const { getByLabelText, findByText, queryByText } = await renderTela();
      await findByText("React");

      await act(async () => {
        fireEvent.press(getByLabelText("Remover habilidade React"));
      });
      await act(async () => {
        confirmarViaAlert("Excluir");
      });

      expect(mockRemoverHabilidade).toHaveBeenCalledWith("h1");
      await waitFor(() => expect(queryByText("React")).toBeNull());
    });
  });

  describe("deficiências", () => {
    it("marcar uma deficiência do catálogo chama vincularDeficiencia e passa a mostrar o campo de observações", async () => {
      mockCargaPadrao();
      mockListarDeficiencias.mockResolvedValue([{ id: "d1", nome: "Baixa visão", descricao: "..." }]);
      mockVincularDeficiencia.mockResolvedValue(undefined);
      const { getByLabelText, findByText, queryByLabelText } = await renderTela();
      await findByText("Baixa visão");

      expect(queryByLabelText("Observações")).toBeNull();

      await act(async () => {
        fireEvent(getByLabelText("Baixa visão"), "valueChange", true);
      });

      expect(mockVincularDeficiencia).toHaveBeenCalledWith("c1", "d1");
      expect(await findByText("Observações")).toBeTruthy();
    });

    it("desmarcar uma deficiência já vinculada chama desvincularDeficiencia e esconde as observações", async () => {
      mockCargaPadrao({
        deficiencias: [{ id: "d1", nome: "Baixa visão", CandidatoDeficiencia: { observacoes: "Uso leitor de tela." } }],
      });
      mockListarDeficiencias.mockResolvedValue([{ id: "d1", nome: "Baixa visão" }]);
      mockDesvincularDeficiencia.mockResolvedValue(undefined);
      const { getByLabelText, findByText, queryByLabelText } = await renderTela();
      await findByText("Baixa visão");
      expect(getByLabelText("Observações").props.value).toBe("Uso leitor de tela.");

      await act(async () => {
        fireEvent(getByLabelText("Baixa visão"), "valueChange", false);
      });

      expect(mockDesvincularDeficiencia).toHaveBeenCalledWith("c1", "d1");
      await waitFor(() => expect(queryByLabelText("Observações")).toBeNull());
    });

    it("falha ao vincular mostra mensagem amigável", async () => {
      mockCargaPadrao();
      mockListarDeficiencias.mockResolvedValue([{ id: "d1", nome: "Baixa visão" }]);
      const erro = Object.assign(new Error("falhou"), { isAxiosError: true });
      mockVincularDeficiencia.mockRejectedValue(erro);
      const { getByLabelText, findByText } = await renderTela();
      await findByText("Baixa visão");

      await act(async () => {
        fireEvent(getByLabelText("Baixa visão"), "valueChange", true);
      });

      expect(
        await findByText("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."),
      ).toBeTruthy();
    });
  });
});

describe("MyProfileScreen — roteamento por tipoUsuario (Fase 18)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ refreshUser: mockRefreshUser });
  });

  it("conta empresa: renderiza o perfil de empresa, NUNCA chama PerfilService.meuCandidato", async () => {
    const { EmpresaService } = jest.requireMock("../../empresas") as {
      EmpresaService: { meuPerfil: jest.Mock };
    };
    mockUseAuth.mockReturnValue({
      refreshUser: mockRefreshUser,
      user: { id: "u9", nome: "ACME", email: "acme@exemplo.com", tipoUsuario: "empresa" },
    });
    EmpresaService.meuPerfil.mockResolvedValue({
      id: "e1",
      usuarioId: "u9",
      razaoSocial: "ACME Ltda",
      statusAprovacao: "aprovada",
    });

    const { findByText } = await renderTela();

    expect(await findByText("Razão social")).toBeTruthy();
    expect(mockMeuCandidato).not.toHaveBeenCalled();
  });

  it("conta candidato (ou sem user ainda resolvido): renderiza o perfil de candidato normalmente", async () => {
    mockCargaPadrao();
    const { EmpresaService } = jest.requireMock("../../empresas") as {
      EmpresaService: { meuPerfil: jest.Mock };
    };

    const { findByText } = await renderTela();

    expect(await findByText("Ana Beatriz")).toBeTruthy();
    expect(EmpresaService.meuPerfil).not.toHaveBeenCalled();
  });
});
