/**
 * Navegação por objetivos: caminhos guiados para o que a pessoa quer fazer, com SÓ os passos de que
 * ela precisa para aquele objetivo, em ordem. Cada passo leva a uma página que já existe; nada aqui
 * faz nada pela pessoa (não envia, não publica, não compartilha). Escritos à mão.
 */

export type RotaDoPasso =
  | "/vagas"
  | "/perfil"
  | "/minha-acessibilidade"
  | "/simulador"
  | "/dashboard/candidato"
  | "/dashboard/empresa"
  | "/configuracoes/acessibilidade"
  | "/configuracoes/privacidade"
  | "/mensagens"
  | "/notificacoes"
  | "/comunicacao"
  | "/profissoes"
  | "/comparar"
  | "/cadastro"
  | "/entrar";

export type PublicoDoObjetivo = "candidato" | "empresa" | "visitante";

export type Passo = {
  id: string;
  titulo: string;
  descricao: string;
  para: RotaDoPasso;
  /** Rótulo do botão que leva ao passo. */
  acao: string;
  /** Passo que a pessoa pode pular sem prejuízo. */
  opcional?: boolean;
};

export type Objetivo = {
  id: string;
  titulo: string;
  resumo: string;
  publico: PublicoDoObjetivo;
  passos: Passo[];
};

export const OBJETIVOS: readonly Objetivo[] = [
  {
    id: "encontrar-emprego",
    titulo: "Quero encontrar emprego",
    resumo: "Ver as vagas, entender cada uma e guardar as que interessam.",
    publico: "candidato",
    passos: [
      { id: "ajustar-leitura", titulo: "Ajustar como você quer ler e navegar", descricao: "Tamanho da letra, voz, cores, varredura. Faça isso uma vez só.", para: "/configuracoes/acessibilidade", acao: "Abrir ajustes", opcional: true },
      { id: "ver-vagas", titulo: "Ver as vagas e filtrar", descricao: "Filtre por cidade, modalidade e recursos de acessibilidade.", para: "/vagas", acao: "Ver vagas" },
      { id: "entender-vaga", titulo: "Abrir uma vaga e ouvir o resumo simples", descricao: "Dentro da vaga há um resumo em linguagem simples e o botão Ouvir.", para: "/vagas", acao: "Escolher uma vaga" },
      { id: "comparar", titulo: "Comparar até três vagas", descricao: "Veja lado a lado ambiente, acessibilidade física e adaptações.", para: "/comparar", acao: "Comparar vagas", opcional: true },
    ],
  },
  {
    id: "melhorar-curriculo",
    titulo: "Quero melhorar meu currículo",
    resumo: "Deixar o perfil completo e claro para as empresas.",
    publico: "candidato",
    passos: [
      { id: "ver-profissoes", titulo: "Ver como as profissões se chamam", descricao: "O dicionário ajuda a nomear o que você já fez.", para: "/profissoes", acao: "Abrir dicionário", opcional: true },
      { id: "experiencias", titulo: "Escrever suas experiências e formações", descricao: "Conte onde trabalhou e o que fazia. Você pode ditar o texto.", para: "/perfil", acao: "Abrir meu perfil" },
      { id: "apresentacao", titulo: "Escrever sua apresentação", descricao: "Duas ou três frases sobre quem você é profissionalmente.", para: "/perfil", acao: "Abrir meu perfil" },
    ],
  },
  {
    id: "candidatar",
    titulo: "Quero me candidatar",
    resumo: "Escolher a vaga, decidir o que compartilhar e enviar com segurança.",
    publico: "candidato",
    passos: [
      { id: "escolher-vaga", titulo: "Escolher a vaga", descricao: "Abra a vaga e leia o resumo, o ambiente e as etapas da seleção.", para: "/vagas", acao: "Ver vagas" },
      { id: "definir-adaptacoes", titulo: "Decidir quais adaptações você pode pedir", descricao: "Só o que você marcar na candidatura é compartilhado, e só com aquela empresa.", para: "/minha-acessibilidade", acao: "Abrir Minha Acessibilidade", opcional: true },
      { id: "treinar", titulo: "Treinar no simulador", descricao: "Pratique com uma vaga fictícia. Nada é enviado a empresas.", para: "/simulador", acao: "Abrir simulador", opcional: true },
      { id: "enviar", titulo: "Candidatar-se com a prévia de privacidade", descricao: "Na vaga, use Candidatar-se, revise o que a empresa vai receber e só então envie.", para: "/vagas", acao: "Voltar às vagas" },
    ],
  },
  {
    id: "preparar-entrevista",
    titulo: "Quero preparar uma entrevista",
    resumo: "Treinar, preparar frases de apoio e combinar as adaptações.",
    publico: "candidato",
    passos: [
      { id: "simulador", titulo: "Treinar respostas no simulador", descricao: "Exercícios de apresentação e de perguntas comuns, no seu ritmo.", para: "/simulador", acao: "Abrir simulador" },
      { id: "cartoes", titulo: "Preparar cartões de comunicação", descricao: "Frases como “Preciso de um momento para responder” prontas para mostrar ou ouvir.", para: "/comunicacao", acao: "Abrir cartões" },
      { id: "adaptacoes", titulo: "Pensar nas adaptações da entrevista", descricao: "Legendas, tempo extra, perguntas por escrito: você decide o que pedir.", para: "/minha-acessibilidade", acao: "Abrir Minha Acessibilidade", opcional: true },
      { id: "profissao", titulo: "Conhecer a profissão da vaga", descricao: "Veja atividades e ferramentas para saber o que perguntar.", para: "/profissoes", acao: "Abrir dicionário", opcional: true },
    ],
  },
  {
    id: "acompanhar",
    titulo: "Quero acompanhar minhas candidaturas",
    resumo: "Ver em que etapa cada candidatura está e responder às empresas.",
    publico: "candidato",
    passos: [
      { id: "painel", titulo: "Ver suas candidaturas", descricao: "O painel mostra a situação de cada candidatura e os rascunhos em andamento.", para: "/dashboard/candidato", acao: "Abrir meu painel" },
      { id: "mensagens", titulo: "Ler as mensagens das empresas", descricao: "Respostas e convites chegam por aqui.", para: "/mensagens", acao: "Abrir mensagens" },
      { id: "avisos", titulo: "Conferir as notificações", descricao: "Avisos de mudança de etapa e de resposta a pedidos de adaptação.", para: "/notificacoes", acao: "Abrir notificações" },
    ],
  },
  {
    id: "atualizar-perfil",
    titulo: "Quero atualizar meu perfil",
    resumo: "Manter seus dados e suas escolhas de privacidade em dia.",
    publico: "candidato",
    passos: [
      { id: "perfil", titulo: "Atualizar dados e experiências", descricao: "Cargo, cidade, experiências, formações e habilidades.", para: "/perfil", acao: "Abrir meu perfil" },
      { id: "acessibilidade", titulo: "Rever Minha Acessibilidade", descricao: "Suas necessidades e preferências de comunicação ficam privadas até você autorizar.", para: "/minha-acessibilidade", acao: "Abrir Minha Acessibilidade", opcional: true },
      { id: "privacidade", titulo: "Conferir o que está visível", descricao: "Escolha o que aparece no seu perfil público.", para: "/configuracoes/privacidade", acao: "Abrir privacidade" },
    ],
  },

  // Empresas
  {
    id: "publicar-vaga",
    titulo: "Quero publicar uma vaga clara e acessível",
    resumo: "Escrever a vaga, informar o ambiente e conferir a acessibilidade antes de publicar.",
    publico: "empresa",
    passos: [
      { id: "nova-vaga", titulo: "Criar a vaga", descricao: "Preencha descrição, atividades, requisitos obrigatórios e desejáveis e etapas.", para: "/dashboard/empresa", acao: "Abrir painel da empresa" },
      { id: "ambiente", titulo: "Informar o ambiente e a entrevista", descricao: "Ruído, iluminação, acessibilidade física e o que a entrevista oferece. Tudo opcional.", para: "/dashboard/empresa", acao: "Abrir painel da empresa", opcional: true },
      { id: "avaliar", titulo: "Avaliar a vaga antes de publicar", descricao: "O avaliador aponta o que pode melhorar. Não bloqueia a publicação.", para: "/dashboard/empresa", acao: "Abrir painel da empresa" },
    ],
  },
  {
    id: "responder-adaptacoes",
    titulo: "Quero responder pedidos de adaptação",
    resumo: "Ver o que cada pessoa autorizou compartilhar e responder.",
    publico: "empresa",
    passos: [
      { id: "candidaturas", titulo: "Abrir as candidaturas da vaga", descricao: "Você só vê o que a pessoa autorizou, e só enquanto a candidatura estiver ativa.", para: "/dashboard/empresa", acao: "Abrir painel da empresa" },
      { id: "mensagens", titulo: "Combinar os detalhes por mensagem", descricao: "Use as mensagens para confirmar o que a empresa consegue oferecer.", para: "/mensagens", acao: "Abrir mensagens", opcional: true },
    ],
  },
  {
    id: "perfil-empresa",
    titulo: "Quero atualizar o perfil da empresa",
    resumo: "Apresentar a empresa e o que ela já faz pela inclusão.",
    publico: "empresa",
    passos: [{ id: "perfil", titulo: "Editar o perfil da empresa", descricao: "Descrição, cultura inclusiva e dados de contato.", para: "/perfil", acao: "Abrir perfil" }],
  },

  // Visitantes
  {
    id: "visitante-comecar",
    titulo: "Quero encontrar emprego",
    resumo: "Conhecer as vagas e criar a sua conta.",
    publico: "visitante",
    passos: [
      { id: "ver-vagas", titulo: "Ver as vagas abertas", descricao: "Qualquer pessoa pode ver as vagas, sem criar conta.", para: "/vagas", acao: "Ver vagas" },
      { id: "criar-conta", titulo: "Criar a sua conta", descricao: "Para se candidatar e guardar suas preferências.", para: "/cadastro", acao: "Criar conta" },
      { id: "entrar", titulo: "Ou entrar, se já tem conta", descricao: "Use o e-mail e a senha.", para: "/entrar", acao: "Entrar", opcional: true },
    ],
  },
];

/** Os objetivos que fazem sentido para quem está usando o site agora. Administradores não têm objetivos. */
export function objetivosPara(tipoDeUsuario: string | null | undefined): Objetivo[] {
  if (!tipoDeUsuario) return OBJETIVOS.filter((o) => o.publico === "visitante");
  if (tipoDeUsuario === "candidato") return OBJETIVOS.filter((o) => o.publico === "candidato");
  if (tipoDeUsuario === "empresa") return OBJETIVOS.filter((o) => o.publico === "empresa");

  return [];
}
