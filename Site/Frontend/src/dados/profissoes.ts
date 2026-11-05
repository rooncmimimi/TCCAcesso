/**
 * Dicionário visual de profissões: o que cada profissão faz, em linguagem simples. Texto escrito à
 * mão e genérico de propósito: a rotina real muda de empresa para empresa, e o dicionário nunca
 * promete salário, horário nem exigência de vaga nenhuma. A "ilustração" é um ícone grande (sem
 * imagens de terceiros, sem custo e sem licença a cumprir), com descrição em texto para leitores de tela.
 */

export type IconeDeProfissao = "atendimento" | "administrativo" | "caixa" | "producao" | "motorista" | "cozinha" | "limpeza" | "software" | "design" | "ensino" | "vendas" | "rh" | "estoque" | "saude";

export type Profissao = {
  id: string;
  nome: string;
  /** O que a pessoa faz, em uma ou duas frases. */
  resumo: string;
  atividades: string[];
  ferramentas: string[];
  habilidades: string[];
  /** Um dia comum, em passos curtos (exemplo, não regra). */
  rotina: string[];
  icone: IconeDeProfissao;
  /** Descrição da ilustração, para quem não a vê. */
  descricaoDaImagem: string;
};

export const PROFISSOES: readonly Profissao[] = [
  {
    id: "atendente",
    nome: "Atendente",
    resumo: "Recebe e ajuda clientes, pessoalmente, por telefone ou por mensagem, e resolve ou encaminha o que eles pedem.",
    atividades: ["Receber e cumprimentar clientes", "Responder dúvidas sobre produtos e serviços", "Registrar pedidos e reclamações", "Encaminhar o cliente para quem pode resolver"],
    ferramentas: ["Telefone ou headset", "Computador e sistema da empresa", "E-mail e aplicativos de mensagem"],
    habilidades: ["Explicar com clareza", "Paciência para escutar", "Organização para registrar o que foi combinado"],
    rotina: ["Abrir o sistema e conferir os recados do dia", "Atender clientes durante o turno", "Registrar cada atendimento", "Passar pendências para a próxima pessoa do turno"],
    icone: "atendimento",
    descricaoDaImagem: "Ícone de uma pessoa com fone de ouvido atendendo um cliente.",
  },
  {
    id: "auxiliar-administrativo",
    nome: "Auxiliar administrativo",
    resumo: "Ajuda o escritório a funcionar: organiza documentos, preenche planilhas e cuida de tarefas do dia a dia da equipe.",
    atividades: ["Organizar e arquivar documentos", "Preencher planilhas e cadastros", "Conferir notas e comprovantes", "Apoiar a equipe com tarefas de rotina"],
    ferramentas: ["Computador", "Planilhas e editor de texto", "E-mail", "Impressora e scanner"],
    habilidades: ["Atenção aos detalhes", "Organização", "Cuidado com prazos"],
    rotina: ["Conferir e-mails e pendências", "Digitar e atualizar cadastros", "Arquivar documentos do dia", "Entregar um resumo do que foi feito"],
    icone: "administrativo",
    descricaoDaImagem: "Ícone de uma prancheta com documentos sobre uma mesa de escritório.",
  },
  {
    id: "recepcionista",
    nome: "Recepcionista",
    resumo: "É a primeira pessoa que visitantes e clientes encontram: recebe, orienta e avisa quem foi procurado.",
    atividades: ["Receber e identificar visitantes", "Atender telefone e agendar compromissos", "Orientar sobre o caminho dentro do local", "Avisar a equipe sobre a chegada de alguém"],
    ferramentas: ["Telefone", "Agenda e sistema de visitas", "Computador"],
    habilidades: ["Boa comunicação", "Educação no trato", "Calma em momentos de movimento"],
    rotina: ["Abrir a recepção e conferir a agenda do dia", "Receber visitantes e avisar a equipe", "Atender telefonemas", "Fechar o dia deixando os recados anotados"],
    icone: "atendimento",
    descricaoDaImagem: "Ícone de um balcão de recepção com uma pessoa recebendo alguém.",
  },
  {
    id: "operador-de-caixa",
    nome: "Operador de caixa",
    resumo: "Registra as compras, recebe o pagamento e entrega o troco e o comprovante ao cliente.",
    atividades: ["Registrar produtos e serviços", "Receber pagamentos e dar troco", "Emitir comprovantes", "Conferir o valor do caixa no fim do turno"],
    ferramentas: ["Máquina de cartão", "Leitor de código de barras", "Sistema de caixa"],
    habilidades: ["Atenção com números", "Agilidade com calma", "Honestidade com valores"],
    rotina: ["Conferir o dinheiro do caixa ao começar", "Atender uma pessoa de cada vez", "Resolver dúvidas sobre preço ou pagamento", "Fechar e conferir o caixa"],
    icone: "caixa",
    descricaoDaImagem: "Ícone de um caixa registrador com notas e moedas.",
  },
  {
    id: "auxiliar-de-producao",
    nome: "Auxiliar de produção",
    resumo: "Trabalha em uma fábrica ou oficina ajudando a montar, embalar e conferir produtos.",
    atividades: ["Montar ou embalar produtos", "Conferir a qualidade das peças", "Abastecer a linha com materiais", "Manter o posto de trabalho limpo e organizado"],
    ferramentas: ["Ferramentas manuais", "Equipamentos de proteção", "Máquinas simples da linha"],
    habilidades: ["Atenção às instruções", "Trabalho em equipe", "Cuidado com a segurança"],
    rotina: ["Receber as orientações do turno", "Trabalhar no posto combinado", "Fazer pausas nos horários definidos", "Deixar o posto organizado ao sair"],
    icone: "producao",
    descricaoDaImagem: "Ícone de uma engrenagem sobre uma esteira de produção.",
  },
  {
    id: "motorista",
    nome: "Motorista",
    resumo: "Dirige veículos para levar pessoas ou entregar mercadorias com segurança e no horário combinado.",
    atividades: ["Conduzir o veículo seguindo o trajeto", "Conferir o veículo antes de sair", "Entregar ou receber cargas e documentos", "Registrar o percurso e as entregas"],
    ferramentas: ["Veículo", "Aplicativo de mapas", "Documentos de entrega"],
    habilidades: ["Direção segura", "Pontualidade", "Atenção ao trânsito"],
    rotina: ["Conferir o veículo e a rota", "Fazer as entregas ou viagens do dia", "Anotar ocorrências", "Devolver o veículo limpo e abastecido"],
    icone: "motorista",
    descricaoDaImagem: "Ícone de uma van de entregas na estrada.",
  },
  {
    id: "auxiliar-de-cozinha",
    nome: "Auxiliar de cozinha",
    resumo: "Ajuda a preparar refeições: lava, corta e organiza os alimentos e mantém a cozinha limpa.",
    atividades: ["Lavar e cortar alimentos", "Separar ingredientes das receitas", "Ajudar a montar os pratos", "Limpar a cozinha e os utensílios"],
    ferramentas: ["Facas e utensílios", "Fogão e forno", "Equipamentos de proteção"],
    habilidades: ["Higiene", "Agilidade", "Trabalho em equipe"],
    rotina: ["Lavar as mãos e vestir o uniforme", "Preparar os ingredientes do dia", "Ajudar no serviço das refeições", "Limpar e organizar a cozinha"],
    icone: "cozinha",
    descricaoDaImagem: "Ícone de uma panela com vapor sobre um fogão.",
  },
  {
    id: "auxiliar-de-limpeza",
    nome: "Auxiliar de limpeza",
    resumo: "Mantém limpos e organizados os espaços de uso de todos, como salas, banheiros e áreas comuns.",
    atividades: ["Varrer, passar pano e limpar superfícies", "Higienizar banheiros e áreas comuns", "Repor materiais de higiene", "Recolher o lixo e separar o que é reciclável"],
    ferramentas: ["Vassoura, rodo e panos", "Produtos de limpeza", "Luvas e outros equipamentos de proteção"],
    habilidades: ["Atenção aos detalhes", "Organização do tempo", "Cuidado com produtos e segurança"],
    rotina: ["Separar o material e os equipamentos de proteção", "Limpar as áreas na ordem combinada", "Repor o que estiver faltando", "Guardar o material no lugar"],
    icone: "limpeza",
    descricaoDaImagem: "Ícone de um balde com rodo e espuma.",
  },
  {
    id: "desenvolvedor-junior",
    nome: "Desenvolvedor de software júnior",
    resumo: "Escreve e corrige programas de computador, com ajuda de pessoas mais experientes da equipe.",
    atividades: ["Escrever partes de programas", "Corrigir erros (bugs)", "Testar o que foi feito", "Participar de reuniões rápidas da equipe"],
    ferramentas: ["Computador", "Editor de código", "Git (controle de versões)", "Ferramentas de comunicação da equipe"],
    habilidades: ["Raciocínio lógico", "Vontade de aprender", "Clareza para pedir ajuda"],
    rotina: ["Ver as tarefas combinadas para o dia", "Programar e testar", "Pedir revisão do que fez", "Atualizar a equipe sobre o andamento"],
    icone: "software",
    descricaoDaImagem: "Ícone de um monitor com símbolos de código na tela.",
  },
  {
    id: "designer-grafico",
    nome: "Designer gráfico",
    resumo: "Cria imagens, cartazes, postagens e materiais visuais que comunicam uma ideia de forma clara.",
    atividades: ["Criar artes para impressos e redes sociais", "Escolher cores, fontes e imagens", "Ajustar o trabalho depois de receber comentários", "Preparar arquivos para impressão ou internet"],
    ferramentas: ["Computador ou tablet", "Programas de edição de imagem e ilustração", "Biblioteca de imagens e fontes"],
    habilidades: ["Senso visual", "Escuta de quem pede o trabalho", "Organização de arquivos"],
    rotina: ["Entender o pedido do dia", "Criar uma ou mais versões", "Mostrar e ajustar com a equipe", "Entregar os arquivos finais"],
    icone: "design",
    descricaoDaImagem: "Ícone de uma paleta de cores com um pincel.",
  },
  {
    id: "instrutor",
    nome: "Professor ou instrutor",
    resumo: "Ensina uma pessoa ou um grupo a fazer algo novo, em aulas, oficinas ou treinamentos.",
    atividades: ["Preparar a aula ou o treinamento", "Explicar o conteúdo com exemplos", "Acompanhar a aprendizagem de cada pessoa", "Avaliar e dar retorno"],
    ferramentas: ["Material didático", "Quadro, projetor ou tela", "Computador e plataformas de ensino"],
    habilidades: ["Explicar de formas diferentes", "Paciência", "Planejamento"],
    rotina: ["Revisar o plano da aula", "Dar a aula e tirar dúvidas", "Corrigir atividades", "Anotar o que precisa ser reforçado"],
    icone: "ensino",
    descricaoDaImagem: "Ícone de um quadro-negro com um livro aberto.",
  },
  {
    id: "vendedor",
    nome: "Vendedor",
    resumo: "Apresenta produtos ou serviços a clientes, entende o que eles precisam e fecha a venda.",
    atividades: ["Atender e ouvir o cliente", "Mostrar produtos e explicar preços e condições", "Registrar vendas e pedidos", "Acompanhar o cliente depois da compra"],
    ferramentas: ["Catálogo ou amostras", "Sistema de vendas", "Telefone e aplicativos de mensagem"],
    habilidades: ["Comunicação", "Conhecer o que vende", "Honestidade com o cliente"],
    rotina: ["Conferir metas e novidades do dia", "Atender clientes", "Registrar as vendas", "Retornar para clientes que pediram contato"],
    icone: "vendas",
    descricaoDaImagem: "Ícone de uma sacola de compras com uma etiqueta de preço.",
  },
  {
    id: "assistente-de-rh",
    nome: "Assistente de RH",
    resumo: "Apoia o setor de pessoas: organiza contratações, documentos e informações dos colegas de trabalho.",
    atividades: ["Organizar documentos de admissão", "Ajudar nos processos seletivos", "Atualizar cadastros de colaboradores", "Responder dúvidas sobre benefícios e rotinas"],
    ferramentas: ["Computador e planilhas", "Sistema de gestão de pessoas", "E-mail e telefone"],
    habilidades: ["Sigilo com informações pessoais", "Organização", "Escuta e boa comunicação"],
    rotina: ["Ver as demandas do dia", "Atender colegas e candidatos", "Atualizar cadastros e documentos", "Passar o andamento ao time de RH"],
    icone: "rh",
    descricaoDaImagem: "Ícone de duas pessoas ao lado de um crachá.",
  },
  {
    id: "estoquista",
    nome: "Estoquista ou almoxarife",
    resumo: "Cuida do estoque: recebe, guarda, separa e entrega mercadorias e materiais, sempre conferindo as quantidades.",
    atividades: ["Receber e conferir mercadorias", "Guardar cada item no lugar certo", "Separar pedidos", "Contar o estoque e anotar diferenças"],
    ferramentas: ["Leitor de código de barras", "Carrinho ou paleteira", "Sistema de estoque ou planilha"],
    habilidades: ["Organização", "Atenção com números", "Cuidado ao carregar peso"],
    rotina: ["Receber as entregas do dia", "Guardar e etiquetar os itens", "Separar os pedidos solicitados", "Atualizar o estoque no sistema"],
    icone: "estoque",
    descricaoDaImagem: "Ícone de caixas empilhadas em uma prateleira.",
  },
  {
    id: "tecnico-de-enfermagem",
    nome: "Técnico de enfermagem",
    resumo: "Ajuda a cuidar de pacientes seguindo as orientações da equipe de saúde, com formação técnica e registro profissional.",
    atividades: ["Aferir pressão, temperatura e outros sinais", "Auxiliar em curativos e procedimentos", "Dar medicamentos conforme a prescrição", "Registrar tudo no prontuário"],
    ferramentas: ["Termômetro e aparelho de pressão", "Materiais de curativo", "Prontuário (em papel ou no computador)"],
    habilidades: ["Atenção e cuidado", "Trabalho em equipe", "Calma em situações difíceis"],
    rotina: ["Receber o plantão e a passagem de informações", "Cuidar dos pacientes conforme a escala", "Registrar os cuidados feitos", "Passar o plantão para a próxima equipe"],
    icone: "saude",
    descricaoDaImagem: "Ícone de uma cruz de saúde ao lado de um estetoscópio.",
  },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtra por nome, resumo, atividades, ferramentas e habilidades. Busca vazia devolve tudo. */
export function buscarProfissoes(busca: string, lista: readonly Profissao[] = PROFISSOES): Profissao[] {
  const termo = semAcento(busca).trim();

  if (!termo) return [...lista];

  return lista.filter((p) => semAcento([p.nome, p.resumo, ...p.atividades, ...p.ferramentas, ...p.habilidades].join(" ")).includes(termo));
}
