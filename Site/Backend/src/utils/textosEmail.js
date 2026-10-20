/**
 * Textos dos e-mails transacionais em cada idioma (pt, en, es). Só texto: a estrutura HTML e os
 * estilos ficam em `modelosEmail.js`, iguais para os três idiomas. Os trechos que levam um valor
 * (nome, código, minutos) são funções, para a ordem das palavras poder mudar de uma língua para a
 * outra sem o modelo saber.
 */
const pt = {
    htmlLang: "pt-BR",
    rodape:
        "Este é um e-mail automático do ACESSO — plataforma de inclusão profissional. Se você não reconhece esta solicitação, apenas ignore esta mensagem.",
    ola: (nome) => (nome ? `Olá, ${nome}!` : "Olá!"),
    olaFormal: (nome) => (nome ? `Olá, ${nome}.` : "Olá."),
    motivo: "Motivo:",

    confirmacaoCadastro: {
        assunto: "Confirme seu e-mail — ACESSO",
        titulo: "Bem-vindo ao ACESSO!",
        introComLink:
            "Sua conta no ACESSO foi criada com sucesso. Para confirmar seu endereço de e-mail e liberar o acesso, clique no botão abaixo:",
        botao: "Confirmar meu e-mail",
        codigoAlternativo: "Se o botão não funcionar, use este código na tela de confirmação:",
        validadeComLink: (min) =>
            `Este link/código é válido por ${min} minutos. Se você não criou esta conta, ignore este e-mail.`,
        introSemLink:
            "Sua conta no ACESSO foi criada com sucesso. Para confirmar seu endereço de e-mail, use o código abaixo na tela de confirmação:",
        validadeSemLink: (min) =>
            `Este código é válido por ${min} minutos. Se você não criou esta conta, ignore este e-mail.`,
        textoComLink: (link, codigo, min) =>
            `Bem-vindo ao ACESSO!\n\n` +
            `Sua conta foi criada com sucesso. Para confirmar seu e-mail, acesse:\n${link}\n\n` +
            `Ou use o código ${codigo} na tela de confirmação (válido por ${min} minutos).\n\n` +
            `Se você não criou esta conta, ignore este e-mail.`,
        textoSemLink: (codigo, min) =>
            `Bem-vindo ao ACESSO!\n\n` +
            `Sua conta foi criada com sucesso. Use o código ${codigo} na tela de confirmação ` +
            `(válido por ${min} minutos).\n\n` +
            `Se você não criou esta conta, ignore este e-mail.`
    },

    recuperacaoSenha: {
        assunto: "Redefinição de senha — ACESSO",
        titulo: "Redefinição de senha",
        intro: "Recebemos uma solicitação para redefinir a senha da sua conta no ACESSO.",
        botao: "Redefinir minha senha",
        codigoComLink: "Se estiver no aplicativo ACESSO, use o código abaixo em vez do botão:",
        codigoSemLink: "Use o código abaixo na tela de redefinição:",
        validade: (min) =>
            `Válido por ${min} minutos. Se você não solicitou essa alteração, ignore este e-mail — sua senha continua a mesma.`,
        texto: (link, codigo, min) =>
            `Redefinição de senha — ACESSO\n\n` +
            `Recebemos uma solicitação para redefinir sua senha.\n` +
            (link ? `Acesse: ${link}\n\n` : "\n") +
            `Se estiver no aplicativo ACESSO, use o código: ${codigo}\n\n` +
            `Válido por ${min} minutos. Se você não solicitou, ignore este e-mail.`
    },

    trocaEmail: {
        assunto: "Confirme seu novo e-mail — ACESSO",
        titulo: "Confirme seu novo e-mail",
        intro:
            "Recebemos uma solicitação para trocar o e-mail da sua conta ACESSO para este endereço. Use o código abaixo para confirmar:",
        validade: (min) =>
            `Este código é válido por ${min} minutos. Se você não solicitou essa troca, ignore este e-mail — o endereço atual da sua conta continua o mesmo.`,
        texto: (codigo, min) =>
            `Confirme seu novo e-mail — ACESSO\n\n` +
            `Use o código ${codigo} para confirmar a troca do e-mail da sua conta.\n` +
            `Válido por ${min} minutos. Se você não solicitou, ignore este e-mail.`
    },

    contaBloqueada: {
        assunto: "Sua conta foi bloqueada — ACESSO",
        titulo: "Sua conta foi bloqueada",
        intro: "Sua conta no ACESSO foi bloqueada pela nossa equipe de moderação.",
        fim: "Se você acredita que isso foi um engano, entre em contato com o suporte do ACESSO respondendo este e-mail.",
        texto: (motivo) =>
            `Sua conta foi bloqueada — ACESSO\n\n` +
            `Sua conta no ACESSO foi bloqueada pela nossa equipe de moderação.\n` +
            (motivo ? `Motivo: ${motivo}\n\n` : "\n") +
            `Se você acredita que isso foi um engano, entre em contato com o suporte respondendo este e-mail.`
    },

    empresaSuspensa: {
        assunto: "Sua empresa foi suspensa — ACESSO",
        titulo: "Sua empresa foi suspensa",
        intro:
            "O cadastro da sua empresa no ACESSO foi suspenso pela nossa equipe de moderação. Enquanto a suspensão estiver ativa, não é possível publicar ou editar vagas, nem receber novas candidaturas — vagas e candidaturas já existentes continuam preservadas.",
        fim: "Se você acredita que isso foi um engano, entre em contato com o suporte do ACESSO respondendo este e-mail.",
        texto: (motivo) =>
            `Sua empresa foi suspensa — ACESSO\n\n` +
            `O cadastro da sua empresa foi suspenso pela nossa equipe de moderação. Vagas e candidaturas já existentes continuam preservadas, mas não é possível publicar/editar vaga nem receber candidatura nova enquanto a suspensão estiver ativa.\n` +
            (motivo ? `Motivo: ${motivo}\n\n` : "\n") +
            `Se você acredita que isso foi um engano, entre em contato com o suporte respondendo este e-mail.`
    },

    senhaAlterada: {
        assunto: "Sua senha foi alterada — ACESSO",
        titulo: "Sua senha foi alterada",
        intro: "A senha da sua conta ACESSO foi alterada com sucesso.",
        aviso:
            "Se você não realizou essa alteração, troque sua senha imediatamente e entre em contato com o suporte do ACESSO.",
        texto:
            `Sua senha foi alterada — ACESSO\n\n` +
            `A senha da sua conta foi alterada com sucesso.\n` +
            `Se você não realizou essa alteração, troque sua senha imediatamente e contate o suporte.`
    }
};

const en = {
    htmlLang: "en",
    rodape:
        "This is an automated email from ACESSO — a professional inclusion platform. If you don't recognize this request, just ignore this message.",
    ola: (nome) => (nome ? `Hello, ${nome}!` : "Hello!"),
    olaFormal: (nome) => (nome ? `Hello, ${nome}.` : "Hello."),
    motivo: "Reason:",

    confirmacaoCadastro: {
        assunto: "Confirm your email — ACESSO",
        titulo: "Welcome to ACESSO!",
        introComLink:
            "Your ACESSO account was created successfully. To confirm your email address and unlock access, click the button below:",
        botao: "Confirm my email",
        codigoAlternativo: "If the button doesn't work, use this code on the confirmation screen:",
        validadeComLink: (min) =>
            `This link/code is valid for ${min} minutes. If you didn't create this account, ignore this email.`,
        introSemLink:
            "Your ACESSO account was created successfully. To confirm your email address, use the code below on the confirmation screen:",
        validadeSemLink: (min) =>
            `This code is valid for ${min} minutes. If you didn't create this account, ignore this email.`,
        textoComLink: (link, codigo, min) =>
            `Welcome to ACESSO!\n\n` +
            `Your account was created successfully. To confirm your email, go to:\n${link}\n\n` +
            `Or use the code ${codigo} on the confirmation screen (valid for ${min} minutes).\n\n` +
            `If you didn't create this account, ignore this email.`,
        textoSemLink: (codigo, min) =>
            `Welcome to ACESSO!\n\n` +
            `Your account was created successfully. Use the code ${codigo} on the confirmation screen ` +
            `(valid for ${min} minutes).\n\n` +
            `If you didn't create this account, ignore this email.`
    },

    recuperacaoSenha: {
        assunto: "Password reset — ACESSO",
        titulo: "Password reset",
        intro: "We received a request to reset the password of your ACESSO account.",
        botao: "Reset my password",
        codigoComLink: "If you're using the ACESSO app, use the code below instead of the button:",
        codigoSemLink: "Use the code below on the reset screen:",
        validade: (min) =>
            `Valid for ${min} minutes. If you didn't request this change, ignore this email — your password stays the same.`,
        texto: (link, codigo, min) =>
            `Password reset — ACESSO\n\n` +
            `We received a request to reset your password.\n` +
            (link ? `Go to: ${link}\n\n` : "\n") +
            `If you're using the ACESSO app, use the code: ${codigo}\n\n` +
            `Valid for ${min} minutes. If you didn't request it, ignore this email.`
    },

    trocaEmail: {
        assunto: "Confirm your new email — ACESSO",
        titulo: "Confirm your new email",
        intro:
            "We received a request to change your ACESSO account email to this address. Use the code below to confirm:",
        validade: (min) =>
            `This code is valid for ${min} minutes. If you didn't request this change, ignore this email — your account's current address stays the same.`,
        texto: (codigo, min) =>
            `Confirm your new email — ACESSO\n\n` +
            `Use the code ${codigo} to confirm the change of your account email.\n` +
            `Valid for ${min} minutes. If you didn't request it, ignore this email.`
    },

    contaBloqueada: {
        assunto: "Your account was blocked — ACESSO",
        titulo: "Your account was blocked",
        intro: "Your ACESSO account was blocked by our moderation team.",
        fim: "If you believe this was a mistake, contact ACESSO support by replying to this email.",
        texto: (motivo) =>
            `Your account was blocked — ACESSO\n\n` +
            `Your ACESSO account was blocked by our moderation team.\n` +
            (motivo ? `Reason: ${motivo}\n\n` : "\n") +
            `If you believe this was a mistake, contact support by replying to this email.`
    },

    empresaSuspensa: {
        assunto: "Your company was suspended — ACESSO",
        titulo: "Your company was suspended",
        intro:
            "Your company's registration on ACESSO was suspended by our moderation team. While the suspension is active, you can't publish or edit jobs or receive new applications — existing jobs and applications are preserved.",
        fim: "If you believe this was a mistake, contact ACESSO support by replying to this email.",
        texto: (motivo) =>
            `Your company was suspended — ACESSO\n\n` +
            `Your company's registration was suspended by our moderation team. Existing jobs and applications are preserved, but you can't publish/edit jobs or receive new applications while the suspension is active.\n` +
            (motivo ? `Reason: ${motivo}\n\n` : "\n") +
            `If you believe this was a mistake, contact support by replying to this email.`
    },

    senhaAlterada: {
        assunto: "Your password was changed — ACESSO",
        titulo: "Your password was changed",
        intro: "The password of your ACESSO account was changed successfully.",
        aviso:
            "If you didn't make this change, change your password immediately and contact ACESSO support.",
        texto:
            `Your password was changed — ACESSO\n\n` +
            `Your account password was changed successfully.\n` +
            `If you didn't make this change, change your password immediately and contact support.`
    }
};

const es = {
    htmlLang: "es",
    rodape:
        "Este es un correo automático de ACESSO, plataforma de inclusión profesional. Si no reconoces esta solicitud, simplemente ignora este mensaje.",
    ola: (nome) => (nome ? `¡Hola, ${nome}!` : "¡Hola!"),
    olaFormal: (nome) => (nome ? `Hola, ${nome}.` : "Hola."),
    motivo: "Motivo:",

    confirmacaoCadastro: {
        assunto: "Confirma tu correo electrónico — ACESSO",
        titulo: "¡Te damos la bienvenida a ACESSO!",
        introComLink:
            "Tu cuenta de ACESSO se creó con éxito. Para confirmar tu dirección de correo electrónico y habilitar el acceso, haz clic en el botón de abajo:",
        botao: "Confirmar mi correo electrónico",
        codigoAlternativo: "Si el botón no funciona, usa este código en la pantalla de confirmación:",
        validadeComLink: (min) =>
            `Este enlace/código es válido durante ${min} minutos. Si no creaste esta cuenta, ignora este correo.`,
        introSemLink:
            "Tu cuenta de ACESSO se creó con éxito. Para confirmar tu dirección de correo electrónico, usa el código de abajo en la pantalla de confirmación:",
        validadeSemLink: (min) =>
            `Este código es válido durante ${min} minutos. Si no creaste esta cuenta, ignora este correo.`,
        textoComLink: (link, codigo, min) =>
            `¡Te damos la bienvenida a ACESSO!\n\n` +
            `Tu cuenta se creó con éxito. Para confirmar tu correo electrónico, entra en:\n${link}\n\n` +
            `O usa el código ${codigo} en la pantalla de confirmación (válido durante ${min} minutos).\n\n` +
            `Si no creaste esta cuenta, ignora este correo.`,
        textoSemLink: (codigo, min) =>
            `¡Te damos la bienvenida a ACESSO!\n\n` +
            `Tu cuenta se creó con éxito. Usa el código ${codigo} en la pantalla de confirmación ` +
            `(válido durante ${min} minutos).\n\n` +
            `Si no creaste esta cuenta, ignora este correo.`
    },

    recuperacaoSenha: {
        assunto: "Restablecimiento de contraseña — ACESSO",
        titulo: "Restablecimiento de contraseña",
        intro: "Recibimos una solicitud para restablecer la contraseña de tu cuenta de ACESSO.",
        botao: "Restablecer mi contraseña",
        codigoComLink: "Si estás en la aplicación de ACESSO, usa el código de abajo en lugar del botón:",
        codigoSemLink: "Usa el código de abajo en la pantalla de restablecimiento:",
        validade: (min) =>
            `Válido durante ${min} minutos. Si no solicitaste este cambio, ignora este correo: tu contraseña sigue siendo la misma.`,
        texto: (link, codigo, min) =>
            `Restablecimiento de contraseña — ACESSO\n\n` +
            `Recibimos una solicitud para restablecer tu contraseña.\n` +
            (link ? `Entra en: ${link}\n\n` : "\n") +
            `Si estás en la aplicación de ACESSO, usa el código: ${codigo}\n\n` +
            `Válido durante ${min} minutos. Si no lo solicitaste, ignora este correo.`
    },

    trocaEmail: {
        assunto: "Confirma tu nuevo correo electrónico — ACESSO",
        titulo: "Confirma tu nuevo correo electrónico",
        intro:
            "Recibimos una solicitud para cambiar el correo electrónico de tu cuenta de ACESSO a esta dirección. Usa el código de abajo para confirmar:",
        validade: (min) =>
            `Este código es válido durante ${min} minutos. Si no solicitaste este cambio, ignora este correo: la dirección actual de tu cuenta sigue siendo la misma.`,
        texto: (codigo, min) =>
            `Confirma tu nuevo correo electrónico — ACESSO\n\n` +
            `Usa el código ${codigo} para confirmar el cambio del correo electrónico de tu cuenta.\n` +
            `Válido durante ${min} minutos. Si no lo solicitaste, ignora este correo.`
    },

    contaBloqueada: {
        assunto: "Tu cuenta fue bloqueada — ACESSO",
        titulo: "Tu cuenta fue bloqueada",
        intro: "Tu cuenta de ACESSO fue bloqueada por nuestro equipo de moderación.",
        fim: "Si crees que fue un error, ponte en contacto con el soporte de ACESSO respondiendo a este correo.",
        texto: (motivo) =>
            `Tu cuenta fue bloqueada — ACESSO\n\n` +
            `Tu cuenta de ACESSO fue bloqueada por nuestro equipo de moderación.\n` +
            (motivo ? `Motivo: ${motivo}\n\n` : "\n") +
            `Si crees que fue un error, ponte en contacto con el soporte respondiendo a este correo.`
    },

    empresaSuspensa: {
        assunto: "Tu empresa fue suspendida — ACESSO",
        titulo: "Tu empresa fue suspendida",
        intro:
            "El registro de tu empresa en ACESSO fue suspendido por nuestro equipo de moderación. Mientras la suspensión esté activa, no es posible publicar ni editar vacantes ni recibir nuevas candidaturas; las vacantes y candidaturas ya existentes se conservan.",
        fim: "Si crees que fue un error, ponte en contacto con el soporte de ACESSO respondiendo a este correo.",
        texto: (motivo) =>
            `Tu empresa fue suspendida — ACESSO\n\n` +
            `El registro de tu empresa fue suspendido por nuestro equipo de moderación. Las vacantes y candidaturas ya existentes se conservan, pero no es posible publicar ni editar vacantes ni recibir candidaturas nuevas mientras la suspensión esté activa.\n` +
            (motivo ? `Motivo: ${motivo}\n\n` : "\n") +
            `Si crees que fue un error, ponte en contacto con el soporte respondiendo a este correo.`
    },

    senhaAlterada: {
        assunto: "Tu contraseña fue cambiada — ACESSO",
        titulo: "Tu contraseña fue cambiada",
        intro: "La contraseña de tu cuenta de ACESSO se cambió con éxito.",
        aviso:
            "Si no realizaste este cambio, cambia tu contraseña de inmediato y ponte en contacto con el soporte de ACESSO.",
        texto:
            `Tu contraseña fue cambiada — ACESSO\n\n` +
            `La contraseña de tu cuenta se cambió con éxito.\n` +
            `Si no realizaste este cambio, cambia tu contraseña de inmediato y ponte en contacto con el soporte.`
    }
};

const TEXTOS = { pt, en, es };

/** Textos do e-mail no idioma pedido; idioma desconhecido cai no português. */
export const textosEmail = (idioma) => TEXTOS[idioma] ?? pt;
