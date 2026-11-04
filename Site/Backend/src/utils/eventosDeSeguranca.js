/**
 * Os tipos de evento do histórico de segurança e o texto que a pessoa lê para cada um. O banco guarda só o `tipo`; o texto
 * mora aqui, para poder melhorar a redação sem migration. Um tipo desconhecido (de uma versão futura) aparece como texto
 * genérico, nunca quebra a tela.
 */
export const EVENTOS_DE_SEGURANCA = {
    dispositivo_novo_confirmado: "Você confirmou um dispositivo novo com o código enviado por e-mail.",
    dispositivo_confiavel_adicionado: "Você marcou um dispositivo como de confiança.",
    dispositivo_confiavel_revogado: "Você removeu a confiança de um dispositivo.",
    dispositivos_confiaveis_revogados: "Você removeu a confiança de todos os dispositivos.",
    conta_protegida_por_link: "A conta foi protegida por um link de segurança: sessões encerradas e confiança nos dispositivos removida.",
    conta_protegida_agora: "Você protegeu a conta: as outras sessões foram encerradas e a confiança nos dispositivos foi removida.",
    link_de_seguranca_enviado: "Foi pedido um link de segurança para esta conta.",
    sessoes_encerradas: "Você encerrou as outras sessões.",
    senha_alterada: "A senha foi alterada."
};

export function descreverEvento(tipo) {
    return EVENTOS_DE_SEGURANCA[tipo] ?? "Evento de segurança registrado.";
}
