import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Protege o payload de `emitirFeed` (`io.emit`, sem sala: todo cliente conectado recebe). Cada
 * teste captura o argumento real passado a `emitirFeed` e confere que ele nunca carrega a postagem
 * ou o comentário (com URLs assinadas de anexo privado), só o `id` e o marcador; uma regressão como
 * `emitirFeed("feed:postagem", { postagem: atualizada, atualizada: true })` faz os testes falharem.
 *
 * Nenhum teste toca o banco real: todo model do Sequelize é mockado, porque o projeto não tem banco
 * de teste isolado.
 */

vi.mock("../config/bancoDeDados.js", () => ({
    default: {
        transaction: vi.fn(async () => ({
            commit: vi.fn(),
            rollback: vi.fn()
        }))
    }
}));

vi.mock("../realtime/socket.js", () => ({
    emitirFeed: vi.fn()
}));

vi.mock("../utils/supabaseStorage.js", () => ({
    resolverUrlExibicao: vi.fn((url) => url),
    gerarUrlAssinada: vi.fn(),
    gerarUrlsAssinadas: vi.fn(),
    // Usados por `ArmazenamentoService.removerArquivoFisico`, chamado pela compensação de
    // `PostagemService.criar()` quando a transação falha depois de os anexos irem para o Storage.
    storageHabilitado: true,
    removerArquivo: vi.fn(async () => true)
}));

vi.mock("../middlewares/uploadMiddleware.js", () => ({
    urlPublica: vi.fn(() => "url-publica-fake"),
    tipoDoArquivo: vi.fn(() => "imagem")
}));

vi.mock("./NotificacaoService.js", () => ({ default: { criar: vi.fn() } }));
vi.mock("./AdminAuditoriaService.js", () => ({ default: { registrar: vi.fn() } }));
vi.mock("./SeguidorService.js", () => ({
    default: {
        podeVerConteudoPrivado: vi.fn(async () => false),
        idsSeguidos: vi.fn(async () => [])
    }
}));
vi.mock("./BloqueioService.js", () => ({
    default: {
        estaBloqueadoEntre: vi.fn(async () => false),
        idsRelacionados: vi.fn(async () => [])
    }
}));

vi.mock("../models/index.js", () => ({
    Postagem: { create: vi.fn(), findOne: vi.fn(), findByPk: vi.fn(), findAndCountAll: vi.fn() },
    Usuario: { findByPk: vi.fn(), findAll: vi.fn() },
    Comentario: { create: vi.fn(), count: vi.fn(), findByPk: vi.fn() },
    Curtida: { findAll: vi.fn(), count: vi.fn() },
    PostagemAnexo: { bulkCreate: vi.fn() },
    Compartilhamento: { count: vi.fn() },
    UsuarioSeguido: { findAll: vi.fn() },
    Empresa: { findOne: vi.fn() },
    Candidato: { findOne: vi.fn() }
}));

const { emitirFeed } = await import("../realtime/socket.js");
const { gerarUrlsAssinadas, removerArquivo } = await import("../utils/supabaseStorage.js");
const { Postagem, Usuario, Curtida, Comentario, Compartilhamento } = await import("../models/index.js");
const { default: PostagemService } = await import("./PostagemService.js");

const CONTEUDO_SECRETO = "Conteúdo confidencial que não pode vazar pelo Socket.IO";
const URL_ASSINADA_SECRETA =
    "https://supabase.test/private/anexo-secreto?token=SEGREDO-NAO-PODE-VAZAR";

function autorPublico(id = "user-1") {
    return { id, perfilPublico: true, tipoUsuario: "candidato" };
}

function postagemFake({ id = "postagem-1", usuarioId = "user-1", anexos = [] } = {}) {
    const dados = {
        id,
        usuarioId,
        ativo: true,
        conteudo: CONTEUDO_SECRETO,
        publica: true,
        criadoEm: new Date(),
        anexos
    };
    return {
        ...dados,
        toJSON: () => dados,
        update: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined)
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    // Dependências de `buscarPorId`, `decorar` e `garantirAcessoAPostagem` em todos os cenários
    // abaixo. O autor é sempre público, então nenhum teste precisa de `SeguidorService` ou
    // `BloqueioService` reais.
    Usuario.findByPk.mockResolvedValue(autorPublico());
    Usuario.findAll.mockResolvedValue([autorPublico()]);
    Curtida.findAll.mockResolvedValue([]);
    Comentario.count.mockResolvedValue([]);
    Compartilhamento.count.mockResolvedValue([]);
});

describe("PostagemService — payload do Socket.IO nunca carrega conteúdo protegido", () => {
    it("create() emite só {id, criada: true} — nunca o objeto da postagem", async () => {
        const solicitante = { id: "user-1", nome: "Ana", tipoUsuario: "candidato" };
        const postagemCriada = postagemFake();
        Postagem.create.mockResolvedValue({ id: postagemCriada.id });
        Postagem.findOne.mockResolvedValue(postagemCriada);

        await PostagemService.criar({ conteudo: CONTEUDO_SECRETO }, solicitante, []);

        expect(emitirFeed).toHaveBeenCalledTimes(1);
        const [evento, payload] = emitirFeed.mock.calls[0];
        expect(evento).toBe("feed:postagem");
        expect(payload).toEqual({ id: postagemCriada.id, criada: true });
        expect(JSON.stringify(payload)).not.toContain(CONTEUDO_SECRETO);
    });

    it("update() emite só {id, atualizada: true} — nunca a URL assinada de um anexo privado", async () => {
        const solicitante = { id: "user-1", nome: "Ana", tipoUsuario: "candidato" };
        const anexoPrivado = { id: "anexo-1", url: "caminho/no/storage.png", privado: true };
        const postagemComAnexo = postagemFake({ anexos: [anexoPrivado] });
        Postagem.findByPk.mockResolvedValue(postagemComAnexo);
        Postagem.findOne.mockResolvedValue(postagemComAnexo);
        gerarUrlsAssinadas.mockResolvedValue([{ url: URL_ASSINADA_SECRETA, expiraEm: null }]);

        await PostagemService.atualizar(postagemComAnexo.id, { conteudo: "novo texto" }, solicitante);

        const [, payload] = emitirFeed.mock.calls.at(-1);
        expect(payload).toEqual({ id: postagemComAnexo.id, atualizada: true });
        expect(JSON.stringify(payload)).not.toContain(URL_ASSINADA_SECRETA);
    });

    it("atualizarDescricaoAnexo() emite só {id, atualizada: true} — mesma regra de update()", async () => {
        const solicitante = { id: "user-1", nome: "Ana", tipoUsuario: "candidato" };
        const anexoPrivado = { id: "anexo-1", url: "caminho/no/storage.png", privado: true };
        const postagem = postagemFake({ anexos: [anexoPrivado] });
        Postagem.findByPk.mockResolvedValue(postagem);
        Postagem.findOne.mockResolvedValue(postagem);
        gerarUrlsAssinadas.mockResolvedValue([{ url: URL_ASSINADA_SECRETA, expiraEm: null }]);
        const PostagemAnexoMock = (await import("../models/index.js")).PostagemAnexo;
        PostagemAnexoMock.findOne = vi.fn().mockResolvedValue({
            ...anexoPrivado,
            update: vi.fn().mockResolvedValue(undefined)
        });

        await PostagemService.atualizarDescricaoAnexo(postagem.id, anexoPrivado.id, "nova descrição", solicitante);

        const [, payload] = emitirFeed.mock.calls.at(-1);
        expect(payload).toEqual({ id: postagem.id, atualizada: true });
        expect(JSON.stringify(payload)).not.toContain(URL_ASSINADA_SECRETA);
    });

    it("comentar() emite só {postagemId, totalComentarios} — nunca o comentário completo", async () => {
        const solicitante = { id: "user-1", nome: "Ana", tipoUsuario: "candidato" };
        const postagem = postagemFake();
        Postagem.findByPk.mockResolvedValue(postagem);
        const TEXTO_COMENTARIO_SECRETO = "Comentário com informação que não pode ser transmitida a todo mundo";
        Comentario.create.mockResolvedValue({ id: "comentario-1" });
        Comentario.findByPk.mockResolvedValue({
            id: "comentario-1",
            comentario: TEXTO_COMENTARIO_SECRETO,
            usuario: { nome: "Ana" }
        });
        Comentario.count.mockResolvedValueOnce(3);

        await PostagemService.comentar(postagem.id, TEXTO_COMENTARIO_SECRETO, solicitante);

        const [evento, payload] = emitirFeed.mock.calls.at(-1);
        expect(evento).toBe("feed:comentario");
        expect(payload).toEqual({ postagemId: postagem.id, totalComentarios: 3 });
        expect(JSON.stringify(payload)).not.toContain(TEXTO_COMENTARIO_SECRETO);
    });

    it("delete() continua emitindo só {id, removida: true} (já era seguro, sem regressão)", async () => {
        const solicitante = { id: "user-1", nome: "Ana", tipoUsuario: "candidato" };
        const postagem = postagemFake();
        Postagem.findByPk.mockResolvedValue(postagem);

        await PostagemService.excluir(postagem.id, solicitante);

        const [evento, payload] = emitirFeed.mock.calls.at(-1);
        expect(evento).toBe("feed:postagem");
        expect(payload).toEqual({ id: postagem.id, removida: true });
    });
});

describe("PostagemService.criar() — Etapa 4: compensação quando o banco falha após o Storage já ter recebido os anexos", () => {
    it("Cenário D: Storage sucesso + banco falha → limpa os anexos desta operação e propaga o erro original do banco", async () => {
        // `processarAnexosPostagem` (`uploadMiddleware.js`) já enviou os 2 anexos ao Storage (por
        // isso ambos têm `.url`); o passo que falha é gravar a postagem.
        const solicitante = { id: "user-1", nome: "Ana", tipoUsuario: "candidato" };
        const arquivos = [
            { originalname: "1.png", mimetype: "image/png", size: 1024, url: "postagens/user-1/1.png" },
            { originalname: "2.png", mimetype: "image/png", size: 1024, url: "postagens/user-1/2.png" }
        ];
        const erroBanco = new Error("violação de constraint no banco");
        Postagem.create.mockRejectedValue(erroBanco);

        // O erro que chega a quem chamou é o do banco, e não um erro de limpeza de arquivo.
        await expect(
            PostagemService.criar({ conteudo: "texto" }, solicitante, arquivos)
        ).rejects.toBe(erroBanco);

        // A limpeza é tentada para os 2 arquivos desta operação, nem mais nem menos.
        expect(removerArquivo).toHaveBeenCalledTimes(2);
    });

    it("sucesso normal: quando o banco não falha, nenhuma limpeza é acionada", async () => {
        const solicitante = { id: "user-1", nome: "Ana", tipoUsuario: "candidato" };
        const arquivos = [{ originalname: "1.png", mimetype: "image/png", size: 1024, url: "postagens/user-1/1.png" }];
        const postagemCriada = postagemFake();
        Postagem.create.mockResolvedValue({ id: postagemCriada.id });
        Postagem.findOne.mockResolvedValue(postagemCriada);

        await PostagemService.criar({ conteudo: "texto" }, solicitante, arquivos);

        expect(removerArquivo).not.toHaveBeenCalled();
    });
});
