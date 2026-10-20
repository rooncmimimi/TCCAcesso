/**
 * Descrições do registro de auditoria administrativa. Ficam gravadas em português (o registro é
 * imutável) e são traduzidas na leitura, para o painel mostrar o idioma de quem está olhando.
 * `{#n}` casa só dígitos. [pt, en, es]
 */
export default [
    ["{admin} removeu uma publicação de {autor}. A publicação continha: {=conteudo}.", "{admin} removed a post by {autor}. The post contained: {conteudo}.", "{admin} eliminó una publicación de {autor}. La publicación contenía: {conteudo}."],
    ["{admin} removeu um comentário de {autor} em uma publicação de {autorPostagem}.", "{admin} removed a comment by {autor} on a post by {autorPostagem}.", "{admin} eliminó un comentario de {autor} en una publicación de {autorPostagem}."],
    ["um usuário removido", "a removed user", "un usuario eliminado"],
    ["texto", "text", "texto"],
    ["nenhum conteúdo registrado", "no content recorded", "ningún contenido registrado"],
    ["{#n} imagem", "{n} image", "{n} imagen"],
    ["{#n} imagens", "{n} images", "{n} imágenes"],
    ["{#n} vídeo", "{n} video", "{n} vídeo"],
    ["{#n} vídeos", "{n} videos", "{n} vídeos"],
    ["{#n} documento", "{n} document", "{n} documento"],
    ["{#n} documentos", "{n} documents", "{n} documentos"],
    ["{#n} curtida", "{n} like", "{n} me gusta"],
    ["{#n} curtidas", "{n} likes", "{n} me gusta"],
    ["{#n} comentário", "{n} comment", "{n} comentario"],
    ["{#n} comentários", "{n} comments", "{n} comentarios"],

    ["Empresa {nome} foi aprovada.", "Company {nome} was approved.", "La empresa {nome} fue aprobada."],
    ["Empresa {nome} foi reprovada.", "Company {nome} was rejected.", "La empresa {nome} fue rechazada."],
    ["Empresa {nome} recebeu o selo de verificada.", "Company {nome} received the verified badge.", "La empresa {nome} recibió el sello de verificada."],
    ["Selo de verificada removido da empresa {nome}.", "Verified badge removed from company {nome}.", "Sello de verificada retirado de la empresa {nome}."],
    ["Empresa {nome} foi suspensa.", "Company {nome} was suspended.", "La empresa {nome} fue suspendida."],
    ["Empresa {nome} foi reativada.", "Company {nome} was reactivated.", "La empresa {nome} fue reactivada."],
    ["Empresa {nome} foi removida.", "Company {nome} was removed.", "La empresa {nome} fue eliminada."],
    ["Usuário {nome} ({email}) foi bloqueado.", "User {nome} ({email}) was blocked.", "El usuario {nome} ({email}) fue bloqueado."],
    ["Usuário {nome} ({email}) foi reativado.", "User {nome} ({email}) was reactivated.", "El usuario {nome} ({email}) fue reactivado."],
    ["Usuário {nome} ({email}) foi desativado.", "User {nome} ({email}) was deactivated.", "El usuario {nome} ({email}) fue desactivado."],
    ["Usuário {nome} ({email}) foi excluído permanentemente.", "User {nome} ({email}) was permanently deleted.", "El usuario {nome} ({email}) fue eliminado permanentemente."],
    ["Vaga \"{titulo}\" foi ocultada pela moderação.", "Job \"{titulo}\" was hidden by moderation.", "La vacante \"{titulo}\" fue ocultada por la moderación."],
    ["Vaga \"{titulo}\" voltou a ficar visível.", "Job \"{titulo}\" is visible again.", "La vacante \"{titulo}\" vuelve a ser visible."],
    ["Vaga \"{titulo}\" removida pela moderação.", "Job \"{titulo}\" removed by moderation.", "Vacante \"{titulo}\" eliminada por la moderación."],
    ["Status da vaga \"{titulo}\" alterado para {=status} pela moderação.", "Status of job \"{titulo}\" changed to {status} by moderation.", "Estado de la vacante \"{titulo}\" cambiado a {status} por la moderación."],
    ["Denúncia atribuída a {nome}.", "Report assigned to {nome}.", "Denuncia asignada a {nome}."],
    ["Denúncia marcada como {=status}.", "Report marked as {status}.", "Denuncia marcada como {status}."],
    ["Contexto de mensagem denunciada consultado.", "Reported message context viewed.", "Contexto del mensaje denunciado consultado."],

    /* Valores de enum que aparecem dentro dessas frases */
    ["aberta", "open", "abierta"],
    ["pausada", "archived", "archivada"],
    ["encerrada", "closed", "cerrada"],
    ["pendente", "pending", "pendiente"],
    ["em_analise", "under review", "en análisis"],
    ["resolvida", "resolved", "resuelta"],
    ["rejeitada", "rejected", "rechazada"],
    ["arquivada", "archived", "archivada"]
];
