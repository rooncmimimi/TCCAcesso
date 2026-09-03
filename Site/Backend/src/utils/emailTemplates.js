/**
 * Templates de e-mail transacional (HTML + texto alternativo).
 *
 * E-mail HTML tem suporte a CSS muito mais limitado que uma página web —
 * por isso os estilos aqui são inline e a estrutura é propositalmente
 * simples (sem grid/flex/variáveis CSS), pensada para funcionar em
 * clientes de e-mail comuns (Gmail, Outlook, Apple Mail).
 *
 * A cor abaixo é uma aproximação do azul primário do ACESSO (definido em
 * OKLCH no Frontend, que e-mail não renderiza) — só para dar identidade
 * visual ao e-mail, não precisa ser pixel-perfect.
 */
const COR_PRIMARIA = "#2954d6";
const COR_TEXTO = "#1f2430";
const COR_TEXTO_SECUNDARIO = "#5b6270";
const COR_FUNDO = "#f3f5fb";
const COR_CARTAO = "#ffffff";
const COR_BORDA = "#e2e5ee";

function escaparHtml(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Estrutura comum a todos os e-mails do ACESSO. */
function layoutBase({ titulo, saudacao, corpoHtml, rodapeExtraHtml = "" }) {
    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escaparHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COR_FUNDO};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COR_FUNDO};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:${COR_CARTAO};border:1px solid ${COR_BORDA};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <span style="display:inline-block;width:28px;height:28px;background-color:${COR_PRIMARIA};border-radius:8px;vertical-align:middle;"></span>
              <span style="display:inline-block;margin-left:8px;font-size:18px;font-weight:bold;color:${COR_TEXTO};vertical-align:middle;">ACESSO</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <h1 style="margin:0;font-size:20px;color:${COR_TEXTO};">${escaparHtml(titulo)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;font-size:15px;color:${COR_TEXTO};line-height:1.5;">
              ${saudacao ? `<p style="margin:0 0 16px 0;">${escaparHtml(saudacao)}</p>` : ""}
              ${corpoHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px;border-top:1px solid ${COR_BORDA};margin-top:16px;">
              <p style="margin:16px 0 0 0;font-size:12px;color:${COR_TEXTO_SECUNDARIO};line-height:1.5;">
                ${rodapeExtraHtml}
                Este é um e-mail automático do ACESSO — plataforma de inclusão profissional. Se você não reconhece esta solicitação, apenas ignore esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function botao(url, texto) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr>
    <td style="border-radius:8px;background-color:${COR_PRIMARIA};">
      <a href="${escaparHtml(url)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${escaparHtml(texto)}</a>
    </td>
  </tr>
</table>`;
}

/**
 * E-mail de confirmação de cadastro (candidato ou empresa).
 *
 * `linkConfirmacao` pode vir `null` (ver `utils/frontendUrl.js`) quando
 * `FRONTEND_URL` está mal configurada — o código de 6 dígitos nunca
 * depende disso, então o e-mail continua útil sem o botão, só com o
 * texto de introdução e o rodapé ajustados para não mencionar um botão
 * que não existe.
 */
export function templateConfirmacaoCadastro({ nome, linkConfirmacao, codigo, minutosValidade }) {
    const assunto = "Confirme seu e-mail — ACESSO";
    const corpoHtml = linkConfirmacao
        ? `
      <p style="margin:0 0 16px 0;">Sua conta no ACESSO foi criada com sucesso. Para confirmar seu endereço de e-mail e liberar o acesso, clique no botão abaixo:</p>
      ${botao(linkConfirmacao, "Confirmar meu e-mail")}
      <p style="margin:16px 0 0 0;color:${COR_TEXTO_SECUNDARIO};">Se o botão não funcionar, use este código na tela de confirmação: <strong style="letter-spacing:2px;color:${COR_TEXTO};">${escaparHtml(codigo)}</strong></p>
      <p style="margin:8px 0 0 0;color:${COR_TEXTO_SECUNDARIO};">Este link/código é válido por ${minutosValidade} minutos. Se você não criou esta conta, ignore este e-mail.</p>
    `
        : `
      <p style="margin:0 0 16px 0;">Sua conta no ACESSO foi criada com sucesso. Para confirmar seu endereço de e-mail, use o código abaixo na tela de confirmação:</p>
      <p style="margin:0 0 16px 0;font-size:28px;font-weight:bold;letter-spacing:6px;color:${COR_TEXTO};text-align:center;">${escaparHtml(codigo)}</p>
      <p style="margin:8px 0 0 0;color:${COR_TEXTO_SECUNDARIO};">Este código é válido por ${minutosValidade} minutos. Se você não criou esta conta, ignore este e-mail.</p>
    `;
    const html = layoutBase({
        titulo: "Bem-vindo ao ACESSO!",
        saudacao: nome ? `Olá, ${nome}!` : "Olá!",
        corpoHtml
    });
    const texto = linkConfirmacao
        ? `Bem-vindo ao ACESSO!\n\n` +
          `Sua conta foi criada com sucesso. Para confirmar seu e-mail, acesse:\n${linkConfirmacao}\n\n` +
          `Ou use o código ${codigo} na tela de confirmação (válido por ${minutosValidade} minutos).\n\n` +
          `Se você não criou esta conta, ignore este e-mail.`
        : `Bem-vindo ao ACESSO!\n\n` +
          `Sua conta foi criada com sucesso. Use o código ${codigo} na tela de confirmação ` +
          `(válido por ${minutosValidade} minutos).\n\n` +
          `Se você não criou esta conta, ignore este e-mail.`;

    return { assunto, html, texto };
}

/**
 * E-mail de recuperação de senha.
 *
 * `linkRedefinir` pode vir `null` (ver `utils/frontendUrl.js`) quando
 * `FRONTEND_URL` está mal configurada — o código já é o mecanismo
 * principal (por isso vem em destaque, antes do botão), então o e-mail
 * continua completo e utilizável mesmo sem o link.
 */
export function templateRecuperacaoSenha({ nome, codigo, linkRedefinir, minutosValidade }) {
    const assunto = "Redefinição de senha — ACESSO";
    const corpoHtml = `
      <p style="margin:0 0 16px 0;">Recebemos uma solicitação para redefinir a senha da sua conta no ACESSO. Use o código abaixo na tela de redefinição:</p>
      <p style="margin:0 0 16px 0;font-size:28px;font-weight:bold;letter-spacing:6px;color:${COR_TEXTO};text-align:center;">${escaparHtml(codigo)}</p>
      ${linkRedefinir ? botao(linkRedefinir, "Redefinir minha senha") : ""}
      <p style="margin:16px 0 0 0;color:${COR_TEXTO_SECUNDARIO};">Este código é válido por ${minutosValidade} minutos. Se você não solicitou essa alteração, ignore este e-mail — sua senha continua a mesma.</p>
    `;
    const html = layoutBase({
        titulo: "Redefinição de senha",
        saudacao: nome ? `Olá, ${nome}!` : "Olá!",
        corpoHtml
    });
    const texto =
        `Redefinição de senha — ACESSO\n\n` +
        `Recebemos uma solicitação para redefinir sua senha. Use o código: ${codigo}\n` +
        (linkRedefinir ? `Ou acesse: ${linkRedefinir}\n\n` : "\n") +
        `Válido por ${minutosValidade} minutos. Se você não solicitou, ignore este e-mail.`;

    return { assunto, html, texto };
}

/** E-mail de confirmação ao trocar o e-mail da conta (Configurações > Acesso e segurança). */
export function templateConfirmacaoTrocaEmail({ nome, codigo, minutosValidade }) {
    const assunto = "Confirme seu novo e-mail — ACESSO";
    const corpoHtml = `
      <p style="margin:0 0 16px 0;">Recebemos uma solicitação para trocar o e-mail da sua conta ACESSO para este endereço. Use o código abaixo para confirmar:</p>
      <p style="margin:0 0 16px 0;font-size:28px;font-weight:bold;letter-spacing:6px;color:${COR_TEXTO};text-align:center;">${escaparHtml(codigo)}</p>
      <p style="margin:16px 0 0 0;color:${COR_TEXTO_SECUNDARIO};">Este código é válido por ${minutosValidade} minutos. Se você não solicitou essa troca, ignore este e-mail — o endereço atual da sua conta continua o mesmo.</p>
    `;
    const html = layoutBase({
        titulo: "Confirme seu novo e-mail",
        saudacao: nome ? `Olá, ${nome}!` : "Olá!",
        corpoHtml
    });
    const texto =
        `Confirme seu novo e-mail — ACESSO\n\n` +
        `Use o código ${codigo} para confirmar a troca do e-mail da sua conta.\n` +
        `Válido por ${minutosValidade} minutos. Se você não solicitou, ignore este e-mail.`;

    return { assunto, html, texto };
}

/**
 * E-mail de aviso quando a conta é bloqueada pela moderação (Fase 9,
 * Bloco 3) — canal fora de banda: o usuário deixa de conseguir logar ou
 * usar uma sessão já aberta, então o aviso in-app sozinho (`Notificacao`)
 * nunca chega a ser visto por quem foi bloqueado.
 */
export function templateContaBloqueada({ nome, motivo }) {
    const assunto = "Sua conta foi bloqueada — ACESSO";
    const corpoHtml = `
      <p style="margin:0 0 16px 0;">Sua conta no ACESSO foi bloqueada pela nossa equipe de moderação.</p>
      ${motivo ? `<p style="margin:0 0 16px 0;"><strong>Motivo:</strong> ${escaparHtml(motivo)}</p>` : ""}
      <p style="margin:0;color:${COR_TEXTO_SECUNDARIO};">Se você acredita que isso foi um engano, entre em contato com o suporte do ACESSO respondendo este e-mail.</p>
    `;
    const html = layoutBase({
        titulo: "Sua conta foi bloqueada",
        saudacao: nome ? `Olá, ${nome}.` : "Olá.",
        corpoHtml
    });
    const texto =
        `Sua conta foi bloqueada — ACESSO\n\n` +
        `Sua conta no ACESSO foi bloqueada pela nossa equipe de moderação.\n` +
        (motivo ? `Motivo: ${motivo}\n\n` : "\n") +
        `Se você acredita que isso foi um engano, entre em contato com o suporte respondendo este e-mail.`;

    return { assunto, html, texto };
}

/**
 * E-mail de aviso quando a EMPRESA é suspensa pela moderação (Fase 9,
 * Bloco 1/3) — diferente de conta bloqueada: o login da empresa continua
 * funcionando (só `Empresa.statusAprovacao` muda, não `Usuario.bloqueado`),
 * mas ela não pode mais criar/editar vaga nem receber candidatura nova —
 * o e-mail existe pra garantir que a empresa saiba do motivo mesmo se não
 * abrir o painel imediatamente.
 */
export function templateEmpresaSuspensa({ nome, motivo }) {
    const assunto = "Sua empresa foi suspensa — ACESSO";
    const corpoHtml = `
      <p style="margin:0 0 16px 0;">O cadastro da sua empresa no ACESSO foi suspenso pela nossa equipe de moderação. Enquanto a suspensão estiver ativa, não é possível publicar ou editar vagas, nem receber novas candidaturas — vagas e candidaturas já existentes continuam preservadas.</p>
      ${motivo ? `<p style="margin:0 0 16px 0;"><strong>Motivo:</strong> ${escaparHtml(motivo)}</p>` : ""}
      <p style="margin:0;color:${COR_TEXTO_SECUNDARIO};">Se você acredita que isso foi um engano, entre em contato com o suporte do ACESSO respondendo este e-mail.</p>
    `;
    const html = layoutBase({
        titulo: "Sua empresa foi suspensa",
        saudacao: nome ? `Olá, ${nome}.` : "Olá.",
        corpoHtml
    });
    const texto =
        `Sua empresa foi suspensa — ACESSO\n\n` +
        `O cadastro da sua empresa foi suspenso pela nossa equipe de moderação. Vagas e candidaturas já existentes continuam preservadas, mas não é possível publicar/editar vaga nem receber candidatura nova enquanto a suspensão estiver ativa.\n` +
        (motivo ? `Motivo: ${motivo}\n\n` : "\n") +
        `Se você acredita que isso foi um engano, entre em contato com o suporte respondendo este e-mail.`;

    return { assunto, html, texto };
}

/** E-mail de aviso após troca de senha bem-sucedida. */
export function templateSenhaAlterada({ nome }) {
    const assunto = "Sua senha foi alterada — ACESSO";
    const corpoHtml = `
      <p style="margin:0;">A senha da sua conta ACESSO foi alterada com sucesso.</p>
      <p style="margin:16px 0 0 0;color:${COR_TEXTO_SECUNDARIO};">Se você não realizou essa alteração, troque sua senha imediatamente e entre em contato com o suporte do ACESSO.</p>
    `;
    const html = layoutBase({
        titulo: "Sua senha foi alterada",
        saudacao: nome ? `Olá, ${nome}!` : "Olá!",
        corpoHtml
    });
    const texto =
        `Sua senha foi alterada — ACESSO\n\n` +
        `A senha da sua conta foi alterada com sucesso.\n` +
        `Se você não realizou essa alteração, troque sua senha imediatamente e contate o suporte.`;

    return { assunto, html, texto };
}
