import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import env from "../config/env.js";
import {
    Usuario,
    Candidato,
    Empresa,
    CodigoVerificacaoEmail
} from "../models/index.js";
import { gerarHashSenha, compararSenha } from "../utils/bcrypt.js";
import { assinarJwt } from "../utils/jwt.js";
import { gerarCodigoNumerico, hashToken, compararHash } from "../utils/tokens.js";
import SessaoService from "./SessaoService.js";
import EmailService from "./EmailService.js";
import NotificacaoService from "./NotificacaoService.js";
import NotificacaoPushService from "./NotificacaoPushService.js";
import AdminUsuarioService from "./AdminUsuarioService.js";
import {
    modeloConfirmacaoCadastro,
    modeloConfirmacaoTrocaEmail,
    modeloSenhaAlterada
} from "../utils/modelosEmail.js";
import { montarUrlFrontend } from "../utils/urlFrontend.js";
import ErroApi from "../utils/ErroApi.js";
import { ehIdioma, idiomaAtual, idiomaDoDestinatario } from "../i18n/idioma.js";

const MINUTOS_VALIDADE_EMAIL = 15;
const MAX_TENTATIVAS_EMAIL = 5;
// Cooldown mínimo entre reenvios de confirmação de cadastro (anti-abuso,
// independente do rate limit por IP da rota).
const SEGUNDOS_COOLDOWN_REENVIO = 60;

/**
 * Regras de autenticação e cadastro.
 *
 * Observações de segurança:
 * - o hash da senha nunca sai do Service (scope padrão do model já o exclui);
 * - mensagens de login são genéricas para não permitir enumeração de contas;
 * - o tipo de usuário nunca vem do corpo da requisição;
 * - a sessão combina um access token JWT curto com refresh token rotativo.
 */
class AutenticacaoService {
    normalizarEmail(email) {
        return String(email || "")
            .toLowerCase()
            .trim();
    }

    gerarToken(usuario) {
        return assinarJwt({
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

        // Só para empresa: inclui a empresa na resposta para o cliente saber o `statusAprovacao` já
        // no login ou no cadastro, sem esperar `/auth/me`; senão, haveria um momento em que a
        // sessão parece normal antes de alguma rota empresarial recusar. É a mesma associação que
        // `perfilAtual()` devolve, e não muda o token nem a resposta de candidato e administrador.
        if (dados.tipoUsuario === "empresa") {
            const empresa = await Empresa.findOne({
                where: { usuarioId: usuario.id }
            });

            dados.empresa = empresa || null;
        }

        const { refreshToken } = await SessaoService.emitir(
            usuario.id,
            contexto
        );

        return {
            usuario: dados,
            token: this.gerarToken(usuario),
            refreshToken
        };
    }

    /**
     * Campos do registro de aceite dos documentos legais, para gravar junto do `Usuario.create`.
     *
     * O momento vem do servidor, nunca do cliente, e a versão é a que o cliente diz ter mostrado —
     * é só um rótulo do texto exibido, não uma permissão, então não há o que forjar aqui. Sem versão
     * informada não grava nada: melhor um aceite sem registro do que um registro que mente sobre
     * qual texto foi aceito.
     */
    registroDeAceite(versao) {
        if (!versao) return {};

        return { termosAceitosEm: new Date(), termosVersao: String(versao).slice(0, 20) };
    }

    /**
     * Idioma que a conta nasce com: o que a tela de cadastro mandou ou, sem ele, o da requisição.
     * Nunca vem solto do cliente — valor fora de `pt`/`en`/`es` cai no idioma da requisição, que
     * já é um idioma suportado.
     */
    idiomaDoCadastro(idioma) {
        return ehIdioma(idioma) ? idioma : idiomaAtual();
    }

    /**
     * Lê o código de entrega do Google e devolve o `sub` verificado, para vincular no cadastro.
     *
     * O `sub` vem do token que **este servidor** assinou depois de verificar o ID token com o
     * Google — nunca de um campo que o navegador mandou. É o que impede alguém de criar uma conta
     * dizendo ser dona de uma conta Google qualquer.
     *
     * Código ausente é cadastro comum, sem Google: devolve `{}` e segue. Código presente e inválido
     * é erro, porque aí houve intenção de vincular e ela não pôde ser comprovada.
     */
    vinculoGoogle(codigo) {
        if (!codigo) return {};

        let conteudo;
        try {
            conteudo = jwt.verify(codigo, env.jwt.secret);
        } catch {
            throw ErroApi.requisicaoInvalida(
                "A verificação com o Google expirou. Entre com o Google novamente."
            );
        }

        if (!conteudo?.perfil?.sub) {
            throw ErroApi.requisicaoInvalida("Verificação do Google inválida.");
        }

        return { googleId: conteudo.perfil.sub };
    }

    /**
     * Cadastro de candidato: cria conta e perfil numa transação e já devolve sessão.
     *
     * As duas primeiras etapas do wizard chegam juntas aqui (conta + dados pessoais), de propósito:
     * são os campos obrigatórios do candidato, e gravá-los numa transação só evita a conta existir
     * pela metade se a chamada seguinte falhar.
     *
     * `emailVerificado` nasce **falso** e continua falso até alguém de fato confirmar o endereço —
     * o cadastro deixou de exigir a confirmação, mas isso não torna o e-mail verificado. Quem libera
     * o uso da conta é o login (`entrar`), que não barra candidato por e-mail não confirmado.
     */
    async cadastrarCandidato(data, contexto = {}) {
        const { nome, email, senha, telefone, cpf, pais, dataNascimento, cidade, estado, termosVersao, googleCodigo, idioma } = data;

        if (await this.buscarPorEmail(email)) {
            throw ErroApi.conflito("Este e-mail já está cadastrado.");
        }

        if (cpf && (await Candidato.findOne({ where: { cpfHash: hashToken(cpf) } }))) {
            throw ErroApi.conflito("Este CPF já está cadastrado.");
        }

        const transaction = await sequelize.transaction();
        let usuarioCriado;

        try {
            const usuario = await Usuario.create(
                {
                    nome,
                    email: this.normalizarEmail(email),
                    senhaHash: await gerarHashSenha(senha),
                    telefone: telefone || null,
                    tipoUsuario: "candidato",
                    emailVerificado: false,
                    idioma: this.idiomaDoCadastro(idioma),
                    ...this.registroDeAceite(termosVersao),
                    ...this.vinculoGoogle(googleCodigo)
                },
                { transaction }
            );

            await Candidato.create(
                {
                    usuarioId: usuario.id,
                    cpf: cpf || null,
                    pais: pais ? pais.toUpperCase() : null,
                    dataNascimento: dataNascimento || null,
                    cidade: cidade || null,
                    estado: estado ? estado.toUpperCase() : null
                },
                { transaction }
            );

            await transaction.commit();
            usuarioCriado = usuario;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        // Fora da transação, e best-effort: o e-mail de confirmação continua saindo para quem
        // quiser verificar o endereço depois (recuperação de senha agradece), mas o cadastro não
        // depende dele. Falhar aqui não pode derrubar uma conta que já está criada.
        if (EmailService.disponivel()) {
            try {
                await this.enviarCodigoConfirmacaoCadastro(usuarioCriado);
            } catch {
                // `enviarCodigoConfirmacaoCadastro` já engole a falha de envio; isto cobre o resto
                // (gravar o código, por exemplo). A pessoa pode pedir reenvio quando quiser.
            }
        }

        return this.montarSessao(usuarioCriado, contexto);
    }

    /* Cadastro de empresa */
    /**
     * Cadastro de empresa. Exige que quem está criando já tenha conta de **candidato**.
     *
     * É a regra do produto: a conta de empresa nasce de uma conta pessoal e fica vinculada a ela.
     * As duas permanecem separadas — cada uma com seu login e seu `tipo_usuario` —, então nada da
     * autorização muda; o que a empresa ganha é o registro de quem respondeu pelo cadastro.
     *
     * O vínculo vem de `solicitante`, que o controller lê da sessão. Nunca do corpo da requisição:
     * um campo enviado pelo cliente seria alegação, não prova, e qualquer um poderia dizer que a
     * empresa pertence à conta de outra pessoa.
     *
     * Nada aqui contorna a aprovação: a empresa continua nascendo em análise.
     */
    async cadastrarEmpresa(data, contexto = {}, solicitante = null) {
        if (!solicitante) {
            throw ErroApi.naoAutenticado(
                "Para cadastrar uma empresa é preciso entrar com a sua conta de candidato."
            );
        }

        if (solicitante.tipoUsuario !== "candidato") {
            throw ErroApi.acessoNegado(
                "Só uma conta de candidato pode cadastrar uma empresa. Entre com a sua conta pessoal."
            );
        }

        return this.criarEmpresa(data, contexto, solicitante.id);
    }

    async criarEmpresa(data, contexto = {}, usuarioCandidatoId = null) {
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
            cep,
            pais,
            culturaInclusiva,
            termosVersao,
            idioma
        } = data;

        if (await this.buscarPorEmail(email)) {
            throw ErroApi.conflito("Este e-mail já está cadastrado.");
        }

        if (await Empresa.findOne({ where: { cnpjHash: hashToken(cnpj) } })) {
            throw ErroApi.conflito("Este CNPJ já está cadastrado.");
        }

        const precisaConfirmarEmail = EmailService.disponivel();
        const transaction = await sequelize.transaction();

        try {
            const usuario = await Usuario.create(
                {
                    nome,
                    email: this.normalizarEmail(email),
                    senhaHash: await gerarHashSenha(senha),
                    telefone: telefone || null,
                    tipoUsuario: "empresa",
                    emailVerificado: !precisaConfirmarEmail,
                    idioma: this.idiomaDoCadastro(idioma),
                    ...this.registroDeAceite(termosVersao)
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
                    cep: cep || null,
                    pais: pais ? pais.toUpperCase() : null,
                    culturaInclusiva: culturaInclusiva || null,
                    usuarioCandidatoId
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
     * Fecha o cadastro de **empresa**. Com o envio de confirmação disponível (`BREVO_API_KEY`
     * configurada), a conta exige confirmar o e-mail antes do primeiro login e ainda não recebe
     * sessão. Sem provedor, o login é imediato, para não travar o cadastro por uma dependência
     * externa não configurada.
     *
     * Candidato não passa por aqui: `cadastrarCandidato` devolve sessão direto, porque o cadastro
     * dele deixou de exigir confirmação de e-mail.
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
            // Confirmação de cadastro reaproveita esta tabela guardando o
            // e-mail atual do usuário (nunca muda): o que distingue de um
            // código de troca de e-mail é justamente `novoEmail === email`,
            // uma condição que solicitarTrocaEmail nunca permite gerar
            // (ela recusa `novoEmail === usuario.email` antes de criar o
            // registro), então as duas finalidades nunca colidem.
            novoEmail: usuario.email,
            codigoHash: hashToken(codigo),
            expiraEm
        });

        const { assunto, html, texto } = modeloConfirmacaoCadastro({
            nome: usuario.nome,
            linkConfirmacao: montarUrlFrontend("/confirmar-email", {
                email: usuario.email,
                codigo
            }),
            codigo,
            minutosValidade: MINUTOS_VALIDADE_EMAIL,
            idioma: idiomaDoDestinatario(usuario, { daRequisicao: true })
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
            throw ErroApi.requisicaoInvalida("Código inválido ou expirado.");
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
            order: [["criadoEm", "DESC"]]
        });

        if (!registro) {
            throw ErroApi.requisicaoInvalida("Código inválido ou expirado.");
        }

        if (registro.tentativas >= MAX_TENTATIVAS_EMAIL) {
            await registro.update({ utilizadoEm: new Date() });
            throw ErroApi.requisicaoInvalida(
                "Número de tentativas excedido. Solicite um novo código."
            );
        }

        if (!compararHash(hashToken(codigo), registro.codigoHash)) {
            await registro.increment("tentativas");
            throw ErroApi.requisicaoInvalida("Código inválido ou expirado.");
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
            tipo: "sistema",
            titulo: "E-mail confirmado",
            descricao: "Seu e-mail foi confirmado com sucesso. Sua conta já está pronta para uso.",
            subtipo: "email_confirmado"
        });

        return { mensagem: "E-mail confirmado com sucesso. Você já pode fazer login." };
    }

    /**
     * Reenvia o código de confirmação de cadastro. Resposta sempre genérica
     * (não revela se a conta existe ou já está confirmada, mesma lógica
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
            order: [["criadoEm", "DESC"]]
        });

        if (ultimoEnvio) {
            const segundosDesdeUltimoEnvio =
                (Date.now() - new Date(ultimoEnvio.criadoEm).getTime()) / 1000;

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

    /* Login */
    async entrar(email, senha, contexto = {}, confirmarReativacao = false) {
        const usuario = await this.buscarPorEmail(email, { comSenha: true });

        // Executa a comparação mesmo sem usuário para reduzir timing attacks.
        const hashReferencia =
            usuario?.senhaHash ||
            "$2b$12$0000000000000000000000000000000000000000000000000000";

        const senhaCorreta = await compararSenha(senha, hashReferencia);

        if (!usuario || !senhaCorreta) {
            throw ErroApi.naoAutenticado("E-mail ou senha inválidos.");
        }

        // Os demais portões (conta desativada, bloqueada, e-mail não confirmado e conta pausada)
        // ficam em `entrarComUsuario`, compartilhados com o login pelo Google.
        return this.entrarComUsuario(usuario, contexto, confirmarReativacao);
    }

    /**
     * Últimas checagens e emissão da sessão, a partir de um usuário já identificado.
     *
     * Existe para o login com Google passar exatamente pelos mesmos portões do login com senha —
     * conta desativada, bloqueada, e-mail não confirmado (empresa) e conta pausada. Sem isto, entrar
     * pelo Google seria um caminho paralelo que escapa das regras de autorização.
     *
     * Quem chama é responsável por já ter provado a identidade: senha conferida em `entrar`, ou
     * `sub` do ID token verificado em `GoogleAuthService`.
     */
    async entrarComUsuario(usuario, contexto = {}, confirmarReativacao = false) {
        if (!usuario.ativo) {
            throw ErroApi.acessoNegado("Usuário desativado.");
        }

        if (usuario.bloqueado) {
            throw ErroApi.acessoNegado(
                usuario.motivoBloqueio
                    ? `Conta bloqueada: ${usuario.motivoBloqueio}`
                    : "Conta bloqueada pela moderação."
            );
        }

        if (!usuario.emailVerificado && usuario.tipoUsuario !== "candidato") {
            return { emailNaoVerificado: true, email: usuario.email };
        }

        if (usuario.pausadoPeloUsuario) {
            if (!confirmarReativacao) {
                return { contaPausada: true };
            }

            usuario.pausadoPeloUsuario = false;
            usuario.pausadoEm = null;
        }

        usuario.ultimoLogin = new Date();
        await usuario.save();

        return this.montarSessao(usuario, contexto);
    }

    /* Renovação de sessão */
    async renovarToken(refreshToken, contexto = {}) {
        const { usuario, refreshToken: novoToken } =
            await SessaoService.rotacionar(refreshToken, contexto);

        const dados = usuario.toJSON();
        delete dados.senhaHash;

        return {
            usuario: dados,
            token: this.gerarToken(usuario),
            refreshToken: novoToken
        };
    }

    async sair(refreshToken) {
        return SessaoService.revogar(refreshToken);
    }

    /* Usuário autenticado */
    async perfilAtual(id) {
        const usuario = await Usuario.findByPk(id, {
            include: [
                { model: Candidato, as: "candidato" },
                { model: Empresa, as: "empresa" }
            ]
        });

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        return usuario;
    }

    /**
     * Marca o cadastro como terminado. Chamada na última etapa do wizard.
     *
     * Enquanto `cadastroConcluidoEm` for nula, o Site entende que a pessoa parou no meio — o caso
     * normal quando a confirmação de e-mail está ativa, que corta o cadastro em dois — e oferece
     * retomar de onde parou depois do login. Idempotente: concluir de novo não reescreve a data,
     * para a primeira conclusão continuar sendo a verdadeira.
     */
    async concluirCadastro(usuarioId) {
        const usuario = await Usuario.findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        // Candidato só conclui com os campos obrigatórios do perfil preenchidos. É aqui que isso é
        // conferido no servidor, e não em `PUT /candidatos/:id`, porque aquele endpoint também
        // serve à edição avulsa do perfil, onde exigir estes campos travaria qualquer outra
        // alteração. Currículo e foto continuam opcionais e nunca entram nesta conta.
        if (usuario.tipoUsuario === "candidato") {
            const candidato = await Candidato.findOne({ where: { usuarioId } });

            if (!candidato) {
                throw ErroApi.naoEncontrado("Perfil de candidato não encontrado.");
            }

            // Só o que as duas primeiras etapas pedem. A etapa de perfil profissional e currículo é
            // inteiramente opcional: ninguém fica preso no cadastro por não ter currículo em mãos
            // ou por não saber como se descrever ainda.
            const obrigatorios = {
                "país": candidato.pais,
                "data de nascimento": candidato.dataNascimento,
                cidade: candidato.cidade,
                estado: candidato.estado
            };

            const faltando = Object.entries(obrigatorios)
                .filter(([, valor]) => !String(valor ?? "").trim())
                .map(([nome]) => nome);

            if (faltando.length) {
                throw ErroApi.requisicaoInvalida(
                    `Para concluir o cadastro, preencha: ${faltando.join(", ")}.`
                );
            }
        }

        if (!usuario.cadastroConcluidoEm) {
            await usuario.update({ cadastroConcluidoEm: new Date() });
        }

        return this.perfilAtual(usuarioId);
    }

    /* Troca de senha */
    async alterarSenha(usuarioId, senhaAtual, novaSenha) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        const confere = await compararSenha(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ErroApi.naoAutenticado("Senha atual incorreta.");
        }

        usuario.senhaHash = await gerarHashSenha(novaSenha);
        // `senhaAlteradaEm` invalida os access tokens já emitidos; sem ela, um token roubado
        // continuaria valendo até expirar, mesmo depois da troca de senha.
        usuario.senhaAlteradaEm = new Date();
        await usuario.save();

        // Revoga todas as sessões da conta, inclusive a atual. O Site e o app saem da conta assim
        // que a troca termina, e qualquer outro aparelho cai na requisição seguinte.
        await SessaoService.revogarTodos(usuarioId);
        // Junto das sessões vão os tokens de push: um aparelho que acabou de perder o acesso não
        // pode continuar recebendo as notificações da conta.
        await NotificacaoPushService.removerTodosDoUsuario(usuarioId);

        await this.avisarSenhaAlterada(usuario);

        return { mensagem: "Senha alterada com sucesso.", sessaoEncerrada: true };
    }

    /**
     * Aviso de segurança best-effort após troca de senha bem-sucedida
     * (configurações da conta ou recuperação de senha): nunca bloqueia a
     * operação principal se o envio falhar.
     */
    async avisarSenhaAlterada(usuario) {
        await NotificacaoService.criar({
            usuarioId: usuario.id,
            tipo: "sistema",
            titulo: "Senha alterada",
            descricao: "Sua senha foi alterada com sucesso. Se não foi você, contate o suporte imediatamente.",
            subtipo: "senha_alterada"
        });

        if (!EmailService.disponivel()) return;

        const { assunto, html, texto } = modeloSenhaAlterada({
            nome: usuario.nome,
            idioma: idiomaDoDestinatario(usuario, { daRequisicao: true })
        });

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

    /**
     * Salva o idioma da interface na conta. Chamada quando a pessoa troca de idioma logada; é o que
     * faz a escolha valer em outro aparelho e define a língua dos e-mails e avisos que o servidor
     * envia por conta própria.
     */
    async alterarIdioma(usuarioId, idioma) {
        const usuario = await Usuario.findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        if (usuario.idioma !== idioma) {
            await usuario.update({ idioma });
        }

        return { mensagem: "Idioma atualizado com sucesso.", idioma: usuario.idioma };
    }

    /* Pausar conta (pelo próprio usuário, independente do bloqueio administrativo) */
    async pausarConta(usuarioId, senhaAtual) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        const confere = await compararSenha(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ErroApi.naoAutenticado("Senha atual incorreta.");
        }

        usuario.pausadoPeloUsuario = true;
        usuario.pausadoEm = new Date();
        await usuario.save();

        await SessaoService.revogarTodos(usuarioId);

        return { mensagem: "Conta pausada. Faça login novamente quando quiser voltar." };
    }

    /* Excluir conta (pelo próprio usuário) */
    /**
     * Exclusão definitiva pelo próprio usuário, com o mesmo núcleo da exclusão administrativa
     * (`AdminUsuarioService.excluirContaDefinitivamente`): limpa o Storage e arquiva as denúncias
     * pendentes contra a conta. Sem isso, foto, capa e currículo continuariam no Storage, e as
     * denúncias pendentes ficariam na fila apontando para ninguém.
     */
    async excluirConta(usuarioId, senhaAtual) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        const confere = await compararSenha(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ErroApi.naoAutenticado("Senha atual incorreta.");
        }

        await AdminUsuarioService.excluirContaDefinitivamente(usuario);

        return { mensagem: "Conta excluída com sucesso." };
    }

    /* Troca de e-mail (com verificação do novo endereço) */
    async solicitarTrocaEmail(usuarioId, senhaAtual, novoEmailBruto) {
        const novoEmail = this.normalizarEmail(novoEmailBruto);

        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        const confere = await compararSenha(senhaAtual, usuario.senhaHash);

        if (!confere) {
            throw ErroApi.naoAutenticado("Senha atual incorreta.");
        }

        if (novoEmail === usuario.email) {
            throw ErroApi.requisicaoInvalida("Este já é o seu e-mail atual.");
        }

        if (await this.buscarPorEmail(novoEmail)) {
            throw ErroApi.conflito("Este e-mail já está cadastrado.");
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
            const { assunto, html, texto } = modeloConfirmacaoTrocaEmail({
                nome: usuario.nome,
                codigo,
                minutosValidade: MINUTOS_VALIDADE_EMAIL,
                idioma: idiomaDoDestinatario(usuario, { daRequisicao: true })
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
            // Sem provedor de e-mail, só fora de produção: o código vai para o log.
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
            order: [["criadoEm", "DESC"]]
        });

        if (!registro) {
            throw ErroApi.requisicaoInvalida("Código inválido ou expirado.");
        }

        if (registro.tentativas >= MAX_TENTATIVAS_EMAIL) {
            await registro.update({ utilizadoEm: new Date() });
            throw ErroApi.requisicaoInvalida(
                "Número de tentativas excedido. Solicite um novo código."
            );
        }

        if (!compararHash(hashToken(codigo), registro.codigoHash)) {
            await registro.increment("tentativas");
            throw ErroApi.requisicaoInvalida("Código inválido ou expirado.");
        }

        if (await this.buscarPorEmail(registro.novoEmail)) {
            await registro.update({ utilizadoEm: new Date() });
            throw ErroApi.conflito("Este e-mail já está cadastrado.");
        }

        const usuario = await Usuario.findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
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
            tipo: "sistema",
            titulo: "E-mail alterado",
            descricao: `Seu e-mail de acesso foi alterado para ${usuario.email}.`,
            subtipo: "email_alterado"
        });

        return { mensagem: "E-mail atualizado com sucesso.", usuario };
    }
}

export default new AutenticacaoService();
