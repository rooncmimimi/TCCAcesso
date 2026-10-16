import crypto from "node:crypto";

import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";
import { emailCanonico } from "../utils/email.js";
import { AUDIENCIA_STATE, INTENCAO_VINCULAR, intencaoValida, vinculoValido } from "../utils/codigoGoogle.js";
import { modeloContaGoogle } from "../utils/modelosEmail.js";
import { Usuario } from "../models/index.js";
import EmailService from "./EmailService.js";
import NotificacaoService from "./NotificacaoService.js";

const ESCOPOS = ["openid", "email", "profile"];
const MINUTOS_VALIDADE_STATE = 10;

const SO_CANDIDATO = "Entrar com o Google vale só para contas de candidato. Para esta conta, use e-mail e senha.";

/**
 * Entrar e cadastrar com uma conta Google (OAuth 2.0 + OpenID Connect).
 *
 * O ACESSO nunca vê a senha do Google: a pessoa autentica na página do próprio Google e volta com
 * um código de autorização, que o servidor troca por um ID token assinado. Só o ID token é levado a
 * sério — nada que o navegador diga sobre a identidade da pessoa é aceito. Do servidor para o Site, a
 * identidade já verificada segue num "código de entrega" próprio (ver `utils/codigoGoogle.js`).
 *
 * Proteções implementadas aqui:
 *
 * - **CSRF (`state`)**: o `state` é um JWT curto assinado com o `JWT_SECRET`, com validade de dez
 *   minutos. Quem não passou por `gerarUrlDeAutorizacao` não consegue forjar um `state` válido, e
 *   um `state` antigo não serve. É stateless de propósito: não exige sessão nem tabela para um
 *   fluxo que acontece antes de existir conta. Ele carrega o hash do segredo guardado no navegador
 *   que clicou, e é isso que amarra o retorno àquele navegador (ver `vinculo` abaixo).
 * - **Repetição (`nonce`)**: o `nonce` vai no pedido e volta dentro do ID token assinado pelo
 *   Google; se não bater com o do `state`, o token é de outro pedido e é recusado.
 * - **Vínculo por `sub`**: a conta é encontrada por `googleId` (a claim `sub`), nunca pelo e-mail.
 *   `sub` é estável e único; e-mail muda e pode ser reaproveitado.
 * - **Sem vínculo automático por e-mail**: se já existe conta ACESSO com aquele e-mail mas sem
 *   Google vinculado, o fluxo **para** e pede que a pessoa entre com a senha para então vincular.
 *   Vincular só porque o e-mail coincide deixaria qualquer um que criasse uma conta Google com
 *   aquele endereço assumir a conta alheia.
 * - **Papel não vem da URL**: `tipoConta` não escolhe o papel — conta nova nasce candidato de todo
 *   jeito, e ele só carrega a intenção de seguir para o cadastro da empresa depois. Numa conta que
 *   já existe, o tipo é o que está no banco: nenhum parâmetro de URL promove ninguém a empresa ou
 *   administrador.
 */
class GoogleAuthService {
    disponivel() {
        return Boolean(env.google.clientId && env.google.clientSecret && env.google.redirectUri);
    }

    garantirDisponivel() {
        if (!this.disponivel()) {
            throw ErroApi.servicoIndisponivel(
                "Entrar com Google não está configurado neste ambiente."
            );
        }
    }

    cliente() {
        return new OAuth2Client({
            clientId: env.google.clientId,
            clientSecret: env.google.clientSecret,
            redirectUri: env.google.redirectUri
        });
    }

    /**
     * Monta a URL da tela de consentimento do Google.
     *
     * `tipoConta` fica dentro do `state` assinado, e não solto na query de retorno, para não poder
     * ser trocado no meio do caminho por quem quer virar empresa.
     *
     * `vinculo` é o hash do segredo que o Site guardou no `sessionStorage` do navegador que
     * começou o fluxo. Ele viaja no `state`, passa ao código de entrega e é conferido em
     * `concluir`: quem não é esse navegador não consegue trocar o código (o ataque de "login CSRF",
     * em que alguém leva a vítima a entrar na conta do atacante). É obrigatório.
     *
     * `intencao: "vincular"` com o `usuarioId` de quem já está autenticado é o fluxo de
     * Configurações → Segurança: o `state` assinado leva as duas informações, e o retorno só serve
     * a essa pessoa (ver `GoogleAuthController.vincular`).
     */
    gerarUrlDeAutorizacao({ tipoConta = null, origem = null, vinculo = null, intencao = null, usuarioId = null } = {}) {
        this.garantirDisponivel();

        if (!intencaoValida(intencao, usuarioId)) {
            throw ErroApi.requisicaoInvalida("Pedido do Google inválido.");
        }

        if (tipoConta && !["candidato", "empresa"].includes(tipoConta)) {
            throw ErroApi.requisicaoInvalida("Tipo de conta inválido.");
        }

        if (!vinculoValido(vinculo)) {
            throw ErroApi.requisicaoInvalida(
                "Não foi possível identificar este navegador. Atualize a página e tente de novo."
            );
        }

        const nonce = crypto.randomBytes(16).toString("hex");
        const state = jwt.sign(
            {
                nonce,
                tipoConta,
                vinculo,
                origem: this.origemDeRetorno(origem),
                ...(intencao ? { intencao, usuarioId } : {})
            },
            env.jwt.secret,
            // `audience` própria: o `state` não é aceito no lugar do código de entrega, da prova ou do
            // access token, nem o contrário.
            { expiresIn: `${MINUTOS_VALIDADE_STATE}m`, audience: AUDIENCIA_STATE }
        );

        const url = this.cliente().generateAuthUrl({
            scope: ESCOPOS,
            state,
            nonce,
            // `select_account` evita entrar silenciosamente com a conta que já estava logada no
            // navegador — quem tem mais de uma conta Google precisa escolher qual usar.
            prompt: "select_account",
            include_granted_scopes: false
        });

        return { url, state };
    }

    /**
     * Para qual origem o navegador volta depois do Google.
     *
     * Não dá para usar `env.frontendUrl`: ele escolhe de propósito a origem **não** localhost, o que
     * é certo para link de e-mail e errado aqui — em desenvolvimento jogaria a pessoa no site
     * publicado. Então vale a origem de onde o fluxo começou, mas só se ela estiver na allowlist do
     * CORS; qualquer outra coisa é ignorada e cai no padrão. Assim um `Origin` forjado não vira
     * redirecionamento aberto.
     */
    origemDeRetorno(origem) {
        if (origem && env.security.corsOrigins.includes(origem)) {
            return origem;
        }

        return env.frontendUrl;
    }

    /** Confere o `state` que voltou do Google: assinatura, validade e formato. */
    lerState(state) {
        if (!state) {
            throw ErroApi.requisicaoInvalida("Requisição do Google sem identificação de origem.");
        }

        try {
            const conteudo = jwt.verify(state, env.jwt.secret, { audience: AUDIENCIA_STATE });

            if (!conteudo?.nonce || !vinculoValido(conteudo.vinculo) || !intencaoValida(conteudo.intencao, conteudo.usuarioId)) {
                throw new Error("state sem nonce, sem vínculo com o navegador ou com intenção inválida");
            }

            return conteudo;
        } catch {
            // Mensagem genérica de propósito: distinguir "expirado" de "assinatura inválida" só
            // ajudaria quem está sondando o fluxo.
            throw ErroApi.requisicaoInvalida(
                "Não foi possível validar o retorno do Google. Tente entrar novamente."
            );
        }
    }

    /**
     * O que o Google respondeu de errado ao trocar o código, em poucas palavras para o log do
     * servidor: `invalid_client` (segredo errado ou trocado), `invalid_grant` (código usado ou
     * vencido), `redirect_uri_mismatch`... Lê só o código e a descrição curta da resposta de erro
     * (nunca tokens nem o corpo inteiro) ou, sem resposta, o código de rede (`ENOTFOUND`,
     * `ETIMEDOUT`). Nada disso vai para o cliente.
     */
    motivoDoGoogle(erro) {
        const resposta = erro?.response?.data;
        const codigo = typeof resposta?.error === "string" ? resposta.error : null;
        const descricao = typeof resposta?.error_description === "string" ? resposta.error_description : null;

        const motivo = [codigo, descricao].filter(Boolean).join(": ") || erro?.code || erro?.message || "motivo desconhecido";

        return String(motivo).replace(/\s+/g, " ").slice(0, 200);
    }

    /**
     * Troca o código por tokens e devolve o perfil **verificado** do Google.
     *
     * O perfil sai do ID token assinado e já validado (emissor, destinatário, expiração) pela
     * `google-auth-library`; o `nonce` é conferido aqui contra o do `state`.
     */
    async perfilDoCodigo(codigo, nonceEsperado) {
        this.garantirDisponivel();

        if (!codigo) {
            throw ErroApi.requisicaoInvalida("Autorização do Google ausente.");
        }

        const cliente = this.cliente();

        let tokens;
        try {
            ({ tokens } = await cliente.getToken(codigo));
        } catch (erro) {
            const falha = ErroApi.requisicaoInvalida(
                "Não foi possível concluir a autenticação com o Google. Tente novamente."
            );
            // A mensagem para a pessoa continua genérica; a causa real fica só no log do servidor.
            falha.motivoGoogle = this.motivoDoGoogle(erro);
            throw falha;
        }

        if (!tokens?.id_token) {
            throw ErroApi.requisicaoInvalida("O Google não devolveu a identificação da conta.");
        }

        const ticket = await cliente.verifyIdToken({
            idToken: tokens.id_token,
            audience: env.google.clientId
        });
        const dados = ticket.getPayload();

        if (!dados?.sub) {
            throw ErroApi.requisicaoInvalida("Resposta do Google sem identificador de conta.");
        }

        if (dados.nonce !== nonceEsperado) {
            throw ErroApi.requisicaoInvalida(
                "O retorno do Google não corresponde ao pedido. Tente entrar novamente."
            );
        }

        // `email_verified` falso significa que o próprio Google não confirmou aquele endereço;
        // tratá-lo como verificado aqui seria herdar uma garantia que não existe.
        return {
            sub: dados.sub,
            email: dados.email ? String(dados.email).trim().toLowerCase() : null,
            emailVerificado: dados.email_verified === true,
            nome: dados.name || null
        };
    }

    /**
     * Decide o que fazer com o perfil que voltou do Google, sem criar nem vincular nada sozinho.
     *
     * Devolve um dos três desfechos:
     * - `entrar`: já existe conta vinculada a este `sub`.
     * - `conflito`: existe conta com o mesmo e-mail, sem Google vinculado. Não vincula automaticamente.
     * - `cadastrar`: não há conta; o cliente segue para o cadastro de candidato.
     */
    async resolver(perfil) {
        const vinculado = await Usuario.findOne({ where: { googleId: perfil.sub } });

        if (vinculado) {
            return { desfecho: "entrar", usuario: vinculado };
        }

        if (perfil.email) {
            // O banco guarda o e-mail na forma canônica (`mariasilva@gmail.com`), e o Google informa
            // o endereço como a conta foi criada (`maria.silva@gmail.com`): comparar o texto cru
            // deixaria de achar a conta e a pessoa só descobriria o conflito no fim do cadastro.
            const mesmoEmail = await Usuario.findOne({ where: { email: emailCanonico(perfil.email) } });

            if (mesmoEmail) {
                return { desfecho: "conflito", email: perfil.email };
            }
        }

        return { desfecho: "cadastrar", perfil };
    }

    async buscar(usuarioId) {
        const usuario = await Usuario.findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        return usuario;
    }

    /** O que a tela Contas conectadas mostra: o recurso existe aqui, vale para esta conta, e já está vinculado? */
    async situacao(usuarioId) {
        const usuario = await this.buscar(usuarioId);

        return {
            disponivel: this.disponivel(),
            elegivel: usuario.tipoUsuario === "candidato",
            vinculado: Boolean(usuario.googleId)
        };
    }

    /**
     * Confere, antes de levar a pessoa ao Google, que esta conta pode receber um vínculo: só conta de
     * candidato (o Google nasce como login de candidato; a conta de empresa é outra conta, com e-mail
     * e senha próprios) e só uma por vez.
     */
    async conferirPodeVincular(usuarioId) {
        const usuario = await this.buscar(usuarioId);

        if (usuario.tipoUsuario !== "candidato") {
            throw ErroApi.acessoNegado(SO_CANDIDATO);
        }

        if (usuario.googleId) {
            throw ErroApi.conflito("Esta conta já tem um Google vinculado. Desvincule-o antes de vincular outro.");
        }

        return usuario;
    }

    /**
     * Vincula a conta Google a um usuário **já autenticado e que acabou de confirmar a senha**.
     *
     * Este é o único caminho de vínculo para contas que já existem. A senha é conferida antes de a
     * pessoa sair para o Google (`GoogleAuthController.iniciarVinculo`), o `state` leva o id dela, e
     * o código que volta só vale para ela (`GoogleAuthController.vincular`). Aqui ficam as regras
     * da conta: só candidato, um Google por conta e um `sub` por conta. Avisa a pessoa, no Site e
     * por e-mail, porque um segundo meio de entrar na conta é justamente o que ela precisa notar.
     */
    async vincular(usuarioId, perfil) {
        const usuario = await this.buscar(usuarioId);

        if (usuario.tipoUsuario !== "candidato") {
            throw ErroApi.acessoNegado(SO_CANDIDATO);
        }

        // Repetir o mesmo vínculo não muda nada e não precisa de aviso.
        if (usuario.googleId === perfil.sub) {
            return usuario;
        }

        if (usuario.googleId) {
            throw ErroApi.conflito("Esta conta já tem outro Google vinculado. Desvincule-o antes de vincular outro.");
        }

        const jaUsado = await Usuario.findOne({ where: { googleId: perfil.sub } });

        if (jaUsado) {
            throw ErroApi.conflito("Esta conta Google já está vinculada a outro usuário.");
        }

        try {
            await usuario.update({ googleId: perfil.sub });
        } catch (erro) {
            // Duas contas vinculando o mesmo Google ao mesmo tempo: o índice único do banco decide.
            if (erro?.name === "SequelizeUniqueConstraintError") {
                throw ErroApi.conflito("Esta conta Google já está vinculada a outro usuário.");
            }
            throw erro;
        }

        await this.avisar(usuario, "vinculada");

        return usuario;
    }

    /**
     * Desfaz o vínculo. A senha já foi conferida por quem chama. Recusa se a conta não tiver senha,
     * porque então o Google seria o único jeito de entrar e a pessoa se trancaria para fora.
     */
    async desvincular(usuarioId) {
        const usuario = await Usuario.scope("comSenha").findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        if (!usuario.googleId) {
            throw ErroApi.conflito("Esta conta não tem Google vinculado.");
        }

        if (!usuario.senhaHash) {
            throw ErroApi.conflito("Defina uma senha antes de desvincular o Google, ou você perderia o acesso à conta.");
        }

        await usuario.update({ googleId: null });

        await this.avisar(usuario, "desvinculada");

        return usuario;
    }

    /**
     * Aviso de segurança após vincular ou desvincular, no Site e por e-mail. Best-effort: nunca
     * desfaz nem bloqueia a operação principal se o aviso falhar. O registro em log leva só o id.
     */
    async avisar(usuario, acao) {
        const vinculada = acao === "vinculada";

        console.info(
            JSON.stringify({
                nivel: "info",
                servico: "GoogleAuthService",
                acao: vinculada ? "google_vinculado" : "google_desvinculado",
                usuarioId: usuario.id
            })
        );

        await NotificacaoService.criar({
            usuarioId: usuario.id,
            tipo: "sistema",
            titulo: vinculada ? "Conta Google vinculada" : "Conta Google desvinculada",
            descricao: vinculada
                ? "Agora você também pode entrar no ACESSO com o Google. Se não foi você, troque sua senha e contate o suporte."
                : "Você não entra mais no ACESSO com o Google. Se não foi você, troque sua senha e contate o suporte.",
            subtipo: vinculada ? "google_vinculado" : "google_desvinculado"
        });

        if (!EmailService.disponivel()) return;

        const { assunto, html, texto } = modeloContaGoogle({ nome: usuario.nome, acao });

        try {
            await EmailService.enviar({
                para: usuario.email,
                nomeDestinatario: usuario.nome,
                assunto,
                html,
                texto,
                tag: vinculada ? "google-vinculado" : "google-desvinculado"
            });
        } catch (erro) {
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "GoogleAuthService",
                    acao: "aviso_conta_google",
                    usuarioId: usuario.id,
                    motivo: erro?.message ?? String(erro)
                })
            );
        }
    }
}

export default new GoogleAuthService();
