import { Op } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import {
    Usuario,
    Candidato,
    Empresa,
    Administrador
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import { garantirDono, garantirAlvoDeAcaoAdministrativa } from "../utils/autorizacao.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
import BloqueioService from "./BloqueioService.js";
import AdminUsuarioService from "./AdminUsuarioService.js";

/**
 * Conta de usuário: consulta, dados públicos mínimos, edição, ativação e exclusão (que delega para
 * `AdminUsuarioService`).
 */
class UsuarioService {
    async buscarPorId(id) {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        return usuario;
    }

    /* Listar (somente administrador) */
    async listar(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);
        const { nome, email, tipoUsuario, ativo } = query;

        const where = {};

        if (nome) {
            where.nome = { [Op.iLike]: `%${nome}%` };
        }

        if (email) {
            where.email = { [Op.iLike]: `%${email}%` };
        }

        if (tipoUsuario) {
            where.tipoUsuario = tipoUsuario;
        }

        if (ativo !== undefined) {
            where.ativo = ativo === "true" || ativo === true;
        }

        const { rows, count } = await Usuario.findAndCountAll({
            where,
            offset,
            limit: limite,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("usuarios", rows, count, pagina, limite);
    }

    /* Buscar por id */
    async buscarRegistroCompleto(id, solicitante) {
        const usuario = await Usuario.findByPk(id, {
            include: [
                { model: Candidato, as: "candidato" },
                { model: Empresa, as: "empresa" },
                { model: Administrador, as: "administrador" }
            ]
        });

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        // Esta rota devolve o registro completo (e-mail, telefone, CPF via candidato, CNPJ via
        // empresa), então só o dono ou um administrador recebe esses dados, mesmo sem nenhum
        // cliente usando a rota.
        garantirDono(solicitante, usuario.id);

        return usuario;
    }

    /*
     * Perfil público básico (qualquer usuário autenticado). Usado pela rota de perfil quando o alvo
     * não tem registro de candidato nem de empresa (administradores): devolve só o necessário para
     * o cabeçalho do perfil, nunca e-mail, telefone ou documentos, com a mesma checagem de bloqueio
     * e privacidade dos perfis de candidato e empresa.
     */
    async perfilPublicoBasico(id, solicitante) {
        const usuario = await Usuario.findByPk(id, {
            attributes: [
                "id",
                "nome",
                "fotoPerfil",
                "capaPerfil",
                "tipoUsuario",
                "perfilPublico",
                "ativo",
                "bloqueado"
            ]
        });

        if (!usuario || !usuario.ativo) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        await BloqueioService.garantirNaoBloqueado(usuario, solicitante);

        return {
            id: usuario.id,
            nome: usuario.nome,
            fotoPerfil: usuario.fotoPerfil,
            capaPerfil: usuario.capaPerfil,
            tipoUsuario: usuario.tipoUsuario
        };
    }

    /*
     * Atualizar (dono ou administrador). Campos sensíveis (email, senhaHash, tipoUsuario, ativo)
     * não podem ser alterados por esta rota, contra escalonamento de privilégio por mass assignment
     * (OWASP A01/A08).
     */
    async atualizar(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const usuario = await Usuario.findByPk(id, { transaction });

            if (!usuario) {
                throw ErroApi.naoEncontrado("Usuário não encontrado.");
            }

            garantirDono(solicitante, usuario.id);

            // "!== undefined" (em vez de "??") permite limpar telefone, foto e capa enviando null.
            await usuario.update(
                {
                    nome: data.nome ?? usuario.nome,
                    telefone: data.telefone !== undefined ? data.telefone : usuario.telefone,
                    fotoPerfil: data.fotoPerfil !== undefined ? data.fotoPerfil : usuario.fotoPerfil,
                    capaPerfil: data.capaPerfil !== undefined ? data.capaPerfil : usuario.capaPerfil
                },
                { transaction }
            );

            await transaction.commit();

            return usuario;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /*
     * Ativar e desativar (administrador). As rotas já são restritas a administrador
     * (`exigirTipoUsuarioMiddleware`), mas o serviço aplica a mesma proteção contra agir sobre a
     * própria conta ou sobre outro administrador (`garantirAlvoDeAcaoAdministrativa`, em
     * `utils/autorizacao.js`), sem confiar só na rota.
     */
    async definirAtivo(id, ativo, solicitante, contexto = {}) {
        const usuario = await this.buscarPorId(id);

        garantirAlvoDeAcaoAdministrativa(usuario, solicitante, {
            mensagemAutoAcao: ativo
                ? "Você não pode reativar a própria conta por aqui."
                : "Você não pode desativar a própria conta por aqui.",
            mensagemAdminProtegido: ativo
                ? "Contas administrativas não podem ser reativadas por aqui."
                : "Contas administrativas não podem ser desativadas por aqui."
        });

        const estadoAnterior = { ativo: usuario.ativo };

        usuario.ativo = ativo;
        await usuario.save();

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: ativo ? "ativar_usuario" : "desativar_usuario",
            entidadeTipo: "usuario",
            entidadeId: usuario.id,
            descricao: ativo
                ? `Usuário ${usuario.nome} (${usuario.email}) foi reativado.`
                : `Usuário ${usuario.nome} (${usuario.email}) foi desativado.`,
            metadados: { antes: estadoAnterior, depois: { ativo } },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return usuario;
    }

    async ativar(id, solicitante, contexto = {}) {
        return this.definirAtivo(id, true, solicitante, contexto);
    }

    async desativar(id, solicitante, contexto = {}) {
        return this.definirAtivo(id, false, solicitante, contexto);
    }

    /*
     * Excluir (administrador). Delega para `AdminUsuarioService.removerUsuario`, para ter
     * exatamente o mesmo resultado da exclusão pelo painel (limpeza do Storage, arquivamento de
     * denúncias pendentes e log de auditoria na mesma transação). O painel usa
     * `/admin/usuarios/:id`, mas esta rota continua ativa pela API.
     */
    async excluir(id, solicitante, contexto = {}) {
        return AdminUsuarioService.removerUsuario(id, {}, solicitante, contexto);
    }
}

export default new UsuarioService();
