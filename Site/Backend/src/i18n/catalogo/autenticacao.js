/** Login, cadastro, sessão, senha, e-mail e entrar com Google. [pt, en, es] */
export default [
    /* Login e cadastro */
    ["E-mail ou senha inválidos.", "Invalid email or password.", "Correo electrónico o contraseña no válidos."],
    ["Este e-mail já está cadastrado.", "This email is already registered.", "Este correo electrónico ya está registrado."],
    ["Este CPF já está cadastrado.", "This CPF is already registered.", "Este CPF ya está registrado."],
    ["Este CNPJ já está cadastrado.", "This CNPJ is already registered.", "Este CNPJ ya está registrado."],
    [
        "Para cadastrar uma empresa é preciso entrar com a sua conta de candidato.",
        "To register a company you need to sign in with your candidate account.",
        "Para registrar una empresa debes iniciar sesión con tu cuenta de candidato."
    ],
    [
        "Só uma conta de candidato pode cadastrar uma empresa. Entre com a sua conta pessoal.",
        "Only a candidate account can register a company. Sign in with your personal account.",
        "Solo una cuenta de candidato puede registrar una empresa. Inicia sesión con tu cuenta personal."
    ],
    [
        "Para concluir o cadastro, preencha: {=campos}.",
        "To finish your registration, fill in: {campos}.",
        "Para completar el registro, rellena: {campos}."
    ],
    ["país", "country", "país"],
    ["data de nascimento", "date of birth", "fecha de nacimiento"],
    ["cidade", "city", "ciudad"],
    ["estado", "state", "estado"],
    [
        "Perfil de candidato não encontrado.",
        "Candidate profile not found.",
        "Perfil de candidato no encontrado."
    ],
    ["Perfil de empresa não encontrado.", "Company profile not found.", "Perfil de empresa no encontrado."],

    /* Confirmação de e-mail */
    ["Código inválido ou expirado.", "Invalid or expired code.", "Código no válido o caducado."],
    [
        "Número de tentativas excedido. Solicite um novo código.",
        "Too many attempts. Request a new code.",
        "Demasiados intentos. Solicita un código nuevo."
    ],
    [
        "E-mail já confirmado. Você já pode fazer login.",
        "Email already confirmed. You can sign in now.",
        "Correo electrónico ya confirmado. Ya puedes iniciar sesión."
    ],
    [
        "E-mail confirmado com sucesso. Você já pode fazer login.",
        "Email confirmed successfully. You can sign in now.",
        "Correo electrónico confirmado con éxito. Ya puedes iniciar sesión."
    ],
    [
        "Se sua conta existir e ainda não estiver confirmada, enviaremos um novo e-mail de confirmação.",
        "If your account exists and is not confirmed yet, we will send a new confirmation email.",
        "Si tu cuenta existe y aún no está confirmada, enviaremos un nuevo correo de confirmación."
    ],
    ["E-mail confirmado", "Email confirmed", "Correo electrónico confirmado"],
    [
        "Seu e-mail foi confirmado com sucesso. Sua conta já está pronta para uso.",
        "Your email was confirmed successfully. Your account is ready to use.",
        "Tu correo electrónico fue confirmado con éxito. Tu cuenta ya está lista para usar."
    ],

    /* Senha */
    ["Senha atual incorreta.", "Current password is incorrect.", "La contraseña actual es incorrecta."],
    ["Senha alterada com sucesso.", "Password changed successfully.", "Contraseña cambiada con éxito."],
    ["Senha alterada", "Password changed", "Contraseña cambiada"],
    [
        "Sua senha foi alterada com sucesso. Se não foi você, contate o suporte imediatamente.",
        "Your password was changed successfully. If this wasn't you, contact support immediately.",
        "Tu contraseña fue cambiada con éxito. Si no fuiste tú, contacta con soporte de inmediato."
    ],
    [
        "Se encontrarmos uma conta associada a este endereço, enviaremos as instruções para recuperação.",
        "If we find an account associated with this address, we will send the recovery instructions.",
        "Si encontramos una cuenta asociada a esta dirección, enviaremos las instrucciones de recuperación."
    ],
    [
        "Senha redefinida com sucesso. Faça login novamente.",
        "Password reset successfully. Please sign in again.",
        "Contraseña restablecida con éxito. Inicia sesión de nuevo."
    ],
    [
        "Link ou código inválido ou expirado.",
        "Invalid or expired link or code.",
        "Enlace o código no válido o caducado."
    ],

    /* Conta */
    [
        "Conta pausada. Faça login novamente quando quiser voltar.",
        "Account paused. Sign in again whenever you want to come back.",
        "Cuenta pausada. Vuelve a iniciar sesión cuando quieras regresar."
    ],
    ["Conta excluída com sucesso.", "Account deleted successfully.", "Cuenta eliminada con éxito."],
    ["Este já é o seu e-mail atual.", "This is already your current email.", "Este ya es tu correo electrónico actual."],
    [
        "Enviamos um código de confirmação para o novo e-mail.",
        "We sent a confirmation code to the new email.",
        "Enviamos un código de confirmación al nuevo correo electrónico."
    ],
    ["E-mail atualizado com sucesso.", "Email updated successfully.", "Correo electrónico actualizado con éxito."],
    [
        "Seu e-mail de acesso foi alterado para {email}.",
        "Your sign-in email was changed to {email}.",
        "Tu correo electrónico de acceso fue cambiado a {email}."
    ],
    ["E-mail alterado", "Email changed", "Correo electrónico cambiado"],
    ["Idioma atualizado com sucesso.", "Language updated successfully.", "Idioma actualizado con éxito."],

    /* Sessões */
    ["Sessão inválida.", "Invalid session.", "Sesión no válida."],
    ["Sessão não encontrada.", "Session not found.", "Sesión no encontrada."],
    ["Sessão encerrada.", "Session ended.", "Sesión finalizada."],
    ["As outras sessões foram encerradas.", "The other sessions were ended.", "Las demás sesiones fueron finalizadas."],
    ["Sessão expirada. Entre novamente.", "Session expired. Please sign in again.", "Sesión caducada. Inicia sesión de nuevo."],

    /* Entrar com Google */
    [
        "A verificação com o Google expirou. Entre com o Google novamente.",
        "The Google verification expired. Sign in with Google again.",
        "La verificación con Google caducó. Inicia sesión con Google de nuevo."
    ],
    ["Verificação do Google inválida.", "Invalid Google verification.", "Verificación de Google no válida."],
    [
        "Sessão do Google expirada. Tente entrar novamente.",
        "Google session expired. Please try signing in again.",
        "La sesión de Google caducó. Intenta iniciar sesión de nuevo."
    ],
    [
        "Entrar com Google não está configurado neste ambiente.",
        "Sign in with Google is not configured in this environment.",
        "Iniciar sesión con Google no está configurado en este entorno."
    ],
    ["Tipo de conta inválido.", "Invalid account type.", "Tipo de cuenta no válido."],
    [
        "Requisição do Google sem identificação de origem.",
        "Google request without an origin identification.",
        "Solicitud de Google sin identificación de origen."
    ],
    [
        "Não foi possível validar o retorno do Google. Tente entrar novamente.",
        "We couldn't validate the Google response. Please try signing in again.",
        "No pudimos validar la respuesta de Google. Intenta iniciar sesión de nuevo."
    ],
    ["Autorização do Google ausente.", "Google authorization missing.", "Falta la autorización de Google."],
    [
        "Não foi possível concluir a autenticação com o Google. Tente novamente.",
        "We couldn't complete the Google authentication. Please try again.",
        "No pudimos completar la autenticación con Google. Inténtalo de nuevo."
    ],
    [
        "O Google não devolveu a identificação da conta.",
        "Google did not return the account identification.",
        "Google no devolvió la identificación de la cuenta."
    ],
    [
        "Resposta do Google sem identificador de conta.",
        "Google response without an account identifier.",
        "Respuesta de Google sin identificador de cuenta."
    ],
    [
        "O retorno do Google não corresponde ao pedido. Tente entrar novamente.",
        "The Google response doesn't match the request. Please try signing in again.",
        "La respuesta de Google no corresponde a la solicitud. Intenta iniciar sesión de nuevo."
    ],
    [
        "Esta conta Google já está vinculada a outro usuário.",
        "This Google account is already linked to another user.",
        "Esta cuenta de Google ya está vinculada a otro usuario."
    ],

    /* E-mail transacional */
    [
        "Envio de e-mail não está configurado neste momento.",
        "Email sending is not configured at the moment.",
        "El envío de correo electrónico no está configurado en este momento."
    ],
    [
        "Não foi possível enviar o e-mail agora. Tente novamente em alguns instantes.",
        "We couldn't send the email right now. Please try again in a few moments.",
        "No pudimos enviar el correo electrónico ahora. Inténtalo de nuevo en unos instantes."
    ]
];
