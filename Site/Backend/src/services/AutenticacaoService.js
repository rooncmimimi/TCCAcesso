import { Op } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import {
    Usuario,
    Candidato,
    Empresa,
    CodigoVerificacaoEmail
} from "../models/index.js";
import { gerarHashSenha, compararSenha } from "../utils/bcrypt.js";
import { assinarJwt, assinarDesafioMfa, lerDesafioMfa } from "../utils/jwt.js";
import { gerarCodigoNumerico, hashToken, compararHash } from "../utils/tokens.js";
import SessaoService from "./SessaoService.js";
import TotpService from "./TotpService.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
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
import { emailCanonico } from "../utils/email.js";
import { lerProva } from "../utils/codigoGoogle.js";
import ErroApi from "../utils/ErroApi.js";

/** Nome de cada dado obrigatório do candidato, para a mensagem de `concluirCadastro`. */
const ROTULOS_DADOS = {
    pais: "país",
    dataNascimento: "data de nascimento",
    cidade: "cidade",
    estado: "estado"
};

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
    /**
     * Forma em que o e-mail é gravado e procurado. É **a mesma** em todas as entradas (cadastro,
     * login, Google, recuperação de senha, confirmação e troca de e-mail), porque o cadastro grava
     * `maria.silva@gmail.com` como `mariasilva@gmail.com` e quem procurasse por outro texto não
     * acharia a conta. A regra mora em `utils/email.js`.
     */
    normalizarEmail(email) {
        return emailCanonico(email);
    }

    /**
     * Access token. `mfaVerificadoEm` (quando a sessão passou pelo segundo fator) vai como `mfa`, em segundos:
     * o middleware compara com a data em que o TOTP do administrador foi ativado ou reiniciado.
     */
    gerarToken(usuario, { mfaVerificadoEm = null, familiaId = null } = {}) {
        return assinarJwt({
            id: usuario.id,
            tipoUsuario: usuario.tipoUsuario,
            ...(mfaVerificadoEm ? { mfa: Math.floor(new Date(mfaVerificadoEm).getTime() / 1000) } : {}),
            // Identifica o login (dispositivo): o middleware confere que ele segue ativo, e encerrar a sessão corta o acesso na hora.
            ...(familiaId ? { sid: familiaId } : {})
        });
    }

    async buscarPorEmail(email, { comSenha = false } = {}) {
        const model = comSenha ? Usuario.scope("comSenha") : Usuario;

        return model.findOne({
            where: { email: this.normalizarEmail(email) }
        });
    }

    /**
     * O que o Site precisa saber da conta além do que está na tabela (nada disso é segredo):
     *
     * - `temSenha`: conta que entra só pelo Google ainda não tem senha. O Site usa para oferecer
     *   "definir senha" e para não mostrar "senha atual" onde não há o que digitar.
     * - `dadosPessoaisPendentes`: candidato que ainda não terminou o cadastro e **não tem CPF**. É o
     *   caso de quem criou a conta direto pelo Google: a conta nasce sem CPF, nascimento, cidade e
     *   estado, e `/cadastro/dados` pede tudo de uma vez. Só vale para cadastro **não concluído**:
     *   quem já terminou nunca é mandado de volta, mesmo que o dado seja antigo e esteja em branco.
     *   Quem tem CPF mas está sem algum outro dado obrigatório (conta antiga) não entra aqui: é o
     *   `cadastroPendente` (`situacaoDoCadastro`), que pede só o que falta e não obriga a digitar o
     *   CPF de novo.
     *
     * O hash da senha só sai do banco para virar esse booleano.
     */
    async situacaoDaConta(usuario) {
        // `senhaHash` já está na instância quando ela veio de `Usuario.create` ou do escopo
        // `comSenha` (login por senha); no resto das vezes é preciso perguntar ao banco.
        const hash =
            usuario.senhaHash !== undefined
                ? usuario.senhaHash
                : (await Usuario.scope("comSenha").findByPk(usuario.id, { attributes: ["id", "senhaHash"] }))?.senhaHash;

        let dadosPessoaisPendentes = false;

        if (usuario.tipoUsuario === "candidato" && !usuario.cadastroConcluidoEm) {
            const candidato = await Candidato.findOne({
                where: { usuarioId: usuario.id },
                attributes: ["id", "cpfHash"]
            });

            dadosPessoaisPendentes = !candidato || !candidato.cpfHash;
        }

        // Verificação em duas etapas: só o que o Site precisa (disponível, configurada, exigida). Nada de segredo.
        return { temSenha: Boolean(hash), dadosPessoaisPendentes, ...(await TotpService.situacaoDaConta(usuario)) };
    }

    /**
     * Conta que entra só pelo Google ainda não tem senha, e várias ações pedem a "senha atual". Em vez
     * de um "senha incorreta" que não faria sentido, diz o que fazer. O código `SEM_SENHA` é o que o
     * Site compara para oferecer o caminho de definir a senha.
     */
    exigirSenhaDefinida(usuario) {
        if (!usuario.senhaHash) {
            throw new ErroApi(
                409,
                "Esta conta entra com o Google e ainda não tem senha. Defina uma senha em Configurações, Alterar senha, para usar este recurso.",
                { codigo: "SEM_SENHA" }
            );
        }
    }

    async montarSessao(usuario, contexto = {}, { mfaVerificadoEm = null } = {}) {
        const dados = usuario.toJSON();
        delete dados.senhaHash;

        Object.assign(dados, await this.situacaoDaConta(usuario));

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

        // O Site decide para onde mandar a pessoa logo depois de entrar. Esse sinal vem daqui, do que a
        // conta tem de fato, e não só da data de conclusão (ver `situacaoDoCadastro`).
        const candidato =
            usuario.tipoUsuario === "candidato"
                ? await Candidato.findOne({ where: { usuarioId: usuario.id } })
                : null;

        Object.assign(dados, this.situacaoDoCadastro(usuario, candidato));

        const { refreshToken, registro } = await SessaoService.emitir(
            usuario.id,
            contexto,
            { mfaVerificadoEm }
        );

        return {
            usuario: dados,
            token: this.gerarToken(usuario, { mfaVerificadoEm, familiaId: registro?.familiaId }),
            refreshToken,
            // Administrador sem TOTP entra, mas só alcança a tela de configuração: o servidor nega o resto.
            mfaConfiguracaoPendente: Boolean(dados.mfaExigido && !dados.mfaConfigurado)
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
     * Lê a prova do Google que acompanha o cadastro e devolve o que o Google verificou: o `sub`, o
     * e-mail e se o próprio Google confirmou aquele e-mail.
     *
     * Tudo vem da prova que **este servidor** assinou (em `concluir`, depois de verificar o ID token
     * com o Google) — nunca de um campo que o navegador mandou. É o que impede alguém de criar uma
     * conta dizendo ser dona de uma conta Google qualquer. A prova tem `audience` própria: o código
     * de entrega, que vai pela URL, não serve no lugar dela.
     *
     * Prova ausente é cadastro comum, sem Google: devolve `null` e segue. Prova presente e inválida
     * é erro, porque aí houve intenção de vincular e ela não pôde ser comprovada.
     */
    vinculoGoogle(prova) {
        if (!prova) return null;

        const { perfil } = lerProva(prova);

        return {
            googleId: perfil.sub,
            email: perfil.email ?? null,
            emailVerificado: perfil.emailVerificado === true,
            nome: perfil.nome ?? null
        };
    }

    /**
     * No cadastro com Google, o e-mail da conta tem de ser o que o Google verificou.
     *
     * Sem esta conferência o código só provaria que a pessoa passou pelo Google, e o e-mail do
     * formulário seria uma alegação: qualquer um com uma conta Google criaria no ACESSO a conta de
     * um e-mail alheio, com o **seu** Google vinculado e uma senha dele. Quando o dono do e-mail
     * recuperasse a senha, o vínculo continuaria valendo e a conta seguiria acessível a quem a
     * reservou (o ataque se chama *pre-hijacking*).
     *
     * Os dois e-mails são comparados na forma canônica, a mesma que o cadastro grava, porque o
     * Google informa `maria.silva@gmail.com` e o formulário já chega como `mariasilva@gmail.com`.
     */
    conferirEmailDoGoogle(vinculo, email) {
        if (!vinculo.emailVerificado) {
            throw ErroApi.requisicaoInvalida(
                "O Google não confirmou o e-mail desta conta. Faça o cadastro com e-mail e senha."
            );
        }

        if (!vinculo.email || emailCanonico(vinculo.email) !== emailCanonico(email)) {
            throw ErroApi.requisicaoInvalida(
                "Use o mesmo e-mail da sua conta Google para concluir o cadastro."
            );
        }
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
     *
     * A única exceção é o cadastro com Google: ali o e-mail **tem de ser o que o Google verificou**
     * (`conferirEmailDoGoogle`), e só então a conta já nasce com o e-mail verificado.
     */
    async cadastrarCandidato(data, contexto = {}) {
        const { nome, email, senha, telefone, cpf, pais, dataNascimento, cidade, estado, termosVersao, googleCodigo } = data;

        // Antes de qualquer consulta ao banco: um código inválido ou um e-mail que não é o do Google
        // recusa o cadastro sem revelar se o e-mail já existe.
        const vinculo = this.vinculoGoogle(googleCodigo);

        if (vinculo) {
            this.conferirEmailDoGoogle(vinculo, email);
        }

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
                    emailVerificado: Boolean(vinculo),
                    // Todos os dados obrigatórios chegam neste mesmo POST e são validados antes; as etapas
                    // seguintes do assistente (perfil, acessibilidade) são opcionais.
                    cadastroConcluidoEm: new Date(),
                    ...this.registroDeAceite(termosVersao),
                    ...(vinculo ? { googleId: vinculo.googleId } : {})
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
        // depende dele. Falhar aqui não pode derrubar uma conta que já está criada. Com Google não há
        // o que confirmar: o e-mail já chegou verificado.
        if (!vinculo && EmailService.disponivel()) {
            try {
                await this.enviarCodigoConfirmacaoCadastro(usuarioCriado);
            } catch {
                // `enviarCodigoConfirmacaoCadastro` já engole a falha de envio; isto cobre o resto
                // (gravar o código, por exemplo). A pessoa pode pedir reenvio quando quiser.
            }
        }

        return this.montarSessao(usuarioCriado, contexto);
    }

    /**
     * Cria a conta de candidato **direto do retorno do Google**, sem senha (etapa 6 da auditoria).
     *
     * Quem chega aqui já passou pelo `concluir`, que verificou o ID token com o Google e entregou a
     * prova. Tudo que importa vem dela, nunca do corpo: o `sub`, o e-mail e o nome. As regras do
     * cadastro com Google continuam valendo e são até mais rígidas, porque aqui não há formulário
     * para a pessoa digitar outro e-mail: o Google tem de ter **verificado** o e-mail, e a conta já
     * nasce com ele verificado.
     *
     * O aceite dos termos é condição para criar a conta (e fica registrado, com a versão e o
     * momento), como no cadastro por formulário. CPF, telefone, nascimento e endereço ficam para
     * depois do login (`situacaoDaConta` diz que estão pendentes), e a conta nasce com
     * `cadastroConcluidoEm` nulo, como toda conta de cadastro em andamento.
     *
     * O banco só deixa uma conta nascer sem senha se tiver Google vinculado
     * (`ck_usuarios_senha_ou_google`), e aqui ela sempre tem.
     */
    async cadastrarCandidatoComGoogle({ prova, termosVersao }, contexto = {}) {
        if (!termosVersao) {
            throw ErroApi.requisicaoInvalida("Aceite os Termos de Uso e o Aviso de Privacidade para criar a conta.");
        }

        const vinculo = this.vinculoGoogle(prova);

        if (!vinculo) {
            throw ErroApi.requisicaoInvalida("A verificação com o Google expirou. Entre com o Google novamente.");
        }

        if (!vinculo.emailVerificado || !vinculo.email) {
            throw ErroApi.requisicaoInvalida(
                "O Google não confirmou o e-mail desta conta. Faça o cadastro com e-mail e senha."
            );
        }

        const email = this.normalizarEmail(vinculo.email);

        if (await this.buscarPorEmail(email)) {
            throw ErroApi.conflito("Este e-mail já está cadastrado.");
        }

        if (await Usuario.findOne({ where: { googleId: vinculo.googleId } })) {
            throw ErroApi.conflito("Esta conta Google já está vinculada a outra conta.");
        }

        const transaction = await sequelize.transaction();
        let usuarioCriado;

        try {
            usuarioCriado = await Usuario.create(
                {
                    nome: this.nomeDaContaGoogle(vinculo.nome, email),
                    email,
                    senhaHash: null,
                    tipoUsuario: "candidato",
                    emailVerificado: true,
                    googleId: vinculo.googleId,
                    ...this.registroDeAceite(termosVersao)
                },
                { transaction }
            );

            await Candidato.create({ usuarioId: usuarioCriado.id }, { transaction });

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        return this.montarSessao(usuarioCriado, contexto);
    }

    /**
     * O nome da conta vem do Google, mas o modelo exige de 3 a 150 caracteres. Sem nome, ou com um
     * curto demais, usa a parte do e-mail antes do @ (que a pessoa troca depois no perfil).
     */
    nomeDaContaGoogle(nome, email) {
        const limpo = String(nome ?? "").trim();
        if (limpo.length >= 3) return limpo.slice(0, 150);

        const doEmail = String(email).split("@")[0].trim();
        return doEmail.length >= 3 ? doEmail.slice(0, 150) : "Novo usuário";
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
            termosVersao
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
                    cadastroConcluidoEm: new Date(),
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
    async entrarComUsuario(usuario, contexto = {}, confirmarReativacao = false, { segundoFatorVerificado = false } = {}) {
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

        // Quem tem verificação em duas etapas não recebe sessão só com a senha (ou o Google): recebe um desafio
        // de 5 minutos, que `concluirLoginComSegundoFator` troca pela sessão depois do código. Fica antes da
        // checagem de conta pausada para não revelar o estado da conta a quem só tem a senha.
        if (!segundoFatorVerificado && TotpService.habilitado() && (await TotpService.buscarAtivo(usuario.id, { attributes: ["usuarioId"] }))) {
            return {
                mfaNecessario: true,
                desafioMfa: assinarDesafioMfa({ sub: usuario.id, cr: confirmarReativacao ? 1 : 0 }),
                metodosMfa: ["totp", "recuperacao"]
            };
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

        return this.montarSessao(usuario, contexto, {
            mfaVerificadoEm: segundoFatorVerificado ? new Date() : null
        });
    }

    /**
     * Passo 2 do login de quem tem verificação em duas etapas: troca o desafio (entregue depois da senha ou do
     * Google) e um código do aplicativo, ou de recuperação, pela sessão.
     *
     * O desafio sozinho não abre nada, e o código é conferido pelo `TotpService` (uso único, espera depois de
     * erros seguidos). Depois disso a conta passa de novo pelos portões de `entrarComUsuario`. Usar um código
     * de recuperação fica na auditoria e a resposta diz quantos restam.
     */
    async concluirLoginComSegundoFator(desafio, codigo, contexto = {}) {
        const expirado = () =>
            ErroApi.requisicaoInvalida("A verificação expirou. Entre novamente.", { codigo: "MFA_DESAFIO_EXPIRADO" });

        let payload;
        try {
            payload = lerDesafioMfa(desafio);
        } catch {
            throw expirado();
        }

        TotpService.exigirHabilitado();

        const usuario = await Usuario.findByPk(payload.sub);

        if (!usuario) {
            throw expirado();
        }

        const conferencia = await TotpService.conferirSegundoFator(usuario.id, codigo);

        if (!conferencia.ok) {
            throw ErroApi.requisicaoInvalida("Código incorreto ou já usado. Confira o aplicativo e tente de novo.", {
                codigo: "MFA_CODIGO_INVALIDO"
            });
        }

        let codigosRestantes = null;

        if (conferencia.metodo === "recuperacao") {
            codigosRestantes = await TotpService.codigosRestantes(usuario.id);

            await AdminAuditoriaService.registrar({
                administradorId: usuario.tipoUsuario === "administrador" ? usuario.id : null,
                acao: "totp_codigo_recuperacao_usado",
                entidadeTipo: "usuario",
                entidadeId: usuario.id,
                descricao: "Entrou com um código de recuperação da verificação em duas etapas.",
                metadados: { codigosRestantes },
                ...contexto
            });
        }

        const sessao = await this.entrarComUsuario(usuario, contexto, payload.cr === 1, {
            segundoFatorVerificado: true
        });

        return codigosRestantes === null ? sessao : { ...sessao, codigosRecuperacaoRestantes: codigosRestantes };
    }

    /**
     * Sessão nova, já marcada como verificada, para quem acabou de ativar ou trocar o TOTP (isso encerra as
     * outras sessões da conta, e este aparelho segue com a sua).
     */
    async emitirSessaoVerificada(usuario, contexto = {}, mfaVerificadoEm) {
        const { refreshToken, registro } = await SessaoService.emitir(usuario.id, contexto, { mfaVerificadoEm });

        return { token: this.gerarToken(usuario, { mfaVerificadoEm, familiaId: registro?.familiaId }), refreshToken };
    }

    /* Renovação de sessão */
    async renovarToken(refreshToken, contexto = {}) {
        const { usuario, refreshToken: novoToken, mfaVerificadoEm, familiaId } =
            await SessaoService.rotacionar(refreshToken, contexto);

        const dados = usuario.toJSON();
        delete dados.senhaHash;

        return {
            usuario: dados,
            token: this.gerarToken(usuario, { mfaVerificadoEm, familiaId }),
            refreshToken: novoToken
        };
    }

    async sair(refreshToken, { usuarioId = null, familiaId = null } = {}) {
        return SessaoService.revogar(refreshToken, { usuarioId, familiaId });
    }

    /**
     * Campos sem os quais o cadastro de candidato não pode ser dado como concluído. É a mesma lista que
     * `concluirCadastro` exige e que o cadastro (`POST /auth/register`) já grava de uma vez. Currículo,
     * foto, perfil profissional e acessibilidade são opcionais e nunca entram aqui.
     */
    dadosObrigatoriosFaltando(candidato) {
        const obrigatorios = {
            pais: candidato?.pais,
            dataNascimento: candidato?.dataNascimento,
            cidade: candidato?.cidade,
            estado: candidato?.estado
        };

        return Object.entries(obrigatorios)
            .filter(([, valor]) => !String(valor ?? "").trim())
            .map(([campo]) => campo);
    }

    /**
     * Situação do cadastro, para o Site decidir se manda a pessoa continuar de onde parou.
     *
     * **Cadastro pendente é cadastro com dado obrigatório faltando**, e não "o último botão do
     * assistente não foi clicado". As etapas de perfil profissional e de acessibilidade são opcionais;
     * quem fechou a aba nelas já tem tudo o que a conta precisa e entra normalmente. Antes, o sinal era só
     * `cadastroConcluidoEm` nula, e isso prendia a pessoa num laço: a conta criada sem país, nascimento,
     * cidade ou estado era mandada para a etapa de perfil (que não pede esses dados), o botão final era
     * recusado por falta deles, e no login seguinte tudo recomeçava.
     *
     * - Administrador e empresa: nunca pendentes (a empresa nasce com tudo numa chamada só).
     * - Candidato com `cadastroConcluidoEm` preenchida: concluído, mesmo que uma conta antiga não tenha
     *   algum campo (a migration 0004 deu a data a quem já existia; ninguém antigo volta ao cadastro).
     * - Candidato sem a data: pendente só se faltar algum dado obrigatório, e `dadosCadastroPendentes`
     *   diz quais (nomes de campo, nunca valores).
     */
    situacaoDoCadastro(usuario, candidato) {
        const concluido = { cadastroPendente: false, dadosCadastroPendentes: [] };

        if (usuario.tipoUsuario !== "candidato" || usuario.cadastroConcluidoEm) {
            return concluido;
        }

        const faltando = this.dadosObrigatoriosFaltando(candidato);

        return { cadastroPendente: faltando.length > 0, dadosCadastroPendentes: faltando };
    }

    /** `perfilAtual` com a situação do cadastro, já como objeto simples para a resposta da API. */
    async perfilAtualComSituacao(id) {
        const usuario = await this.perfilAtual(id);

        return {
            ...usuario.toJSON(),
            ...(await this.situacaoDaConta(usuario)),
            ...this.situacaoDoCadastro(usuario, usuario.candidato)
        };
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
            const faltando = this.dadosObrigatoriosFaltando(candidato).map((campo) => ROTULOS_DADOS[campo]);

            if (faltando.length) {
                throw ErroApi.requisicaoInvalida(
                    `Para concluir o cadastro, preencha: ${faltando.join(", ")}.`
                );
            }
        }

        if (!usuario.cadastroConcluidoEm) {
            await usuario.update({ cadastroConcluidoEm: new Date() });
        }

        return this.perfilAtualComSituacao(usuarioId);
    }

    /* Troca de senha */
    /**
     * Reautenticação: confere a senha de quem já tem sessão, antes de uma ação sensível (vincular ou
     * desvincular o Google). Responde 403, e não 401: o Site trata 401 como sessão vencida e tenta
     * renovar o token, e um erro de digitação não deve ter esse efeito.
     */
    async conferirSenhaAtual(usuarioId, senha) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        this.exigirSenhaDefinida(usuario);

        const confere = typeof senha === "string" && senha !== "" ? await compararSenha(senha, usuario.senhaHash) : false;

        if (!confere) {
            throw ErroApi.acessoNegado("Senha incorreta.");
        }
    }

    async alterarSenha(usuarioId, senhaAtual, novaSenha) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        this.exigirSenhaDefinida(usuario);

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

        const { assunto, html, texto } = modeloSenhaAlterada({ nome: usuario.nome });

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

    /* Pausar conta (pelo próprio usuário, independente do bloqueio administrativo) */
    async pausarConta(usuarioId, senhaAtual) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        this.exigirSenhaDefinida(usuario);

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

        this.exigirSenhaDefinida(usuario);

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

        this.exigirSenhaDefinida(usuario);

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
