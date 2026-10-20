/**
 * Modelos de e-mail transacional (HTML e texto alternativo). Clientes de e-mail suportam bem menos
 * CSS que o navegador, então os estilos são inline e a estrutura é simples (sem grid, flex ou
 * variáveis CSS), para funcionar no Gmail, no Outlook e no Apple Mail. `COR_PRIMARIA` só dá
 * identidade visual ao e-mail e não precisa ser idêntica às cores do Site, que usam OKLCH, formato
 * que e-mails não renderizam.
 *
 * Cada modelo recebe `idioma` (`pt`, `en` ou `es`; padrão `pt`) e escolhe os textos em
 * `textosEmail.js`; a estrutura é a mesma nos três idiomas. Quem chama decide o idioma:
 * o da conta do destinatário (`usuarios.idioma`) ou, quando é ele mesmo quem acabou de pedir, o da
 * requisição (ver `idiomaDoDestinatario` em `i18n/idioma.js`).
 */
import { textosEmail } from "./textosEmail.js";

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
function layoutBase({ idioma, titulo, saudacao, corpoHtml, rodapeExtraHtml = "" }) {
    const t = textosEmail(idioma);

    return `<!doctype html>
<html lang="${t.htmlLang}">
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
                ${escaparHtml(t.rodape)}
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

/** Código de 6 dígitos em destaque, centralizado. */
const codigoEmDestaque = (codigo) =>
    `<p style="margin:0 0 16px 0;font-size:28px;font-weight:bold;letter-spacing:6px;color:${COR_TEXTO};text-align:center;">${escaparHtml(codigo)}</p>`;

/** Parágrafo secundário (cinza), usado para validade, avisos e orientações. */
const paragrafoSecundario = (texto, margem = "16px 0 0 0") =>
    `<p style="margin:${margem};color:${COR_TEXTO_SECUNDARIO};">${escaparHtml(texto)}</p>`;

const paragrafo = (texto, margem = "0 0 16px 0") =>
    `<p style="margin:${margem};">${escaparHtml(texto)}</p>`;

/**
 * E-mail de confirmação de cadastro (candidato ou empresa).
 *
 * `linkConfirmacao` pode vir `null` (ver `utils/urlFrontend.js`) quando
 * `FRONTEND_URL` está mal configurada; o código de 6 dígitos nunca
 * depende disso, então o e-mail continua útil sem o botão, só com o
 * texto de introdução e o rodapé ajustados para não mencionar um botão
 * que não existe.
 */
export function modeloConfirmacaoCadastro({ nome, linkConfirmacao, codigo, minutosValidade, idioma }) {
    const t = textosEmail(idioma);
    const c = t.confirmacaoCadastro;
    const corpoHtml = linkConfirmacao
        ? `
      ${paragrafo(c.introComLink)}
      ${botao(linkConfirmacao, c.botao)}
      <p style="margin:16px 0 0 0;color:${COR_TEXTO_SECUNDARIO};">${escaparHtml(c.codigoAlternativo)} <strong style="letter-spacing:2px;color:${COR_TEXTO};">${escaparHtml(codigo)}</strong></p>
      ${paragrafoSecundario(c.validadeComLink(minutosValidade), "8px 0 0 0")}
    `
        : `
      ${paragrafo(c.introSemLink)}
      ${codigoEmDestaque(codigo)}
      ${paragrafoSecundario(c.validadeSemLink(minutosValidade), "8px 0 0 0")}
    `;
    const html = layoutBase({
        idioma,
        titulo: c.titulo,
        saudacao: t.ola(nome),
        corpoHtml
    });
    const texto = linkConfirmacao
        ? c.textoComLink(linkConfirmacao, codigo, minutosValidade)
        : c.textoSemLink(codigo, minutosValidade);

    return { assunto: c.assunto, html, texto };
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
export function modeloRecuperacaoSenha({ nome, codigo, linkRedefinir, minutosValidade, idioma }) {
    const t = textosEmail(idioma);
    const c = t.recuperacaoSenha;
    const corpoHtml = `
      ${paragrafo(c.intro)}
      ${linkRedefinir ? botao(linkRedefinir, c.botao) : ""}
      ${paragrafoSecundario(linkRedefinir ? c.codigoComLink : c.codigoSemLink, "0 0 8px 0")}
      ${codigoEmDestaque(codigo)}
      ${paragrafoSecundario(c.validade(minutosValidade))}
    `;
    const html = layoutBase({
        idioma,
        titulo: c.titulo,
        saudacao: t.ola(nome),
        corpoHtml
    });

    return { assunto: c.assunto, html, texto: c.texto(linkRedefinir, codigo, minutosValidade) };
}

/** E-mail com o código de confirmação da troca de e-mail da conta. */
export function modeloConfirmacaoTrocaEmail({ nome, codigo, minutosValidade, idioma }) {
    const t = textosEmail(idioma);
    const c = t.trocaEmail;
    const corpoHtml = `
      ${paragrafo(c.intro)}
      ${codigoEmDestaque(codigo)}
      ${paragrafoSecundario(c.validade(minutosValidade))}
    `;
    const html = layoutBase({
        idioma,
        titulo: c.titulo,
        saudacao: t.ola(nome),
        corpoHtml
    });

    return { assunto: c.assunto, html, texto: c.texto(codigo, minutosValidade) };
}

/**
 * Aviso de conta bloqueada pela moderação. O e-mail é necessário porque a pessoa bloqueada não
 * consegue mais entrar nem usar uma sessão aberta, então nunca veria a notificação dentro do app.
 * O `motivo` é texto livre do moderador e sai como foi escrito, sem tradução.
 */
export function modeloContaBloqueada({ nome, motivo, idioma }) {
    const t = textosEmail(idioma);
    const c = t.contaBloqueada;
    const corpoHtml = `
      ${paragrafo(c.intro)}
      ${motivo ? `<p style="margin:0 0 16px 0;"><strong>${escaparHtml(t.motivo)}</strong> ${escaparHtml(motivo)}</p>` : ""}
      ${paragrafoSecundario(c.fim, "0")}
    `;
    const html = layoutBase({
        idioma,
        titulo: c.titulo,
        saudacao: t.olaFormal(nome),
        corpoHtml
    });

    return { assunto: c.assunto, html, texto: c.texto(motivo) };
}

/**
 * Aviso de empresa suspensa pela moderação. Diferente do bloqueio de conta, o login continua
 * funcionando (muda só `Empresa.statusAprovacao`, não `Usuario.bloqueado`), mas a empresa não pode
 * mais criar ou editar vagas nem receber candidaturas; o e-mail garante que ela saiba o motivo
 * mesmo sem abrir o painel.
 */
export function modeloEmpresaSuspensa({ nome, motivo, idioma }) {
    const t = textosEmail(idioma);
    const c = t.empresaSuspensa;
    const corpoHtml = `
      ${paragrafo(c.intro)}
      ${motivo ? `<p style="margin:0 0 16px 0;"><strong>${escaparHtml(t.motivo)}</strong> ${escaparHtml(motivo)}</p>` : ""}
      ${paragrafoSecundario(c.fim, "0")}
    `;
    const html = layoutBase({
        idioma,
        titulo: c.titulo,
        saudacao: t.olaFormal(nome),
        corpoHtml
    });

    return { assunto: c.assunto, html, texto: c.texto(motivo) };
}

/** E-mail de aviso após troca de senha bem-sucedida. */
export function modeloSenhaAlterada({ nome, idioma }) {
    const t = textosEmail(idioma);
    const c = t.senhaAlterada;
    const corpoHtml = `
      ${paragrafo(c.intro, "0")}
      ${paragrafoSecundario(c.aviso)}
    `;
    const html = layoutBase({
        idioma,
        titulo: c.titulo,
        saudacao: t.ola(nome),
        corpoHtml
    });

    return { assunto: c.assunto, html, texto: c.texto };
}
