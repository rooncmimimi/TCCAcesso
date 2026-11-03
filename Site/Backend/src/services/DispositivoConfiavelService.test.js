import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

/**
 * Verificação por e-mail em dispositivo novo: o que o `DispositivoConfiavelService` decide sobre o código (uso único, tentativas,
 * reenvio, espera, validade), o reconhecimento do aparelho pelo token e a lista de dispositivos de confiança. O banco é
 * simulado; a atomicidade, o trancamento de linha e a migration 0010 são conferidos na rodada funcional contra um Postgres
 * descartável (`Site/docs/dispositivos-e-conta-comprometida.md`).
 */

const SEGREDO = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

const { env, modelos, email, eventos, transacao } = vi.hoisted(() => {
    const transacao = { LOCK: { UPDATE: "UPDATE" }, finished: false, commit: vi.fn(), rollback: vi.fn() };

    return {
        env: {
            jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres", expiresIn: "30m" },
            seguranca: { dispositivosHabilitado: true, diasDeConfianca: 90 }
        },
        modelos: {
            DesafioDeDispositivo: { count: vi.fn(), update: vi.fn(), create: vi.fn(), findByPk: vi.fn(), destroy: vi.fn() },
            DispositivoConfiavel: { findOne: vi.fn(), findAll: vi.fn(), create: vi.fn(), update: vi.fn(), destroy: vi.fn() },
            LinkDeSeguranca: { create: vi.fn(), destroy: vi.fn() },
            Usuario: { findByPk: vi.fn() }
        },
        email: { disponivel: vi.fn(() => true), enviar: vi.fn() },
        eventos: { registrar: vi.fn() },
        transacao
    };
});

vi.mock("../config/env.js", () => ({ default: env }));
vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn(async () => transacao) } }));
vi.mock("../models/index.js", () => modelos);
vi.mock("./EmailService.js", () => ({ default: email }));
vi.mock("./SegurancaEventosService.js", () => ({ default: eventos }));
vi.mock("../utils/urlFrontend.js", () => ({
    montarUrlFrontend: vi.fn((caminho, params) => `https://site.exemplo${caminho}?token=${params.token}`)
}));

const { default: Servico, hmacDoCodigo } = await import("./DispositivoConfiavelService.js");
const { hashToken } = await import("../utils/tokens.js");
const { assinarDesafioDispositivo, verificarJwt } = await import("../utils/jwt.js");

const usuario = { id: "u1", nome: "Ana", email: "ana@exemplo.com" };
const CONTEXTO = { ip: "1.1.1.1", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537" };

/** O código que o servidor mandou por e-mail, lido do que `EmailService.enviar` recebeu. */
const codigoEnviado = () => /\b(\d{6})\b/.exec(email.enviar.mock.calls.at(-1)[0].texto)[1];

function desafioNoBanco(extra = {}) {
    const linha = {
        id: "d1",
        usuarioId: "u1",
        codigoHash: hmacDoCodigo("123456", "d1"),
        expiraEm: new Date(Date.now() + 10 * 60 * 1000),
        tentativas: 0,
        reenvios: 0,
        utilizadoEm: null,
        substituidoEm: null,
        criadoEm: new Date(Date.now() - 120 * 1000),
        update: vi.fn(async function (dados) {
            Object.assign(this, dados);
        }),
        ...extra
    };

    modelos.DesafioDeDispositivo.findByPk.mockResolvedValue(linha);

    return linha;
}

const jwtDoDesafio = (extra = {}) => assinarDesafioDispositivo({ sub: "u1", did: "d1", cr: 0, ...extra });

beforeEach(() => {
    vi.clearAllMocks();
    env.seguranca.dispositivosHabilitado = true;
    env.seguranca.diasDeConfianca = 90;
    email.disponivel.mockReturnValue(true);
    email.enviar.mockResolvedValue({ enviado: true });
    transacao.finished = false;
    transacao.commit.mockImplementation(async () => {
        transacao.finished = true;
    });
    transacao.rollback.mockImplementation(async () => {
        transacao.finished = true;
    });
    modelos.DesafioDeDispositivo.count.mockResolvedValue(0);
    modelos.DesafioDeDispositivo.update.mockResolvedValue([0]);
    modelos.DesafioDeDispositivo.create.mockImplementation(async (dados) => ({
        ...dados,
        criadoEm: new Date(),
        update: vi.fn()
    }));
    modelos.DispositivoConfiavel.update.mockResolvedValue([0]);
    modelos.LinkDeSeguranca.create.mockResolvedValue({});
});

describe("habilitado / disponivel", () => {
    it("chave desligada: nada disponível, e exigirHabilitado responde 503", () => {
        env.seguranca.dispositivosHabilitado = false;

        expect(Servico.habilitado()).toBe(false);
        expect(Servico.disponivel()).toBe(false);
        expect(() => Servico.exigirHabilitado()).toThrow(expect.objectContaining({ statusCode: 503 }));
    });

    it("ligada mas sem e-mail capaz de enviar: habilitado, porém INATIVO (ninguém é trancado para fora)", () => {
        email.disponivel.mockReturnValue(false);

        expect(Servico.habilitado()).toBe(true);
        expect(Servico.disponivel()).toBe(false);
    });

    it("ligada e com e-mail: disponível", () => {
        expect(Servico.disponivel()).toBe(true);
    });
});

describe("reconhecido", () => {
    it.each([[undefined], [null], [""], [123], ["x".repeat(201)]])("token inválido (%s): não consulta o banco", async (token) => {
        expect(await Servico.reconhecido("u1", token)).toBe(false);
        expect(modelos.DispositivoConfiavel.findOne).not.toHaveBeenCalled();
    });

    it("procura pelo HASH do token, da própria conta, sem revogação e dentro do prazo", async () => {
        modelos.DispositivoConfiavel.findOne.mockResolvedValue(null);

        await Servico.reconhecido("u1", "token-do-aparelho");

        const { where } = modelos.DispositivoConfiavel.findOne.mock.calls[0][0];

        expect(where.usuarioId).toBe("u1");
        expect(where.tokenHash).toBe(hashToken("token-do-aparelho"));
        expect(JSON.stringify(where)).not.toContain("token-do-aparelho");
        expect(where.revogadoEm).toBeNull();
        expect(Object.getOwnPropertySymbols(where.expiraEm)).toHaveLength(1);
    });

    it("aparelho conhecido: registra o uso e reconhece; desconhecido: não", async () => {
        const dispositivo = { update: vi.fn() };
        modelos.DispositivoConfiavel.findOne.mockResolvedValueOnce(dispositivo).mockResolvedValueOnce(null);

        expect(await Servico.reconhecido("u1", "a")).toBe(true);
        expect(dispositivo.update).toHaveBeenCalledWith({ ultimoUsoEm: expect.any(Date) });
        expect(await Servico.reconhecido("u1", "b")).toBe(false);
    });
});

describe("iniciarVerificacao (passo 1)", () => {
    it("manda o código de 6 números por e-mail e devolve o desafio, SEM sessão nem token", async () => {
        const r = await Servico.iniciarVerificacao(usuario, CONTEXTO);

        expect(r.verificacaoDispositivo).toBe(true);
        expect(r.emailMascarado).toBe("an***@exemplo.com");
        expect(r.validadeEmMinutos).toBe(15);
        expect(r.reenvioEmSegundos).toBe(60);
        expect(r.token).toBeUndefined();
        expect(r.refreshToken).toBeUndefined();
        expect(email.enviar).toHaveBeenCalledOnce();
        expect(codigoEnviado()).toMatch(/^\d{6}$/);
        expect(email.enviar.mock.calls[0][0]).toMatchObject({ para: "ana@exemplo.com", tag: "verificacao-dispositivo" });
    });

    it("guarda só o HMAC do código (nunca o número) e o prende ao desafio", async () => {
        await Servico.iniciarVerificacao(usuario, CONTEXTO);

        const gravado = modelos.DesafioDeDispositivo.create.mock.calls[0][0];
        const codigo = codigoEnviado();

        expect(gravado.codigoHash).toBe(hmacDoCodigo(codigo, gravado.id));
        expect(gravado.codigoHash).not.toContain(codigo);
        expect(gravado.codigoHash).not.toBe(hmacDoCodigo(codigo, "outro-desafio"));
        expect(JSON.stringify(gravado)).not.toContain(`"${codigo}"`);
    });

    it("o desafio assinado tem audiência própria: não abre sessão e leva só a conta e o id do desafio", async () => {
        const { desafioDispositivo } = await Servico.iniciarVerificacao(usuario, CONTEXTO, { confirmarReativacao: true });
        const carga = jwt.decode(desafioDispositivo);

        expect(carga).toMatchObject({ sub: "u1", cr: 1, aud: "acesso:dispositivo-desafio" });
        expect(carga.exp - carga.iat).toBe(20 * 60);
        expect(() => verificarJwt(desafioDispositivo)).toThrow();
    });

    it("um código novo invalida o anterior da mesma conta", async () => {
        await Servico.iniciarVerificacao(usuario, CONTEXTO);

        const [dados, opcoes] = modelos.DesafioDeDispositivo.update.mock.calls[0];

        expect(dados.substituidoEm).toBeInstanceOf(Date);
        expect(opcoes.where).toMatchObject({ usuarioId: "u1", utilizadoEm: null, substituidoEm: null });
    });

    it("no máximo 6 códigos por hora: o 7º é recusado com 429 e nada é enviado", async () => {
        modelos.DesafioDeDispositivo.count.mockResolvedValue(6);

        await expect(Servico.iniciarVerificacao(usuario, CONTEXTO)).rejects.toMatchObject({
            statusCode: 429,
            detalhes: { codigo: "DISPOSITIVO_CODIGOS_DEMAIS" }
        });
        expect(email.enviar).not.toHaveBeenCalled();
        expect(modelos.DesafioDeDispositivo.create).not.toHaveBeenCalled();
    });

    it("e-mail que falha: 503, e o desafio fica inutilizado (ninguém entra sem a verificação)", async () => {
        email.enviar.mockRejectedValue(new Error("brevo fora do ar"));
        const marcar = vi.fn();
        modelos.DesafioDeDispositivo.create.mockImplementation(async (dados) => ({ ...dados, update: marcar }));

        await expect(Servico.iniciarVerificacao(usuario, CONTEXTO)).rejects.toMatchObject({ statusCode: 503 });
        expect(marcar).toHaveBeenCalledWith({ substituidoEm: expect.any(Date) });
    });
});

describe("confirmar (passo 2)", () => {
    it("código certo: marca como usado e devolve a conta e a escolha de reativação", async () => {
        const linha = desafioNoBanco();

        expect(await Servico.confirmar(jwtDoDesafio({ cr: 1 }), "123456")).toEqual({ usuarioId: "u1", confirmarReativacao: true });
        expect(linha.utilizadoEm).toBeInstanceOf(Date);
        expect(transacao.commit).toHaveBeenCalled();
    });

    it("o código só vale uma vez", async () => {
        desafioNoBanco({ utilizadoEm: new Date() });

        await expect(Servico.confirmar(jwtDoDesafio(), "123456")).rejects.toMatchObject({
            detalhes: { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" }
        });
    });

    it("código errado: conta a tentativa, diz quantas restam e NÃO usa o desafio", async () => {
        const linha = desafioNoBanco();

        await expect(Servico.confirmar(jwtDoDesafio(), "000000")).rejects.toMatchObject({
            detalhes: { codigo: "DISPOSITIVO_CODIGO_INVALIDO", tentativasRestantes: 4 }
        });
        expect(linha.tentativas).toBe(1);
        expect(linha.utilizadoEm).toBeNull();
        expect(transacao.commit).toHaveBeenCalled();
    });

    it("a 5ª tentativa errada avisa que é preciso pedir outro código; depois disso nem o código certo vale", async () => {
        desafioNoBanco({ tentativas: 4 });

        await expect(Servico.confirmar(jwtDoDesafio(), "000000")).rejects.toMatchObject({
            detalhes: { codigo: "DISPOSITIVO_CODIGO_INVALIDO", tentativasRestantes: 0 }
        });

        desafioNoBanco({ tentativas: 5 });

        await expect(Servico.confirmar(jwtDoDesafio(), "123456")).rejects.toMatchObject({
            statusCode: 429,
            detalhes: { codigo: "DISPOSITIVO_TENTATIVAS_DEMAIS" }
        });
    });

    it("desafio vencido ou substituído por um código mais novo: expirado", async () => {
        desafioNoBanco({ expiraEm: new Date(Date.now() - 1000) });
        await expect(Servico.confirmar(jwtDoDesafio(), "123456")).rejects.toMatchObject({ detalhes: { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" } });

        desafioNoBanco({ substituidoEm: new Date() });
        await expect(Servico.confirmar(jwtDoDesafio(), "123456")).rejects.toMatchObject({ detalhes: { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" } });
    });

    it("desafio de OUTRA conta no mesmo id não vale", async () => {
        desafioNoBanco({ usuarioId: "outro" });

        await expect(Servico.confirmar(jwtDoDesafio(), "123456")).rejects.toMatchObject({ detalhes: { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" } });
    });

    it.each([["lixo"], [""], [jwt.sign({ sub: "u1", did: "d1" }, SEGREDO)], [jwt.sign({ sub: "u1", did: "d1" }, "outro-segredo-qualquer-com-32-caracteres!!", { audience: "acesso:dispositivo-desafio", issuer: "acesso-api" })]])(
        "desafio que não é um desafio assinado por nós (%#): expirado",
        async (falso) => {
            await expect(Servico.confirmar(falso, "123456")).rejects.toMatchObject({ detalhes: { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" } });
            expect(modelos.DesafioDeDispositivo.findByPk).not.toHaveBeenCalled();
        }
    );

    it("um access token comum NÃO serve de desafio", async () => {
        const acesso = jwt.sign({ id: "u1" }, SEGREDO, { issuer: "acesso-api", expiresIn: "5m" });

        await expect(Servico.confirmar(acesso, "123456")).rejects.toMatchObject({ detalhes: { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" } });
    });

    it("o código de um desafio não vale em outro (HMAC preso ao id)", async () => {
        desafioNoBanco({ id: "d2", codigoHash: hmacDoCodigo("123456", "d1") });

        await expect(Servico.confirmar(jwtDoDesafio({ did: "d2" }), "123456")).rejects.toMatchObject({
            detalhes: { codigo: "DISPOSITIVO_CODIGO_INVALIDO" }
        });
    });

    it("confere dentro de uma transação com a linha trancada", async () => {
        desafioNoBanco();

        await Servico.confirmar(jwtDoDesafio(), "123456");

        expect(modelos.DesafioDeDispositivo.findByPk).toHaveBeenCalledWith("d1", { transaction: transacao, lock: "UPDATE" });
    });
});

describe("reenviar", () => {
    it("antes de 60 segundos: 429 com o tempo que falta, sem enviar", async () => {
        desafioNoBanco({ criadoEm: new Date(Date.now() - 20 * 1000) });

        await expect(Servico.reenviar(jwtDoDesafio(), CONTEXTO)).rejects.toMatchObject({
            statusCode: 429,
            detalhes: { codigo: "DISPOSITIVO_REENVIO_ESPERA", segundos: 40 }
        });
        expect(email.enviar).not.toHaveBeenCalled();
    });

    it("depois de 3 reenvios: 429, sem enviar", async () => {
        desafioNoBanco({ reenvios: 3 });

        await expect(Servico.reenviar(jwtDoDesafio(), CONTEXTO)).rejects.toMatchObject({
            detalhes: { codigo: "DISPOSITIVO_REENVIOS_DEMAIS" }
        });
        expect(email.enviar).not.toHaveBeenCalled();
    });

    it("desafio já usado ou substituído: expirado", async () => {
        desafioNoBanco({ utilizadoEm: new Date() });

        await expect(Servico.reenviar(jwtDoDesafio(), CONTEXTO)).rejects.toMatchObject({ detalhes: { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" } });
    });

    it("reenvio válido: código novo, contador +1, a escolha de reativação preservada e o código antigo invalidado", async () => {
        desafioNoBanco({ reenvios: 1 });
        modelos.Usuario.findByPk.mockResolvedValue(usuario);

        const r = await Servico.reenviar(jwtDoDesafio({ cr: 1 }), CONTEXTO);

        expect(modelos.DesafioDeDispositivo.create.mock.calls[0][0].reenvios).toBe(2);
        expect(jwt.decode(r.desafioDispositivo).cr).toBe(1);
        expect(modelos.DesafioDeDispositivo.update).toHaveBeenCalled();
        expect(email.enviar).toHaveBeenCalledOnce();
    });
});

describe("confiar / listar / revogar", () => {
    it("confiar devolve o token UMA vez; o banco guarda só o hash, com o prazo configurado", async () => {
        env.seguranca.diasDeConfianca = 30;

        const token = await Servico.confiar("u1", CONTEXTO);
        const gravado = modelos.DispositivoConfiavel.create.mock.calls[0][0];

        expect(token.length).toBeGreaterThanOrEqual(40);
        expect(gravado.tokenHash).toBe(hashToken(token));
        expect(JSON.stringify(gravado)).not.toContain(token);
        expect(gravado.rotulo).toBe("Chrome · Windows");

        const dias = (gravado.expiraEm.getTime() - Date.now()) / 86_400_000;

        expect(dias).toBeGreaterThan(29.9);
        expect(dias).toBeLessThanOrEqual(30);
        expect(eventos.registrar).toHaveBeenCalledWith("u1", "dispositivo_confiavel_adicionado", CONTEXTO);
    });

    it("listar nunca devolve o hash nem o token, e marca o aparelho atual", async () => {
        modelos.DispositivoConfiavel.findAll.mockResolvedValue([
            { id: "a", tokenHash: hashToken("meu"), rotulo: "Chrome · Windows", ip: "1.1.1.1", criadoEm: 1, ultimoUsoEm: 2, expiraEm: 3 },
            { id: "b", tokenHash: hashToken("outro"), rotulo: null, ip: null, criadoEm: 1, ultimoUsoEm: 2, expiraEm: 3 }
        ]);

        const lista = await Servico.listar("u1", "meu");

        expect(lista.map((d) => d.atual)).toEqual([true, false]);
        expect(lista[1].rotulo).toBe("Dispositivo desconhecido");
        expect(JSON.stringify(lista)).not.toContain("tokenHash");
        expect(JSON.stringify(lista)).not.toContain(hashToken("meu"));
    });

    it("revogar só alcança dispositivo da própria conta; de outra conta (ou inexistente) é 404", async () => {
        modelos.DispositivoConfiavel.findOne.mockResolvedValue(null);

        await expect(Servico.revogar("u1", "id-de-outra-conta", CONTEXTO)).rejects.toMatchObject({ statusCode: 404 });
        expect(modelos.DispositivoConfiavel.findOne.mock.calls[0][0].where).toMatchObject({ id: "id-de-outra-conta", usuarioId: "u1", revogadoEm: null });
    });

    it("revogar marca a data e registra o evento", async () => {
        const d = { rotulo: "Firefox · Linux", update: vi.fn() };
        modelos.DispositivoConfiavel.findOne.mockResolvedValue(d);

        await Servico.revogar("u1", "a", CONTEXTO);

        expect(d.update).toHaveBeenCalledWith({ revogadoEm: expect.any(Date) });
        expect(eventos.registrar).toHaveBeenCalledWith("u1", "dispositivo_confiavel_revogado", CONTEXTO, { rotulo: "Firefox · Linux" });
    });

    it("revogarTodos devolve quantos eram e só registra o evento quando recebe o contexto", async () => {
        modelos.DispositivoConfiavel.update.mockResolvedValue([3]);

        expect(await Servico.revogarTodos("u1")).toBe(3);
        expect(eventos.registrar).not.toHaveBeenCalled();

        await Servico.revogarTodos("u1", { contexto: CONTEXTO });

        expect(eventos.registrar).toHaveBeenCalledWith("u1", "dispositivos_confiaveis_revogados", CONTEXTO, { quantidade: 3 });
    });
});

describe("notificarNovoAcesso", () => {
    it("cria o link \"Não fui eu\" (7 dias, só o hash no banco) e manda no e-mail", async () => {
        await Servico.notificarNovoAcesso(usuario, CONTEXTO);

        const gravado = modelos.LinkDeSeguranca.create.mock.calls[0][0];
        const { texto } = email.enviar.mock.calls[0][0];
        const token = /token=([^\s]+)/.exec(texto)[1];

        expect(gravado.tipo).toBe("nao_fui_eu");
        expect(gravado.tokenHash).toBe(hashToken(token));
        expect(Math.round((gravado.expiraEm.getTime() - Date.now()) / 86_400_000)).toBe(7);
    });

    it("falha no envio NUNCA propaga: o login já foi concluído", async () => {
        email.enviar.mockRejectedValue(new Error("fora do ar"));
        const erro = vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(Servico.notificarNovoAcesso(usuario, CONTEXTO)).resolves.toBeUndefined();
        expect(erro).toHaveBeenCalled();
        expect(erro.mock.calls[0][0]).not.toContain("ana@exemplo.com");

        erro.mockRestore();
    });
});

describe("limparAntigos", () => {
    it("apaga desafios com mais de 1 dia, links vencidos há mais de 7 e dispositivos vencidos ou revogados há mais de 30", async () => {
        modelos.DesafioDeDispositivo.destroy.mockResolvedValue(2);
        modelos.LinkDeSeguranca.destroy.mockResolvedValue(1);
        modelos.DispositivoConfiavel.destroy.mockResolvedValue(4);

        expect(await Servico.limparAntigos()).toEqual({ desafios: 2, links: 1, dispositivos: 4 });
        expect(modelos.DesafioDeDispositivo.destroy).toHaveBeenCalledOnce();
        expect(modelos.LinkDeSeguranca.destroy).toHaveBeenCalledOnce();
        expect(modelos.DispositivoConfiavel.destroy).toHaveBeenCalledOnce();
    });
});
