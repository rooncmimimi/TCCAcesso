/**
 * As palavras que a leitura em voz acrescenta ao texto da tela: o que o controle É ("botão"), em que
 * ESTADO está ("marcado", "com erro"), "Título de nível 1", "Imagem:", "Erro:" e os avisos de início e
 * fim da página. Existem nos três idiomas do site, para a frase falada não sair misturada ("Sign in,
 * botão.").
 *
 * Qual vocabulário vale: o do idioma do TEXTO que está sendo lido (uma tela ainda não traduzida segue
 * em português mesmo com o site em inglês, e a frase precisa ficar toda em português para a voz
 * portuguesa lê-la), e na dúvida o idioma do site. Ver `idiomaDaFala.ts`.
 */

import { detectarIdiomaDoTexto, idiomaDaTela, idiomaDoSite } from "@/lib/idiomaDaFala";
import type { CodigoIdioma } from "@/i18n/idiomas";

export type Vocabulario = {
  funcao: {
    switch: string;
    opcao: string;
    aba: string;
    seletor: string;
    caixaDeSelecao: string;
    botao: string;
    link: string;
    campoDeTexto: string;
    campoDeArquivo: string;
  };
  estado: {
    desabilitado: string;
    carregando: string;
    selecionado: string;
    expandido: string;
    recolhido: string;
    ativado: string;
    desativado: string;
    marcado: string;
    naoMarcado: string;
    comErro: string;
  };
  erro: string;
  imagem: string;
  titulo: (nivel: string | null) => string;
  fimDaPagina: string;
  inicioDaPagina: string;
};

export const VOCABULARIOS: Record<CodigoIdioma, Vocabulario> = {
  pt: {
    funcao: { switch: "interruptor", opcao: "opção", aba: "aba", seletor: "seletor", caixaDeSelecao: "caixa de seleção", botao: "botão", link: "link", campoDeTexto: "campo de texto", campoDeArquivo: "campo de arquivo" },
    estado: { desabilitado: "desabilitado", carregando: "carregando", selecionado: "selecionado", expandido: "expandido", recolhido: "recolhido", ativado: "ativado", desativado: "desativado", marcado: "marcado", naoMarcado: "não marcado", comErro: "com erro" },
    erro: "Erro",
    imagem: "Imagem",
    titulo: (nivel) => (nivel ? `Título de nível ${nivel}` : "Título"),
    fimDaPagina: "Fim da página.",
    inicioDaPagina: "Início da página.",
  },
  en: {
    funcao: { switch: "switch", opcao: "option", aba: "tab", seletor: "drop-down list", caixaDeSelecao: "checkbox", botao: "button", link: "link", campoDeTexto: "text field", campoDeArquivo: "file field" },
    estado: { desabilitado: "disabled", carregando: "loading", selecionado: "selected", expandido: "expanded", recolhido: "collapsed", ativado: "on", desativado: "off", marcado: "checked", naoMarcado: "not checked", comErro: "with an error" },
    erro: "Error",
    imagem: "Image",
    titulo: (nivel) => (nivel ? `Heading level ${nivel}` : "Heading"),
    fimDaPagina: "End of the page.",
    inicioDaPagina: "Start of the page.",
  },
  es: {
    funcao: { switch: "interruptor", opcao: "opción", aba: "pestaña", seletor: "lista desplegable", caixaDeSelecao: "casilla de verificación", botao: "botón", link: "enlace", campoDeTexto: "campo de texto", campoDeArquivo: "campo de archivo" },
    estado: { desabilitado: "deshabilitado", carregando: "cargando", selecionado: "seleccionado", expandido: "expandido", recolhido: "contraído", ativado: "activado", desativado: "desactivado", marcado: "marcada", naoMarcado: "no marcada", comErro: "con error" },
    erro: "Error",
    imagem: "Imagen",
    titulo: (nivel) => (nivel ? `Título de nivel ${nivel}` : "Título"),
    fimDaPagina: "Fin de la página.",
    inicioDaPagina: "Inicio de la página.",
  },
};

/**
 * O vocabulário para uma frase cujo texto principal é `texto`: o idioma do próprio texto; se for curto ou ambíguo
 * demais, o da tela em volta de `el` (uma tela ainda em português num site em inglês); e, sem pista, o do site.
 */
export function vocabularioPara(texto: string, siteLang?: string | null, el?: Element | null): Vocabulario {
  return VOCABULARIOS[detectarIdiomaDoTexto(texto) ?? idiomaDaTela(el) ?? idiomaDoSite(siteLang)];
}

const NOME_DO_IDIOMA: Record<CodigoIdioma, Record<CodigoIdioma, string>> = {
  pt: { pt: "português", en: "inglês", es: "espanhol" },
  en: { pt: "Portuguese", en: "English", es: "Spanish" },
  es: { pt: "portugués", en: "inglés", es: "español" },
};

/** O aviso de que o aparelho não tem voz do idioma do texto, escrito no idioma do SITE (é nele que a pessoa lê). */
export function mensagemSemVoz(idiomaDoTexto: CodigoIdioma, idiomaDoSite: CodigoIdioma): string {
  const nome = NOME_DO_IDIOMA[idiomaDoSite][idiomaDoTexto];

  if (idiomaDoSite === "en") return `Your device has no ${nome} voice. The reading will use another voice and may sound odd.`;
  if (idiomaDoSite === "es") return `Su dispositivo no tiene una voz en ${nome}. La lectura usará otra voz y puede sonar extraña.`;

  return `Seu aparelho não tem uma voz em ${nome}. A leitura usará outra voz e pode soar estranha.`;
}

/** O vocabulário do idioma do site (para avisos que não têm texto de tela, como "Fim da página."). */
export function vocabularioDoSite(siteLang?: string | null): Vocabulario {
  return VOCABULARIOS[idiomaDoSite(siteLang)];
}
