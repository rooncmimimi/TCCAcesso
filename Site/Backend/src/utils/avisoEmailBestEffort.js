import EmailService from "../services/EmailService.js";

/**
 * Aviso por e-mail best-effort para ações administrativas (bloqueio de
 * conta, suspensão de empresa) — nunca lança, nunca desfaz nem atrasa a
 * ação principal (a sanção já foi persistida antes de chegar aqui em todo
 * call-site). Uma falha da Brevo vira só um log estruturado no servidor.
 *
 * Compartilhado entre `AdminUsuarioService` e `AdminEmpresaService` (Etapa 2
 * — antes vivia como método privado de `AdminService`, usado por ambos):
 * extraído para cá em vez de duplicado, já que a lógica é idêntica nos dois
 * domínios, só o template/motivo muda.
 */
export async function avisarPorEmailBestEffort({ usuarioId, email, nome, template, tag, acao, servico }) {
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
