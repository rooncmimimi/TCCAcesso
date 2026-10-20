/** Painel de preferências de acessibilidade, consentimento de voz e frases do leitor por voz. */
export const acessibilidade = {
  painel: {
    previaTitulo: "Pré-visualização em tempo real",
    previaVaga: "Assistente Administrativo Jr — Vaga PCD",
    previaDescricao:
      "Grupo Aurora · Híbrido · São Paulo, SP. Ambiente acessível, com intérprete de Libras e suporte a leitor de tela.",
    previaFalada:
      "Exemplo de leitura por voz do ACESSO. Assistente Administrativo Júnior, vaga inclusiva no Grupo Aurora.",
    testarLeitura: "Testar leitura em voz alta",
    botaoExemplo: "Botão de exemplo (teste o foco com Tab)",
    grupoVisual: "Visual",
    altoContraste: {
      titulo: "Alto contraste",
      descricao: "Aumenta o contraste entre textos, bordas e fundos.",
    },
    modoEscuro: {
      titulo: "Modo escuro",
      descricao: "Reduz o brilho da tela em ambientes com pouca luz.",
    },
    fonteDislexia: {
      titulo: "Fonte para dislexia",
      descricao: "Tipografia com letras mais distinguíveis entre si.",
    },
    tamanhoFonte: "Tamanho da fonte",
    espacamentoLetras: "Espaçamento entre letras",
    espacamentoLinhas: "Espaçamento entre linhas",
    unidadeEm: (valor: string) => `${valor} em`,
    grupoNavegacao: "Navegação e interação",
    cursor: {
      titulo: "Cursor ampliado",
      descricao: "Ponteiro do mouse maior e com contorno reforçado.",
    },
    animacoes: {
      titulo: "Reduzir animações",
      descricao: "Remove transições e movimentos que podem causar desconforto.",
    },
    foco: {
      titulo: "Destaque de foco do teclado",
      descricao: "Contorno bem visível no elemento em foco.",
    },
    grupoAssistivo: "Recursos assistivos",
    leituraVoz: {
      titulo: "Leitura por voz",
      descricao: "Lê em voz alta os elementos ao navegar pelo site.",
    },
    velocidadeVoz: "Velocidade da voz",
    vlibras: {
      titulo: "VLibras (Libras)",
      descricao: "Tradutor oficial do Governo Federal, disponível em todas as páginas.",
    },
  },
  consentimento: {
    pergunta:
      "Olá! Bem-vindo ao ACESSO. Deseja utilizar o sistema de leitura por voz como padrão durante toda a sua navegação? Escolha sim ou não.",
    titulo: "Deseja ativar a leitura por voz?",
    descricao:
      "O ACESSO pode ler em voz alta os conteúdos enquanto você navega. Você pode alterar essa escolha depois em Configurações de acessibilidade.",
    nao: "Não, obrigado",
    sim: "Sim, ativar leitura",
    ativada: "Leitura por voz ativada. Use a tecla Tab para navegar pelo site.",
    erroSalvar: "Não foi possível salvar essa escolha na sua conta. Ficou salva neste dispositivo.",
  },
  /** Palavras que o leitor por voz usa para descrever um elemento (função, estado, imagem, erro). */
  leitor: {
    funcao: {
      interruptor: "interruptor",
      opcao: "opção",
      aba: "aba",
      seletor: "seletor",
      caixaSelecao: "caixa de seleção",
      botao: "botão",
      link: "link",
      campoTexto: "campo de texto",
      campoArquivo: "campo de arquivo",
    },
    estado: {
      desabilitado: "desabilitado",
      carregando: "carregando",
      selecionado: "selecionado",
      expandido: "expandido",
      recolhido: "recolhido",
      ativado: "ativado",
      desativado: "desativado",
      marcado: "marcado",
      naoMarcado: "não marcado",
      comErro: "com erro",
    },
    imagem: (descricao: string) => `Imagem: ${descricao}.`,
    erro: (texto: string) => `Erro: ${texto}`,
  },
};
