import jwt from "jsonwebtoken";

import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";
import GoogleAuthService from "../services/GoogleAuthService.js";
import AutenticacaoService from "../services/AutenticacaoService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Vida do código de entrega.
 *
 * Quinze minutos, e não um, porque ele não serve só para a troca imediata: quem não tem conta ainda
 * precisa atravessar o cadastro inteiro antes de reenviá-lo, e é ele que prova qual conta Google
 * foi verificada. Um minuto expirava no meio do formulário e o vínculo se perdia.
 *
 * Continua curto de propósito: sozinho não autentica ninguém, só diz "esta conta Google foi
 * verificada agora". Quinze minutos cobrem um cadastro sem deixar a prova circulando por horas.
 */
const SEGUNDOS_ENTREGA = 15 * 60;

/**
 * Fluxo de entrar/cadastrar com Google.
 *
 * O retorno do Google é uma navegação do navegador para o **backend**, mas quem precisa da sessão é
 * o Site. A ponte é um "código de entrega": um JWT de 60 segundos, assinado aqui, que carrega
 * apenas o perfil **já verificado** pelo Google. O backend redireciona o navegador para o Site com
 * esse código, e o Site o troca num POST por sessão ou pelo próximo passo.
 *
 * O código vai na URL porque, sem cookie de sessão (adiado para uma fase futura, ver
 * `docs/cookies-de-sessao.md`), não há outro canal entre o redirecionamento do Google e o Site. Por
 * isso ele dura um minuto, serve a uma coisa só e não é sessão: sozinho não autentica ninguém, só
 * diz qual conta Google foi verificada. A fase de cookies elimina essa passagem pela URL.
 */
class GoogleAuthController {
    /** Diz se o recurso está configurado, para o Site não mostrar um botão que leva a erro. */
    disponivel(req, res) {
        return res.status(200).json({ sucesso: true, disponivel: GoogleAuthService.disponivel() });
    }

    /** Devolve a URL da tela de consentimento; o Site redireciona o navegador para ela. */
    async iniciar(req, res, next) {
        try {
            const { url } = GoogleAuthService.gerarUrlDeAutorizacao({
                tipoConta: req.query.tipoConta || null,
                // De onde o Site chamou: é para lá que o navegador volta depois do Google.
                origem: req.get('origin') || null
            });

            return res.status(200).json({ sucesso: true, url });
        } catch (erro) {
            return next(erro);
        }
    }

    /** Para onde o Google manda o navegador de volta. Sempre termina num redirecionamento ao Site. */
    async callback(req, res) {
        // O Google devolve o `state` inclusive quando a pessoa cancela, então a origem de retorno é
        // lida antes de qualquer desvio: sem isso, cancelar em desenvolvimento jogaria a pessoa no
        // site publicado. Só cai no padrão quando o `state` não veio ou não é válido.
        let origem = env.frontendUrl;
        try {
            const previa = GoogleAuthService.lerState(req.query.state);
            if (previa.origem) origem = previa.origem;
        } catch {
            // `state` ausente ou inválido: segue com a origem padrão e o erro aparece abaixo.
        }

        const destino = (parametros) =>
            `${origem}/retorno-google?${new URLSearchParams(parametros).toString()}`;

        // A pessoa cancelou na tela do Google, ou o Google recusou o pedido.
        if (req.query.error) {
            return res.redirect(destino({ erro: "cancelado" }));
        }

        try {
            const { nonce, tipoConta } = GoogleAuthService.lerState(req.query.state);
            const perfil = await GoogleAuthService.perfilDoCodigo(req.query.code, nonce);

            const codigo = jwt.sign({ perfil, tipoConta }, env.jwt.secret, {
                expiresIn: SEGUNDOS_ENTREGA
            });

            return res.redirect(destino({ codigo }));
        } catch (erro) {
            // O motivo nunca vai para a URL — o Site mostra uma mensagem genérica —, mas vai para o
            // log do servidor: sem isso, uma falha aqui é indistinguível de outra e só resta
            // adivinhar por que o login com Google não funcionou.
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "GoogleAuthController.callback",
                    motivo: erro?.message ?? String(erro)
                })
            );

            return res.redirect(destino({ erro: "falha" }));
        }
    }

    /**
     * Troca o código de entrega pelo próximo passo:
     * - `entrar`: sessão criada, conta já vinculada;
     * - `conflito`: existe conta com aquele e-mail sem Google vinculado — não vincula sozinho;
     * - `cadastrar`: não há conta; o Site pergunta se é candidato ou empresa.
     */
    async concluir(req, res, next) {
        try {
            const { perfil, tipoConta } = lerCodigoDeEntrega(req.body.codigo);
            const resultado = await GoogleAuthService.resolver(perfil);

            if (resultado.desfecho === "entrar") {
                const sessao = await AutenticacaoService.entrarComUsuario(
                    resultado.usuario,
                    contextoRequisicao(req)
                );

                return res.status(200).json({ sucesso: true, desfecho: "entrar", ...sessao });
            }

            if (resultado.desfecho === "conflito") {
                return res.status(200).json({
                    sucesso: true,
                    desfecho: "conflito",
                    email: resultado.email
                });
            }

            // Só o que o Google realmente forneceu. Nada de CPF, país ou telefone inventados.
            return res.status(200).json({
                sucesso: true,
                desfecho: "cadastrar",
                tipoConta: tipoConta ?? null,
                perfil: { email: perfil.email, nome: perfil.nome },
                // Devolvido para o Site reenviar no cadastro e o vínculo ser feito pelo `sub`
                // verificado, nunca por um `sub` que o navegador alegue.
                codigo: req.body.codigo
            });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * Vincula a conta Google a quem já está autenticado por senha.
     *
     * É o caminho de saída do `conflito`: a pessoa entra normalmente e então anexa o Google. Exige
     * sessão justamente para provar que a conta é dela.
     */
    async vincular(req, res, next) {
        try {
            const { perfil } = lerCodigoDeEntrega(req.body.codigo);
            await GoogleAuthService.vincular(req.user.id, perfil);
            const usuario = await AutenticacaoService.perfilAtual(req.user.id);

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }
}

/** Lê o código de entrega e devolve o perfil verificado que ele carrega. */
function lerCodigoDeEntrega(codigo) {
    try {
        const conteudo = jwt.verify(codigo, env.jwt.secret);

        if (!conteudo?.perfil?.sub) {
            throw new Error("código sem perfil");
        }

        return conteudo;
    } catch {
        // `ErroApi` para o middleware de erro devolver 400 com a mensagem; um `Error` comum virava
        // 500 "Erro interno do servidor", que não diz à pessoa o que fazer.
        throw ErroApi.requisicaoInvalida("Sessão do Google expirada. Tente entrar novamente.");
    }
}

export default new GoogleAuthController();
