/** Erros genéricos do servidor, limites de requisição, upload e acesso. [pt, en, es] */
export default [
    ["Erro interno do servidor.", "Internal server error.", "Error interno del servidor."],
    ["Rota não encontrada.", "Route not found.", "Ruta no encontrada."],
    ["Recurso não encontrado.", "Resource not found.", "Recurso no encontrado."],
    ["Não autenticado.", "Not authenticated.", "No autenticado."],
    ["Acesso negado.", "Access denied.", "Acceso denegado."],
    [
        "Serviço temporariamente indisponível.",
        "Service temporarily unavailable.",
        "Servicio temporalmente no disponible."
    ],
    ["Erro de validação.", "Validation error.", "Error de validación."],
    ["Registro duplicado.", "Duplicate record.", "Registro duplicado."],
    ["Este valor já está em uso.", "This value is already in use.", "Este valor ya está en uso."],
    [
        "Operação viola a integridade referencial.",
        "This operation violates referential integrity.",
        "Esta operación viola la integridad referencial."
    ],
    [
        "Erro ao consultar o banco de dados.",
        "Error while querying the database.",
        "Error al consultar la base de datos."
    ],
    [
        "Arquivo excede o tamanho máximo permitido.",
        "The file exceeds the maximum allowed size.",
        "El archivo supera el tamaño máximo permitido."
    ],
    ["Falha no upload do arquivo.", "File upload failed.", "Error al subir el archivo."],
    ["Valor inválido.", "Invalid value.", "Valor no válido."],

    /* Autenticação por token */
    ["Token não informado.", "Token not provided.", "Token no proporcionado."],
    ["Token inválido ou expirado.", "Invalid or expired token.", "Token no válido o caducado."],
    ["Usuário não autenticado.", "User not authenticated.", "Usuario no autenticado."],
    ["Usuário não encontrado.", "User not found.", "Usuario no encontrado."],
    ["Usuário desativado.", "User deactivated.", "Usuario desactivado."],
    [
        "Sua senha foi alterada. Entre novamente.",
        "Your password was changed. Please sign in again.",
        "Tu contraseña fue cambiada. Inicia sesión de nuevo."
    ],
    [
        "Você não possui permissão para esta ação.",
        "You do not have permission to perform this action.",
        "No tienes permiso para realizar esta acción."
    ],
    [
        "Você não possui permissão sobre este recurso.",
        "You do not have permission over this resource.",
        "No tienes permiso sobre este recurso."
    ],
    [
        "Você não possui permissão sobre este registro.",
        "You do not have permission over this record.",
        "No tienes permiso sobre este registro."
    ],
    ["Falha na autenticação do socket.", "Socket authentication failed.", "Error de autenticación del socket."],
    ["Conversa não disponível.", "Conversation not available.", "Conversación no disponible."],

    /* Bloqueio e suspensão pela moderação */
    [
        "Sua conta foi bloqueada pela moderação do ACESSO.",
        "Your account was blocked by ACESSO moderation.",
        "Tu cuenta fue bloqueada por la moderación de ACESSO."
    ],
    [
        "Sua conta foi bloqueada pela moderação do ACESSO. Motivo: {motivo}",
        "Your account was blocked by ACESSO moderation. Reason: {motivo}",
        "Tu cuenta fue bloqueada por la moderación de ACESSO. Motivo: {motivo}"
    ],
    [
        "Conta bloqueada pela moderação.",
        "Account blocked by moderation.",
        "Cuenta bloqueada por la moderación."
    ],
    ["Conta bloqueada: {motivo}", "Account blocked: {motivo}", "Cuenta bloqueada: {motivo}"],
    ["Conta indisponível.", "Account unavailable.", "Cuenta no disponible."],
    [
        "Sua empresa está suspensa pela moderação do ACESSO.",
        "Your company is suspended by ACESSO moderation.",
        "Tu empresa está suspendida por la moderación de ACESSO."
    ],
    [
        "Sua empresa está suspensa pela moderação do ACESSO. Motivo: {motivo}",
        "Your company is suspended by ACESSO moderation. Reason: {motivo}",
        "Tu empresa está suspendida por la moderación de ACESSO. Motivo: {motivo}"
    ],
    [
        "Seu cadastro empresarial não foi aprovado pela equipe do ACESSO.",
        "Your company registration was not approved by the ACESSO team.",
        "El registro de tu empresa no fue aprobado por el equipo de ACESSO."
    ],
    [
        "Seu cadastro empresarial não foi aprovado. Motivo: {motivo}",
        "Your company registration was not approved. Reason: {motivo}",
        "El registro de tu empresa no fue aprobado. Motivo: {motivo}"
    ],
    [
        "Sua empresa está aguardando aprovação da equipe do ACESSO. Você receberá uma notificação quando a análise for concluída.",
        "Your company is awaiting approval by the ACESSO team. You will be notified when the review is complete.",
        "Tu empresa está esperando la aprobación del equipo de ACESSO. Recibirás una notificación cuando termine el análisis."
    ],
    ["não informado", "not provided", "no informado"],

    /* Limites de requisição */
    [
        "Muitas requisições. Tente novamente em alguns minutos.",
        "Too many requests. Please try again in a few minutes.",
        "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos."
    ],
    [
        "Muitas tentativas de autenticação. Tente novamente mais tarde.",
        "Too many authentication attempts. Please try again later.",
        "Demasiados intentos de autenticación. Inténtalo de nuevo más tarde."
    ],
    [
        "Muitas tentativas de renovação de sessão. Tente novamente mais tarde.",
        "Too many session renewal attempts. Please try again later.",
        "Demasiados intentos de renovación de sesión. Inténtalo de nuevo más tarde."
    ],
    [
        "Você atingiu o limite de denúncias por hora. Tente novamente mais tarde.",
        "You have reached the hourly limit of reports. Please try again later.",
        "Has alcanzado el límite de denuncias por hora. Inténtalo de nuevo más tarde."
    ],
    [
        "Muitas solicitações de reenvio. Tente novamente mais tarde.",
        "Too many resend requests. Please try again later.",
        "Demasiadas solicitudes de reenvío. Inténtalo de nuevo más tarde."
    ],
    [
        "Você atingiu o limite de sugestões de descrição por hora. Tente novamente mais tarde ou escreva a descrição manualmente.",
        "You have reached the hourly limit of description suggestions. Try again later or write the description yourself.",
        "Has alcanzado el límite de sugerencias de descripción por hora. Inténtalo más tarde o escribe la descripción manualmente."
    ],

    /* Arquivos enviados */
    [
        "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP.",
        "Invalid format. Upload a PNG, JPEG or WEBP image.",
        "Formato no válido. Sube una imagen PNG, JPEG o WEBP."
    ],
    [
        "Formato inválido. Envie um arquivo PDF, DOC ou DOCX.",
        "Invalid format. Upload a PDF, DOC or DOCX file.",
        "Formato no válido. Sube un archivo PDF, DOC o DOCX."
    ],
    [
        "Formato inválido. Envie imagens (PNG, JPEG, WEBP) ou vídeos (MP4, WEBM).",
        "Invalid format. Upload images (PNG, JPEG, WEBP) or videos (MP4, WEBM).",
        "Formato no válido. Sube imágenes (PNG, JPEG, WEBP) o vídeos (MP4, WEBM)."
    ],
    [
        "O conteúdo do arquivo não corresponde a um arquivo válido do formato declarado.",
        "The file contents do not match a valid file of the declared format.",
        "El contenido del archivo no corresponde a un archivo válido del formato declarado."
    ],
    [
        "Arquivo muito grande. Limite de {limite}MB para este tipo.",
        "File too large. The limit is {limite}MB for this type.",
        "Archivo demasiado grande. El límite es de {limite}MB para este tipo."
    ],
    [
        "Não foi possível enviar o arquivo agora. Tente novamente em alguns instantes.",
        "We couldn't upload the file right now. Please try again in a few moments.",
        "No pudimos subir el archivo ahora. Inténtalo de nuevo en unos instantes."
    ],
    ["Envie um arquivo PDF ou DOCX.", "Upload a PDF or DOCX file.", "Sube un archivo PDF o DOCX."],
    [
        "Envie uma imagem para gerar a sugestão.",
        "Upload an image to generate the suggestion.",
        "Sube una imagen para generar la sugerencia."
    ],
    [
        "Não foi possível gerar acesso a este arquivo.",
        "We couldn't generate access to this file.",
        "No pudimos generar acceso a este archivo."
    ],
    [
        "Não foi possível extrair texto deste PDF — ele pode ser uma imagem escaneada. Envie um PDF com texto selecionável ou um DOCX.",
        "We couldn't extract text from this PDF — it may be a scanned image. Upload a PDF with selectable text or a DOCX.",
        "No pudimos extraer texto de este PDF — puede ser una imagen escaneada. Sube un PDF con texto seleccionable o un DOCX."
    ],
    [
        "Não foi possível extrair texto deste arquivo DOCX.",
        "We couldn't extract text from this DOCX file.",
        "No pudimos extraer texto de este archivo DOCX."
    ],
    [
        "Extração automática só é suportada para PDF e DOCX. Arquivos .doc (formato antigo do Word) não são suportados — salve como .docx ou PDF e envie novamente.",
        "Automatic extraction only supports PDF and DOCX. .doc files (old Word format) are not supported — save as .docx or PDF and upload again.",
        "La extracción automática solo admite PDF y DOCX. Los archivos .doc (formato antiguo de Word) no son compatibles: guárdalo como .docx o PDF y súbelo de nuevo."
    ],
    [
        "Extração automática por palavras-chave, sem inteligência artificial — revise e complete cada campo antes de salvar.",
        "Automatic keyword-based extraction, without artificial intelligence — review and complete each field before saving.",
        "Extracción automática por palabras clave, sin inteligencia artificial: revisa y completa cada campo antes de guardar."
    ],
    [
        "Não foi possível concluir o cadastro agora. Tente novamente.",
        "We couldn't complete your registration right now. Please try again.",
        "No pudimos completar el registro ahora. Inténtalo de nuevo."
    ],
    ["Identificador inválido.", "Invalid identifier.", "Identificador no válido."],
    ["Refresh token não informado.", "Refresh token not provided.", "Refresh token no proporcionado."]
];
