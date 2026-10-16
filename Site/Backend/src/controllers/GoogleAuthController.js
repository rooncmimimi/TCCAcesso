import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";
import GoogleAuthService from "../services/GoogleAuthService.js";
import AutenticacaoService from "../services/AutenticacaoService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";
import {
    assinarCodigoDeEntrega,
    assinarProva,
    conferirVinculo,
    lerCodigoDeEntrega
} from "../utils/codigoGoogle.js";
import { codigosDeEntregaUsados } from "../utils/usoUnico.js";

const CODIGO_JA_USADO = "Este código do Google já foi usado. Entre com o Google de novo.";

/**
 * Fluxo de entrar/cadastrar com Google.
 *
 * O retorno do Google é uma navegação do navegador para o **backend**, mas quem precisa da sessão é
 * o Site. A ponte é um "código de entrega": um JWT assinado aqui, que carrega apenas o perfil
 * **já verificado** pelo Google e o hash de um segredo que só o navegador que começou o fluxo tem
 * (ver `utils/codigoGoogle.js`). O backend redireciona o navegador para o Site com esse código no
 * **fragmento** da URL (`#codigo=…`, que não vai a servidores nem a logs), e o Site o troca num POST,
 * junto com o segredo, por sessão ou pelo próximo passo.
 *
 * Por isso o código, sozinho, **não** autentica ninguém:
 *
 * - só funciona no navegador que começou o fluxo (sem o segredo do `sessionStorage` dele, é recusado);
 * - dura poucos minutos e só pode ser usado **uma vez**.
 *
 * Quem recebe o endereço de outra pessoa, ou o encontra no histórico, não consegue usá-lo.
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
                // O hash do segredo guardado no navegador que clicou: amarra o retorno a ele.
                vinculo: req.query.vinculo || null,
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

        const comErro = (erro) => `${origem}/retorno-google?${new URLSearchParams({ erro }).toString()}`;

        // A pessoa cancelou na tela do Google, ou o Google recusou o pedido.
        if (req.query.error) {
            return res.redirect(comErro("cancelado"));
        }

        try {
            const { nonce, tipoConta, vinculo } = GoogleAuthService.lerState(req.query.state);
            const perfil = await GoogleAuthService.perfilDoCodigo(req.query.code, nonce);

            const codigo = assinarCodigoDeEntrega({ perfil, tipoConta, vinculo });

            // No fragmento, e não na query: o fragmento não é enviado ao servidor do Site nem entra
            // nos logs dele, e o Site o apaga da barra de endereço assim que o lê.
            return res.redirect(`${origem}/retorno-google#codigo=${codigo}`);
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

            return res.redirect(comErro("falha"));
        }
    }

    /**
     * Troca o código de entrega pelo próximo passo:
     * - `entrar`: sessão criada, conta já vinculada;
     * - `conflito`: existe conta com aquele e-mail sem Google vinculado — não vincula sozinho;
     * - `cadastrar`: não há conta; o Site leva ao cadastro de candidato, que é onde toda conta
     *   começa, e `tipoConta` apenas diz se ela deve seguir para o cadastro da empresa depois. A
     *   resposta traz a `prova` do Google, que o Site guarda na memória do navegador e reenvia no
     *   cadastro.
     *
     * Ordem das conferências: assinatura e validade do código, **depois** o vínculo com o navegador
     * e só então a reserva de uso único. Quem não é o navegador do fluxo, portanto, não consegue nem
     * "gastar" o código de quem é.
     *
     * Duas respostas deixam o código **utilizável de novo**, porque não chegaram a cumprir o papel
     * dele: `contaPausada` (a pessoa ainda vai decidir se reativa) e `emailNaoVerificado`. O mesmo
     * vale para qualquer erro.
     */
    async concluir(req, res, next) {
        let reservado = null;

        try {
            const conteudo = lerCodigoDeEntrega(req.body.codigo);
            conferirVinculo(conteudo.vinculo, req.body.vinculo);

            if (!codigosDeEntregaUsados.reservar(conteudo.jti, conteudo.exp)) {
                throw ErroApi.requisicaoInvalida(CODIGO_JA_USADO);
            }
            reservado = conteudo.jti;

            const { perfil, tipoConta } = conteudo;
            const resultado = await GoogleAuthService.resolver(perfil);

            if (resultado.desfecho === "entrar") {
                // `confirmarReativacao` é a mesma confirmação do login por senha: a conta pausada só
                // volta quando a pessoa diz que quer, e o Site manda de novo o mesmo código de entrega.
                const sessao = await AutenticacaoService.entrarComUsuario(
                    resultado.usuario,
                    contextoRequisicao(req),
                    Boolean(req.body.confirmarReativacao)
                );

                if (sessao.contaPausada || sessao.emailNaoVerificado) {
                    codigosDeEntregaUsados.liberar(reservado);
                }

                return res.status(200).json({ sucesso: true, desfecho: "entrar", ...sessao });
            }

            if (resultado.desfecho === "conflito") {
                return res.status(200).json({
                    sucesso: true,
                    desfecho: "conflito",
                    email: resultado.email
                });
            }

            // O cadastro só aceita o e-mail que o Google verificou (`conferirEmailDoGoogle`). Recusar
            // já aqui poupa a pessoa de preencher duas etapas para ouvir um "não" no final.
            if (perfil.emailVerificado !== true) {
                throw ErroApi.requisicaoInvalida(
                    "O Google não confirmou o e-mail desta conta. Faça o cadastro com e-mail e senha."
                );
            }

            // Só o que o Google realmente forneceu. Nada de CPF, país ou telefone inventados.
            return res.status(200).json({
                sucesso: true,
                desfecho: "cadastrar",
                tipoConta: tipoConta ?? null,
                perfil: { email: perfil.email, nome: perfil.nome },
                // Assinada aqui, depois de o ID token ser verificado: o Site a reenvia no cadastro e o
                // vínculo é feito pelo `sub` que ela carrega, nunca por um `sub` que o navegador alegue.
                prova: assinarProva(perfil)
            });
        } catch (erro) {
            if (reservado) {
                codigosDeEntregaUsados.liberar(reservado);
            }

            return next(erro);
        }
    }

    /**
     * Vincula a conta Google a quem já está autenticado por senha.
     *
     * É o caminho de saída do `conflito`: a pessoa entra normalmente e então anexa o Google. Exige
     * sessão justamente para provar que a conta é dela, e o código passa pelas mesmas conferências
     * do `concluir` (vínculo com o navegador e uso único).
     */
    async vincular(req, res, next) {
        let reservado = null;

        try {
            const conteudo = lerCodigoDeEntrega(req.body.codigo);
            conferirVinculo(conteudo.vinculo, req.body.vinculo);

            if (!codigosDeEntregaUsados.reservar(conteudo.jti, conteudo.exp)) {
                throw ErroApi.requisicaoInvalida(CODIGO_JA_USADO);
            }
            reservado = conteudo.jti;

            await GoogleAuthService.vincular(req.user.id, conteudo.perfil);
            const usuario = await AutenticacaoService.perfilAtual(req.user.id);

            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            if (reservado) {
                codigosDeEntregaUsados.liberar(reservado);
            }

            return next(erro);
        }
    }
}

export default new GoogleAuthController();
