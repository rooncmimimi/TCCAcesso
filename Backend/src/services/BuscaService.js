import { Op, fn, col, where as sqlWhere } from "sequelize";

import {
    Usuario,
    Empresa,
    Candidato,
    Vaga,
    Postagem
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao } from "../utils/pagination.js";

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
            throw ApiError.badRequest(
                "Informe ao menos 2 caracteres para pesquisar."
            );
        }

        return texto.slice(0, 120);
    }

    like(campo, termo) {
        return sqlWhere(fn("LOWER", col(campo)), {
            [Op.like]: `%${termo.toLowerCase()}%`
        });
    }

    async buscarUsuarios(termo, limite, offset) {
        const { rows, count } = await Usuario.findAndCountAll({
            where: {
                ativo: true,
                bloqueado: false,
                tipoUsuario: { [Op.ne]: "administrador" },
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

    async buscarEmpresas(termo, limite, offset) {
        const { rows, count } = await Empresa.findAndCountAll({
            where: {
                statusAprovacao: "aprovada",
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
                status: "Aberta",
                oculta: false,
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
            order: [["created_at", "DESC"]]
        });

        return { total: count, itens: rows };
    }

    async buscarPostagens(termo, limite, offset) {
        const { rows, count } = await Postagem.findAndCountAll({
            where: {
                ativo: true,
                [Op.and]: [this.like("Postagem.conteudo", termo)]
            },
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return { total: count, itens: rows };
    }

    async buscar(query) {
        const termo = this.normalizar(query.q);
        const tipo = TIPOS.includes(query.tipo) ? query.tipo : "tudo";
        const { pagina, limite, offset } = resolverPaginacao(query, 10);

        if (tipo !== "tudo") {
            const mapa = {
                usuarios: () => this.buscarUsuarios(termo, limite, offset),
                empresas: () => this.buscarEmpresas(termo, limite, offset),
                vagas: () => this.buscarVagas(termo, limite, offset),
                postagens: () => this.buscarPostagens(termo, limite, offset)
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
            this.buscarUsuarios(termo, limiteResumo, 0),
            this.buscarEmpresas(termo, limiteResumo, 0),
            this.buscarVagas(termo, limiteResumo, 0),
            this.buscarPostagens(termo, limiteResumo, 0)
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
