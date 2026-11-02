import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Busca de talentos (`GET /candidatos`, empresa ou administrador).
 *
 * Antes devolvia as linhas inteiras do candidato a qualquer conta de empresa: CPF decifrado, endereço, CEP,
 * data de nascimento, necessidades de acessibilidade, caminho do currículo, e-mail e telefone. O Aviso de
 * Privacidade promete o contrário: sem candidatura, a empresa vê só o perfil público, e a deficiência
 * declarada nunca aparece em busca de talentos.
 *
 * Banco e models são mockados (o projeto não tem banco de teste isolado); a privacidade usada é a real.
 */

vi.mock("../config/bancoDeDados.js", () => ({ default: { transaction: vi.fn() } }));
vi.mock("../models/index.js", () => ({
    Candidato: { findAndCountAll: vi.fn() },
    Usuario: {},
    Deficiencia: {},
    CandidatoDeficiencia: {},
    Candidatura: {},
    Vaga: {},
    Empresa: {},
    UsuarioBloqueado: {},
    RegistroAuditoria: {}
}));
vi.mock("../utils/supabaseStorage.js", () => ({ gerarUrlAssinada: vi.fn() }));
vi.mock("../utils/extrairTextoDocumento.js", () => ({ extrairTextoDocumento: vi.fn() }));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: vi.fn() } }));
vi.mock("./BloqueioService.js", () => ({ default: { estaBloqueadoEntre: vi.fn() } }));

const { Candidato, Deficiencia } = await import("../models/index.js");
const { default: CandidatoService } = await import("./CandidatoService.js");

const empresa = { id: "empresa-1", tipoUsuario: "empresa" };
const administrador = { id: "admin-1", tipoUsuario: "administrador" };

const linhaDoBanco = () => ({
    id: "c1",
    usuarioId: "u1",
    cidade: "São Paulo",
    estado: "SP",
    tituloProfissional: "Desenvolvedora",
    cpf: "52998224725",
    dataNascimento: "1990-05-20",
    endereco: "Rua A, 10",
    cep: "01001000",
    necessidadesAcessibilidade: "Leitor de tela",
    curriculo: "privado/curriculo.pdf",
    usuario: { id: "u1", nome: "Ana Souza", email: "ana@exemplo.com", telefone: "11999998888", fotoPerfil: "f.png" },
    deficiencias: [{ id: "d1", nome: "Deficiência visual" }]
});

beforeEach(() => {
    vi.resetAllMocks();
    Candidato.findAndCountAll.mockImplementation(async () => ({ rows: [linhaDoBanco()], count: 1 }));
});

const modelosIncluidos = () => Candidato.findAndCountAll.mock.calls[0][0].include.map((i) => i.model);
const itemDevolvido = (resposta) => JSON.parse(JSON.stringify(resposta)).candidatos[0];

describe("CandidatoService.listar (busca de talentos)", () => {
    it("para a empresa, devolve só o perfil público", async () => {
        const item = itemDevolvido(await CandidatoService.listar({}, empresa));

        expect(item.cidade).toBe("São Paulo");
        expect(item.tituloProfissional).toBe("Desenvolvedora");
        expect(item.usuario.nome).toBe("Ana Souza");

        for (const privado of ["cpf", "dataNascimento", "endereco", "cep", "necessidadesAcessibilidade", "curriculo"]) {
            expect(item[privado], privado).toBeUndefined();
        }

        expect(item.usuario.email).toBeUndefined();
        expect(item.usuario.telefone).toBeUndefined();
    });

    it("para a empresa, não inclui deficiência na consulta nem na resposta", async () => {
        const item = itemDevolvido(await CandidatoService.listar({}, empresa));

        expect(modelosIncluidos()).not.toContain(Deficiencia);
        // A linha simulada traz `deficiencias` como se o banco as devolvesse; a empresa nunca as vê.
        expect(item.deficiencias).toBeUndefined();
    });

    it("para a empresa, ignora o filtro por deficiência (filtrar revelaria a declaração por inferência)", async () => {
        await CandidatoService.listar({ deficienciaId: "11111111-1111-4111-8111-111111111111" }, empresa);

        expect(modelosIncluidos()).not.toContain(Deficiencia);
    });

    it("o administrador continua vendo tudo e filtrando por deficiência", async () => {
        const item = itemDevolvido(
            await CandidatoService.listar({ deficienciaId: "11111111-1111-4111-8111-111111111111" }, administrador)
        );

        expect(modelosIncluidos()).toContain(Deficiencia);
        const incluiDeficiencia = Candidato.findAndCountAll.mock.calls[0][0].include.find((i) => i.model === Deficiencia);
        expect(incluiDeficiencia.required).toBe(true);
        expect(incluiDeficiencia.where).toEqual({ id: "11111111-1111-4111-8111-111111111111" });
        expect(item.cpf).toBe("52998224725");
        expect(item.deficiencias).toHaveLength(1);
    });

    it("sem identificar quem pede, trata como terceiro (nunca como administrador)", async () => {
        const item = itemDevolvido(await CandidatoService.listar({}));

        expect(item.cpf).toBeUndefined();
        expect(modelosIncluidos()).not.toContain(Deficiencia);
    });

    it("mantém os filtros e a paginação de sempre", async () => {
        await CandidatoService.listar({ cidade: "Sao", estado: "sp", nome: "Ana", page: "1", limit: "5" }, empresa);

        const consulta = Candidato.findAndCountAll.mock.calls[0][0];
        expect(consulta.where.estado).toBe("SP");
        expect(consulta.limit).toBe(5);
    });
});
