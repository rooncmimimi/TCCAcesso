/**
 * Interpretação semântica para o leitor de voz próprio do ACESSO (Fase 9,
 * Bloco J3). Camada única, usada tanto por clique quanto por navegação por
 * teclado (foco) — nunca duas lógicas separadas para a mesma interação
 * (ver `useAutoSpeech` em `SpeechContext.tsx`).
 *
 * Regra central: o leitor acompanha o que o usuário está usando (como o
 * VLibras acompanha), nunca narra a página inteira. Cada função aqui é
 * pura (sem React, sem efeitos) para ficar fácil de testar isoladamente.
 *
 * Nunca fala: id, UUID, URL, caminho de Storage, className, nome de
 * componente, atributo HTML cru — só nome acessível, função e estado.
 */

/** Controles interativos — sempre têm prioridade sobre uma imagem que porventura os envolva. */
export const SELETOR_INTERATIVO =
  "[data-speak], button, a[href], input, textarea, select, " +
  "[role='button'], [role='link'], [role='menuitem'], [role='option'], " +
  "[role='tab'], [role='checkbox'], [role='radio'], [role='switch']";

/** Elementos que fazem sentido anunciar — nunca o DOM inteiro. */
export const SELETOR_FALAVEL = `${SELETOR_INTERATIVO}, img[alt]`;

export const SELETOR_DIALOGO = '[role="dialog"], [role="alertdialog"]';

/**
 * Resolve o elemento a descrever a partir do alvo real de um clique/foco.
 * Uma imagem DENTRO de um controle interativo (ex.: `<button><img/></button>`,
 * o padrão de "Ampliar imagem") nunca é descrita isoladamente — o controle
 * é quem define a ação (item 3 do Bloco J3: nunca misturar a descrição da
 * imagem com a ação do botão que a envolve). Só cai para a imagem quando
 * ela não está dentro de nenhum controle (ex.: a imagem grande do Lightbox).
 */
export function resolverAlvoFalavel(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const interativo = target.closest<HTMLElement>(SELETOR_INTERATIVO);
  if (interativo) return interativo;
  return target.closest<HTMLElement>("img[alt]");
}

function textoVisivel(el: Element | null): string | null {
  const texto = (el as HTMLElement | null)?.innerText?.trim();
  return texto || null;
}

/**
 * Nome acessível de um elemento — mesma ordem de prioridade que um leitor
 * de tela nativo usaria (aria-labelledby > aria-label > label associado >
 * placeholder > title > texto visível). Nunca cai para `href`/`src`/`id`
 * como conteúdo falado — só usa `id` para ACHAR um `<label for>`, nunca
 * fala o id em si.
 */
function nomeAcessivel(el: HTMLElement): string | null {
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const texto = labelledBy
      .split(/\s+/)
      .map((id) => textoVisivel(document.getElementById(id)))
      .filter(Boolean)
      .join(" ");
    if (texto) return texto;
  }

  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel?.trim()) return ariaLabel.trim();

  if (el.id) {
    const rotulo = document.querySelector<HTMLElement>(`label[for="${CSS.escape(el.id)}"]`);
    const texto = textoVisivel(rotulo);
    if (texto) return texto;
  }

  const rotuloEnvolvente = el.closest("label");
  const textoRotulo = textoVisivel(rotuloEnvolvente);
  if (textoRotulo) return textoRotulo;

  const placeholder = (el as HTMLInputElement).placeholder;
  if (placeholder?.trim()) return placeholder.trim();

  const title = el.getAttribute("title");
  if (title?.trim()) return title.trim();

  return textoVisivel(el);
}

/** Palavra que descreve a FUNÇÃO do elemento — nunca o tipo técnico/HTML. */
function palavraFuncao(el: HTMLElement): string | null {
  const role = el.getAttribute("role");
  const tag = el.tagName;

  // Um role ARIA explícito e reconhecido tem prioridade sobre a inferência
  // pela tag nativa — sem isso, um `<button role="switch">` (padrão do
  // Radix, usado em todos os switches de Configurações) era anunciado como
  // "botão" em vez de "interruptor", e um `<a role="menuitem">` como "link"
  // em vez de "opção", porque a tag nativa vencia antes de o role sequer
  // ser olhado (achado da auditoria da Etapa 3). Sem role reconhecido, cai
  // para a mesma inferência por tag de sempre.
  if (role === "switch") return "interruptor";
  if (role === "menuitem") return "opção";
  if (role === "option") return "opção";
  if (role === "tab") return "aba";
  if (role === "combobox") return "seletor";
  if (role === "checkbox") return "caixa de seleção";
  if (role === "radio") return "opção";
  if (role === "button") return "botão";
  if (role === "link") return "link";

  if (tag === "BUTTON") return "botão";
  if (tag === "A" && el.hasAttribute("href")) return "link";
  if (tag === "SELECT") return "seletor";
  if (tag === "TEXTAREA") return "campo de texto";
  if (tag === "INPUT") {
    const tipo = (el as HTMLInputElement).type;
    if (tipo === "checkbox") return "caixa de seleção";
    if (tipo === "radio") return "opção";
    if (tipo === "file") return "campo de arquivo";
    if (tipo === "submit" || tipo === "button") return "botão";
    return "campo de texto";
  }
  return null;
}

/**
 * Estado relevante para o usuário — nunca detalhe técnico (classe, atributo
 * cru). `nomeJaTemAriaLabel` evita duplicar o estado marcado/ativado: alguns
 * componentes (ex.: switches de Configurações) já escrevem o próprio
 * `aria-label` incluindo o estado ("Perfil público, desativado") — quando o
 * nome veio de um `aria-label` explícito como esse, confiamos que o autor
 * já descreveu o estado por completo e não repetimos "desativado" de novo.
 * Quando o nome veio só do `<label>`/texto (sem `aria-label`), continuamos
 * completando o estado — a maioria dos switches/checkboxes do app não
 * baixa o estado no próprio rótulo.
 */
function estadoDoElemento(el: HTMLElement, nomeJaTemAriaLabel: boolean): string | null {
  const partes: string[] = [];

  const desabilitado = (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true";
  if (desabilitado) partes.push("desabilitado");

  if (el.getAttribute("aria-busy") === "true") partes.push("carregando");

  const pressionado = el.getAttribute("aria-pressed");
  if (pressionado === "true") partes.push("selecionado");

  const expandido = el.getAttribute("aria-expanded");
  if (expandido === "true") partes.push("expandido");
  else if (expandido === "false") partes.push("recolhido");

  if (!nomeJaTemAriaLabel) {
    // Interruptor (switch) fala "ativado/desativado"; caixa de seleção
    // (checkbox/radio) fala "marcado/não marcado" — o mesmo aria-checked,
    // mas a palavra certa depende do tipo de controle (antes só cobria
    // checkbox: um Switch desligado nunca dizia nada sobre o estado).
    const ehSwitch = el.getAttribute("role") === "switch";
    const marcado = el.getAttribute("aria-checked") ?? ((el as HTMLInputElement).type === "checkbox" ? String((el as HTMLInputElement).checked) : null);
    if (marcado === "true") partes.push(ehSwitch ? "ativado" : "marcado");
    else if (marcado === "false") partes.push(ehSwitch ? "desativado" : "não marcado");
  }

  if (el.getAttribute("aria-invalid") === "true") partes.push("com erro");

  return partes.length ? partes.join(", ") : null;
}

/**
 * Texto de `aria-describedby` — mensagem de erro ou dica auxiliar que o
 * próprio componente já associou ao campo (item 9 do Bloco J4: "E-mail,
 * campo de texto. Erro: informe um endereço de e-mail válido."). Prefixa
 * "Erro:" só quando o campo está `aria-invalid`, senão fala a dica como
 * está (ex.: contador de caracteres, instrução de formato de senha).
 */
function descricaoAssociada(el: HTMLElement): string | null {
  const describedBy = el.getAttribute("aria-describedby");
  if (!describedBy) return null;

  const texto = describedBy
    .split(/\s+/)
    .map((id) => textoVisivel(document.getElementById(id)))
    .filter(Boolean)
    .join(" ");

  if (!texto) return null;

  return el.getAttribute("aria-invalid") === "true" ? `Erro: ${texto}` : texto;
}

/**
 * Imagem: sempre "Imagem: <descrição>." (prefixo, nunca misturado com a
 * ação de um botão que porventura a envolva — ver `descreverElemento`,
 * que resolve `data-speak`/função ANTES de cair aqui). `alt=""` (decorativa)
 * ou ausente nunca fala nada, mesmo comportamento de `aria-hidden`.
 */
function descreverImagem(el: HTMLImageElement): string | null {
  const alt = el.getAttribute("alt");
  if (!alt || !alt.trim()) return null;
  return `Imagem: ${alt.trim()}.`;
}

/**
 * Descrição acessível de UM elemento — usada por clique e por foco, nunca
 * duas lógicas diferentes (Fase J, item 8). `data-speak` sempre vence: é o
 * único jeito de um card composto (vaga, aviso) falar uma frase pronta sem
 * duplicar o que um leitor de tela nativo já lê nos parágrafos abaixo dele.
 */
export function descreverElemento(el: HTMLElement): string | null {
  if (el.dataset.speak) return el.dataset.speak;

  if (el.tagName === "IMG") return descreverImagem(el as HTMLImageElement);

  const nome = nomeAcessivel(el);
  if (!nome) return null;

  // Alguns `aria-label` já existentes na base terminam com ponto próprio —
  // sem isso, viraria "..., link." com dois pontos seguidos.
  const nomeLimpo = nome.replace(/\.+$/, "");

  const funcao = palavraFuncao(el);
  const estado = estadoDoElemento(el, Boolean(el.getAttribute("aria-label")?.trim()));

  const frase = `${[nomeLimpo, funcao, estado].filter(Boolean).join(", ")}.`;

  // Descrição associada (erro/dica) vem numa frase separada, depois do
  // nome+função+estado — nunca misturada na mesma cláusula (item 6:
  // nome → função → estado → descrição → contexto).
  const descricao = descricaoAssociada(el);
  return descricao ? `${frase} ${descricao}` : frase;
}

/**
 * Contexto principal de um diálogo recém-aberto — título (`aria-labelledby`)
 * + descrição (`aria-describedby`), os dois que o Radix já liga
 * automaticamente a `DialogTitle`/`DialogDescription`. `null` quando o
 * diálogo não declara nenhum dos dois (não força uma frase genérica).
 */
export function obterContextoDialogo(dialogo: HTMLElement): string | null {
  const labelledBy = dialogo.getAttribute("aria-labelledby");
  const describedBy = dialogo.getAttribute("aria-describedby");
  const titulo = labelledBy ? textoVisivel(document.getElementById(labelledBy)) : null;
  const descricao = describedBy ? textoVisivel(document.getElementById(describedBy)) : null;
  const texto = [titulo, descricao].filter(Boolean).join(". ");
  return texto || null;
}
