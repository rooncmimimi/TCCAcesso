import { tx } from "@/i18n/frases";

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
    get nome() { return tx("Página inicial"); },
    get texto() { return tx("Você está na página inicial do ACESSO, uma rede de empregos para pessoas com deficiência e profissionais com 50 anos ou mais."); },
    get proximosPassos() { return tx("Use Entrar se já tem conta, Criar conta se é novo aqui, ou Quero encontrar vagas para ver as oportunidades."); },
  },
  {
    padrao: "/ajuda",
    get nome() { return tx("Central de Ajuda"); },
    get texto() { return tx("Aqui estão os tutoriais com imagens e as perguntas frequentes, em duas áreas: para candidatos e para empresas. Há uma busca no alto da página."); },
    get proximosPassos() { return tx("Escolha a sua área e um tutorial, ou digite o que procura na busca. Se não resolver, use Falar com a equipe, no fim da página."); },
  },
  {
    padrao: "/entrar",
    get nome() { return tx("Entrar"); },
    get texto() { return tx("Aqui você entra na sua conta com e-mail e senha, ou com a conta Google se ela já estiver ligada ao seu cadastro."); },
    get proximosPassos() { return tx("Preencha e-mail e senha e use o botão Entrar. Se esqueceu a senha, use o link Esqueceu a senha."); },
  },
  {
    padrao: "/cadastro/*",
    get nome() { return tx("Criar conta"); },
    get texto() { return tx("Você está criando a sua conta. O cadastro é feito em etapas, e você pode voltar para corrigir uma etapa antes de terminar."); },
    get proximosPassos() { return tx("Preencha a etapa atual e use o botão para continuar."); },
  },
  {
    padrao: "/cadastro",
    get nome() { return tx("Criar conta"); },
    get texto() { return tx("Aqui você escolhe como quer criar a sua conta: como pessoa candidata ou como empresa."); },
    get proximosPassos() { return tx("Escolha o tipo de conta e siga as etapas."); },
  },
  {
    padrao: "/vagas",
    get nome() { return tx("Vagas"); },
    get texto() { return tx("Aqui você vê as vagas abertas e pode filtrar por cidade, modalidade, tipo de contrato e recursos de acessibilidade."); },
    get proximosPassos() { return tx("Abra uma vaga para ver os detalhes. Dentro dela você pode se candidatar e ouvir um resumo em linguagem simples."); },
  },
  {
    padrao: "/vaga/:id",
    get nome() { return tx("Detalhes da vaga"); },
    get texto() { return tx("Você está vendo uma vaga: o que a pessoa vai fazer, o que a empresa pede, os benefícios e os recursos de acessibilidade. Tem também um botão que explica a vaga de forma simples."); },
    get proximosPassos() { return tx("Para participar, use Candidatar-se. Você também pode favoritar a vaga ou conversar com a empresa."); },
  },
  {
    padrao: "/minha-acessibilidade",
    get nome() { return tx("Minha Acessibilidade"); },
    get texto() { return tx("Aqui você registra, só para você, o que ajuda a participar de processos seletivos: adaptações, como prefere ser contatado e se quer mostrar a categoria de deficiência no seu perfil. Nada é enviado a empresas sozinho."); },
    get proximosPassos() { return tx("Marque o que se aplica e salve cada parte. Em cada candidatura você decide o que compartilhar, depois de ver uma prévia."); },
  },
  {
    padrao: "/diagnostico-de-voz",
    get nome() { return tx("Teste da leitura em voz alta"); },
    get texto() { return tx("Uma tela para conferir, em cerca de 1 minuto, se a leitura em voz alta do ACESSO marca as palavras e se Pausar e Continuar funcionam no seu aparelho."); },
    get proximosPassos() { return tx("Siga as três etapas: ouça o trecho, pause e continue, e (se quiser) faça o teste automático. No fim, dá para copiar o resultado."); },
  },
  {
    padrao: "/comunicacao",
    get nome() { return tx("Central de comunicação"); },
    get texto() { return tx("Aqui ficam frases prontas, como “Preciso de um momento para responder”. Você pode mostrar a frase em letras grandes, ouvi-la em voz alta ou copiá-la."); },
    get proximosPassos() { return tx("Escolha um cartão e use Mostrar, Ouvir ou Copiar."); },
  },
  {
    padrao: "/profissoes",
    get nome() { return tx("Dicionário de profissões"); },
    get texto() { return tx("Uma lista de profissões explicadas em linguagem simples, com o que a pessoa faz, as ferramentas, as habilidades e um exemplo de dia de trabalho."); },
    get proximosPassos() { return tx("Procure uma profissão pelo nome, abra a ficha e, se quiser, procure vagas dessa profissão."); },
  },
  {
    padrao: "/objetivos",
    get nome() { return tx("O que você quer fazer?"); },
    get texto() { return tx("Aqui você escolhe um objetivo, como encontrar emprego ou se candidatar, e vê só os passos de que precisa, em ordem."); },
    get proximosPassos() { return tx("Escolha um objetivo e siga o passo destacado como “Próximo passo”. Marque os que já fez."); },
  },
  {
    padrao: "/comparar",
    get nome() { return tx("Comparar vagas"); },
    get texto() { return tx("Mostra até três vagas lado a lado: modalidade, ambiente, acessibilidade física e adaptações. A tela não diz qual vaga é melhor: você decide pelo que importa para você."); },
    get proximosPassos() { return tx("As linhas marcadas como “Diferente” mostram onde as vagas se separam. Abra uma vaga pelo título."); },
  },
  {
    padrao: "/feed",
    get nome() { return tx("Publicações"); },
    get texto() { return tx("Aqui ficam as publicações de pessoas e empresas que você segue, como numa rede social profissional."); },
    get proximosPassos() { return tx("Você pode curtir, comentar, compartilhar e escrever a sua própria publicação."); },
  },
  {
    padrao: "/descobrir",
    get nome() { return tx("Descobrir"); },
    get texto() { return tx("Aqui você encontra pessoas e empresas para seguir."); },
    get proximosPassos() { return tx("Abra um perfil para conhecer a pessoa ou a empresa, ou use Seguir."); },
  },
  {
    padrao: "/mensagens",
    get nome() { return tx("Mensagens"); },
    get texto() { return tx("Aqui ficam as suas conversas com outras pessoas e com empresas."); },
    get proximosPassos() { return tx("Escolha uma conversa na lista e escreva a mensagem no campo de baixo."); },
  },
  {
    padrao: "/notificacoes",
    get nome() { return tx("Notificações"); },
    get texto() { return tx("Aqui você vê os avisos da plataforma: novas mensagens, mudanças nas suas candidaturas e novos seguidores."); },
  },
  {
    padrao: "/dashboard/candidato",
    get nome() { return tx("Painel da pessoa candidata"); },
    get texto() { return tx("Aqui você acompanha as suas candidaturas, as vagas favoritas e um resumo da sua atividade no ACESSO."); },
    get proximosPassos() { return tx("Abra uma candidatura para ver o andamento."); },
  },
  {
    padrao: "/dashboard/empresa",
    get nome() { return tx("Painel da empresa"); },
    get texto() { return tx("Aqui a empresa publica e gerencia as vagas e acompanha as pessoas que se candidataram."); },
    get proximosPassos() { return tx("Use Nova vaga para publicar, ou abra uma vaga para ver as candidaturas."); },
  },
  {
    padrao: "/dashboard",
    get nome() { return tx("Painel"); },
    get texto() { return tx("Esta é a sua página de acompanhamento: o que está acontecendo com as suas vagas ou candidaturas."); },
  },
  {
    padrao: "/perfil",
    get nome() { return tx("Meu perfil"); },
    get texto() { return tx("Aqui você vê e edita o seu perfil: dados profissionais, experiências, formação e habilidades. É o que as empresas veem sobre você."); },
    get proximosPassos() { return tx("Use Editar para mudar as informações."); },
  },
  {
    padrao: "/perfil/:id",
    get nome() { return tx("Perfil"); },
    get texto() { return tx("Você está vendo o perfil de uma pessoa ou empresa."); },
    get proximosPassos() { return tx("Você pode seguir, enviar mensagem ou, no caso de empresa, ver as vagas dela."); },
  },
  {
    padrao: "/configuracoes/acessibilidade",
    get nome() { return tx("Configurações de acessibilidade"); },
    get texto() { return tx("Aqui você ajusta o ACESSO para o seu jeito de ler e navegar: contraste, tamanho da letra, voz, régua de leitura e cores. Cada mudança aparece na hora."); },
    get proximosPassos() { return tx("Teste as opções e use Salvar preferências no fim da página."); },
  },
  {
    padrao: "/configuracoes/*",
    get nome() { return tx("Configurações"); },
    get texto() { return tx("Aqui você ajusta a sua conta: senha, e-mail, notificações, privacidade e segurança."); },
  },
  {
    padrao: "/configuracoes",
    get nome() { return tx("Configurações"); },
    get texto() { return tx("Aqui você escolhe o que quer ajustar na sua conta: senha, e-mail, notificações, privacidade, segurança e acessibilidade."); },
  },
  {
    padrao: "/fale-conosco",
    get nome() { return tx("Fale conosco"); },
    get texto() { return tx("Aqui você envia uma mensagem para a equipe do ACESSO, com uma dúvida, sugestão ou problema."); },
  },
  {
    padrao: "/sobre-nos",
    get nome() { return tx("Sobre nós"); },
    get texto() { return tx("Aqui você conhece o ACESSO: quem somos e por que a plataforma existe."); },
  },
  {
    padrao: "/termos",
    get nome() { return tx("Termos de uso"); },
    get texto() { return tx("Aqui estão as regras de uso do ACESSO."); },
  },
  {
    padrao: "/privacidade",
    get nome() { return tx("Política de privacidade"); },
    get texto() { return tx("Aqui você vê como o ACESSO trata os seus dados pessoais."); },
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
