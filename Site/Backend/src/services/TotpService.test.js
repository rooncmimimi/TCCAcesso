import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Regras do TotpService, com o banco simulado por um armazenamento em memória que respeita o que o
 * banco garante (uma linha por conta, código de recuperação marcado como usado uma única vez). O que só
 * o Postgres de verdade prova (trancamento de linha, duas conferências ao mesmo tempo) é conferido na
 * rodada funcional contra um banco descartável, descrita em `Site/docs/verificacao-em-duas-etapas.md`.
 */

const { env, banco, models, auditoria, sessoes, comparar } = vi.hoisted(() => {
    const banco = { totp: new Map(), codigos: [], usuarios: new Map() };

    const linha = (valores) => {
        const instancia = { ...valores };
        instancia.update = vi.fn(async (novos) => {
            Object.assign(instancia, novos);
            return instancia;
        });
        return instancia;
    };

    return {
        env: { jwt: { secret: "k".repeat(64) }, mfa: { habilitado: true, chaveCifra: null, emissor: "ACESSO" } },
        banco,
        models: {
            AutenticacaoTotp: {
                findByPk: vi.fn(async (id) => banco.totp.get(id) ?? null),
                create: vi.fn(async (valores) => {
                    const nova = linha({ tentativasFalhas: 0, bloqueadoAte: null, ultimoPasso: null, ...valores });
                    banco.totp.set(valores.usuarioId, nova);
                    return nova;
                }),
                destroy: vi.fn(async ({ where }) => (banco.totp.delete(where.usuarioId) ? 1 : 0))
            },
            CodigoRecuperacaoTotp: {
                update: vi.fn(async (valores, { where }) => {
                    const alvo = banco.codigos.filter(
                        (c) =>
                            c.usuarioId === where.usuarioId &&
                            c.codigoHash === where.codigoHash &&
                            // O fake só aplica o filtro que o código pediu: sem `usadoEm: null` no where, reaproveitaria o código.
                            (!("usadoEm" in where) || c.usadoEm === where.usadoEm)
                    );
                    alvo.forEach((c) => Object.assign(c, valores));
                    return [alvo.length];
                }),
                count: vi.fn(async ({ where }) => banco.codigos.filter((c) => c.usuarioId === where.usuarioId && c.usadoEm === null).length),
                destroy: vi.fn(async ({ where }) => {
                    banco.codigos = banco.codigos.filter((c) => c.usuarioId !== where.usuarioId);
                }),
                bulkCreate: vi.fn(async (itens) => {
                    banco.codigos.push(...itens.map((i) => ({ usadoEm: null, ...i })));
                })
            },
            Usuario: {
                findByPk: vi.fn(async (id) => banco.usuarios.get(id) ?? null),
                scope: vi.fn(() => ({ findByPk: vi.fn(async (id) => banco.usuarios.get(id) ?? null) }))
            }
        },
        auditoria: { registrar: vi.fn() },
        sessoes: { revogarTodos: vi.fn() },
        comparar: vi.fn()
    };
});

vi.mock("../config/env.js", () => ({ default: env }));
vi.mock("../config/bancoDeDados.js", () => ({
    default: {
        transaction: vi.fn(async () => {
            const t = { LOCK: { UPDATE: "UPDATE" }, finished: false };
            t.commit = vi.fn(async () => { t.finished = "commit"; });
            t.rollback = vi.fn(async () => { t.finished = "rollback"; });
            return t;
        })
    }
}));
vi.mock("../models/index.js", () => models);
vi.mock("./AdminAuditoriaService.js", () => ({ default: auditoria }));
vi.mock("./SessaoService.js", () => ({ default: sessoes }));
vi.mock("../utils/bcrypt.js", () => ({ compararSenha: comparar }));

const { default: TotpService } = await import("./TotpService.js");
const { cifrarSegredoTotp, hashCodigoDeRecuperacao, selarConfiguracao } = await import("../utils/segredosMfa.js");
const { codigoDoPasso, gerarSegredoBase32, passoDoInstante } = await import("../utils/totp.js");

const AGORA = 1_700_000_000_000;
const PASSO = passoDoInstante(AGORA);

const candidata = { id: "u-cand", tipoUsuario: "candidato", email: "ana@exemplo.com" };
const admin = { id: "u-adm", tipoUsuario: "administrador", email: "adm@exemplo.com" };
const outroAdmin = { id: "u-adm2", tipoUsuario: "administrador", email: "adm2@exemplo.com" };

/** Põe um TOTP ativo na conta e devolve o segredo em claro para os testes gerarem códigos. */
async function ativarNoBanco(usuario, extra = {}) {
    const segredo = gerarSegredoBase32();
    await models.AutenticacaoTotp.create({
        usuarioId: usuario.id,
        segredoCifrado: cifrarSegredoTotp(segredo, usuario.id),
        confirmadoEm: new Date(AGORA - 3600_000),
        ...extra
    });
    return segredo;
}

const codigoLivre = (usuarioId, codigo) => banco.codigos.push({ usuarioId, codigoHash: hashCodigoDeRecuperacao(codigo), usadoEm: null });

beforeEach(() => {
    vi.clearAllMocks();
    banco.totp.clear();
    banco.codigos = [];
    banco.usuarios.clear();
    for (const u of [candidata, admin, outroAdmin]) banco.usuarios.set(u.id, { ...u, senhaHash: "hash" });
    env.mfa.habilitado = true;
    comparar.mockResolvedValue(true);
});

describe("conferirSegundoFator: código do aplicativo", () => {
    it("aceita o código certo e guarda o intervalo usado", async () => {
        const segredo = await ativarNoBanco(candidata);

        const r = await TotpService.conferirSegundoFator(candidata.id, codigoDoPasso(segredo, PASSO), { agora: AGORA });

        expect(r).toEqual({ ok: true, metodo: "totp" });
        expect(banco.totp.get(candidata.id).ultimoPasso).toBe(PASSO);
    });

    it("o mesmo código não vale duas vezes (replay)", async () => {
        const segredo = await ativarNoBanco(candidata);
        const codigo = codigoDoPasso(segredo, PASSO);

        expect((await TotpService.conferirSegundoFator(candidata.id, codigo, { agora: AGORA })).ok).toBe(true);
        expect((await TotpService.conferirSegundoFator(candidata.id, codigo, { agora: AGORA })).ok).toBe(false);
    });

    it("um código de intervalo anterior ao último usado também é recusado", async () => {
        const segredo = await ativarNoBanco(candidata);

        await TotpService.conferirSegundoFator(candidata.id, codigoDoPasso(segredo, PASSO), { agora: AGORA });

        expect((await TotpService.conferirSegundoFator(candidata.id, codigoDoPasso(segredo, PASSO - 1), { agora: AGORA })).ok).toBe(false);
    });

    it("o código do intervalo seguinte (relógio adiantado) é aceito", async () => {
        const segredo = await ativarNoBanco(candidata);

        expect((await TotpService.conferirSegundoFator(candidata.id, codigoDoPasso(segredo, PASSO + 1), { agora: AGORA })).ok).toBe(true);
    });

    it("código errado conta uma falha e não revela nada", async () => {
        await ativarNoBanco(candidata);

        const r = await TotpService.conferirSegundoFator(candidata.id, "000000", { agora: AGORA });

        expect(r).toEqual({ ok: false, metodo: null });
        expect(banco.totp.get(candidata.id).tentativasFalhas).toBe(1);
    });

    it("conta sem TOTP não confere (sem lançar)", async () => {
        expect(await TotpService.conferirSegundoFator("ninguem", "123456", { agora: AGORA })).toEqual({ ok: false, metodo: null });
    });
});

describe("conferirSegundoFator: espera depois de erros seguidos", () => {
    it("na 5ª falha a conta espera 1 minuto, e até o código certo é recusado com 429", async () => {
        const segredo = await ativarNoBanco(candidata);

        for (let i = 0; i < 5; i += 1) {
            await TotpService.conferirSegundoFator(candidata.id, "000000", { agora: AGORA });
        }

        await expect(TotpService.conferirSegundoFator(candidata.id, codigoDoPasso(segredo, PASSO), { agora: AGORA + 1000 })).rejects.toMatchObject({
            statusCode: 429,
            detalhes: { codigo: "MFA_ESPERA" }
        });
    });

    it("a espera cresce: 5ª = 1 min, 6ª = 5 min, 7ª = 15 min, 8ª em diante = 60 min", async () => {
        await ativarNoBanco(candidata);
        const esperas = [];

        for (let i = 1; i <= 9; i += 1) {
            const registro = banco.totp.get(candidata.id);
            registro.bloqueadoAte = null; // simula o tempo ter passado, para continuar errando
            await TotpService.conferirSegundoFator(candidata.id, "000000", { agora: AGORA });
            esperas.push(registro.bloqueadoAte ? Math.round((registro.bloqueadoAte.getTime() - AGORA) / 60000) : 0);
        }

        expect(esperas).toEqual([0, 0, 0, 0, 1, 5, 15, 60, 60]);
    });

    it("passada a espera, o código certo volta a valer e zera o contador", async () => {
        const segredo = await ativarNoBanco(candidata);

        for (let i = 0; i < 5; i += 1) await TotpService.conferirSegundoFator(candidata.id, "000000", { agora: AGORA });

        const depois = AGORA + 61_000;
        const r = await TotpService.conferirSegundoFator(candidata.id, codigoDoPasso(segredo, passoDoInstante(depois)), { agora: depois });

        expect(r.ok).toBe(true);
        expect(banco.totp.get(candidata.id).tentativasFalhas).toBe(0);
        expect(banco.totp.get(candidata.id).bloqueadoAte).toBeNull();
    });

    it("acertar zera as falhas anteriores", async () => {
        const segredo = await ativarNoBanco(candidata);
        await TotpService.conferirSegundoFator(candidata.id, "000000", { agora: AGORA });
        await TotpService.conferirSegundoFator(candidata.id, "000000", { agora: AGORA });

        await TotpService.conferirSegundoFator(candidata.id, codigoDoPasso(segredo, PASSO), { agora: AGORA });

        expect(banco.totp.get(candidata.id).tentativasFalhas).toBe(0);
    });
});

describe("conferirSegundoFator: código de recuperação", () => {
    it("vale uma vez só", async () => {
        await ativarNoBanco(candidata);
        codigoLivre(candidata.id, "ABCDE-FGHJK");

        expect(await TotpService.conferirSegundoFator(candidata.id, "ABCDE-FGHJK", { agora: AGORA })).toEqual({ ok: true, metodo: "recuperacao" });
        expect((await TotpService.conferirSegundoFator(candidata.id, "ABCDE-FGHJK", { agora: AGORA })).ok).toBe(false);
    });

    it("aceita minúsculas e sem hífen", async () => {
        await ativarNoBanco(candidata);
        codigoLivre(candidata.id, "ABCDE-FGHJK");

        expect((await TotpService.conferirSegundoFator(candidata.id, "abcde fghjk", { agora: AGORA })).ok).toBe(true);
    });

    it("não serve para outra conta", async () => {
        await ativarNoBanco(candidata);
        await ativarNoBanco(admin);
        codigoLivre(candidata.id, "ABCDE-FGHJK");

        expect((await TotpService.conferirSegundoFator(admin.id, "ABCDE-FGHJK", { agora: AGORA })).ok).toBe(false);
    });

    it("um código de recuperação errado conta como falha", async () => {
        await ativarNoBanco(candidata);

        await TotpService.conferirSegundoFator(candidata.id, "ZZZZZ-ZZZZZ", { agora: AGORA });

        expect(banco.totp.get(candidata.id).tentativasFalhas).toBe(1);
    });
});

describe("configurar e ativar", () => {
    it("com o recurso desligado, responde 503 e não gera segredo", async () => {
        env.mfa.habilitado = false;

        await expect(TotpService.iniciarConfiguracao(candidata)).rejects.toMatchObject({ statusCode: 503 });
    });

    it("iniciar devolve a chave, o endereço do QR e a configuração selada, sem gravar nada", async () => {
        const r = await TotpService.iniciarConfiguracao(candidata);

        expect(r.segredo).toMatch(/^[A-Z2-7]{32}$/);
        expect(r.segredoAgrupado.split(" ")).toHaveLength(8);
        expect(r.uri).toContain(`secret=${r.segredo}`);
        expect(r.uri).toContain(encodeURIComponent("ACESSO:ana@exemplo.com"));
        expect(r.troca).toBe(false);
        expect(banco.totp.size).toBe(0);
    });

    it("ativar com o código certo grava o segredo cifrado, gera dez códigos e encerra as outras sessões", async () => {
        const inicio = await TotpService.iniciarConfiguracao(candidata);
        const codigo = codigoDoPasso(inicio.segredo, passoDoInstante());

        const r = await TotpService.ativar(candidata, { configuracao: inicio.configuracao, codigo });

        expect(r.codigosRecuperacao).toHaveLength(10);
        expect(r.mfaVerificadoEm).toBeInstanceOf(Date);

        const guardado = banco.totp.get(candidata.id);
        expect(guardado.segredoCifrado).not.toContain(inicio.segredo);
        expect(guardado.confirmadoEm).toBe(r.mfaVerificadoEm);
        expect(sessoes.revogarTodos).toHaveBeenCalledWith(candidata.id, expect.anything());
    });

    it("só os hashes dos códigos de recuperação ficam guardados, nunca o valor", async () => {
        const inicio = await TotpService.iniciarConfiguracao(candidata);
        const { codigosRecuperacao } = await TotpService.ativar(candidata, {
            configuracao: inicio.configuracao,
            codigo: codigoDoPasso(inicio.segredo, passoDoInstante())
        });

        const guardado = JSON.stringify(banco.codigos);

        for (const codigo of codigosRecuperacao) {
            expect(guardado).not.toContain(codigo);
            expect(guardado).not.toContain(codigo.replace("-", ""));
            expect(banco.codigos.some((c) => c.codigoHash === hashCodigoDeRecuperacao(codigo))).toBe(true);
        }
    });

    it("a auditoria registra a ativação sem segredo nem códigos", async () => {
        const inicio = await TotpService.iniciarConfiguracao(admin);
        const { codigosRecuperacao } = await TotpService.ativar(
            admin,
            { configuracao: inicio.configuracao, codigo: codigoDoPasso(inicio.segredo, passoDoInstante()) },
            { ip: "10.0.0.1", userAgent: "teste" }
        );

        const [registro] = auditoria.registrar.mock.calls[0];
        const texto = JSON.stringify(registro);

        expect(registro).toMatchObject({ administradorId: admin.id, acao: "totp_ativado", entidadeId: admin.id, ip: "10.0.0.1" });
        expect(texto).not.toContain(inicio.segredo);
        for (const codigo of codigosRecuperacao) expect(texto).not.toContain(codigo);
    });

    it("código errado não grava nada", async () => {
        const inicio = await TotpService.iniciarConfiguracao(candidata);

        await expect(TotpService.ativar(candidata, { configuracao: inicio.configuracao, codigo: "000000" })).rejects.toMatchObject({
            statusCode: 400,
            detalhes: { codigo: "MFA_CODIGO_INVALIDO" }
        });
        expect(banco.totp.size).toBe(0);
    });

    it("configuração vencida, adulterada ou de outra conta é recusada", async () => {
        const velha = selarConfiguracao(gerarSegredoBase32(), candidata.id, { agora: Date.now() - 11 * 60_000 });
        const deOutro = selarConfiguracao("JBSWY3DPEHPK3PXP", admin.id);

        for (const configuracao of [velha, deOutro, "lixo", ""]) {
            await expect(TotpService.ativar(candidata, { configuracao, codigo: "123456" })).rejects.toMatchObject({
                detalhes: { codigo: "MFA_CONFIGURACAO_EXPIRADA" }
            });
        }
    });

    it("quem já tem TOTP não ativa de novo com uma configuração comum", async () => {
        await ativarNoBanco(candidata);
        const segredo = gerarSegredoBase32();

        await expect(
            TotpService.ativar(candidata, {
                configuracao: selarConfiguracao(segredo, candidata.id),
                codigo: codigoDoPasso(segredo, passoDoInstante())
            })
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it("quem já tem TOTP só inicia a troca provando senha e um código", async () => {
        const segredoAntigo = await ativarNoBanco(candidata);

        await expect(TotpService.iniciarConfiguracao(candidata, { senhaAtual: "x", codigo: "000000" })).rejects.toMatchObject({ statusCode: 400 });

        comparar.mockResolvedValue(false);
        await expect(
            TotpService.iniciarConfiguracao(candidata, { senhaAtual: "errada", codigo: codigoDoPasso(segredoAntigo, passoDoInstante()) })
        ).rejects.toMatchObject({ statusCode: 401, message: "Senha atual incorreta." });
    });

    it("a troca de aparelho substitui o segredo e refaz os códigos", async () => {
        const antigo = await ativarNoBanco(candidata);
        const inicio = await TotpService.iniciarConfiguracao(candidata, {
            senhaAtual: "certa",
            codigo: codigoDoPasso(antigo, passoDoInstante())
        });
        expect(inicio.troca).toBe(true);

        const r = await TotpService.ativar(candidata, {
            configuracao: inicio.configuracao,
            codigo: codigoDoPasso(inicio.segredo, passoDoInstante())
        });

        expect(r.codigosRecuperacao).toHaveLength(10);
        expect(auditoria.registrar.mock.calls[0][0].acao).toBe("totp_trocado");
        expect(banco.totp.get(candidata.id).update).toHaveBeenCalled();
    });
});

describe("desativar", () => {
    it("administrador não desativa a própria proteção, mesmo provando senha e código", async () => {
        const segredo = await ativarNoBanco(admin);

        await expect(
            TotpService.desativar(admin, { senhaAtual: "certa", codigo: codigoDoPasso(segredo, passoDoInstante()) })
        ).rejects.toMatchObject({ statusCode: 403, detalhes: { codigo: "MFA_OBRIGATORIO" } });
        expect(banco.totp.has(admin.id)).toBe(true);
    });

    it("quem ativou por vontade própria desativa com senha e código", async () => {
        const segredo = await ativarNoBanco(candidata);
        codigoLivre(candidata.id, "ABCDE-FGHJK");

        await TotpService.desativar(candidata, { senhaAtual: "certa", codigo: codigoDoPasso(segredo, passoDoInstante()) });

        expect(banco.totp.has(candidata.id)).toBe(false);
        expect(banco.codigos).toHaveLength(0);
        expect(auditoria.registrar.mock.calls[0][0].acao).toBe("totp_desativado");
    });

    it("sem a senha certa ou com código errado, continua ativo", async () => {
        await ativarNoBanco(candidata);

        comparar.mockResolvedValue(false);
        await expect(TotpService.desativar(candidata, { senhaAtual: "errada", codigo: "000000" })).rejects.toMatchObject({ statusCode: 401 });

        comparar.mockResolvedValue(true);
        await expect(TotpService.desativar(candidata, { senhaAtual: "certa", codigo: "000000" })).rejects.toMatchObject({ statusCode: 400 });

        expect(banco.totp.has(candidata.id)).toBe(true);
    });

    it("conta sem senha (Google) prova só com o código", async () => {
        banco.usuarios.set(candidata.id, { ...candidata, senhaHash: null });
        const segredo = await ativarNoBanco(candidata);

        await TotpService.desativar(candidata, { codigo: codigoDoPasso(segredo, passoDoInstante()) });

        expect(banco.totp.has(candidata.id)).toBe(false);
        expect(comparar).not.toHaveBeenCalled();
    });
});

describe("códigos de recuperação: refazer", () => {
    it("exige senha e código, invalida os antigos e devolve dez novos", async () => {
        const segredo = await ativarNoBanco(candidata);
        codigoLivre(candidata.id, "ABCDE-FGHJK");

        const r = await TotpService.regenerarCodigosDeRecuperacao(candidata, {
            senhaAtual: "certa",
            codigo: codigoDoPasso(segredo, passoDoInstante())
        });

        expect(r.codigosRecuperacao).toHaveLength(10);
        expect(banco.codigos.some((c) => c.codigoHash === hashCodigoDeRecuperacao("ABCDE-FGHJK"))).toBe(false);
        expect(auditoria.registrar.mock.calls[0][0].acao).toBe("totp_codigos_refeitos");
    });

    it("sem TOTP ativo, não há o que refazer", async () => {
        await expect(TotpService.regenerarCodigosDeRecuperacao(candidata, { senhaAtual: "x", codigo: "123456" })).rejects.toMatchObject({
            statusCode: 400
        });
    });
});

describe("reiniciar", () => {
    it("outro administrador reinicia: apaga segredo e códigos, encerra sessões, audita com origem e motivo", async () => {
        await ativarNoBanco(admin);
        codigoLivre(admin.id, "ABCDE-FGHJK");

        const r = await TotpService.reiniciar(admin.id, {
            origem: "administrador",
            solicitante: outroAdmin,
            motivo: "Perdeu o celular",
            contexto: { ip: "10.0.0.2", userAgent: "x" }
        });

        expect(r).toEqual({ tinhaTotp: true, tipoUsuario: "administrador" });
        expect(banco.totp.has(admin.id)).toBe(false);
        expect(banco.codigos).toHaveLength(0);
        expect(sessoes.revogarTodos).toHaveBeenCalledWith(admin.id, expect.anything());
        expect(auditoria.registrar.mock.calls[0][0]).toMatchObject({
            administradorId: outroAdmin.id,
            acao: "totp_reiniciado_por_administrador",
            entidadeId: admin.id,
            metadados: { origem: "administrador", motivo: "Perdeu o celular", tinhaTotp: true },
            ip: "10.0.0.2"
        });
    });

    it("ninguém reinicia a própria proteção pela interface", async () => {
        await ativarNoBanco(admin);

        await expect(TotpService.reiniciar(admin.id, { origem: "administrador", solicitante: admin })).rejects.toMatchObject({
            statusCode: 403,
            detalhes: { codigo: "MFA_AUTORREINICIO" }
        });
        expect(banco.totp.has(admin.id)).toBe(true);
    });

    it("quem não é administrador não reinicia", async () => {
        await ativarNoBanco(admin);

        await expect(TotpService.reiniciar(admin.id, { origem: "administrador", solicitante: candidata })).rejects.toMatchObject({ statusCode: 403 });
        await expect(TotpService.reiniciar(admin.id, { origem: "administrador", solicitante: null })).rejects.toMatchObject({ statusCode: 403 });
    });

    it("o script reinicia sem solicitante e audita como script", async () => {
        await ativarNoBanco(admin);

        await TotpService.reiniciar(admin.id, { origem: "script", motivo: "Administrador único perdeu o aplicativo" });

        expect(auditoria.registrar.mock.calls[0][0]).toMatchObject({
            administradorId: null,
            acao: "totp_reiniciado_por_script",
            metadados: { origem: "script", motivo: "Administrador único perdeu o aplicativo" }
        });
    });

    it("conta inexistente: 404, e nada é apagado nem auditado", async () => {
        await expect(TotpService.reiniciar("fantasma", { origem: "script" })).rejects.toMatchObject({ statusCode: 404 });
        expect(auditoria.registrar).not.toHaveBeenCalled();
    });

    it("a auditoria do reinício não leva segredo nem código", async () => {
        const segredo = await ativarNoBanco(admin);
        codigoLivre(admin.id, "ABCDE-FGHJK");

        await TotpService.reiniciar(admin.id, { origem: "script", motivo: "x" });

        const texto = JSON.stringify(auditoria.registrar.mock.calls);
        expect(texto).not.toContain(segredo);
        expect(texto).not.toContain("ABCDE");
    });
});

describe("estadoDoAcesso (a regra que o middleware aplica ao administrador)", () => {
    const desde = Math.floor((AGORA - 3600_000) / 1000);

    it("administrador sem TOTP: configuração pendente", async () => {
        expect(await TotpService.estadoDoAcesso(admin, { mfa: desde + 10 })).toBe("nao_configurado");
    });

    it("administrador com TOTP e sessão sem a verificação: necessário", async () => {
        await ativarNoBanco(admin);

        expect(await TotpService.estadoDoAcesso(admin, {})).toBe("necessario");
        expect(await TotpService.estadoDoAcesso(admin, null)).toBe("necessario");
    });

    it("sessão verificada ANTES do TOTP ser reiniciado ou trocado deixa de valer", async () => {
        await ativarNoBanco(admin);

        expect(await TotpService.estadoDoAcesso(admin, { mfa: desde - 1 })).toBe("necessario");
    });

    it("sessão verificada depois da ativação: ok", async () => {
        await ativarNoBanco(admin);

        expect(await TotpService.estadoDoAcesso(admin, { mfa: desde })).toBe("ok");
        expect(await TotpService.estadoDoAcesso(admin, { mfa: desde + 500 })).toBe("ok");
    });

    it("candidato e empresa não são cobrados a cada requisição", async () => {
        await ativarNoBanco(candidata);

        expect(await TotpService.estadoDoAcesso(candidata, {})).toBe("ok");
        expect(await TotpService.estadoDoAcesso({ id: "e", tipoUsuario: "empresa" }, {})).toBe("ok");
    });

    it("com o recurso desligado não há exigência nenhuma e o banco nem é consultado", async () => {
        env.mfa.habilitado = false;

        expect(await TotpService.estadoDoAcesso(admin, {})).toBe("ok");
        expect(models.AutenticacaoTotp.findByPk).not.toHaveBeenCalled();
    });
});

describe("situacaoDaConta (o que o Site recebe)", () => {
    it("recurso desligado: nada disponível e nenhuma consulta", async () => {
        env.mfa.habilitado = false;

        expect(await TotpService.situacaoDaConta(admin)).toEqual({ mfaDisponivel: false, mfaConfigurado: false, mfaExigido: false });
        expect(models.AutenticacaoTotp.findByPk).not.toHaveBeenCalled();
    });

    it("administrador sem TOTP: exigido e não configurado", async () => {
        expect(await TotpService.situacaoDaConta(admin)).toEqual({ mfaDisponivel: true, mfaConfigurado: false, mfaExigido: true });
    });

    it("candidata com TOTP: configurado e não exigido", async () => {
        await ativarNoBanco(candidata);

        expect(await TotpService.situacaoDaConta(candidata)).toEqual({ mfaDisponivel: true, mfaConfigurado: true, mfaExigido: false });
    });

    it("nada do que sai daqui contém segredo", async () => {
        await ativarNoBanco(candidata);

        const texto = JSON.stringify(await TotpService.estado(candidata));
        expect(texto).not.toMatch(/segredo/i);
    });
});
