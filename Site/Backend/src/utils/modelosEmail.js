/**
 * Modelos de e-mail transacional (HTML e texto alternativo). Clientes de e-mail suportam bem menos
 * CSS que o navegador, então os estilos são inline e a estrutura é simples (sem grid, flex ou
 * variáveis CSS), para funcionar no Gmail, no Outlook e no Apple Mail. `COR_PRIMARIA` só dá
 * identidade visual ao e-mail e não precisa ser idêntica às cores do Site, que usam OKLCH, formato
 * que e-mails não renderizam.
 */
const COR_PRIMARIA = "#2954d6";
const COR_TEXTO = "#1f2430";
const COR_TEXTO_SECUNDARIO = "#5b6270";
const COR_FUNDO = "#f3f5fb";
const COR_CARTAO = "#ffffff";
const COR_BORDA = "#e2e5ee";

/** Escapa qualquer valor dinâmico antes de ele entrar no HTML do e-mail. */
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

/** Botão de link montado com tabela, o formato que os clientes de e-mail exibem de forma consistente. */
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
 * `linkConfirmacao` pode vir `null` (ver `utils/urlFrontend.js`) quando
 * `FRONTEND_URL` está mal configurada; o código de 6 dígitos nunca
 * depende disso, então o e-mail continua útil sem o botão, só com o
 * texto de introdução e o rodapé ajustados para não mencionar um botão
 * que não existe.
 */
export function modeloConfirmacaoCadastro({ nome, linkConfirmacao, codigo, minutosValidade }) {
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
 * O link (token opaco) é o mecanismo principal, por isso vem em destaque,
 * antes do código. `linkRedefinir` pode vir `null` (ver
 * `utils/urlFrontend.js`) quando `FRONTEND_URL` está mal configurada; o
 * código de 6 dígitos nunca depende disso e continua funcionando sozinho
 * (é o único mecanismo que o aplicativo mobile usa), então o e-mail
 * continua completo e utilizável mesmo sem o botão.
 */
export function modeloRecuperacaoSenha({ nome, codigo, linkRedefinir, minutosValidade }) {
    const assunto = "Redefinição de senha — ACESSO";
    const corpoHtml = `
      <p style="margin:0 0 16px 0;">Recebemos uma solicitação para redefinir a senha da sua conta no ACESSO.</p>
      ${linkRedefinir ? botao(linkRedefinir, "Redefinir minha senha") : ""}
      <p style="margin:0 0 8px 0;color:${COR_TEXTO_SECUNDARIO};">${linkRedefinir ? "Se estiver no aplicativo ACESSO, use o código abaixo em vez do botão:" : "Use o código abaixo na tela de redefinição:"}</p>
      <p style="margin:0 0 16px 0;font-size:28px;font-weight:bold;letter-spacing:6px;color:${COR_TEXTO};text-align:center;">${escaparHtml(codigo)}</p>
      <p style="margin:16px 0 0 0;color:${COR_TEXTO_SECUNDARIO};">Válido por ${minutosValidade} minutos. Se você não solicitou essa alteração, ignore este e-mail — sua senha continua a mesma.</p>
    `;
    const html = layoutBase({
        titulo: "Redefinição de senha",
        saudacao: nome ? `Olá, ${nome}!` : "Olá!",
        corpoHtml
    });
    const texto =
        `Redefinição de senha — ACESSO\n\n` +
        `Recebemos uma solicitação para redefinir sua senha.\n` +
        (linkRedefinir ? `Acesse: ${linkRedefinir}\n\n` : "\n") +
        `Se estiver no aplicativo ACESSO, use o código: ${codigo}\n\n` +
        `Válido por ${minutosValidade} minutos. Se você não solicitou, ignore este e-mail.`;

    return { assunto, html, texto };
}

/** E-mail com o código de confirmação da troca de e-mail da conta. */
export function modeloConfirmacaoTrocaEmail({ nome, codigo, minutosValidade }) {
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
 * Aviso de conta bloqueada pela moderação. O e-mail é necessário porque a pessoa bloqueada não
 * consegue mais entrar nem usar uma sessão aberta, então nunca veria a notificação dentro do app.
 */
export function modeloContaBloqueada({ nome, motivo }) {
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
 * Aviso de empresa suspensa pela moderação. Diferente do bloqueio de conta, o login continua
 * funcionando (muda só `Empresa.statusAprovacao`, não `Usuario.bloqueado`), mas a empresa não pode
 * mais criar ou editar vagas nem receber candidaturas; o e-mail garante que ela saiba o motivo
 * mesmo sem abrir o painel.
 */
export function modeloEmpresaSuspensa({ nome, motivo }) {
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
export function modeloSenhaAlterada({ nome }) {
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
