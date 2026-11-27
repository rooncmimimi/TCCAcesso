import { tx } from "@/i18n/frases";

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
  /** O que procurar nas vagas: em português nos três idiomas, porque é assim que elas são escritas. */
  termoDeBusca: string;
  /** Um dia comum, em passos curtos (exemplo, não regra). */
  rotina: string[];
  icone: IconeDeProfissao;
  /** Descrição da ilustração, para quem não a vê. */
  descricaoDaImagem: string;
};

export const PROFISSOES: readonly Profissao[] = [
  {
    id: "atendente",
    get nome() { return tx("Atendente"); },
    termoDeBusca: "Atendente",
    get resumo() { return tx("Recebe e ajuda clientes, pessoalmente, por telefone ou por mensagem, e resolve ou encaminha o que eles pedem."); },
    get atividades() { return [tx("Receber e cumprimentar clientes"), tx("Responder dúvidas sobre produtos e serviços"), tx("Registrar pedidos e reclamações"), tx("Encaminhar o cliente para quem pode resolver")]; },
    get ferramentas() { return [tx("Telefone ou headset"), tx("Computador e sistema da empresa"), tx("E-mail e aplicativos de mensagem")]; },
    get habilidades() { return [tx("Explicar com clareza"), tx("Paciência para escutar"), tx("Organização para registrar o que foi combinado")]; },
    get rotina() { return [tx("Abrir o sistema e conferir os recados do dia"), tx("Atender clientes durante o turno"), tx("Registrar cada atendimento"), tx("Passar pendências para a próxima pessoa do turno")]; },
    icone: "atendimento",
    get descricaoDaImagem() { return tx("Ícone de uma pessoa com fone de ouvido atendendo um cliente."); },
  },
  {
    id: "auxiliar-administrativo",
    get nome() { return tx("Auxiliar administrativo"); },
    termoDeBusca: "Auxiliar administrativo",
    get resumo() { return tx("Ajuda o escritório a funcionar: organiza documentos, preenche planilhas e cuida de tarefas do dia a dia da equipe."); },
    get atividades() { return [tx("Organizar e arquivar documentos"), tx("Preencher planilhas e cadastros"), tx("Conferir notas e comprovantes"), tx("Apoiar a equipe com tarefas de rotina")]; },
    get ferramentas() { return [tx("Computador"), tx("Planilhas e editor de texto"), "E-mail", tx("Impressora e scanner")]; },
    get habilidades() { return [tx("Atenção aos detalhes"), tx("Organização"), tx("Cuidado com prazos")]; },
    get rotina() { return [tx("Conferir e-mails e pendências"), tx("Digitar e atualizar cadastros"), tx("Arquivar documentos do dia"), tx("Entregar um resumo do que foi feito")]; },
    icone: "administrativo",
    get descricaoDaImagem() { return tx("Ícone de uma prancheta com documentos sobre uma mesa de escritório."); },
  },
  {
    id: "recepcionista",
    get nome() { return tx("Recepcionista"); },
    termoDeBusca: "Recepcionista",
    get resumo() { return tx("É a primeira pessoa que visitantes e clientes encontram: recebe, orienta e avisa quem foi procurado."); },
    get atividades() { return [tx("Receber e identificar visitantes"), tx("Atender telefone e agendar compromissos"), tx("Orientar sobre o caminho dentro do local"), tx("Avisar a equipe sobre a chegada de alguém")]; },
    get ferramentas() { return [tx("Telefone"), tx("Agenda e sistema de visitas"), tx("Computador")]; },
    get habilidades() { return [tx("Boa comunicação"), tx("Educação no trato"), tx("Calma em momentos de movimento")]; },
    get rotina() { return [tx("Abrir a recepção e conferir a agenda do dia"), tx("Receber visitantes e avisar a equipe"), tx("Atender telefonemas"), tx("Fechar o dia deixando os recados anotados")]; },
    icone: "atendimento",
    get descricaoDaImagem() { return tx("Ícone de um balcão de recepção com uma pessoa recebendo alguém."); },
  },
  {
    id: "operador-de-caixa",
    get nome() { return tx("Operador de caixa"); },
    termoDeBusca: "Operador de caixa",
    get resumo() { return tx("Registra as compras, recebe o pagamento e entrega o troco e o comprovante ao cliente."); },
    get atividades() { return [tx("Registrar produtos e serviços"), tx("Receber pagamentos e dar troco"), tx("Emitir comprovantes"), tx("Conferir o valor do caixa no fim do turno")]; },
    get ferramentas() { return [tx("Máquina de cartão"), tx("Leitor de código de barras"), tx("Sistema de caixa")]; },
    get habilidades() { return [tx("Atenção com números"), tx("Agilidade com calma"), tx("Honestidade com valores")]; },
    get rotina() { return [tx("Conferir o dinheiro do caixa ao começar"), tx("Atender uma pessoa de cada vez"), tx("Resolver dúvidas sobre preço ou pagamento"), tx("Fechar e conferir o caixa")]; },
    icone: "caixa",
    get descricaoDaImagem() { return tx("Ícone de um caixa registrador com notas e moedas."); },
  },
  {
    id: "auxiliar-de-producao",
    get nome() { return tx("Auxiliar de produção"); },
    termoDeBusca: "Auxiliar de produção",
    get resumo() { return tx("Trabalha em uma fábrica ou oficina ajudando a montar, embalar e conferir produtos."); },
    get atividades() { return [tx("Montar ou embalar produtos"), tx("Conferir a qualidade das peças"), tx("Abastecer a linha com materiais"), tx("Manter o posto de trabalho limpo e organizado")]; },
    get ferramentas() { return [tx("Ferramentas manuais"), tx("Equipamentos de proteção"), tx("Máquinas simples da linha")]; },
    get habilidades() { return [tx("Atenção às instruções"), tx("Trabalho em equipe"), tx("Cuidado com a segurança")]; },
    get rotina() { return [tx("Receber as orientações do turno"), tx("Trabalhar no posto combinado"), tx("Fazer pausas nos horários definidos"), tx("Deixar o posto organizado ao sair")]; },
    icone: "producao",
    get descricaoDaImagem() { return tx("Ícone de uma engrenagem sobre uma esteira de produção."); },
  },
  {
    id: "motorista",
    get nome() { return tx("Motorista"); },
    termoDeBusca: "Motorista",
    get resumo() { return tx("Dirige veículos para levar pessoas ou entregar mercadorias com segurança e no horário combinado."); },
    get atividades() { return [tx("Conduzir o veículo seguindo o trajeto"), tx("Conferir o veículo antes de sair"), tx("Entregar ou receber cargas e documentos"), tx("Registrar o percurso e as entregas")]; },
    get ferramentas() { return [tx("Veículo"), tx("Aplicativo de mapas"), tx("Documentos de entrega")]; },
    get habilidades() { return [tx("Direção segura"), tx("Pontualidade"), tx("Atenção ao trânsito")]; },
    get rotina() { return [tx("Conferir o veículo e a rota"), tx("Fazer as entregas ou viagens do dia"), tx("Anotar ocorrências"), tx("Devolver o veículo limpo e abastecido")]; },
    icone: "motorista",
    get descricaoDaImagem() { return tx("Ícone de uma van de entregas na estrada."); },
  },
  {
    id: "auxiliar-de-cozinha",
    get nome() { return tx("Auxiliar de cozinha"); },
    termoDeBusca: "Auxiliar de cozinha",
    get resumo() { return tx("Ajuda a preparar refeições: lava, corta e organiza os alimentos e mantém a cozinha limpa."); },
    get atividades() { return [tx("Lavar e cortar alimentos"), tx("Separar ingredientes das receitas"), tx("Ajudar a montar os pratos"), tx("Limpar a cozinha e os utensílios")]; },
    get ferramentas() { return [tx("Facas e utensílios"), tx("Fogão e forno"), tx("Equipamentos de proteção")]; },
    get habilidades() { return [tx("Higiene"), tx("Agilidade"), tx("Trabalho em equipe")]; },
    get rotina() { return [tx("Lavar as mãos e vestir o uniforme"), tx("Preparar os ingredientes do dia"), tx("Ajudar no serviço das refeições"), tx("Limpar e organizar a cozinha")]; },
    icone: "cozinha",
    get descricaoDaImagem() { return tx("Ícone de uma panela com vapor sobre um fogão."); },
  },
  {
    id: "auxiliar-de-limpeza",
    get nome() { return tx("Auxiliar de limpeza"); },
    termoDeBusca: "Auxiliar de limpeza",
    get resumo() { return tx("Mantém limpos e organizados os espaços de uso de todos, como salas, banheiros e áreas comuns."); },
    get atividades() { return [tx("Varrer, passar pano e limpar superfícies"), tx("Higienizar banheiros e áreas comuns"), tx("Repor materiais de higiene"), tx("Recolher o lixo e separar o que é reciclável")]; },
    get ferramentas() { return [tx("Vassoura, rodo e panos"), tx("Produtos de limpeza"), tx("Luvas e outros equipamentos de proteção")]; },
    get habilidades() { return [tx("Atenção aos detalhes"), tx("Organização do tempo"), tx("Cuidado com produtos e segurança")]; },
    get rotina() { return [tx("Separar o material e os equipamentos de proteção"), tx("Limpar as áreas na ordem combinada"), tx("Repor o que estiver faltando"), tx("Guardar o material no lugar")]; },
    icone: "limpeza",
    get descricaoDaImagem() { return tx("Ícone de um balde com rodo e espuma."); },
  },
  {
    id: "desenvolvedor-junior",
    get nome() { return tx("Desenvolvedor de software júnior"); },
    termoDeBusca: "Desenvolvedor de software júnior",
    get resumo() { return tx("Escreve e corrige programas de computador, com ajuda de pessoas mais experientes da equipe."); },
    get atividades() { return [tx("Escrever partes de programas"), tx("Corrigir erros (bugs)"), tx("Testar o que foi feito"), tx("Participar de reuniões rápidas da equipe")]; },
    get ferramentas() { return [tx("Computador"), tx("Editor de código"), tx("Git (controle de versões)"), tx("Ferramentas de comunicação da equipe")]; },
    get habilidades() { return [tx("Raciocínio lógico"), tx("Vontade de aprender"), tx("Clareza para pedir ajuda")]; },
    get rotina() { return [tx("Ver as tarefas combinadas para o dia"), tx("Programar e testar"), tx("Pedir revisão do que fez"), tx("Atualizar a equipe sobre o andamento")]; },
    icone: "software",
    get descricaoDaImagem() { return tx("Ícone de um monitor com símbolos de código na tela."); },
  },
  {
    id: "designer-grafico",
    get nome() { return tx("Designer gráfico"); },
    termoDeBusca: "Designer gráfico",
    get resumo() { return tx("Cria imagens, cartazes, postagens e materiais visuais que comunicam uma ideia de forma clara."); },
    get atividades() { return [tx("Criar artes para impressos e redes sociais"), tx("Escolher cores, fontes e imagens"), tx("Ajustar o trabalho depois de receber comentários"), tx("Preparar arquivos para impressão ou internet")]; },
    get ferramentas() { return [tx("Computador ou tablet"), tx("Programas de edição de imagem e ilustração"), tx("Biblioteca de imagens e fontes")]; },
    get habilidades() { return [tx("Senso visual"), tx("Escuta de quem pede o trabalho"), tx("Organização de arquivos")]; },
    get rotina() { return [tx("Entender o pedido do dia"), tx("Criar uma ou mais versões"), tx("Mostrar e ajustar com a equipe"), tx("Entregar os arquivos finais")]; },
    icone: "design",
    get descricaoDaImagem() { return tx("Ícone de uma paleta de cores com um pincel."); },
  },
  {
    id: "instrutor",
    get nome() { return tx("Professor ou instrutor"); },
    termoDeBusca: "Professor",
    get resumo() { return tx("Ensina uma pessoa ou um grupo a fazer algo novo, em aulas, oficinas ou treinamentos."); },
    get atividades() { return [tx("Preparar a aula ou o treinamento"), tx("Explicar o conteúdo com exemplos"), tx("Acompanhar a aprendizagem de cada pessoa"), tx("Avaliar e dar retorno")]; },
    get ferramentas() { return [tx("Material didático"), tx("Quadro, projetor ou tela"), tx("Computador e plataformas de ensino")]; },
    get habilidades() { return [tx("Explicar de formas diferentes"), tx("Paciência"), tx("Planejamento")]; },
    get rotina() { return [tx("Revisar o plano da aula"), tx("Dar a aula e tirar dúvidas"), tx("Corrigir atividades"), tx("Anotar o que precisa ser reforçado")]; },
    icone: "ensino",
    get descricaoDaImagem() { return tx("Ícone de um quadro-negro com um livro aberto."); },
  },
  {
    id: "vendedor",
    get nome() { return tx("Vendedor"); },
    termoDeBusca: "Vendedor",
    get resumo() { return tx("Apresenta produtos ou serviços a clientes, entende o que eles precisam e fecha a venda."); },
    get atividades() { return [tx("Atender e ouvir o cliente"), tx("Mostrar produtos e explicar preços e condições"), tx("Registrar vendas e pedidos"), tx("Acompanhar o cliente depois da compra")]; },
    get ferramentas() { return [tx("Catálogo ou amostras"), tx("Sistema de vendas"), tx("Telefone e aplicativos de mensagem")]; },
    get habilidades() { return [tx("Comunicação"), tx("Conhecer o que vende"), tx("Honestidade com o cliente")]; },
    get rotina() { return [tx("Conferir metas e novidades do dia"), tx("Atender clientes"), tx("Registrar as vendas"), tx("Retornar para clientes que pediram contato")]; },
    icone: "vendas",
    get descricaoDaImagem() { return tx("Ícone de uma sacola de compras com uma etiqueta de preço."); },
  },
  {
    id: "assistente-de-rh",
    get nome() { return tx("Assistente de RH"); },
    termoDeBusca: "Assistente de RH",
    get resumo() { return tx("Apoia o setor de pessoas: organiza contratações, documentos e informações dos colegas de trabalho."); },
    get atividades() { return [tx("Organizar documentos de admissão"), tx("Ajudar nos processos seletivos"), tx("Atualizar cadastros de colaboradores"), tx("Responder dúvidas sobre benefícios e rotinas")]; },
    get ferramentas() { return [tx("Computador e planilhas"), tx("Sistema de gestão de pessoas"), tx("E-mail e telefone")]; },
    get habilidades() { return [tx("Sigilo com informações pessoais"), tx("Organização"), tx("Escuta e boa comunicação")]; },
    get rotina() { return [tx("Ver as demandas do dia"), tx("Atender colegas e candidatos"), tx("Atualizar cadastros e documentos"), tx("Passar o andamento ao time de RH")]; },
    icone: "rh",
    get descricaoDaImagem() { return tx("Ícone de duas pessoas ao lado de um crachá."); },
  },
  {
    id: "estoquista",
    get nome() { return tx("Estoquista ou almoxarife"); },
    termoDeBusca: "Estoquista",
    get resumo() { return tx("Cuida do estoque: recebe, guarda, separa e entrega mercadorias e materiais, sempre conferindo as quantidades."); },
    get atividades() { return [tx("Receber e conferir mercadorias"), tx("Guardar cada item no lugar certo"), tx("Separar pedidos"), tx("Contar o estoque e anotar diferenças")]; },
    get ferramentas() { return [tx("Leitor de código de barras"), tx("Carrinho ou paleteira"), tx("Sistema de estoque ou planilha")]; },
    get habilidades() { return [tx("Organização"), tx("Atenção com números"), tx("Cuidado ao carregar peso")]; },
    get rotina() { return [tx("Receber as entregas do dia"), tx("Guardar e etiquetar os itens"), tx("Separar os pedidos solicitados"), tx("Atualizar o estoque no sistema")]; },
    icone: "estoque",
    get descricaoDaImagem() { return tx("Ícone de caixas empilhadas em uma prateleira."); },
  },
  {
    id: "tecnico-de-enfermagem",
    get nome() { return tx("Técnico de enfermagem"); },
    termoDeBusca: "Técnico de enfermagem",
    get resumo() { return tx("Ajuda a cuidar de pacientes seguindo as orientações da equipe de saúde, com formação técnica e registro profissional."); },
    get atividades() { return [tx("Aferir pressão, temperatura e outros sinais"), tx("Auxiliar em curativos e procedimentos"), tx("Dar medicamentos conforme a prescrição"), tx("Registrar tudo no prontuário")]; },
    get ferramentas() { return [tx("Termômetro e aparelho de pressão"), tx("Materiais de curativo"), tx("Prontuário (em papel ou no computador)")]; },
    get habilidades() { return [tx("Atenção e cuidado"), tx("Trabalho em equipe"), tx("Calma em situações difíceis")]; },
    get rotina() { return [tx("Receber o plantão e a passagem de informações"), tx("Cuidar dos pacientes conforme a escala"), tx("Registrar os cuidados feitos"), tx("Passar o plantão para a próxima equipe")]; },
    icone: "saude",
    get descricaoDaImagem() { return tx("Ícone de uma cruz de saúde ao lado de um estetoscópio."); },
  },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtra por nome, resumo, atividades, ferramentas e habilidades. Busca vazia devolve tudo. */
export function buscarProfissoes(busca: string, lista: readonly Profissao[] = PROFISSOES): Profissao[] {
  const termo = semAcento(busca).trim();

  if (!termo) return [...lista];

  return lista.filter((p) => semAcento([p.nome, p.resumo, ...p.atividades, ...p.ferramentas, ...p.habilidades].join(" ")).includes(termo));
}
