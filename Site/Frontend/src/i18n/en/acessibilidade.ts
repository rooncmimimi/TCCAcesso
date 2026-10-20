import type { Dicionario } from "../dicionario";

export const acessibilidade: Dicionario["acessibilidade"] = {
  painel: {
    previaTitulo: "Live preview",
    previaVaga: "Junior Administrative Assistant — PwD job",
    previaDescricao:
      "Grupo Aurora · Hybrid · São Paulo, SP. Accessible workplace, with a Libras interpreter and screen reader support.",
    previaFalada:
      "ACESSO voice reading example. Junior Administrative Assistant, inclusive job at Grupo Aurora.",
    testarLeitura: "Test reading aloud",
    botaoExemplo: "Example button (test the focus with Tab)",
    grupoVisual: "Visual",
    altoContraste: {
      titulo: "High contrast",
      descricao: "Increases the contrast between text, borders and backgrounds.",
    },
    modoEscuro: {
      titulo: "Dark mode",
      descricao: "Reduces screen brightness in low-light environments.",
    },
    fonteDislexia: {
      titulo: "Dyslexia-friendly font",
      descricao: "Typeface with letters that are easier to tell apart.",
    },
    tamanhoFonte: "Font size",
    espacamentoLetras: "Letter spacing",
    espacamentoLinhas: "Line spacing",
    unidadeEm: (valor) => `${valor} em`,
    grupoNavegacao: "Navigation and interaction",
    cursor: {
      titulo: "Larger cursor",
      descricao: "Bigger mouse pointer with a reinforced outline.",
    },
    animacoes: {
      titulo: "Reduce animations",
      descricao: "Removes transitions and movements that can cause discomfort.",
    },
    foco: {
      titulo: "Keyboard focus highlight",
      descricao: "A clearly visible outline on the focused element.",
    },
    grupoAssistivo: "Assistive features",
    leituraVoz: {
      titulo: "Voice reading",
      descricao: "Reads elements aloud as you move around the Site.",
    },
    velocidadeVoz: "Voice speed",
    vlibras: {
      titulo: "VLibras (Libras)",
      descricao:
        "Official Brazilian Federal Government translator into Libras (Brazilian Sign Language), available on every page. It only translates text written in Portuguese, so switch the Site to Portuguese to get the full benefit.",
    },
  },
  consentimento: {
    pergunta:
      "Hello! Welcome to ACESSO. Would you like to use voice reading by default throughout your browsing? Choose yes or no.",
    titulo: "Turn on voice reading?",
    descricao:
      "ACESSO can read content aloud as you browse. You can change this choice later in Accessibility settings.",
    nao: "No, thanks",
    sim: "Yes, turn on reading",
    ativada: "Voice reading turned on. Use the Tab key to move around the Site.",
    erroSalvar: "We couldn't save this choice to your account. It was saved on this device.",
  },
  leitor: {
    funcao: {
      interruptor: "switch",
      opcao: "option",
      aba: "tab",
      seletor: "dropdown",
      caixaSelecao: "checkbox",
      botao: "button",
      link: "link",
      campoTexto: "text field",
      campoArquivo: "file field",
    },
    estado: {
      desabilitado: "disabled",
      carregando: "loading",
      selecionado: "selected",
      expandido: "expanded",
      recolhido: "collapsed",
      ativado: "on",
      desativado: "off",
      marcado: "checked",
      naoMarcado: "not checked",
      comErro: "has an error",
    },
    imagem: (descricao) => `Image: ${descricao}.`,
    erro: (texto) => `Error: ${texto}`,
  },
};
