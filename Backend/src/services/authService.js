import sequelize from "../config/database.js";
import { Usuario, Candidato, Empresa, Administrador } from "../models/index.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { generateToken } from "../utils/jwt.js";
import ApiError from "../utils/ApiError.js";

/**
 * Regras de autenticação e cadastro.
 *
 * Observações de segurança:
 * - o hash da senha nunca sai do Service (scope padrão do model já o exclui);
 * - mensagens de login são genéricas para não permitir enumeração de contas;
 * - o tipo de usuário NUNCA vem do corpo da requisição.
 */
class AuthService {
    normalizarEmail(email) {
        return String(email || "")
            .toLowerCase()
            .trim();
    }

    gerarToken(usuario) {
        return generateToken({
            id: usuario.id,
            tipoUsuario: usuario.tipoUsuario
        });
    }

    async buscarPorEmail(email, { comSenha = false } = {}) {
        const model = comSenha ? Usuario.scope("comSenha") : Usuario;

        return model.findOne({
            where: { email: this.normalizarEmail(email) }
        });
    }

    montarSessao(usuario) {
        const dados = usuario.toJSON();
        delete dados.senhaHash;

        return {
            usuario: dados,
            token: this.gerarToken(usuario)
        };
    }

    /* ==========================================================
       CADASTRO DE CANDIDATO
    ========================================================== */
    async registerCandidate(data) {
        const { nome, email, senha, telefone, cpf } = data;

        if (await this.buscarPorEmail(email)) {
            throw ApiError.conflict("E-mail já cadastrado.");
        }

        if (cpf && (await Candidato.findOne({ where: { cpf } }))) {
            throw ApiError.conflict("CPF já cadastrado.");
        }

        const transaction = await sequelize.transaction();

        try {
            const usuario = await Usuario.create(
                {
                    nome,
                    email: this.normalizarEmail(email),
                    senhaHash: await hashPassword(senha),
                    telefone: telefone || null,
                    tipoUsuario: "candidato"
                },
                { transaction }
            );

            await Candidato.create(
                {
                    usuarioId: usuario.id,
                    cpf: cpf || null
                },
                { transaction }
            );

            await transaction.commit();

            return this.montarSessao(usuario);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       CADASTRO DE EMPRESA
    ========================================================== */
    async registerCompany(data) {
        const { nome, email, senha, telefone, cnpj, razaoSocial, nomeFantasia } =
            data;

        if (await this.buscarPorEmail(email)) {
            throw ApiError.conflict("E-mail já cadastrado.");
        }

        if (await Empresa.findOne({ where: { cnpj } })) {
            throw ApiError.conflict("CNPJ já cadastrado.");
        }

        const transaction = await sequelize.transaction();

        try {
            const usuario = await Usuario.create(
                {
                    nome,
                    email: this.normalizarEmail(email),
                    senhaHash: await hashPassword(senha),
                    telefone: telefone || null,
                    tipoUsuario: "empresa"
                },
                { transaction }
            );

            await Empresa.create(
                {
                    usuarioId: usuario.id,
                    cnpj,
                    razaoSocial,
                    nomeFantasia: nomeFantasia || null
                },
                { transaction }
            );

            await transaction.commit();

            return this.montarSessao(usuario);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       LOGIN
    ========================================================== */
    async login(email, senha) {
        const usuario = await this.buscarPorEmail(email, { comSenha: true });

        // Executa a comparação mesmo sem usuário para reduzir timing attacks.
        const hashReferencia =
            usuario?.senhaHash ||
            "$2b$12$0000000000000000000000000000000000000000000000000000";

        const senhaCorreta = await comparePassword(senha, hashReferencia);

        if (!usuario || !senhaCorreta) {
            throw ApiError.unauthorized("E-mail ou senha inválidos.");
        }

        if (!usuario.ativo) {
            throw ApiError.forbidden("Usuário desativado.");
        }

        usuario.ultimoLogin = new Date();
        await usuario.save();

        return this.montarSessao(usuario);
    }

    /* ==========================================================
       USUÁRIO AUTENTICADO
    ========================================================== */
    async me(id) {
        const usuario = await Usuario.findByPk(id, {
            include: [
                { model: Candidato, as: "candidato" },
                { model: Empresa, as: "empresa" },
                { model: Administrador, as: "administrador" }
            ]
        });

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        return usuario;
    }

    /* ==========================================================
       TROCA DE SENHA
    ========================================================== */
    async alterarSenha(usuarioId, senhaAtual, novaSenha) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        const confere = await comparePassword(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ApiError.unauthorized("Senha atual incorreta.");
        }

        usuario.senhaHash = await hashPassword(novaSenha);
        await usuario.save();

        return { mensagem: "Senha alterada com sucesso." };
    }
}

export default new AuthService();
