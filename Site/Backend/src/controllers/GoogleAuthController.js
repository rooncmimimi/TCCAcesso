import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";
import GoogleAuthService from "../services/GoogleAuthService.js";
import AutenticacaoService from "../services/AutenticacaoService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";
import {
    INTENCAO_VINCULAR,
    assinarCodigoDeEntrega,
    assinarProva,
    conferirVinculo,
    lerCodigoDeEntrega
} from "../utils/codigoGoogle.js";
import { codigosDeEntregaUsados } from "../utils/usoUnico.js";
import { tratarErroCadastro } from "../utils/erroDeCadastro.js";

const CODIGO_JA_USADO = "Este código do Google já foi usado. Entre com o Google de novo.";
const CODIGO_DE_OUTRO_FLUXO =
    "Este retorno do Google não é para esta ação. Volte e comece de novo pelo botão do Google.";

/** Onde o navegador volta no fim do fluxo: a tela de login, ou a de Segurança quando é vinculação. */
const rotaDeRetorno = (intencao) => (intencao === INTENCAO_VINCULAR ? "/configuracoes/seguranca" : "/retorno-google");

/**
 * Origem e tela para onde o navegador volta, lidas do `state`. O Google devolve o `state` inclusive
 * quando a pessoa cancela, então isso vale antes de qualquer desvio: sem ele, cancelar em
 * desenvolvimento jogaria a pessoa no site publicado, e cancelar uma vinculação a jogaria na tela de
 * login. Só cai no padrão quando o `state` não veio ou não é válido.
 */
function destinoDeRetorno(state) {
    try {
        const previa = GoogleAuthService.lerState(state);

        return { origem: previa.origem || env.frontendUrl, rota: rotaDeRetorno(previa.intencao) };
    } catch {
        // `state` ausente ou inválido: segue com a origem padrão e o erro aparece adiante.
        return { origem: env.frontendUrl, rota: rotaDeRetorno(null) };
    }
}

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

    /**
     * Resposta do limite de requisições do `callback` (ver `criarLimiteGoogle`): como o resto do
     * fluxo, termina num redirecionamento ao Site com `erro=falha`, e não num JSON solto na tela.
     */
    limiteExcedido(req, res) {
        const { origem, rota } = destinoDeRetorno(req.query.state);

        return res.redirect(`${origem}${rota}?${new URLSearchParams({ erro: "falha" }).toString()}`);
    }

    /** Para onde o Google manda o navegador de volta. Sempre termina num redirecionamento ao Site. */
    async callback(req, res) {
        const { origem, rota } = destinoDeRetorno(req.query.state);

        const comErro = (erro) => `${origem}${rota}?${new URLSearchParams({ erro }).toString()}`;

        // A pessoa cancelou na tela do Google, ou o Google recusou o pedido.
        if (req.query.error) {
            return res.redirect(comErro("cancelado"));
        }

        try {
            const { nonce, tipoConta, vinculo, intencao, usuarioId, codeVerifier } = GoogleAuthService.lerState(
                req.query.state
            );
            const perfil = await GoogleAuthService.perfilDoCodigo(req.query.code, nonce, codeVerifier);

            const codigo = assinarCodigoDeEntrega({ perfil, tipoConta, vinculo, intencao, usuarioId });

            // No fragmento, e não na query: o fragmento não é enviado ao servidor do Site nem entra
            // nos logs dele, e o Site o apaga da barra de endereço assim que o lê.
            return res.redirect(`${origem}${rota}#codigo=${codigo}`);
        } catch (erro) {
            // O motivo nunca vai para a URL — o Site mostra uma mensagem genérica —, mas vai para o
            // log do servidor: sem isso, uma falha aqui é indistinguível de outra e só resta
            // adivinhar por que o login com Google não funcionou.
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "GoogleAuthController.callback",
                    motivo: erro?.message ?? String(erro),
                    // O que o Google respondeu (`invalid_client`, `invalid_grant`...), quando foi ele que falhou.
                    ...(erro?.motivoGoogle ? { motivoGoogle: erro.motivoGoogle } : {})
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

            // Um código de vinculação é de quem já tem sessão e não abre uma nova.
            if (conteudo.intencao) {
                throw ErroApi.requisicaoInvalida(CODIGO_DE_OUTRO_FLUXO);
            }

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
                // Diz ao Site qual caminho seguir: com a chave ligada (e a migration aplicada), a conta
                // é criada já aqui, sem senha; desligada, o cadastro segue o formulário de sempre.
                contaSemSenha: Boolean(env.google.contaSemSenha),
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
     * Cria a conta de candidato a partir da prova do Google, sem senha (etapa 6). É o passo que vem
     * depois de `concluir` devolver `cadastrar` com `contaSemSenha`. Recusa quando a chave
     * `GOOGLE_CONTA_SEM_SENHA` está desligada: o servidor não cria conta sem senha por conta própria,
     * mesmo que alguém chame a rota direto.
     */
    async cadastrar(req, res, next) {
        try {
            if (!env.google.contaSemSenha) {
                throw ErroApi.acessoNegado("Criar a conta direto pelo Google não está habilitado.");
            }

            const resultado = await AutenticacaoService.cadastrarCandidatoComGoogle(
                { prova: req.body.prova, termosVersao: req.body.termosVersao },
                contextoRequisicao(req)
            );

            return res.status(201).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(tratarErroCadastro(erro));
        }
    }

    /** O que a tela Contas conectadas mostra sobre o Google desta conta. */
    async conta(req, res, next) {
        try {
            const situacao = await GoogleAuthService.situacao(req.user.id);

            return res.status(200).json({ sucesso: true, ...situacao });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * Primeiro passo de vincular um Google a uma conta que já existe: a pessoa confirma a senha e só
     * então recebe a URL do Google. É o caminho de saída do `conflito`: entra com a senha e anexa o
     * Google. Uma sessão roubada sozinha não basta para anexar um segundo meio de entrada.
     *
     * A senha é conferida **aqui**, antes de sair para o Google; o `state` assinado leva o id de quem
     * pediu e a intenção "vincular", e `vincular` (abaixo) só aceita esse código para essa pessoa.
     */
    async iniciarVinculo(req, res, next) {
        try {
            await GoogleAuthService.conferirPodeVincular(req.user.id);
            await AutenticacaoService.conferirSenhaAtual(req.user.id, req.body.senha);

            const { url } = GoogleAuthService.gerarUrlDeAutorizacao({
                intencao: INTENCAO_VINCULAR,
                usuarioId: req.user.id,
                vinculo: req.body.vinculo || null,
                origem: req.get('origin') || null
            });

            return res.status(200).json({ sucesso: true, url });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * Segundo passo: o Site apresenta o código de volta do Google. Além das conferências do
     * `concluir` (assinatura, vínculo com o navegador, uso único), o código tem de ser de
     * **vinculação** e ter sido pedido por **esta** sessão: um código de login, ou o de outra pessoa,
     * não vincula nada.
     */
    async vincular(req, res, next) {
        let reservado = null;

        try {
            const conteudo = lerCodigoDeEntrega(req.body.codigo);

            if (conteudo.intencao !== INTENCAO_VINCULAR || conteudo.usuarioId !== req.user.id) {
                throw ErroApi.requisicaoInvalida(CODIGO_DE_OUTRO_FLUXO);
            }

            conferirVinculo(conteudo.vinculo, req.body.vinculo);

            if (!codigosDeEntregaUsados.reservar(conteudo.jti, conteudo.exp)) {
                throw ErroApi.requisicaoInvalida(CODIGO_JA_USADO);
            }
            reservado = conteudo.jti;

            await GoogleAuthService.vincular(req.user.id, conteudo.perfil);

            return res.status(200).json({ sucesso: true, vinculado: true });
        } catch (erro) {
            if (reservado) {
                codigosDeEntregaUsados.liberar(reservado);
            }

            return next(erro);
        }
    }

    /** Desfaz o vínculo, também com a senha atual. */
    async desvincular(req, res, next) {
        try {
            await AutenticacaoService.conferirSenhaAtual(req.user.id, req.body.senha);
            await GoogleAuthService.desvincular(req.user.id);

            return res.status(200).json({ sucesso: true, vinculado: false });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new GoogleAuthController();
