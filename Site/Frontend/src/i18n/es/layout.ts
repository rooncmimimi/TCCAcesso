import type { Dicionario } from "../dicionario";

export const layout: Dicionario["layout"] = {
  inicioAria: "ACESSO — página de inicio",
  irParaInicioAria: "ACESSO — ir al inicio",
  navegacaoPublica: "Navegación pública",
  navegacaoPrincipal: "Navegación principal",
  nav: {
    inicio: "Inicio",
    vagas: "Vacantes",
    mensagens: "Mensajes",
    notificacoes: "Notificaciones",
  },
  naoLidas: (n) => `${n} sin leer`,
  menuPerfilAria: "Abrir menú del perfil",
  visitante: "Visitante",
  voce: "Tú",
  convite: "Inicia sesión para personalizar tu experiencia",
  verPerfil: "Ver perfil",
  minhaAtividade: "Mi actividad",
  descobrir: "Descubrir",
  painelIndicadores: "Panel de indicadores",
  painelAdministrativo: "Panel administrativo",
  configuracoesAcessibilidade: "Configuración de accesibilidad",
  configuracoes: "Configuración",
  carregandoSessao: "Cargando tu sesión…",
  rodape: {
    ajuda: "¿Necesitas ayuda?",
    suporteAria: "Soporte",
    faleConosco: "Contáctanos",
    acessibilidade: "Accesibilidad",
    privacidade: "Privacidad",
    seguranca: "Seguridad",
  },
  statusEmpresa: {
    verificarNovamente: "Verificar de nuevo",
    sairDaConta: "Cerrar sesión",
    faleConosco: "Contáctanos",
  },
  meta: {
    titulo: "ACESSO — Inclusión profesional para personas con discapacidad y 50+",
    descricao:
      "Red profesional accesible que conecta a personas con discapacidad y profesionales 50+ con empresas con vacantes realmente inclusivas.",
  },
};
