import { Op, fn, col, where as sqlWhere } from "sequelize";

import {
    Usuario,
    Empresa,
    Candidato,
    Vaga,
    Postagem,
    PostagemAnexo
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao } from "../utils/paginacao.js";
import { ehAdministrador } from "../utils/autorizacao.js";
import BloqueioService from "./BloqueioService.js";
import SeguidorService from "./SeguidorService.js";
import { assinarMidiaDasPostagens } from "./PostagemService.js";

const TIPOS = ["tudo", "usuarios", "empresas", "vagas", "postagens"];

/**
 * Busca global da plataforma.
 *
 * Segurança:
 * - o termo é sempre parametrizado pelo Sequelize (sem SQL bruto);
 * - retorna apenas campos públicos (nunca e-mail, CPF ou CNPJ completos);
 * - resultados limitados/paginados para evitar DoS.
 */
class BuscaService {
    normalizar(termo) {
        const texto = String(termo || "").trim();

        if (texto.length < 2) {
            throw ErroApi.requisicaoInvalida(
                "Informe ao menos 2 caracteres para pesquisar."
            );
        }

        return texto.slice(0, 120);
    }

    /**
     * Remove acentos e caixa alta, replicando em JS a mesma normalização do
     * `acesso_normalizar()` do Postgres (lower + unaccent): necessário para
     * o termo digitado casar com o valor já normalizado pela função no lado
     * da coluna, permitindo que os índices GIN trigram existentes sejam
     * usados (ver migrations 0002/0003/0013).
     */
    normalizarAcentos(texto) {
        return texto
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase();
    }

    like(campo, termo) {
        return sqlWhere(fn("acesso_normalizar", col(campo)), {
            [Op.like]: `%${this.normalizarAcentos(termo)}%`
        });
    }

    async buscarUsuarios(termo, limite, offset, idsExcluidos = []) {
        const { rows, count } = await Usuario.findAndCountAll({
            where: {
                ativo: true,
                bloqueado: false,
                tipoUsuario: { [Op.ne]: "administrador" },
                ...(idsExcluidos.length ? { id: { [Op.notIn]: idsExcluidos } } : {}),
                [Op.and]: [this.like("Usuario.nome", termo)]
            },
            attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"],
            include: [
                {
                    model: Candidato,
                    as: "candidato",
                    required: false,
                    attributes: ["id", "tituloProfissional", "cidade", "estado"]
                }
            ],
            limit: limite,
            offset,
            order: [["nome", "ASC"]]
        });

        return { total: count, itens: rows };
    }

    async buscarEmpresas(termo, limite, offset, idsExcluidos = []) {
        const { rows, count } = await Empresa.findAndCountAll({
            where: {
                statusAprovacao: "aprovada",
                ...(idsExcluidos.length
                    ? { usuarioId: { [Op.notIn]: idsExcluidos } }
                    : {}),
                [Op.or]: [
                    this.like("Empresa.nome_fantasia", termo),
                    this.like("Empresa.razao_social", termo),
                    this.like("Empresa.setor", termo)
                ]
            },
            attributes: [
                "id",
                "usuarioId",
                "nomeFantasia",
                "razaoSocial",
                "setor",
                "cidade",
                "estado",
                "logo",
                "empresaVerificada"
            ],
            limit: limite,
            offset,
            order: [["nomeFantasia", "ASC"]]
        });

        return { total: count, itens: rows };
    }

    async buscarVagas(termo, limite, offset) {
        const { rows, count } = await Vaga.findAndCountAll({
            where: {
                status: "aberta",
                oculta: false,
                // Vaga de empresa suspensa, reprovada ou pendente não aparece na busca, com o mesmo
                // filtro de `VagaService.listar`.
                "$empresa.status_aprovacao$": "aprovada",
                [Op.or]: [
                    this.like("Vaga.titulo", termo),
                    this.like("Vaga.descricao", termo),
                    this.like("Vaga.cidade", termo)
                ]
            },
            include: [
                {
                    model: Empresa,
                    as: "empresa",
                    attributes: ["id", "nomeFantasia", "logo", "cidade", "estado"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["criadoEm", "DESC"]]
        });

        return { total: count, itens: rows };
    }

    /**
     * Postagens de autor com perfil privado só entram no resultado para o próprio autor,
     * administradores ou seguidores aprovados, com o mesmo filtro do feed
     * (`PostagemService.listar`), para a busca não virar um jeito de contornar a privacidade.
     */
    async buscarPostagens(termo, limite, offset, solicitante) {
        const where = {
            ativo: true,
            [Op.and]: [this.like("Postagem.conteudo", termo)]
        };

        if (solicitante && !ehAdministrador(solicitante)) {
            const [idsSeguidos, idsBloqueados] = await Promise.all([
                SeguidorService.idsSeguidos(solicitante.id),
                // Mesma exclusão de `PostagemService.listar`: a busca nunca é um jeito de contornar
                // bloqueio.
                BloqueioService.idsRelacionados(solicitante.id)
            ]);

            where[Op.or] = [
                { "$usuario.perfil_publico$": true },
                { "$usuario.tipo_usuario$": "empresa" },
                {
                    usuarioId: {
                        [Op.in]: [...idsSeguidos, solicitante.id]
                    }
                }
            ];

            if (idsBloqueados.length) {
                where[Op.and].push({ usuarioId: { [Op.notIn]: idsBloqueados } });
            }
        }

        const { rows, count } = await Postagem.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
                },
                // Sem os anexos aqui, `assinarMidiaDasPostagens` não teria o que assinar e as
                // postagens com mídia viriam com o caminho cru, que não abre o arquivo.
                {
                    model: PostagemAnexo,
                    as: "anexos",
                    attributes: ["id", "url"],
                    separate: true
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["criadoEm", "DESC"]]
        });

        // O acesso já foi filtrado acima (equivalente a `garantirAcessoAPostagem`); só então as
        // URLs de exibição são resolvidas.
        const planas = rows.map((linha) => linha.toJSON());

        await assinarMidiaDasPostagens(planas);

        return { total: count, itens: planas };
    }

    async buscar(query, solicitante) {
        const termo = this.normalizar(query.q);
        const tipo = TIPOS.includes(query.tipo) ? query.tipo : "tudo";
        const { pagina, limite, offset } = resolverPaginacao(query, 10);

        const idsExcluidos = solicitante
            ? await BloqueioService.idsRelacionados(solicitante.id)
            : [];

        if (tipo !== "tudo") {
            const mapa = {
                usuarios: () =>
                    this.buscarUsuarios(termo, limite, offset, idsExcluidos),
                empresas: () =>
                    this.buscarEmpresas(termo, limite, offset, idsExcluidos),
                vagas: () => this.buscarVagas(termo, limite, offset),
                postagens: () =>
                    this.buscarPostagens(termo, limite, offset, solicitante)
            };

            const resultado = await mapa[tipo]();

            return {
                termo,
                tipo,
                pagina,
                limite,
                total: resultado.total,
                totalPaginas: Math.ceil(resultado.total / limite),
                resultados: { [tipo]: resultado.itens }
            };
        }

        const limiteResumo = Math.min(limite, 5);

        const [usuarios, empresas, vagas, postagens] = await Promise.all([
            this.buscarUsuarios(termo, limiteResumo, 0, idsExcluidos),
            this.buscarEmpresas(termo, limiteResumo, 0, idsExcluidos),
            this.buscarVagas(termo, limiteResumo, 0),
            this.buscarPostagens(termo, limiteResumo, 0, solicitante)
        ]);

        return {
            termo,
            tipo,
            pagina: 1,
            limite: limiteResumo,
            total:
                usuarios.total + empresas.total + vagas.total + postagens.total,
            totais: {
                usuarios: usuarios.total,
                empresas: empresas.total,
                vagas: vagas.total,
                postagens: postagens.total
            },
            resultados: {
                usuarios: usuarios.itens,
                empresas: empresas.itens,
                vagas: vagas.itens,
                postagens: postagens.itens
            }
        };
    }
}

export default new BuscaService();
