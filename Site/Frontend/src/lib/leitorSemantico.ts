/**
 * Interpretação semântica para o leitor de voz próprio do ACESSO. É a mesma camada para clique e
 * para foco de teclado (ver `hooks/useLeituraAutomatica.ts`), sem duas lógicas para a mesma
 * interação.
 *
 * Regra central: o leitor acompanha o que a pessoa está usando, como o VLibras, e nunca narra a
 * página inteira. As funções são puras (sem React nem efeitos), para serem testadas isoladamente.
 * Nunca falam id, UUID, URL, caminho de Storage, className, nome de componente ou atributo HTML
 * cru: só nome acessível, função e estado.
 */

import { vocabularioPara, type Vocabulario } from "@/lib/vocabularioDeLeitura";

/** Controles interativos: sempre têm prioridade sobre uma imagem que porventura os envolva. */
export const SELETOR_INTERATIVO =
  "[data-speak], button, a[href], input, textarea, select, " +
  "[role='button'], [role='link'], [role='menuitem'], [role='option'], " +
  "[role='tab'], [role='checkbox'], [role='radio'], [role='switch']";

/** Elementos que fazem sentido anunciar, nunca o DOM inteiro. */
export const SELETOR_FALAVEL = `${SELETOR_INTERATIVO}, img[alt]`;

export const SELETOR_DIALOGO = '[role="dialog"], [role="alertdialog"]';

/**
 * Resolve o elemento a descrever a partir do alvo de um clique ou foco. Uma imagem dentro de um
 * controle (como `<button><img/></button>`, o padrão de "Ampliar imagem") nunca é descrita sozinha:
 * o controle define a ação, e a descrição da imagem não se mistura com ela. A imagem só é usada
 * quando não está dentro de nenhum controle (como a imagem grande do lightbox).
 */
export function resolverAlvoFalavel(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const interativo = target.closest<HTMLElement>(SELETOR_INTERATIVO);
  if (interativo) return interativo;
  return target.closest<HTMLElement>("img[alt]");
}

function textoVisivel(el: Element | null): string | null {
  if (!el) return null;
  // Navegador de verdade sempre tem `innerText`; o `textContent` é a reserva de ambientes sem
  // layout (jsdom), onde `innerText` não existe.
  const bruto = (el as HTMLElement).innerText ?? el.textContent;
  const texto = bruto?.trim();
  return texto || null;
}

/**
 * Nome acessível de um elemento: mesma ordem de prioridade que um leitor
 * de tela nativo usaria (aria-labelledby > aria-label > label associado >
 * placeholder > title > texto visível). Nunca cai para `href`/`src`/`id`
 * como conteúdo falado: só usa `id` para achar um `<label for>`, nunca
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

/** Palavra que descreve a função do elemento, nunca o tipo técnico/HTML. */
function palavraFuncao(el: HTMLElement, v: Vocabulario): string | null {
  const role = el.getAttribute("role");
  const tag = el.tagName;

  // Um role ARIA explícito e reconhecido vence a inferência pela tag. Sem isso, um
  // `<button role="switch">` (padrão do Radix, usado nos switches de Configurações) seria anunciado
  // como "botão", e um `<a role="menuitem">` como "link". Sem role reconhecido, vale a inferência
  // pela tag.
  if (role === "switch") return v.funcao.switch;
  if (role === "menuitem") return v.funcao.opcao;
  if (role === "option") return v.funcao.opcao;
  if (role === "tab") return v.funcao.aba;
  if (role === "combobox") return v.funcao.seletor;
  if (role === "checkbox") return v.funcao.caixaDeSelecao;
  if (role === "radio") return v.funcao.opcao;
  if (role === "button") return v.funcao.botao;
  if (role === "link") return v.funcao.link;

  if (tag === "BUTTON") return v.funcao.botao;
  if (tag === "A" && el.hasAttribute("href")) return v.funcao.link;
  if (tag === "SELECT") return v.funcao.seletor;
  if (tag === "TEXTAREA") return v.funcao.campoDeTexto;
  if (tag === "INPUT") {
    const tipo = (el as HTMLInputElement).type;
    if (tipo === "checkbox") return v.funcao.caixaDeSelecao;
    if (tipo === "radio") return v.funcao.opcao;
    if (tipo === "file") return v.funcao.campoDeArquivo;
    if (tipo === "submit" || tipo === "button") return v.funcao.botao;
    return v.funcao.campoDeTexto;
  }
  return null;
}

/**
 * Estado relevante para o usuário, nunca detalhe técnico (classe, atributo
 * cru). `nomeJaTemAriaLabel` evita duplicar o estado marcado/ativado: alguns
 * componentes (ex.: switches de Configurações) já escrevem o próprio
 * `aria-label` incluindo o estado ("Perfil público, desativado"); quando o
 * nome veio de um `aria-label` explícito como esse, confiamos que o autor
 * já descreveu o estado por completo e não repetimos "desativado" de novo.
 * Quando o nome veio só do `<label>`/texto (sem `aria-label`), continuamos
 * completando o estado: a maioria dos switches/checkboxes do app não
 * baixa o estado no próprio rótulo.
 */
function estadoDoElemento(el: HTMLElement, nomeJaTemAriaLabel: boolean, v: Vocabulario): string | null {
  const partes: string[] = [];

  const desabilitado = (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true";
  if (desabilitado) partes.push(v.estado.desabilitado);

  if (el.getAttribute("aria-busy") === "true") partes.push(v.estado.carregando);

  const pressionado = el.getAttribute("aria-pressed");
  if (pressionado === "true") partes.push(v.estado.selecionado);

  const expandido = el.getAttribute("aria-expanded");
  if (expandido === "true") partes.push(v.estado.expandido);
  else if (expandido === "false") partes.push(v.estado.recolhido);

  if (!nomeJaTemAriaLabel) {
    // Switch fala "ativado/desativado"; checkbox e radio falam "marcado/não marcado". O
    // `aria-checked` é o mesmo, mas a palavra depende do tipo de controle.
    const ehSwitch = el.getAttribute("role") === "switch";
    const marcado = el.getAttribute("aria-checked") ?? ((el as HTMLInputElement).type === "checkbox" ? String((el as HTMLInputElement).checked) : null);
    if (marcado === "true") partes.push(ehSwitch ? v.estado.ativado : v.estado.marcado);
    else if (marcado === "false") partes.push(ehSwitch ? v.estado.desativado : v.estado.naoMarcado);
  }

  if (el.getAttribute("aria-invalid") === "true") partes.push(v.estado.comErro);

  return partes.length ? partes.join(", ") : null;
}

/**
 * Texto de `aria-describedby`: a mensagem de erro ou a dica que o componente já associou ao campo
 * (por exemplo, "E-mail, campo de texto. Erro: informe um endereço de e-mail válido."). Prefixa
 * "Erro:" só quando o campo está `aria-invalid`; senão, fala a dica como está (contador de
 * caracteres, instrução de formato de senha).
 */
function descricaoAssociada(el: HTMLElement, v: Vocabulario): string | null {
  const describedBy = el.getAttribute("aria-describedby");
  if (!describedBy) return null;

  const texto = describedBy
    .split(/\s+/)
    .map((id) => textoVisivel(document.getElementById(id)))
    .filter(Boolean)
    .join(" ");

  if (!texto) return null;

  return el.getAttribute("aria-invalid") === "true" ? `${v.erro}: ${texto}` : texto;
}

/**
 * Imagem: sempre "Imagem: <descrição>.", como prefixo, nunca misturado com a ação de um botão que a
 * envolva (`descreverElemento` resolve `data-speak` e a função do controle antes de chegar aqui).
 * `alt=""` (decorativa) ou ausente não fala nada, como `aria-hidden`.
 */
function descreverImagem(el: HTMLImageElement): string | null {
  const alt = el.getAttribute("alt");
  if (!alt || !alt.trim()) return null;
  return `${vocabularioPara(alt, undefined, el).imagem}: ${alt.trim()}.`;
}

/**
 * Descrição acessível de um elemento, a mesma para clique e para foco. `data-speak` sempre vence: é
 * o jeito de um card composto (vaga, aviso) falar uma frase pronta sem repetir o que um leitor de
 * tela nativo já lê nos parágrafos dele.
 */
export function descreverElemento(el: HTMLElement): string | null {
  if (el.dataset.speak) return el.dataset.speak;

  if (el.tagName === "IMG") return descreverImagem(el as HTMLImageElement);

  const nome = nomeAcessivel(el);
  if (!nome) return null;

  // Alguns `aria-label` já existentes na base terminam com ponto próprio:
  // sem isso, viraria "..., link." com dois pontos seguidos.
  const nomeLimpo = nome.replace(/\.+$/, "");

  // A frase fica toda no idioma do nome do controle (a tela pode estar só em parte traduzida).
  const vocabulario = vocabularioPara(nomeLimpo, undefined, el);
  const funcao = palavraFuncao(el, vocabulario);
  const estado = estadoDoElemento(el, Boolean(el.getAttribute("aria-label")?.trim()), vocabulario);

  const frase = `${[nomeLimpo, funcao, estado].filter(Boolean).join(", ")}.`;

  // A descrição associada (erro ou dica) vem numa frase separada, na ordem: nome, função, estado,
  // descrição, contexto.
  const descricao = descricaoAssociada(el, vocabulario);
  return descricao ? `${frase} ${descricao}` : frase;
}

/**
 * Contexto principal de um diálogo recém-aberto: título (`aria-labelledby`)
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
