import { Op, fn, col } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import { Empresa, Usuario, Vaga } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import { garantirDono, ehAdministrador, garantirEmpresaAprovada } from "../utils/autorizacao.js";
import BloqueioService from "./BloqueioService.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";

/** Campos que a própria empresa pode atualizar. */
const CAMPOS_EDITAVEIS = [
    "razaoSocial",
    "nomeFantasia",
    "descricao",
    "setor",
    "porte",
    "site",
    "cidade",
    "estado",
    "endereco",
    "cep",
    "logo",
    "capa",
    "culturaInclusiva"
];

/**
 * Perfil de empresa: listagem, empresas parceiras, consulta por id ou por usuário, edição pela
 * própria empresa e exclusão pelo administrador.
 */
class EmpresaService {
    filtrarCampos(data, solicitante) {
        const dados = CAMPOS_EDITAVEIS.reduce((acc, campo) => {
            if (data[campo] !== undefined) {
                acc[campo] = data[campo];
            }
            return acc;
        }, {});

        // Selo de verificação é exclusivo do administrador.
        if (ehAdministrador(solicitante) && data.empresaVerificada !== undefined) {
            dados.empresaVerificada = data.empresaVerificada;
        }

        if (ehAdministrador(solicitante) && data.cnpj !== undefined) {
            dados.cnpj = data.cnpj;
        }

        return dados;
    }

    /* Listar (público) */
    async listar(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);
        const { search, cidade, estado, setor, porte, empresaVerificada } = query;

        const where = {};

        if (cidade) {
            where.cidade = { [Op.iLike]: `%${cidade}%` };
        }

        if (estado) {
            where.estado = estado.toUpperCase();
        }

        if (setor) {
            where.setor = { [Op.iLike]: `%${setor}%` };
        }

        if (porte) {
            where.porte = porte;
        }

        if (empresaVerificada !== undefined) {
            where.empresaVerificada =
                empresaVerificada === "true" || empresaVerificada === true;
        }

        if (search) {
            where[Op.or] = [
                { nomeFantasia: { [Op.iLike]: `%${search}%` } },
                { razaoSocial: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { rows, count } = await Empresa.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("empresas", rows, count, pagina, limite);
    }

    /*
     * Empresas parceiras (vitrine da página inicial). "Parceira" é a empresa aprovada pela
     * plataforma, que pode publicar vagas; o selo "verificada" é um reconhecimento extra de
     * confiança, nunca requisito para aparecer. Mesmo critério de `PublicoService.paginaInicial()`.
     */
    async listarParceiras() {
        const empresas = await Empresa.findAll({
            where: { statusAprovacao: "aprovada" },
            order: [
                ["empresaVerificada", "DESC"],
                ["criadoEm", "DESC"]
            ],
            limit: 6
        });

        if (empresas.length === 0) return empresas;

        // Mesmo padrão de VagaService.buscarPorEmpresaAutenticada / PublicoService.paginaInicial:
        // uma única consulta agregada, nunca uma por empresa.
        const contagens = await Vaga.findAll({
            where: {
                empresaId: empresas.map((empresa) => empresa.id),
                status: "aberta"
            },
            attributes: ["empresaId", [fn("COUNT", col("id")), "total"]],
            group: ["empresaId"]
        });

        const totalPorEmpresa = new Map(
            contagens.map((c) => [c.empresaId, Number(c.get("total"))])
        );

        return empresas.map((empresa) => {
            const objeto = empresa.toJSON();
            objeto.totalVagas = totalPorEmpresa.get(empresa.id) ?? 0;
            return objeto;
        });
    }

    /* Buscar por id (público) */
    async buscarPorId(id, solicitante) {
        const empresa = await Empresa.findByPk(id, {
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil", "perfilPublico"]
                },
                {
                    model: Vaga,
                    as: "vagas",
                    where: { status: "aberta" },
                    required: false
                }
            ]
        });

        if (!empresa) {
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        await BloqueioService.garantirVisibilidadePerfil(
            empresa.usuario,
            solicitante
        );

        return empresa;
    }

    /**
     * Perfil público resolvido pelo `usuarioId` do autor de uma postagem ou comentário, para abrir
     * o perfil de uma empresa a partir do feed sem o cliente conhecer o `empresaId`. Diferente de
     * `buscarPorUsuario` (usada em /empresas/me), aqui o `Usuario` incluído só traz campos públicos
     * (sem e-mail e telefone).
     */
    async buscarPorUsuarioPublico(usuarioId, solicitante) {
        const empresa = await Empresa.findOne({
            where: { usuarioId },
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil", "perfilPublico"]
                },
                {
                    model: Vaga,
                    as: "vagas",
                    where: { status: "aberta" },
                    required: false
                }
            ]
        });

        if (!empresa) {
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        await BloqueioService.garantirVisibilidadePerfil(
            empresa.usuario,
            solicitante
        );

        return empresa;
    }

    /* Perfil da empresa autenticada */
    async buscarPorUsuario(usuarioId) {
        const empresa = await Empresa.findOne({
            where: { usuarioId },
            include: [{ model: Usuario, as: "usuario" }]
        });

        if (!empresa) {
            throw ErroApi.naoEncontrado("Perfil de empresa não encontrado.");
        }

        return empresa;
    }

    /* Atualizar (dona ou administrador) */
    async atualizar(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const empresa = await Empresa.findByPk(id, { transaction });

            if (!empresa) {
                throw ErroApi.naoEncontrado("Empresa não encontrada.");
            }

            garantirDono(solicitante, empresa.usuarioId);
            garantirEmpresaAprovada(empresa, solicitante);

            await empresa.update(this.filtrarCampos(data, solicitante), {
                transaction
            });

            await transaction.commit();

            return empresa;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /*
     * Remover (administrador). A rota já é restrita a administrador (`exigirTipoUsuarioMiddleware`)
     * e não há caminho de dona, então a auditoria é sempre registrada.
     */
    async excluir(id, solicitante, contexto = {}) {
        const transaction = await sequelize.transaction();
        let empresaRemovida;

        try {
            const empresa = await Empresa.findByPk(id, { transaction });

            if (!empresa) {
                throw ErroApi.naoEncontrado("Empresa não encontrada.");
            }

            empresaRemovida = {
                id: empresa.id,
                razaoSocial: empresa.razaoSocial,
                usuarioId: empresa.usuarioId
            };

            await empresa.destroy({ transaction });
            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: "excluir_empresa",
            entidadeTipo: "empresa",
            entidadeId: id,
            descricao: `Empresa ${empresaRemovida.razaoSocial} foi removida.`,
            metadados: { empresa: empresaRemovida },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return { mensagem: "Empresa removida com sucesso." };
    }
}

export default new EmpresaService();
