/**
 * Explicação em linguagem simples do que cada página do Site faz, para o botão "Explique esta
 * página". Escrita à mão, uma por rota. Uma página sem explicação própria recebe a genérica, que só
 * usa o título da página, sem supor o que ela faz.
 *
 * `padrao` é comparado com o caminho da URL: `:id` vale por um trecho qualquer, e `*` no fim vale
 * por todo o resto. A primeira explicação que casar vence, então as mais específicas vêm antes.
 */

export type ExplicacaoDePagina = {
  padrao: string;
  /** Nome da página, falado antes da explicação. */
  nome: string;
  texto: string;
  /** O que dá para fazer a partir daqui. */
  proximosPassos?: string;
};

export const EXPLICACOES: readonly ExplicacaoDePagina[] = [
  {
    padrao: "/",
    nome: "Página inicial",
    texto: "Você está na página inicial do ACESSO, uma rede de empregos para pessoas com deficiência e profissionais com 50 anos ou mais.",
    proximosPassos: "Use Entrar se já tem conta, Criar conta se é novo aqui, ou Quero encontrar vagas para ver as oportunidades.",
  },
  {
    padrao: "/entrar",
    nome: "Entrar",
    texto: "Aqui você entra na sua conta com e-mail e senha, ou com a conta Google se ela já estiver ligada ao seu cadastro.",
    proximosPassos: "Preencha e-mail e senha e use o botão Entrar. Se esqueceu a senha, use o link Esqueceu a senha.",
  },
  {
    padrao: "/cadastro/*",
    nome: "Criar conta",
    texto: "Você está criando a sua conta. O cadastro é feito em etapas, e você pode voltar para corrigir uma etapa antes de terminar.",
    proximosPassos: "Preencha a etapa atual e use o botão para continuar.",
  },
  {
    padrao: "/cadastro",
    nome: "Criar conta",
    texto: "Aqui você escolhe como quer criar a sua conta: como pessoa candidata ou como empresa.",
    proximosPassos: "Escolha o tipo de conta e siga as etapas.",
  },
  {
    padrao: "/vagas",
    nome: "Vagas",
    texto: "Aqui você vê as vagas abertas e pode filtrar por cidade, modalidade, tipo de contrato e recursos de acessibilidade.",
    proximosPassos: "Abra uma vaga para ver os detalhes. Dentro dela você pode se candidatar e ouvir um resumo em linguagem simples.",
  },
  {
    padrao: "/vaga/:id",
    nome: "Detalhes da vaga",
    texto:
      "Você está vendo uma vaga: o que a pessoa vai fazer, o que a empresa pede, os benefícios e os recursos de acessibilidade. Tem também um botão que explica a vaga de forma simples.",
    proximosPassos: "Para participar, use Candidatar-se. Você também pode favoritar a vaga ou conversar com a empresa.",
  },
  {
    padrao: "/feed",
    nome: "Publicações",
    texto: "Aqui ficam as publicações de pessoas e empresas que você segue, como numa rede social profissional.",
    proximosPassos: "Você pode curtir, comentar, compartilhar e escrever a sua própria publicação.",
  },
  {
    padrao: "/descobrir",
    nome: "Descobrir",
    texto: "Aqui você encontra pessoas e empresas para seguir.",
    proximosPassos: "Abra um perfil para conhecer a pessoa ou a empresa, ou use Seguir.",
  },
  {
    padrao: "/mensagens",
    nome: "Mensagens",
    texto: "Aqui ficam as suas conversas com outras pessoas e com empresas.",
    proximosPassos: "Escolha uma conversa na lista e escreva a mensagem no campo de baixo.",
  },
  {
    padrao: "/notificacoes",
    nome: "Notificações",
    texto: "Aqui você vê os avisos da plataforma: novas mensagens, mudanças nas suas candidaturas e novos seguidores.",
  },
  {
    padrao: "/dashboard/candidato",
    nome: "Painel da pessoa candidata",
    texto: "Aqui você acompanha as suas candidaturas, as vagas favoritas e um resumo da sua atividade no ACESSO.",
    proximosPassos: "Abra uma candidatura para ver o andamento.",
  },
  {
    padrao: "/dashboard/empresa",
    nome: "Painel da empresa",
    texto: "Aqui a empresa publica e gerencia as vagas e acompanha as pessoas que se candidataram.",
    proximosPassos: "Use Nova vaga para publicar, ou abra uma vaga para ver as candidaturas.",
  },
  {
    padrao: "/dashboard",
    nome: "Painel",
    texto: "Esta é a sua página de acompanhamento: o que está acontecendo com as suas vagas ou candidaturas.",
  },
  {
    padrao: "/perfil",
    nome: "Meu perfil",
    texto: "Aqui você vê e edita o seu perfil: dados profissionais, experiências, formação e habilidades. É o que as empresas veem sobre você.",
    proximosPassos: "Use Editar para mudar as informações.",
  },
  {
    padrao: "/perfil/:id",
    nome: "Perfil",
    texto: "Você está vendo o perfil de uma pessoa ou empresa.",
    proximosPassos: "Você pode seguir, enviar mensagem ou, no caso de empresa, ver as vagas dela.",
  },
  {
    padrao: "/configuracoes/acessibilidade",
    nome: "Configurações de acessibilidade",
    texto:
      "Aqui você ajusta o ACESSO para o seu jeito de ler e navegar: contraste, tamanho da letra, voz, régua de leitura e cores. Cada mudança aparece na hora.",
    proximosPassos: "Teste as opções e use Salvar preferências no fim da página.",
  },
  {
    padrao: "/configuracoes/*",
    nome: "Configurações",
    texto: "Aqui você ajusta a sua conta: senha, e-mail, notificações, privacidade e segurança.",
  },
  {
    padrao: "/configuracoes",
    nome: "Configurações",
    texto: "Aqui você escolhe o que quer ajustar na sua conta: senha, e-mail, notificações, privacidade, segurança e acessibilidade.",
  },
  {
    padrao: "/fale-conosco",
    nome: "Fale conosco",
    texto: "Aqui você envia uma mensagem para a equipe do ACESSO, com uma dúvida, sugestão ou problema.",
  },
  {
    padrao: "/sobre-nos",
    nome: "Sobre nós",
    texto: "Aqui você conhece o ACESSO: quem somos e por que a plataforma existe.",
  },
  {
    padrao: "/termos",
    nome: "Termos de uso",
    texto: "Aqui estão as regras de uso do ACESSO.",
  },
  {
    padrao: "/privacidade",
    nome: "Política de privacidade",
    texto: "Aqui você vê como o ACESSO trata os seus dados pessoais.",
  },
];

function normalizarCaminho(caminho: string): string {
  const semConsulta = caminho.split(/[?#]/)[0];
  const limpo = semConsulta.replace(/\/+$/, "");
  return limpo === "" ? "/" : limpo;
}

/** O padrão casa com o caminho? `:id` vale por um trecho, `*` no fim vale por todo o resto. */
export function casaCom(padrao: string, caminho: string): boolean {
  const alvo = normalizarCaminho(caminho).split("/");
  const modelo = padrao.split("/");

  for (let i = 0; i < modelo.length; i++) {
    const parte = modelo[i];
    if (parte === "*") return i === modelo.length - 1 && alvo.length > i;
    if (alvo[i] === undefined) return false;
    if (parte.startsWith(":")) {
      if (alvo[i] === "") return false;
      continue;
    }
    if (parte !== alvo[i]) return false;
  }
  return alvo.length === modelo.length;
}

export function explicacaoDaPagina(caminho: string): ExplicacaoDePagina | null {
  return EXPLICACOES.find((e) => casaCom(e.padrao, caminho)) ?? null;
}
