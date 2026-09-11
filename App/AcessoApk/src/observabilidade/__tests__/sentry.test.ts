/* eslint-disable @typescript-eslint/no-require-imports -- este arquivo testa estado interno do módulo (`ativo`); `jest.resetModules()` + `require()` fresco por teste é a técnica padrão do Jest pra isso, um import ES no topo não serviria (só rodaria uma vez). */
const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockSetUser = jest.fn();

jest.mock("@sentry/react-native", () => ({
  init: (...a: unknown[]) => mockInit(...a),
  captureException: (...a: unknown[]) => mockCaptureException(...a),
  setUser: (...a: unknown[]) => mockSetUser(...a),
}));

const mockSentryDsn: { valor: string | null } = { valor: null };
jest.mock("../../config/env", () => ({
  get SENTRY_DSN() {
    return mockSentryDsn.valor;
  },
}));

describe("observabilidade/sentry", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockSentryDsn.valor = null;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("sem DSN configurado, inicializarObservabilidade nunca chama Sentry.init", () => {
    const { inicializarObservabilidade } = require("../sentry");
    inicializarObservabilidade();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("com DSN configurado, inicializarObservabilidade chama Sentry.init com o DSN", () => {
    mockSentryDsn.valor = "https://exemplo@sentry.io/1";
    const { inicializarObservabilidade } = require("../sentry");
    inicializarObservabilidade();
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ dsn: "https://exemplo@sentry.io/1" }));
  });

  it("sem inicializar, capturarErro nunca chama Sentry.captureException — cai pro console.error local", () => {
    const { capturarErro } = require("../sentry");
    const erro = new Error("falhou");

    capturarErro(erro, { tela: "Teste" });

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Sentry não configurado"), erro, { tela: "Teste" });
  });

  it("depois de inicializar com DSN, capturarErro chama Sentry.captureException", () => {
    mockSentryDsn.valor = "https://exemplo@sentry.io/1";
    const { inicializarObservabilidade, capturarErro } = require("../sentry");
    inicializarObservabilidade();

    const erro = new Error("falhou");
    capturarErro(erro, { tela: "Teste" });

    expect(mockCaptureException).toHaveBeenCalledWith(erro, { extra: { tela: "Teste" } });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("sem inicializar, definirUsuarioObservabilidade nunca chama Sentry.setUser", () => {
    const { definirUsuarioObservabilidade } = require("../sentry");
    definirUsuarioObservabilidade("u1");
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it("depois de inicializar, definirUsuarioObservabilidade chama Sentry.setUser só com o id (nunca nome/e-mail)", () => {
    mockSentryDsn.valor = "https://exemplo@sentry.io/1";
    const { inicializarObservabilidade, definirUsuarioObservabilidade } = require("../sentry");
    inicializarObservabilidade();

    definirUsuarioObservabilidade("u1");
    expect(mockSetUser).toHaveBeenCalledWith({ id: "u1" });

    definirUsuarioObservabilidade(null);
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });
});
