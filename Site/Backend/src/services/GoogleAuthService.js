import crypto from "node:crypto";

import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";
import { Usuario } from "../models/index.js";

const ESCOPOS = ["openid", "email", "profile"];
const MINUTOS_VALIDADE_STATE = 10;

/**
 * Entrar e cadastrar com uma conta Google (OAuth 2.0 + OpenID Connect).
 *
 * O ACESSO nunca vê a senha do Google: a pessoa autentica na página do próprio Google e volta com
 * um código de uso único, que o servidor troca por um ID token assinado. Só o ID token é levado a
 * sério — nada que o navegador diga sobre a identidade da pessoa é aceito.
 *
 * Proteções implementadas aqui:
 *
 * - **CSRF (`state`)**: o `state` é um JWT curto assinado com o `JWT_SECRET`, com validade de dez
 *   minutos. Quem não passou por `gerarUrlDeAutorizacao` não consegue forjar um `state` válido, e
 *   um `state` antigo não serve. É stateless de propósito: não exige sessão nem tabela para um
 *   fluxo que acontece antes de existir conta.
 * - **Repetição (`nonce`)**: o `nonce` vai no pedido e volta dentro do ID token assinado pelo
 *   Google; se não bater com o do `state`, o token é de outro pedido e é recusado.
 * - **Vínculo por `sub`**: a conta é encontrada por `googleId` (a claim `sub`), nunca pelo e-mail.
 *   `sub` é estável e único; e-mail muda e pode ser reaproveitado.
 * - **Sem vínculo automático por e-mail**: se já existe conta ACESSO com aquele e-mail mas sem
 *   Google vinculado, o fluxo **para** e pede que a pessoa entre com a senha para então vincular.
 *   Vincular só porque o e-mail coincide deixaria qualquer um que criasse uma conta Google com
 *   aquele endereço assumir a conta alheia.
 * - **Papel não vem da URL**: `tipoConta` só é usado para **criar** conta nova, e só aceita
 *   `candidato` ou `empresa`. Numa conta que já existe, o tipo é o que está no banco — nenhum
 *   parâmetro de URL promove ninguém a empresa ou administrador.
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
     */
    gerarUrlDeAutorizacao({ tipoConta = null, origem = null } = {}) {
        this.garantirDisponivel();

        if (tipoConta && !["candidato", "empresa"].includes(tipoConta)) {
            throw ErroApi.requisicaoInvalida("Tipo de conta inválido.");
        }

        const nonce = crypto.randomBytes(16).toString("hex");
        const state = jwt.sign(
            { nonce, tipoConta, origem: this.origemDeRetorno(origem) },
            env.jwt.secret,
            { expiresIn: `${MINUTOS_VALIDADE_STATE}m` }
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
            const conteudo = jwt.verify(state, env.jwt.secret);

            if (!conteudo?.nonce) {
                throw new Error("state sem nonce");
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
        } catch {
            throw ErroApi.requisicaoInvalida(
                "Não foi possível concluir a autenticação com o Google. Tente novamente."
            );
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
     * - `cadastrar`: não há conta; o cliente precisa escolher candidato ou empresa.
     */
    async resolver(perfil) {
        const vinculado = await Usuario.findOne({ where: { googleId: perfil.sub } });

        if (vinculado) {
            return { desfecho: "entrar", usuario: vinculado };
        }

        if (perfil.email) {
            const mesmoEmail = await Usuario.findOne({ where: { email: perfil.email } });

            if (mesmoEmail) {
                return { desfecho: "conflito", email: perfil.email };
            }
        }

        return { desfecho: "cadastrar", perfil };
    }

    /**
     * Vincula a conta Google a um usuário **já autenticado por senha**.
     *
     * Este é o único caminho de vínculo para contas que já existem, e por isso exige sessão: quem
     * prova ser dono da conta entrando com a senha é quem pode anexar um Google a ela.
     */
    async vincular(usuarioId, perfil) {
        const jaUsado = await Usuario.findOne({ where: { googleId: perfil.sub } });

        if (jaUsado && jaUsado.id !== usuarioId) {
            throw ErroApi.conflito("Esta conta Google já está vinculada a outro usuário.");
        }

        const usuario = await Usuario.findByPk(usuarioId);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        await usuario.update({ googleId: perfil.sub });

        return usuario;
    }
}

export default new GoogleAuthService();
