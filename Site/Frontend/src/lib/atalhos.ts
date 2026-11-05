/**
 * Atalhos de teclado do ACESSO: sequências de duas teclas (G e depois uma letra, como em vários
 * sistemas de e-mail) e duas teclas soltas (/ para pesquisar, ? para a lista de atalhos).
 *
 * Regras para nunca atrapalhar quem digita ou usa tecnologia assistiva:
 *  - nada acontece com Ctrl, Alt ou Meta apertados (esses são atalhos do navegador e dos leitores de tela);
 *  - nada acontece enquanto a pessoa digita em campo de texto, seletor ou área editável;
 *  - nada acontece com um diálogo aberto (o diálogo tem os próprios controles);
 *  - a segunda tecla da sequência precisa vir logo depois da primeira (JANELA_DA_SEQUENCIA_MS);
 *  - podem ser desligados em Configurações → Acessibilidade (WCAG 2.1.4: atalhos de um caractere devem poder ser desligados).
 *
 * Aqui só fica a lógica pura; quem navega de fato é `hooks/useAtalhosDeTeclado.ts`.
 */

export const JANELA_DA_SEQUENCIA_MS = 1500;

export type AcaoDoAtalho = { tipo: "navegar"; para: string } | { tipo: "pesquisar" } | { tipo: "ajuda" };

export type Atalho = {
  /** Teclas na ordem em que são apertadas, como mostradas na ajuda. */
  teclas: string[];
  descricao: string;
  /** Quem pode usar: todos, ou só quem tem sessão. */
  publico: boolean;
  acao: AcaoDoAtalho | ((tipoDeUsuario: string | null) => AcaoDoAtalho);
};

const painel = (tipo: string | null): AcaoDoAtalho => ({ tipo: "navegar", para: tipo === "empresa" ? "/dashboard/empresa" : tipo === "candidato" ? "/dashboard/candidato" : "/dashboard" });

export const ATALHOS: readonly Atalho[] = [
  { teclas: ["g", "i"], descricao: "Ir para o início (publicações)", publico: false, acao: { tipo: "navegar", para: "/feed" } },
  { teclas: ["g", "v"], descricao: "Ir para as vagas", publico: true, acao: { tipo: "navegar", para: "/vagas" } },
  { teclas: ["g", "m"], descricao: "Ir para as mensagens", publico: false, acao: { tipo: "navegar", para: "/mensagens" } },
  { teclas: ["g", "n"], descricao: "Ir para as notificações", publico: false, acao: { tipo: "navegar", para: "/notificacoes" } },
  { teclas: ["g", "p"], descricao: "Ir para o meu perfil", publico: false, acao: { tipo: "navegar", para: "/perfil" } },
  { teclas: ["g", "d"], descricao: "Ir para o meu painel", publico: false, acao: painel },
  { teclas: ["g", "a"], descricao: "Ir para Minha Acessibilidade", publico: false, acao: { tipo: "navegar", para: "/minha-acessibilidade" } },
  { teclas: ["g", "c"], descricao: "Ir para as configurações de acessibilidade", publico: true, acao: { tipo: "navegar", para: "/configuracoes/acessibilidade" } },
  { teclas: ["g", "o"], descricao: "Ir para “O que você quer fazer?” (objetivos)", publico: true, acao: { tipo: "navegar", para: "/objetivos" } },
  { teclas: ["g", "f"], descricao: "Ir para o Fale conosco", publico: true, acao: { tipo: "navegar", para: "/fale-conosco" } },
  { teclas: ["/"], descricao: "Abrir a pesquisa", publico: false, acao: { tipo: "pesquisar" } },
  { teclas: ["?"], descricao: "Mostrar esta lista de atalhos", publico: true, acao: { tipo: "ajuda" } },
];

export type EstadoDosAtalhos = { primeira: string | null; instante: number };

export const ESTADO_INICIAL: EstadoDosAtalhos = { primeira: null, instante: 0 };

export type ContextoDosAtalhos = {
  ativados: boolean;
  autenticado: boolean;
  tipoDeUsuario: string | null;
  /** Há um diálogo aberto na tela? */
  dialogoAberto: boolean;
};

export type TeclaApertada = {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  /** O alvo do evento: usado para saber se a pessoa está digitando. */
  alvo: EventTarget | null;
  repetida?: boolean;
};

/** A pessoa está digitando (ou escolhendo opção) neste elemento? */
export function estaDigitando(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;

  // `isContentEditable` herda de ancestrais; o atributo cobre navegadores/ambientes que não o calculam.
  const editavel = alvo.closest("[contenteditable]")?.getAttribute("contenteditable");

  if (alvo.isContentEditable || editavel === "" || editavel === "true" || editavel === "plaintext-only") return true;

  const marca = alvo.tagName;

  if (marca === "TEXTAREA" || marca === "SELECT") return true;

  if (marca === "INPUT") {
    const tipo = (alvo as HTMLInputElement).type;

    return !["button", "checkbox", "radio", "submit", "reset", "image", "file", "range", "color"].includes(tipo);
  }

  // Controles compostos (caixa de combinação, lista, árvore, menu): as letras são deles.
  const papel = alvo.getAttribute("role");

  return papel === "textbox" || papel === "combobox" || papel === "searchbox" || papel === "listbox" || papel === "menu" || papel === "menuitem" || papel === "spinbutton" || papel === "slider";
}

export type ResultadoDoAtalho = { acao: AcaoDoAtalho | null; estado: EstadoDosAtalhos };

/**
 * Máquina de estados dos atalhos. Recebe a tecla apertada e devolve a ação (se uma sequência
 * completou) e o novo estado. Não mexe em nada fora de si: o chamador decide se cancela o evento.
 */
export function interpretarTecla(estado: EstadoDosAtalhos, tecla: TeclaApertada, contexto: ContextoDosAtalhos, agora: number): ResultadoDoAtalho {
  const semMudanca: ResultadoDoAtalho = { acao: null, estado: ESTADO_INICIAL };

  if (!contexto.ativados || contexto.dialogoAberto || tecla.repetida) return semMudanca;
  if (tecla.ctrlKey || tecla.altKey || tecla.metaKey) return semMudanca;
  if (estaDigitando(tecla.alvo)) return semMudanca;
  if (tecla.key.length !== 1) return semMudanca;

  const caractere = tecla.key.toLowerCase();
  const disponiveis = ATALHOS.filter((a) => a.publico || contexto.autenticado);
  const resolver = (a: Atalho) => (typeof a.acao === "function" ? a.acao(contexto.tipoDeUsuario) : a.acao);

  // Segunda tecla de uma sequência começada há pouco.
  if (estado.primeira && agora - estado.instante <= JANELA_DA_SEQUENCIA_MS) {
    const achado = disponiveis.find((a) => a.teclas.length === 2 && a.teclas[0] === estado.primeira && a.teclas[1] === caractere);

    if (achado) return { acao: resolver(achado), estado: ESTADO_INICIAL };
  }

  // Atalho de uma tecla só.
  const unico = disponiveis.find((a) => a.teclas.length === 1 && a.teclas[0] === tecla.key);

  if (unico) return { acao: resolver(unico), estado: ESTADO_INICIAL };

  // Primeira tecla de alguma sequência.
  if (disponiveis.some((a) => a.teclas.length === 2 && a.teclas[0] === caractere)) return { acao: null, estado: { primeira: caractere, instante: agora } };

  return semMudanca;
}

/** Atalhos que a pessoa pode usar agora, para a tela de ajuda. */
export function atalhosDisponiveis(autenticado: boolean): Atalho[] {
  return ATALHOS.filter((a) => a.publico || autenticado);
}

/** "G depois V" / "/" para mostrar na ajuda. */
export function textoDasTeclas(teclas: string[]): string {
  return teclas.map((t) => (t.length === 1 && /[a-z]/.test(t) ? t.toUpperCase() : t)).join(" depois ");
}
