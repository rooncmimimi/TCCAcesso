/**
 * Comandos de voz em inglês e espanhol.
 *
 * O interpretador conhece uma lista fechada de frases em português. Em vez de repetir as regras (e as
 * travas contra ações destrutivas) em três idiomas, a fala é convertida para a frase equivalente em
 * português ANTES de ser interpretada. O que não estiver na lista passa como veio e cai em "não entendi".
 *
 * Recebe a fala já normalizada: minúsculas, sem acento e sem pontuação. As frases em português deste
 * arquivo são o VOCABULÁRIO do interpretador, não texto de tela: nunca passam pela tradução.
 */
import type { CodigoIdioma } from "@/i18n/idiomas";

type Troca = readonly [RegExp, string];

/** Em ordem: as frases mais longas antes das palavras soltas que elas contêm. */
const TROCAS: Record<Exclude<CodigoIdioma, "pt">, readonly Troca[]> = {
  en: [
    [/\b(log out|sign out)\b/g, "sair da conta"],
    [/\b(delete|erase|remove)\b/g, "excluir"],
    [/\b(send|submit)\b/g, "enviar"],
    [/\b(publish|post it)\b/g, "publicar"],
    [/\b(stop reading|stop read|be quiet|silence)\b/g, "parar leitura"],
    [/\b(show |view )?(keyboard )?shortcuts\b/g, "mostrar atalhos"],
    [/\b(next page|next)\b/g, "proxima pagina"],
    [/\b(go back|previous page|back)\b/g, "voltar"],
    [/\b(turn on|enable|activate|use) (the )?reading mode\b/g, "ativar modo leitura"],
    [/\b(turn off|disable|deactivate|exit) (the )?reading mode\b/g, "desativar modo leitura"],
    [/\b(turn on|enable|activate|use) (the )?focus mode\b/g, "ativar modo foco"],
    [/\b(turn off|disable|deactivate|exit) (the )?focus mode\b/g, "desativar modo foco"],
    [/\b(apply for (this )?job|apply to (this )?job|i want to apply|apply)\b/g, "quero me candidatar"],
    [/\b(search|look|find)( for)? (jobs?|openings?)( (for|in|as))?\b/g, "pesquisar vagas de"],
    [/\b(search|find)( for)?\b/g, "pesquisar"],
    [/\baccessibility settings\b/g, "configuracoes de acessibilidade"],
    [/\bmy accessibility\b/g, "minha acessibilidade"],
    [/\b(settings|preferences)\b/g, "configuracoes"],
    [/\b(messages|chats)\b/g, "mensagens"],
    [/\bnotifications\b/g, "notificacoes"],
    [/\b(my )?profile\b/g, "perfil"],
    [/\b(home|feed|posts)\b/g, "inicio"],
    [/\b(goals|what i want to do)\b/g, "objetivos"],
    [/\b(job dictionary|professions|dictionary)\b/g, "profissoes"],
    [/\b(communication( center| cards)?|cards|ready phrases)\b/g, "comunicacao"],
    [/\b(jobs|job openings|openings)\b/g, "vagas"],
    [/\b(help center|help|tutorials?)\b/g, "ajuda"],
    [/^(go to|open|show me|show|take me to|i want to see|view)\b/g, "ir para"],
    [/\bthe\b ?/g, ""],
  ],
  es: [
    [/\b(cerrar sesion|salir de la cuenta)\b/g, "sair da conta"],
    [/\b(eliminar|elimina|borrar|borra|quitar|quita)\b/g, "excluir"],
    [/\b(enviar|envia|manda|mandar)\b/g, "enviar"],
    [/\b(publicar|publica)( la| el)?\b/g, "publicar"],
    [/\b(detener|deten|parar|para)( la)? lectura\b|\bsilencio\b|\bcallate\b/g, "parar leitura"],
    [/\b(mostrar |ver )?atajos\b/g, "mostrar atalhos"],
    [/\b(pagina siguiente|siguiente pagina|siguiente)\b/g, "proxima pagina"],
    [/\b(volver|vuelve|atras|pagina anterior)\b/g, "voltar"],
    [/\b(activar|activa|usar) (el )?modo (de )?lectura\b/g, "ativar modo leitura"],
    [/\b(desactivar|desactiva|salir del?) (el )?modo (de )?lectura\b/g, "desativar modo leitura"],
    [/\b(activar|activa|usar) (el )?modo (de )?(foco|concentracion)\b/g, "ativar modo foco"],
    [/\b(desactivar|desactiva|salir del?) (el )?modo (de )?(foco|concentracion)\b/g, "desativar modo foco"],
    [/\b(quiero postularme|postularme|postular|quiero aplicar)\b/g, "quero me candidatar"],
    [/\b(buscar|busca) (empleos?|vacantes?|trabajos?)( (de|para|en|como))?\b/g, "pesquisar vagas de"],
    [/\bbusca\b/g, "buscar"],
    [/\b(configuracion|ajustes|preferencias) de accesibilidad\b/g, "configuracoes de acessibilidade"],
    [/\bmi accesibilidad\b/g, "minha acessibilidade"],
    [/\b(configuracion|ajustes)\b/g, "configuracoes"],
    [/\b(mensajes|conversaciones)\b/g, "mensagens"],
    [/\bnotificaciones\b/g, "notificacoes"],
    [/\b(mi )?perfil\b/g, "perfil"],
    [/\b(inicio|publicaciones)\b/g, "inicio"],
    [/\b(objetivos|lo que quiero hacer)\b/g, "objetivos"],
    [/\b(diccionario( de profesiones)?|profesiones)\b/g, "profissoes"],
    [/\b(comunicacion|tarjetas|frases listas)\b/g, "comunicacao"],
    [/\b(empleos|vacantes|trabajos|ofertas)\b/g, "vagas"],
    [/\b(centro de ayuda|ayuda|tutoriales?)\b/g, "ajuda"],
    [/^(ir a|ve a|abrir|abre|mostrar|muestra|llevame a|quiero ver|ver)\b/g, "ir para"],
    [/\b(el|la|los|las) /g, ""],
  ],
};

export function falaEmPortugues(fala: string, idioma: CodigoIdioma): string {
  if (idioma === "pt") return fala;
  return TROCAS[idioma].reduce((texto, [de, para]) => texto.replace(de, para), fala).replace(/\s+/g, " ").trim();
}
