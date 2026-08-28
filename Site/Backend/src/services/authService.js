import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
    Usuario,
    Candidato,
    Empresa,
    Administrador,
    CodigoVerificacaoEmail
} from "../models/index.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { generateToken } from "../utils/jwt.js";
import { gerarCodigoNumerico, hashToken, compararHash } from "../utils/tokens.js";
import RefreshTokenService from "./RefreshTokenService.js";
import AutenticacaoDoisFatoresService from "./AutenticacaoDoisFatoresService.js";
import ApiError from "../utils/ApiError.js";

const MINUTOS_VALIDADE_EMAIL = 15;
const MAX_TENTATIVAS_EMAIL = 5;

/**
 * Regras de autenticação e cadastro.
 *
 * Observações de segurança:
 * - o hash da senha nunca sai do Service (scope padrão do model já o exclui);
 * - mensagens de login são genéricas para não permitir enumeração de contas;
 * - o tipo de usuário NUNCA vem do corpo da requisição;
 * - a sessão combina um access token JWT curto com refresh token rotativo.
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

    async montarSessao(usuario, contexto = {}) {
        const dados = usuario.toJSON();
        delete dados.senhaHash;

        const { refreshToken } = await RefreshTokenService.emitir(
            usuario.id,
            contexto
        );

        return {
            usuario: dados,
            token: this.gerarToken(usuario),
            refreshToken
        };
    }

    /* ==========================================================
       CADASTRO DE CANDIDATO
    ========================================================== */
    async registerCandidate(data, contexto = {}) {
        const { nome, email, senha, telefone, cpf } = data;

        if (await this.buscarPorEmail(email)) {
            throw ApiError.conflict("E-mail já cadastrado.");
        }

        if (cpf && (await Candidato.findOne({ where: { cpfHash: hashToken(cpf) } }))) {
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

            return this.montarSessao(usuario, contexto);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       CADASTRO DE EMPRESA
    ========================================================== */
    async registerCompany(data, contexto = {}) {
        const { nome, email, senha, telefone, cnpj, razaoSocial, nomeFantasia } =
            data;

        if (await this.buscarPorEmail(email)) {
            throw ApiError.conflict("E-mail já cadastrado.");
        }

        if (await Empresa.findOne({ where: { cnpjHash: hashToken(cnpj) } })) {
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

            return this.montarSessao(usuario, contexto);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       LOGIN
    ========================================================== */
    async login(email, senha, contexto = {}, codigoTotp, confirmarReativacao = false) {
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

        if (usuario.bloqueado) {
            throw ApiError.forbidden(
                usuario.motivoBloqueio
                    ? `Conta bloqueada: ${usuario.motivoBloqueio}`
                    : "Conta bloqueada pela moderação."
            );
        }

        // Conta pausada pelo próprio usuário: e-mail/senha corretos, mas não
        // emite sessão até o usuário confirmar que quer reativar (mesmo
        // padrão do 2FA abaixo — nenhuma arquitetura nova).
        if (usuario.pausadoPeloUsuario) {
            if (!confirmarReativacao) {
                return { contaPausada: true };
            }

            usuario.pausadoPeloUsuario = false;
            usuario.pausadoEm = null;
        }

        // E-mail/senha corretos, mas a conta exige o segundo fator: não
        // emite sessão ainda — o front reenvia login com `codigoTotp`.
        const exigeDoisFatores =
            await AutenticacaoDoisFatoresService.possuiDoisFatoresAtivo(
                usuario.id
            );

        if (exigeDoisFatores) {
            if (!codigoTotp) {
                return { requerDoisFatores: true };
            }

            const codigoValido =
                await AutenticacaoDoisFatoresService.verificarCodigoLogin(
                    usuario.id,
                    codigoTotp
                );

            if (!codigoValido) {
                throw ApiError.unauthorized("Código de verificação inválido.");
            }
        }

        usuario.ultimoLogin = new Date();
        await usuario.save();

        return this.montarSessao(usuario, contexto);
    }

    /* ==========================================================
       RENOVAÇÃO DE SESSÃO
    ========================================================== */
    async refresh(refreshToken, contexto = {}) {
        const { usuario, refreshToken: novoToken } =
            await RefreshTokenService.rotacionar(refreshToken, contexto);

        const dados = usuario.toJSON();
        delete dados.senhaHash;

        return {
            usuario: dados,
            token: this.gerarToken(usuario),
            refreshToken: novoToken
        };
    }

    async logout(refreshToken) {
        return RefreshTokenService.revogar(refreshToken);
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

        // Encerra as demais sessões após troca de senha.
        await RefreshTokenService.revogarTodos(usuarioId);

        return { mensagem: "Senha alterada com sucesso." };
    }

    /* ==========================================================
       PAUSAR CONTA (self-service, independente do bloqueio admin)
    ========================================================== */
    async pausarConta(usuarioId, senhaAtual) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        const confere = await comparePassword(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ApiError.unauthorized("Senha atual incorreta.");
        }

        usuario.pausadoPeloUsuario = true;
        usuario.pausadoEm = new Date();
        await usuario.save();

        await RefreshTokenService.revogarTodos(usuarioId);

        return { mensagem: "Conta pausada. Faça login novamente quando quiser voltar." };
    }

    /* ==========================================================
       EXCLUIR CONTA (self-service — cascade já auditado no schema)
    ========================================================== */
    async excluirConta(usuarioId, senhaAtual) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        const confere = await comparePassword(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ApiError.unauthorized("Senha atual incorreta.");
        }

        await usuario.destroy();

        return { mensagem: "Conta excluída com sucesso." };
    }

    /* ==========================================================
       TROCA DE E-MAIL (com verificação do novo endereço)
    ========================================================== */
    async solicitarTrocaEmail(usuarioId, senhaAtual, novoEmailBruto) {
        const novoEmail = this.normalizarEmail(novoEmailBruto);

        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        const confere = await comparePassword(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ApiError.unauthorized("Senha atual incorreta.");
        }

        if (novoEmail === usuario.email) {
            throw ApiError.badRequest("Este já é o seu e-mail atual.");
        }

        if (await this.buscarPorEmail(novoEmail)) {
            throw ApiError.conflict("E-mail já cadastrado.");
        }

        // Invalida códigos anteriores ainda válidos.
        await CodigoVerificacaoEmail.update(
            { utilizadoEm: new Date() },
            { where: { usuarioId, utilizadoEm: null } }
        );

        const codigo = gerarCodigoNumerico(6);
        const expiraEm = new Date(Date.now() + MINUTOS_VALIDADE_EMAIL * 60 * 1000);

        await CodigoVerificacaoEmail.create({
            usuarioId,
            novoEmail,
            codigoHash: hashToken(codigo),
            expiraEm
        });

        // O envio real do e-mail é feito pelo provedor configurado em produção.
        // Em desenvolvimento o código é registrado no log do servidor (mesmo
        // comportamento já usado na recuperação de senha).
        if (process.env.NODE_ENV !== "production") {
            console.info(
                `[VERIFICACAO-EMAIL] Código para ${novoEmail}: ${codigo} (expira em ${MINUTOS_VALIDADE_EMAIL} min)`
            );
        }

        return { mensagem: "Enviamos um código de confirmação para o novo e-mail." };
    }

    async confirmarTrocaEmail(usuarioId, codigo) {
        const registro = await CodigoVerificacaoEmail.findOne({
            where: {
                usuarioId,
                utilizadoEm: null,
                expiraEm: { [Op.gt]: new Date() }
            },
            order: [["created_at", "DESC"]]
        });

        if (!registro) {
            throw ApiError.badRequest("Código inválido ou expirado.");
        }

        if (registro.tentativas >= MAX_TENTATIVAS_EMAIL) {
            await registro.update({ utilizadoEm: new Date() });
            throw ApiError.badRequest(
                "Número de tentativas excedido. Solicite um novo código."
            );
        }

        if (!compararHash(hashToken(codigo), registro.codigoHash)) {
            await registro.increment("tentativas");
            throw ApiError.badRequest("Código inválido ou expirado.");
        }

        if (await this.buscarPorEmail(registro.novoEmail)) {
            await registro.update({ utilizadoEm: new Date() });
            throw ApiError.conflict("E-mail já cadastrado.");
        }

        const usuario = await Usuario.findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        const transaction = await sequelize.transaction();

        try {
            usuario.email = registro.novoEmail;
            await usuario.save({ transaction });
            await registro.update({ utilizadoEm: new Date() }, { transaction });
            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        return { mensagem: "E-mail atualizado com sucesso.", usuario };
    }
}

export default new AuthService();
