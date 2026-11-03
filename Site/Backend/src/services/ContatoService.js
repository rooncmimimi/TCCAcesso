import crypto from "node:crypto";

import env from "../config/env.js";
import { ASSUNTOS_DE_CONTATO } from "../config/contato.js";
import ErroApi from "../utils/ErroApi.js";
import { modeloMensagemDeContato } from "../utils/modelosEmail.js";
import EmailService from "./EmailService.js";

/**
 * Fale conosco: encaminha a mensagem para a equipe do ACESSO por e-mail.
 *
 * Não existe tabela nem caixa de entrada no banco: o e-mail **é** o registro, e o protocolo que a pessoa recebe
 * aparece no assunto, para os dois lados se referirem à mesma conversa. O destino vem de
 * `CONTATO_EMAIL_DESTINO` (sem valor padrão: nenhum endereço é inventado) e o envio usa o mesmo Brevo do resto da
 * plataforma. Se uma das duas coisas não está configurada, a resposta é 503 dizendo isso; nunca se finge que a
 * mensagem foi enviada.
 *
 * Contra abuso: limite por IP na rota, validação do tamanho e do formato, campo-isca (`website`) que pessoa
 * nenhuma vê nem preenche, e **nenhum e-mail de confirmação sai para o endereço digitado** (isso transformaria o
 * formulário num disparador de e-mail para terceiros). O assunto do e-mail é montado só com o rótulo e o
 * protocolo, nunca com texto da pessoa, o que impede injeção de cabeçalho.
 */
class ContatoService {
    disponivel() {
        return EmailService.disponivel() && Boolean(env.contato?.destinoEmail);
    }

    gerarProtocolo() {
        return `ACE-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    }

    async enviar({ nome, email, assunto, mensagem, website }) {
        const protocolo = this.gerarProtocolo();

        // Robô: o campo-isca vem preenchido. Responde como se tivesse dado certo, para ele não se adaptar, mas
        // não envia nada. Sem dado pessoal no log.
        if (website) {
            console.warn(JSON.stringify({ nivel: "warn", servico: "ContatoService", status: "descartado_campo_isca", protocolo }));
            return { protocolo };
        }

        if (!this.disponivel()) {
            throw ErroApi.servicoIndisponivel(
                "O envio pelo formulário não está disponível agora. Escreva para o e-mail de contato indicado nesta página."
            );
        }

        const rotulo = ASSUNTOS_DE_CONTATO[assunto];

        if (!rotulo) {
            throw ErroApi.requisicaoInvalida("Escolha um assunto da lista.");
        }

        const modelo = modeloMensagemDeContato({ protocolo, rotulo, nome, email, mensagem });

        await EmailService.enviar({
            para: env.contato.destinoEmail,
            assunto: modelo.assunto,
            html: modelo.html,
            texto: modelo.texto,
            tag: "fale-conosco",
            // A equipe responde direto à pessoa, sem copiar o endereço dela para lugar nenhum além deste e-mail.
            responderPara: { email, nome }
        });

        return { protocolo };
    }
}

export default new ContatoService();
