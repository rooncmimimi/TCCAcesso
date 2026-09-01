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
import EmailService from "./EmailService.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminService from "./AdminService.js";
import {
    templateConfirmacaoCadastro,
    templateConfirmacaoTrocaEmail,
    templateSenhaAlterada
} from "../utils/emailTemplates.js";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

const MINUTOS_VALIDADE_EMAIL = 15;
const MAX_TENTATIVAS_EMAIL = 5;
// Cooldown mínimo entre reenvios de confirmação de cadastro (anti-abuso,
// independente do rate limit por IP da rota).
const SEGUNDOS_COOLDOWN_REENVIO = 60;

function linkConfirmacaoCadastro(email, codigo) {
    const url = new URL("/confirmar-email", env.frontendUrl);
    url.searchParams.set("email", email);
    url.searchParams.set("codigo", codigo);
    return url.toString();
}

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
            throw ApiError.conflict("Este e-mail já está cadastrado.");
        }

        if (cpf && (await Candidato.findOne({ where: { cpfHash: hashToken(cpf) } }))) {
            throw ApiError.conflict("Este CPF já está cadastrado.");
        }

        const precisaConfirmarEmail = EmailService.disponivel();
        const transaction = await sequelize.transaction();

        try {
            const usuario = await Usuario.create(
                {
                    nome,
                    email: this.normalizarEmail(email),
                    senhaHash: await hashPassword(senha),
                    telefone: telefone || null,
                    tipoUsuario: "candidato",
                    emailVerificado: !precisaConfirmarEmail
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

            return this.finalizarCadastro(usuario, contexto);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       CADASTRO DE EMPRESA
    ========================================================== */
    async registerCompany(data, contexto = {}) {
        const {
            nome,
            email,
            senha,
            telefone,
            cnpj,
            razaoSocial,
            nomeFantasia,
            setor,
            porte,
            site,
            descricao,
            cidade,
            estado,
            endereco,
            cep
        } = data;

        if (await this.buscarPorEmail(email)) {
            throw ApiError.conflict("Este e-mail já está cadastrado.");
        }

        if (await Empresa.findOne({ where: { cnpjHash: hashToken(cnpj) } })) {
            throw ApiError.conflict("Este CNPJ já está cadastrado.");
        }

        const precisaConfirmarEmail = EmailService.disponivel();
        const transaction = await sequelize.transaction();

        try {
            const usuario = await Usuario.create(
                {
                    nome,
                    email: this.normalizarEmail(email),
                    senhaHash: await hashPassword(senha),
                    telefone: telefone || null,
                    tipoUsuario: "empresa",
                    emailVerificado: !precisaConfirmarEmail
                },
                { transaction }
            );

            await Empresa.create(
                {
                    usuarioId: usuario.id,
                    cnpj,
                    razaoSocial,
                    nomeFantasia: nomeFantasia || null,
                    setor: setor || null,
                    porte: porte || null,
                    site: site || null,
                    descricao: descricao || null,
                    cidade: cidade || null,
                    estado: estado ? estado.toUpperCase() : null,
                    endereco: endereco || null,
                    cep: cep || null
                },
                { transaction }
            );

            await transaction.commit();

            return this.finalizarCadastro(usuario, contexto);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /**
     * Depois que a conta é criada: se o envio de confirmação estiver
     * disponível (BREVO_API_KEY configurada), a conta exige confirmação de
     * e-mail antes do primeiro login — não emite sessão ainda. Sem provedor
     * configurado, mantém o comportamento anterior (login imediato), para
     * nunca travar o cadastro por uma dependência externa não configurada.
     */
    async finalizarCadastro(usuario, contexto) {
        if (!EmailService.disponivel()) {
            return this.montarSessao(usuario, contexto);
        }

        await this.enviarCodigoConfirmacaoCadastro(usuario);

        return { pendenteVerificacaoEmail: true, email: usuario.email };
    }

    /** Gera um novo código de confirmação de cadastro e tenta enviá-lo por e-mail (best-effort). */
    async enviarCodigoConfirmacaoCadastro(usuario) {
        const codigo = gerarCodigoNumerico(6);
        const expiraEm = new Date(Date.now() + MINUTOS_VALIDADE_EMAIL * 60 * 1000);

        await CodigoVerificacaoEmail.create({
            usuarioId: usuario.id,
            // Confirmação de CADASTRO reaproveita esta tabela guardando o
            // e-mail atual do usuário (nunca muda) — o que distingue de um
            // código de TROCA de e-mail é justamente `novoEmail === email`,
            // uma condição que solicitarTrocaEmail nunca permite gerar
            // (ela recusa `novoEmail === usuario.email` antes de criar o
            // registro), então as duas finalidades nunca colidem.
            novoEmail: usuario.email,
            codigoHash: hashToken(codigo),
            expiraEm
        });

        const { assunto, html, texto } = templateConfirmacaoCadastro({
            nome: usuario.nome,
            linkConfirmacao: linkConfirmacaoCadastro(usuario.email, codigo),
            codigo,
            minutosValidade: MINUTOS_VALIDADE_EMAIL
        });

        try {
            await EmailService.enviar({
                para: usuario.email,
                nomeDestinatario: usuario.nome,
                assunto,
                html,
                texto,
                tag: "confirmacao-cadastro"
            });
        } catch (erro) {
            // Best-effort: a conta já existe: se o envio falhar agora, o
            // usuário ainda pode pedir reenvio depois (reenviarConfirmacaoCadastro).
            // Não derruba o cadastro por uma falha do provedor de e-mail.
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "AuthService",
                    acao: "envio_confirmacao_cadastro",
                    usuarioId: usuario.id,
                    erro: erro.message
                })
            );
        }
    }

    /** Confirma o e-mail de uma conta recém-criada usando o código de 6 dígitos recebido por e-mail. */
    async confirmarEmailCadastro(emailBruto, codigo) {
        const email = this.normalizarEmail(emailBruto);
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario) {
            throw ApiError.badRequest("Código inválido ou expirado.");
        }

        if (usuario.emailVerificado) {
            return { mensagem: "E-mail já confirmado. Você já pode fazer login." };
        }

        const registro = await CodigoVerificacaoEmail.findOne({
            where: {
                usuarioId: usuario.id,
                novoEmail: email,
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

        const transaction = await sequelize.transaction();

        try {
            usuario.emailVerificado = true;
            await usuario.save({ transaction });
            await registro.update({ utilizadoEm: new Date() }, { transaction });
            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        // Best-effort: o usuário ainda não está logado neste momento (é
        // literalmente o passo que libera o primeiro login), mas a
        // notificação já fica pronta para quando ele entrar.
        await NotificacaoService.criar({
            usuarioId: usuario.id,
            tipo: "Sistema",
            titulo: "E-mail confirmado",
            descricao: "Seu e-mail foi confirmado com sucesso. Sua conta já está pronta para uso.",
            subtipo: "email_confirmado"
        });

        return { mensagem: "E-mail confirmado com sucesso. Você já pode fazer login." };
    }

    /**
     * Reenvia o código de confirmação de cadastro. Resposta sempre genérica
     * (não revela se a conta existe ou já está confirmada — mesma lógica
     * anti-enumeração de RecuperacaoSenhaService) e com cooldown para não
     * permitir reenvios em sequência para o mesmo endereço.
     */
    async reenviarConfirmacaoCadastro(emailBruto) {
        const generico = {
            mensagem:
                "Se sua conta existir e ainda não estiver confirmada, enviaremos um novo e-mail de confirmação."
        };

        const email = this.normalizarEmail(emailBruto);
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario || usuario.emailVerificado || !EmailService.disponivel()) {
            return generico;
        }

        const ultimoEnvio = await CodigoVerificacaoEmail.findOne({
            where: { usuarioId: usuario.id, novoEmail: email },
            order: [["created_at", "DESC"]]
        });

        if (ultimoEnvio) {
            // Atenção: o atributo Sequelize deste model é `created_at`
            // (snake_case), não `createdAt` — CodigoVerificacaoEmail usa
            // `createdAt: "created_at"` na config de timestamps, que
            // renomeia o atributo, não só a coluna (diferente do padrão
            // `field: "..."` usado no resto do projeto).
            const segundosDesdeUltimoEnvio =
                (Date.now() - new Date(ultimoEnvio.created_at).getTime()) / 1000;

            if (segundosDesdeUltimoEnvio < SEGUNDOS_COOLDOWN_REENVIO) {
                return generico;
            }
        }

        // Invalida códigos anteriores ainda válidos antes de gerar um novo.
        await CodigoVerificacaoEmail.update(
            { utilizadoEm: new Date() },
            { where: { usuarioId: usuario.id, novoEmail: email, utilizadoEm: null } }
        );

        await this.enviarCodigoConfirmacaoCadastro(usuario);

        return generico;
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

        // E-mail/senha corretos, mas o cadastro ainda não foi confirmado:
        // não emite sessão (mesmo padrão de resposta especial do 2FA e da
        // conta pausada abaixo) — o Frontend usa isso para oferecer
        // "reenviar e-mail de confirmação" em vez de um erro genérico.
        // Contas criadas antes desta funcionalidade (ou quando o provedor
        // de e-mail não está configurado) já nascem com emailVerificado
        // = true, então nunca caem aqui.
        if (!usuario.emailVerificado) {
            return { emailNaoVerificado: true, email: usuario.email };
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

        await this.avisarSenhaAlterada(usuario);

        return { mensagem: "Senha alterada com sucesso." };
    }

    /**
     * Aviso de segurança best-effort após troca de senha bem-sucedida
     * (configurações da conta ou recuperação de senha) — nunca bloqueia a
     * operação principal se o envio falhar.
     */
    async avisarSenhaAlterada(usuario) {
        await NotificacaoService.criar({
            usuarioId: usuario.id,
            tipo: "Sistema",
            titulo: "Senha alterada",
            descricao: "Sua senha foi alterada com sucesso. Se não foi você, contate o suporte imediatamente.",
            subtipo: "senha_alterada"
        });

        if (!EmailService.disponivel()) return;

        const { assunto, html, texto } = templateSenhaAlterada({ nome: usuario.nome });

        try {
            await EmailService.enviar({
                para: usuario.email,
                nomeDestinatario: usuario.nome,
                assunto,
                html,
                texto,
                tag: "senha-alterada"
            });
        } catch (erro) {
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "AuthService",
                    acao: "aviso_senha_alterada",
                    usuarioId: usuario.id,
                    erro: erro.message
                })
            );
        }
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
    /**
     * Exclusão definitiva pelo PRÓPRIO usuário (Fase 5) — reaproveita o
     * mesmo núcleo usado pela exclusão administrativa
     * (`AdminService.excluirContaDefinitivamente`): limpa o Storage e
     * arquiva denúncias pendentes contra a conta, exatamente como
     * acontece quando um admin exclui. Antes da Fase 5 este método só
     * fazia `usuario.destroy()`, deixando arquivos (foto, capa,
     * currículo) publicamente acessíveis para sempre e denúncias
     * pendentes contra a conta paradas na fila de moderação apontando
     * para ninguém.
     */
    async excluirConta(usuarioId, senhaAtual) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        const confere = await comparePassword(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ApiError.unauthorized("Senha atual incorreta.");
        }

        await AdminService.excluirContaDefinitivamente(usuario);

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
            throw ApiError.conflict("Este e-mail já está cadastrado.");
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

        if (EmailService.disponivel()) {
            const { assunto, html, texto } = templateConfirmacaoTrocaEmail({
                nome: usuario.nome,
                codigo,
                minutosValidade: MINUTOS_VALIDADE_EMAIL
            });

            try {
                await EmailService.enviar({ para: novoEmail, nomeDestinatario: usuario.nome, assunto, html, texto, tag: "troca-email" });
            } catch (erro) {
                console.error(
                    JSON.stringify({
                        nivel: "error",
                        servico: "AuthService",
                        acao: "envio_confirmacao_troca_email",
                        usuarioId,
                        erro: erro.message
                    })
                );
            }
        } else if (process.env.NODE_ENV !== "production") {
            // Sem provedor de e-mail configurado: mantém o fallback só de
            // desenvolvimento (nunca em produção) que já existia antes.
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
            throw ApiError.conflict("Este e-mail já está cadastrado.");
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

        await NotificacaoService.criar({
            usuarioId: usuario.id,
            tipo: "Sistema",
            titulo: "E-mail alterado",
            descricao: `Seu e-mail de acesso foi alterado para ${usuario.email}.`,
            subtipo: "email_alterado"
        });

        return { mensagem: "E-mail atualizado com sucesso.", usuario };
    }
}

export default new AuthService();
