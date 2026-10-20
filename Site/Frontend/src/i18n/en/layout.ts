import type { Dicionario } from "../dicionario";

export const layout: Dicionario["layout"] = {
  inicioAria: "ACESSO — home page",
  irParaInicioAria: "ACESSO — go to home",
  navegacaoPublica: "Public navigation",
  navegacaoPrincipal: "Main navigation",
  nav: {
    inicio: "Home",
    vagas: "Jobs",
    mensagens: "Messages",
    notificacoes: "Notifications",
  },
  naoLidas: (n) => `${n} unread`,
  menuPerfilAria: "Open profile menu",
  visitante: "Guest",
  voce: "You",
  convite: "Sign in to personalize your experience",
  verPerfil: "View profile",
  minhaAtividade: "My activity",
  descobrir: "Discover",
  painelIndicadores: "Dashboard",
  painelAdministrativo: "Admin panel",
  configuracoesAcessibilidade: "Accessibility settings",
  configuracoes: "Settings",
  carregandoSessao: "Loading your session…",
  rodape: {
    ajuda: "Need help?",
    suporteAria: "Support",
    faleConosco: "Contact us",
    acessibilidade: "Accessibility",
    privacidade: "Privacy",
    seguranca: "Security",
  },
  statusEmpresa: {
    verificarNovamente: "Check again",
    sairDaConta: "Sign out",
    faleConosco: "Contact us",
  },
  meta: {
    titulo: "ACESSO — Professional inclusion for people with disabilities and 50+",
    descricao:
      "An accessible professional network that connects people with disabilities and professionals 50+ to companies with truly inclusive jobs.",
  },
};
