import EmailService from "../services/EmailService.js";

/**
 * Aviso por e-mail, sem garantia de entrega, para ações administrativas (bloqueio de conta,
 * suspensão de empresa). Nunca lança nem desfaz ou atrasa a ação principal, que já foi gravada
 * antes; uma falha da Brevo vira só um log estruturado. Usado por `AdminUsuarioService` e
 * `AdminEmpresaService`, que só mudam o modelo de e-mail e o motivo.
 */
export async function tentarAvisarPorEmail({ usuarioId, email, nome, template, tag, acao, servico }) {
    if (!EmailService.disponivel()) return;

    try {
        await EmailService.enviar({
            para: email,
            nomeDestinatario: nome,
            assunto: template.assunto,
            html: template.html,
            texto: template.texto,
            tag
        });
    } catch (erro) {
        console.error(
            JSON.stringify({
                nivel: "error",
                servico,
                acao,
                usuarioId,
                erro: erro.message
            })
        );
    }
}
