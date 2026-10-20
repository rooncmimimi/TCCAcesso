import type { Dicionario } from "../dicionario";

export const acessibilidade: Dicionario["acessibilidade"] = {
  painel: {
    previaTitulo: "Vista previa en tiempo real",
    previaVaga: "Asistente Administrativo Jr — Vacante PCD",
    previaDescricao:
      "Grupo Aurora · Híbrido · São Paulo, SP. Entorno accesible, con intérprete de Libras y compatibilidad con lector de pantalla.",
    previaFalada:
      "Ejemplo de lectura por voz de ACESSO. Asistente Administrativo Junior, vacante inclusiva en Grupo Aurora.",
    testarLeitura: "Probar la lectura en voz alta",
    botaoExemplo: "Botón de ejemplo (prueba el foco con Tab)",
    grupoVisual: "Visual",
    altoContraste: {
      titulo: "Alto contraste",
      descricao: "Aumenta el contraste entre textos, bordes y fondos.",
    },
    modoEscuro: {
      titulo: "Modo oscuro",
      descricao: "Reduce el brillo de la pantalla en entornos con poca luz.",
    },
    fonteDislexia: {
      titulo: "Fuente para dislexia",
      descricao: "Tipografía con letras más fáciles de distinguir entre sí.",
    },
    tamanhoFonte: "Tamaño de la fuente",
    espacamentoLetras: "Espaciado entre letras",
    espacamentoLinhas: "Espaciado entre líneas",
    unidadeEm: (valor) => `${valor} em`,
    grupoNavegacao: "Navegación e interacción",
    cursor: {
      titulo: "Cursor ampliado",
      descricao: "Puntero del ratón más grande y con contorno reforzado.",
    },
    animacoes: {
      titulo: "Reducir animaciones",
      descricao: "Elimina transiciones y movimientos que pueden causar molestias.",
    },
    foco: {
      titulo: "Resaltado del foco del teclado",
      descricao: "Contorno muy visible en el elemento enfocado.",
    },
    grupoAssistivo: "Recursos de asistencia",
    leituraVoz: {
      titulo: "Lectura por voz",
      descricao: "Lee en voz alta los elementos mientras navegas por el sitio.",
    },
    velocidadeVoz: "Velocidad de la voz",
    vlibras: {
      titulo: "VLibras (Libras)",
      descricao:
        "Traductor oficial del Gobierno Federal de Brasil a Libras (lengua de señas brasileña), disponible en todas las páginas. Solo traduce texto escrito en portugués, así que cambia el Sitio a portugués para aprovecharlo al máximo.",
    },
  },
  consentimento: {
    pergunta:
      "¡Hola! Bienvenido a ACESSO. ¿Quieres usar la lectura por voz de forma predeterminada durante toda tu navegación? Elige sí o no.",
    titulo: "¿Activar la lectura por voz?",
    descricao:
      "ACESSO puede leer los contenidos en voz alta mientras navegas. Puedes cambiar esta elección más tarde en la configuración de accesibilidad.",
    nao: "No, gracias",
    sim: "Sí, activar lectura",
    ativada: "Lectura por voz activada. Usa la tecla Tab para moverte por el sitio.",
    erroSalvar: "No se pudo guardar esta elección en tu cuenta. Quedó guardada en este dispositivo.",
  },
  leitor: {
    funcao: {
      interruptor: "interruptor",
      opcao: "opción",
      aba: "pestaña",
      seletor: "selector",
      caixaSelecao: "casilla de verificación",
      botao: "botón",
      link: "enlace",
      campoTexto: "campo de texto",
      campoArquivo: "campo de archivo",
    },
    estado: {
      desabilitado: "deshabilitado",
      carregando: "cargando",
      selecionado: "seleccionado",
      expandido: "expandido",
      recolhido: "contraído",
      ativado: "activado",
      desativado: "desactivado",
      marcado: "marcado",
      naoMarcado: "no marcado",
      comErro: "con error",
    },
    imagem: (descricao) => `Imagen: ${descricao}.`,
    erro: (texto) => `Error: ${texto}`,
  },
};
