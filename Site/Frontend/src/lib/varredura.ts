/**
 * Varredura com um botão (alternativa dentro da página, complementar à varredura do Windows, do
 * Android e de dispositivos assistivos): descobre quais controles da tela podem ser percorridos e
 * os organiza em grupos. Aqui fica só a leitura da página; o movimento (avançar, voltar, entrar em
 * grupo) está em `motorDeVarredura.ts`, e o relógio e as teclas em `hooks/useVarredura.ts`.
 *
 * O que entra na varredura: botões, links com destino, campos, seletores, caixas de seleção,
 * opções e outros controles com papel interativo. O que NÃO entra: elementos decorativos (sem
 * nome), escondidos, desligados, fora do alcance de leitores de tela (`aria-hidden`, `inert`) e o
 * painel da própria varredura (`data-varredura-ignorar`).
 */

export type Item = {
  elemento: HTMLElement;
  /** Texto curto que descreve o item ("Botão: Entrar", "Grupo: Menu de navegação, 4 controles"). */
  rotulo: string;
  /** Presente só em grupos: os controles dentro dele. */
  filhos?: Item[];
};

const PAPEIS_INTERATIVOS = ["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "combobox", "textbox", "searchbox", "slider", "spinbutton", "treeitem"];

export const SELETOR_DE_CONTROLES = [
  "a[href]",
  "button",
  'input:not([type="hidden"])',
  "select",
  "textarea",
  "summary",
  '[contenteditable="true"]',
  ...PAPEIS_INTERATIVOS.map((p) => `[role="${p}"]`),
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Elementos que formam um grupo de controles na tela. */
const SELETOR_DE_GRUPO = 'dialog, [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="toolbar"], [role="tablist"], [role="radiogroup"], [role="group"], header, nav, footer, aside, form, fieldset, section, article, table';

const NOME_DE_GRUPO: Record<string, string> = {
  HEADER: "Cabeçalho",
  NAV: "Menu de navegação",
  FOOTER: "Rodapé",
  ASIDE: "Barra lateral",
  FORM: "Formulário",
  FIELDSET: "Conjunto de campos",
  TABLE: "Tabela",
  DIALOG: "Janela",
  SECTION: "Seção",
  ARTICLE: "Bloco",
};

const NOME_DE_PAPEL_DE_GRUPO: Record<string, string> = {
  dialog: "Janela",
  alertdialog: "Aviso",
  menu: "Menu",
  listbox: "Lista de opções",
  toolbar: "Barra de ferramentas",
  tablist: "Abas",
  radiogroup: "Opções",
  group: "Grupo",
};

const limpar = (texto: string | null | undefined) => (texto ?? "").replace(/\s+/g, " ").trim();

/** O elemento (ou algum ancestral) está fora do alcance de quem usa o site? */
function estaEscondido(el: HTMLElement): boolean {
  for (let atual: HTMLElement | null = el; atual; atual = atual.parentElement) {
    if (atual.hidden || atual.getAttribute("aria-hidden") === "true" || atual.hasAttribute("inert")) return true;

    const estilo = getComputedStyle(atual);

    if (estilo.display === "none" || estilo.visibility === "hidden") return true;

    // "Só para leitor de tela" (sr-only): recortado a nada. Quem enxerga não vê, então a varredura não deve destacar.
    if (estilo.clip.replace(/[\s,]|px/g, "") === "rect(0000)" || estilo.clipPath.replace(/\s/g, "") === "inset(50%)") return true;
  }

  return false;
}

/** Nome acessível aproximado do controle: o que uma pessoa leria ou ouviria para identificá-lo. */
export function nomeDoControle(el: HTMLElement): string {
  const aria = limpar(el.getAttribute("aria-label"));

  if (aria) return aria;

  const ids = el.getAttribute("aria-labelledby");

  if (ids) {
    const texto = ids
      .split(/\s+/)
      .map((id) => limpar(el.ownerDocument.getElementById(id)?.textContent))
      .filter(Boolean)
      .join(" ");

    if (texto) return texto;
  }

  const rotulos = (el as HTMLInputElement).labels;

  if (rotulos && rotulos.length > 0) {
    const texto = limpar(Array.from(rotulos).map((l) => l.textContent).join(" "));

    if (texto) return texto;
  }

  const conteudo = limpar(el.textContent);

  if (conteudo) return conteudo;

  const imagem = el.querySelector("img[alt]");
  const alt = limpar(imagem?.getAttribute("alt"));

  if (alt) return alt;

  return limpar(el.getAttribute("title")) || limpar(el.getAttribute("placeholder")) || (el instanceof HTMLInputElement && ["button", "submit", "reset"].includes(el.type) ? limpar(el.value) : "");
}

/** "Botão", "Link", "Campo de texto"... para dizer o que o controle é. */
export function tipoDoControle(el: HTMLElement): string {
  const papel = el.getAttribute("role");
  const marca = el.tagName;

  if (papel === "checkbox" || (marca === "INPUT" && (el as HTMLInputElement).type === "checkbox")) return "Caixa de seleção";
  if (papel === "radio" || (marca === "INPUT" && (el as HTMLInputElement).type === "radio")) return "Opção";
  if (papel === "switch") return "Interruptor";
  if (papel === "tab") return "Aba";
  if (papel === "option" || papel === "menuitem" || papel === "menuitemcheckbox" || papel === "menuitemradio") return "Opção";
  if (papel === "combobox" || marca === "SELECT") return "Lista de escolha";
  if (papel === "slider" || (marca === "INPUT" && (el as HTMLInputElement).type === "range")) return "Controle deslizante";
  if (marca === "TEXTAREA" || papel === "textbox" || papel === "searchbox" || el.getAttribute("contenteditable") === "true") return "Campo de texto";
  if (marca === "INPUT") {
    const tipo = (el as HTMLInputElement).type;

    if (["button", "submit", "reset", "image"].includes(tipo)) return "Botão";
    if (tipo === "file") return "Escolher arquivo";

    return "Campo";
  }
  if (marca === "A" || papel === "link") return "Link";
  if (marca === "SUMMARY") return "Detalhes";

  return "Botão";
}

/** Este controle é um campo em que a pessoa digita? (Selecioná-lo coloca o foco nele, em vez de clicar.) */
export function ehCampoDeTexto(el: HTMLElement): boolean {
  const marca = el.tagName;

  if (marca === "TEXTAREA" || marca === "SELECT" || el.getAttribute("contenteditable") === "true") return true;

  const papel = el.getAttribute("role");

  if (papel === "textbox" || papel === "searchbox" || papel === "spinbutton") return true;

  if (marca === "INPUT") {
    return !["button", "checkbox", "radio", "submit", "reset", "image", "file", "range", "color"].includes((el as HTMLInputElement).type);
  }

  return false;
}

/** O controle entra na varredura? */
export function ehControleVarrivel(el: HTMLElement): boolean {
  if (el.closest("[data-varredura-ignorar]")) return false;
  if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return false;
  if (estaEscondido(el)) return false;

  // Sem nome, é decorativo (ícone solto, link vazio) ou não dá para dizer o que faz: fica de fora.
  if (!nomeDoControle(el)) return false;

  // Quando há layout, ignora o que ocupa menos de 4 px (como o link "pular para o conteúdo" recolhido).
  const caixa = el.getBoundingClientRect();

  if (caixa.width + caixa.height > 0 && (caixa.width < 4 || caixa.height < 4)) return false;

  return true;
}

/** Todos os controles percorríveis dentro de `raiz`, na ordem da página. */
export function coletarControles(raiz: ParentNode): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(SELETOR_DE_CONTROLES)).filter(ehControleVarrivel);
}

/**
 * Onde a varredura começa: a camada de cima. Com um diálogo, menu ou lista aberta, só ela é percorrida
 * (a pessoa não deve ser levada a controles que estão atrás). Sem camada, a página toda.
 */
export function raizDaVarredura(documento: Document): ParentNode {
  const camadas = Array.from(documento.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], dialog[open], [role="menu"][data-state="open"], [role="listbox"]')).filter((c) => !estaEscondido(c));

  return camadas.length > 0 ? camadas[camadas.length - 1] : documento.body;
}

function nomeDoGrupo(grupo: HTMLElement): string {
  const aria = limpar(grupo.getAttribute("aria-label"));

  if (aria) return aria;

  const ids = grupo.getAttribute("aria-labelledby");

  if (ids) {
    const texto = ids
      .split(/\s+/)
      .map((id) => limpar(grupo.ownerDocument.getElementById(id)?.textContent))
      .filter(Boolean)
      .join(" ");

    if (texto) return texto;
  }

  const titulo = limpar(grupo.querySelector("h1, h2, h3, h4, legend, caption")?.textContent);

  if (titulo) return titulo.length > 60 ? `${titulo.slice(0, 57)}…` : titulo;

  const papel = grupo.getAttribute("role");

  return (papel && NOME_DE_PAPEL_DE_GRUPO[papel]) || NOME_DE_GRUPO[grupo.tagName] || "Grupo";
}

const comoControle = (el: HTMLElement): Item => ({ elemento: el, rotulo: `${tipoDoControle(el)}: ${nomeDoControle(el)}` });

/**
 * Monta o primeiro nível da varredura.
 *  - Com `porGrupos` desligado, é a lista simples de controles.
 *  - Com `porGrupos` ligado, controles que moram no mesmo grupo (cabeçalho, menu, formulário, cada seção)
 *    formam UM item; selecioná-lo entra no grupo. Grupos com um controle só e controles sem grupo viram
 *    itens diretos, para não obrigar a um passo a mais à toa.
 */
export function montarItens(raiz: ParentNode, porGrupos: boolean): Item[] {
  const controles = coletarControles(raiz);

  if (!porGrupos) return controles.map(comoControle);

  const limite = raiz instanceof HTMLElement ? raiz : null;
  const ordem: Array<HTMLElement | null> = [];
  const porGrupo = new Map<HTMLElement | null, HTMLElement[]>();

  for (const controle of controles) {
    let grupo = controle.parentElement?.closest<HTMLElement>(SELETOR_DE_GRUPO) ?? null;

    // O próprio contêiner da raiz (o diálogo aberto) não é um grupo "dentro" dele.
    if (grupo && limite && grupo === limite) grupo = null;

    if (!porGrupo.has(grupo)) {
      porGrupo.set(grupo, []);
      ordem.push(grupo);
    }

    porGrupo.get(grupo)!.push(controle);
  }

  const itens: Item[] = [];

  for (const grupo of ordem) {
    const membros = porGrupo.get(grupo)!;

    if (grupo === null || membros.length === 1) {
      itens.push(...membros.map(comoControle));
    } else {
      itens.push({ elemento: grupo, rotulo: `Grupo: ${nomeDoGrupo(grupo)}, ${membros.length} controles`, filhos: membros.map(comoControle) });
    }
  }

  // Preserva a ordem da página: itens diretos e grupos foram empilhados por primeira aparição, mas um
  // controle sem grupo que vem DEPOIS de um grupo não pode passar na frente dele.
  return ordenarPelaPagina(itens);
}

function ordenarPelaPagina(itens: Item[]): Item[] {
  const primeiro = (i: Item) => i.filhos?.[0].elemento ?? i.elemento;

  return [...itens].sort((a, b) => {
    const pos = primeiro(a).compareDocumentPosition(primeiro(b));

    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;

    return 0;
  });
}
