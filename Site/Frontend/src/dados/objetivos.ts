import { tx } from "@/i18n/frases";

/**
 * Navegação por objetivos: caminhos guiados para o que a pessoa quer fazer, com SÓ os passos de que
 * ela precisa para aquele objetivo, em ordem. Cada passo leva a uma página que já existe; nada aqui
 * faz nada pela pessoa (não envia, não publica, não compartilha). Escritos à mão.
 */

export type RotaDoPasso =
  | "/vagas"
  | "/perfil"
  | "/minha-acessibilidade"
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
    get titulo() { return tx("Quero encontrar emprego"); },
    get resumo() { return tx("Ver as vagas, entender cada uma e guardar as que interessam."); },
    publico: "candidato",
    passos: [
      { id: "ajustar-leitura", get titulo() { return tx("Ajustar como você quer ler e navegar"); }, get descricao() { return tx("Tamanho da letra, voz, cores, varredura. Faça isso uma vez só."); }, para: "/configuracoes/acessibilidade", get acao() { return tx("Abrir ajustes"); }, opcional: true },
      { id: "ver-vagas", get titulo() { return tx("Ver as vagas e filtrar"); }, get descricao() { return tx("Filtre por cidade, modalidade e recursos de acessibilidade."); }, para: "/vagas", get acao() { return tx("Ver vagas"); } },
      { id: "entender-vaga", get titulo() { return tx("Abrir uma vaga e ouvir o resumo simples"); }, get descricao() { return tx("Dentro da vaga há um resumo em linguagem simples e o botão Ouvir."); }, para: "/vagas", get acao() { return tx("Escolher uma vaga"); } },
      { id: "comparar", get titulo() { return tx("Comparar até três vagas"); }, get descricao() { return tx("Veja lado a lado ambiente, acessibilidade física e adaptações."); }, para: "/comparar", get acao() { return tx("Comparar vagas"); }, opcional: true },
    ],
  },
  {
    id: "melhorar-curriculo",
    get titulo() { return tx("Quero melhorar meu currículo"); },
    get resumo() { return tx("Deixar o perfil completo e claro para as empresas."); },
    publico: "candidato",
    passos: [
      { id: "ver-profissoes", get titulo() { return tx("Ver como as profissões se chamam"); }, get descricao() { return tx("O dicionário ajuda a nomear o que você já fez."); }, para: "/profissoes", get acao() { return tx("Abrir dicionário"); }, opcional: true },
      { id: "experiencias", get titulo() { return tx("Escrever suas experiências e formações"); }, get descricao() { return tx("Conte onde trabalhou e o que fazia. Você pode ditar o texto."); }, para: "/perfil", get acao() { return tx("Abrir meu perfil"); } },
      { id: "apresentacao", get titulo() { return tx("Escrever sua apresentação"); }, get descricao() { return tx("Duas ou três frases sobre quem você é profissionalmente."); }, para: "/perfil", get acao() { return tx("Abrir meu perfil"); } },
    ],
  },
  {
    id: "candidatar",
    get titulo() { return tx("Quero me candidatar"); },
    get resumo() { return tx("Escolher a vaga, decidir o que compartilhar e enviar com segurança."); },
    publico: "candidato",
    passos: [
      { id: "escolher-vaga", get titulo() { return tx("Escolher a vaga"); }, get descricao() { return tx("Abra a vaga e leia o resumo, o ambiente e as etapas da seleção."); }, para: "/vagas", get acao() { return tx("Ver vagas"); } },
      { id: "definir-adaptacoes", get titulo() { return tx("Decidir quais adaptações você pode pedir"); }, get descricao() { return tx("Só o que você marcar na candidatura é compartilhado, e só com aquela empresa."); }, para: "/minha-acessibilidade", get acao() { return tx("Abrir Minha Acessibilidade"); }, opcional: true },
      { id: "enviar", get titulo() { return tx("Candidatar-se com a prévia de privacidade"); }, get descricao() { return tx("Na vaga, use Candidatar-se, revise o que a empresa vai receber e só então envie."); }, para: "/vagas", get acao() { return tx("Voltar às vagas"); } },
    ],
  },
  {
    id: "preparar-entrevista",
    get titulo() { return tx("Quero preparar uma entrevista"); },
    get resumo() { return tx("Preparar frases de apoio e combinar as adaptações."); },
    publico: "candidato",
    passos: [
      { id: "cartoes", get titulo() { return tx("Preparar cartões de comunicação"); }, get descricao() { return tx("Frases como “Preciso de um momento para responder” prontas para mostrar ou ouvir."); }, para: "/comunicacao", get acao() { return tx("Abrir cartões"); } },
      { id: "adaptacoes", get titulo() { return tx("Pensar nas adaptações da entrevista"); }, get descricao() { return tx("Legendas, tempo extra, perguntas por escrito: você decide o que pedir."); }, para: "/minha-acessibilidade", get acao() { return tx("Abrir Minha Acessibilidade"); }, opcional: true },
      { id: "profissao", get titulo() { return tx("Conhecer a profissão da vaga"); }, get descricao() { return tx("Veja atividades e ferramentas para saber o que perguntar."); }, para: "/profissoes", get acao() { return tx("Abrir dicionário"); }, opcional: true },
    ],
  },
  {
    id: "acompanhar",
    get titulo() { return tx("Quero acompanhar minhas candidaturas"); },
    get resumo() { return tx("Ver em que etapa cada candidatura está e responder às empresas."); },
    publico: "candidato",
    passos: [
      { id: "painel", get titulo() { return tx("Ver suas candidaturas"); }, get descricao() { return tx("O painel mostra a situação de cada candidatura e os rascunhos em andamento."); }, para: "/dashboard/candidato", get acao() { return tx("Abrir meu painel"); } },
      { id: "mensagens", get titulo() { return tx("Ler as mensagens das empresas"); }, get descricao() { return tx("Respostas e convites chegam por aqui."); }, para: "/mensagens", get acao() { return tx("Abrir mensagens"); } },
      { id: "avisos", get titulo() { return tx("Conferir as notificações"); }, get descricao() { return tx("Avisos de mudança de etapa e de resposta a pedidos de adaptação."); }, para: "/notificacoes", get acao() { return tx("Abrir notificações"); } },
    ],
  },
  {
    id: "atualizar-perfil",
    get titulo() { return tx("Quero atualizar meu perfil"); },
    get resumo() { return tx("Manter seus dados e suas escolhas de privacidade em dia."); },
    publico: "candidato",
    passos: [
      { id: "perfil", get titulo() { return tx("Atualizar dados e experiências"); }, get descricao() { return tx("Cargo, cidade, experiências, formações e habilidades."); }, para: "/perfil", get acao() { return tx("Abrir meu perfil"); } },
      { id: "acessibilidade", get titulo() { return tx("Rever Minha Acessibilidade"); }, get descricao() { return tx("Suas necessidades e preferências de comunicação ficam privadas até você autorizar."); }, para: "/minha-acessibilidade", get acao() { return tx("Abrir Minha Acessibilidade"); }, opcional: true },
      { id: "privacidade", get titulo() { return tx("Conferir o que está visível"); }, get descricao() { return tx("Escolha o que aparece no seu perfil público."); }, para: "/configuracoes/privacidade", get acao() { return tx("Abrir privacidade"); } },
    ],
  },

  // Empresas
  {
    id: "publicar-vaga",
    get titulo() { return tx("Quero publicar uma vaga clara e acessível"); },
    get resumo() { return tx("Escrever a vaga, informar o ambiente e conferir a acessibilidade antes de publicar."); },
    publico: "empresa",
    passos: [
      { id: "nova-vaga", get titulo() { return tx("Criar a vaga"); }, get descricao() { return tx("Preencha descrição, atividades, requisitos obrigatórios e desejáveis e etapas."); }, para: "/dashboard/empresa", get acao() { return tx("Abrir painel da empresa"); } },
      { id: "ambiente", get titulo() { return tx("Informar o ambiente e a entrevista"); }, get descricao() { return tx("Ruído, iluminação, acessibilidade física e o que a entrevista oferece. Tudo opcional."); }, para: "/dashboard/empresa", get acao() { return tx("Abrir painel da empresa"); }, opcional: true },
      { id: "avaliar", get titulo() { return tx("Avaliar a vaga antes de publicar"); }, get descricao() { return tx("O avaliador aponta o que pode melhorar. Não bloqueia a publicação."); }, para: "/dashboard/empresa", get acao() { return tx("Abrir painel da empresa"); } },
    ],
  },
  {
    id: "responder-adaptacoes",
    get titulo() { return tx("Quero responder pedidos de adaptação"); },
    get resumo() { return tx("Ver o que cada pessoa autorizou compartilhar e responder."); },
    publico: "empresa",
    passos: [
      { id: "candidaturas", get titulo() { return tx("Abrir as candidaturas da vaga"); }, get descricao() { return tx("Você só vê o que a pessoa autorizou, e só enquanto a candidatura estiver ativa."); }, para: "/dashboard/empresa", get acao() { return tx("Abrir painel da empresa"); } },
      { id: "mensagens", get titulo() { return tx("Combinar os detalhes por mensagem"); }, get descricao() { return tx("Use as mensagens para confirmar o que a empresa consegue oferecer."); }, para: "/mensagens", get acao() { return tx("Abrir mensagens"); }, opcional: true },
    ],
  },
  {
    id: "perfil-empresa",
    get titulo() { return tx("Quero atualizar o perfil da empresa"); },
    get resumo() { return tx("Apresentar a empresa e o que ela já faz pela inclusão."); },
    publico: "empresa",
    passos: [{ id: "perfil", get titulo() { return tx("Editar o perfil da empresa"); }, get descricao() { return tx("Descrição, cultura inclusiva e dados de contato."); }, para: "/perfil", get acao() { return tx("Abrir perfil"); } }],
  },

  // Visitantes
  {
    id: "visitante-comecar",
    get titulo() { return tx("Quero encontrar emprego"); },
    get resumo() { return tx("Conhecer as vagas e criar a sua conta."); },
    publico: "visitante",
    passos: [
      { id: "ver-vagas", get titulo() { return tx("Ver as vagas abertas"); }, get descricao() { return tx("Qualquer pessoa pode ver as vagas, sem criar conta."); }, para: "/vagas", get acao() { return tx("Ver vagas"); } },
      { id: "criar-conta", get titulo() { return tx("Criar a sua conta"); }, get descricao() { return tx("Para se candidatar e guardar suas preferências."); }, para: "/cadastro", get acao() { return tx("Criar conta"); } },
      { id: "entrar", get titulo() { return tx("Ou entrar, se já tem conta"); }, get descricao() { return tx("Use o e-mail e a senha."); }, para: "/entrar", get acao() { return tx("Entrar"); }, opcional: true },
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
