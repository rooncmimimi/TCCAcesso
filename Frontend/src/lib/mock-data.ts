export type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  modalidade: "Presencial" | "Híbrido" | "Remoto";
  contrato: string;
  local: string;
  salario: string;
  recursos: string[];
  publicada: string;
  descricao: string;
};

export const vagas: Vaga[] = [
  {
    id: "1",
    titulo: "Assistente Administrativo Jr — Vaga Inclusiva PCD",
    empresa: "Grupo Aurora",
    modalidade: "Híbrido",
    contrato: "CLT",
    local: "São Paulo, SP",
    salario: "R$ 2.800",
    recursos: ["Leitor de tela", "Intérprete de Libras", "Rampa de acesso"],
    publicada: "há 2 horas",
    descricao:
      "Buscamos pessoas talentosas e comprometidas para integrar nossa equipe administrativa em um ambiente acolhedor e acessível.",
  },
  {
    id: "2",
    titulo: "Analista de Suporte Técnico",
    empresa: "Nortis Tecnologia",
    modalidade: "Remoto",
    contrato: "CLT",
    local: "Brasil (remoto)",
    salario: "R$ 4.200",
    recursos: ["Jornada flexível", "Equipamento adaptado", "Legendas em reuniões"],
    publicada: "há 5 horas",
    descricao:
      "Atendimento a clientes internos com foco em qualidade. Equipe treinada em comunicação acessível.",
  },
  {
    id: "3",
    titulo: "Auxiliar de Atendimento ao Cliente 50+",
    empresa: "Banco Serena",
    modalidade: "Presencial",
    contrato: "CLT",
    local: "Campinas, SP",
    salario: "R$ 2.400",
    recursos: ["Mobilidade reduzida", "Mentoria intergeracional"],
    publicada: "há 1 dia",
    descricao:
      "Programa dedicado a profissionais com mais de 50 anos, com trilha de capacitação remunerada.",
  },
  {
    id: "4",
    titulo: "Pessoa Desenvolvedora Front-end Pleno",
    empresa: "Vivaz Digital",
    modalidade: "Remoto",
    contrato: "PJ",
    local: "Brasil (remoto)",
    salario: "R$ 8.500",
    recursos: ["Acessibilidade digital", "Horário flexível"],
    publicada: "há 2 dias",
    descricao:
      "Squad de produto focada em acessibilidade digital e boas práticas de WCAG 2.2.",
  },
];

export type Post = {
  id: string;
  autor: string;
  papel: string;
  tempo: string;
  conteudo: string;
  tipo: "vaga" | "texto";
  curtidas: number;
  comentarios: number;
  vagaId?: string;
};

export const posts: Post[] = [
  {
    id: "p1",
    autor: "Grupo Aurora",
    papel: "Empresa parceira · publicou uma vaga",
    tempo: "2h",
    tipo: "vaga",
    vagaId: "1",
    conteudo:
      "Estamos em busca de pessoas talentosas e comprometidas para integrar nossa equipe! Valorizamos a diversidade e oferecemos um ambiente acolhedor, acessível e inclusivo para profissionais PCD.",
    curtidas: 128,
    comentarios: 14,
  },
  {
    id: "p2",
    autor: "Fulana da Silva",
    papel: "Analista de Processos · Pessoa com deficiência auditiva",
    tempo: "3h",
    tipo: "texto",
    conteudo:
      "Às vezes, os melhores encontros acontecem onde menos esperamos: no ambiente de trabalho. Hoje percebi como algumas conexões surgem de forma única e transformadora — aprendemos que as diferenças não afastam, elas unem e ensinam.",
    curtidas: 342,
    comentarios: 41,
  },
  {
    id: "p3",
    autor: "Nortis Tecnologia",
    papel: "Empresa parceira",
    tempo: "6h",
    tipo: "texto",
    conteudo:
      "Concluímos a auditoria de acessibilidade digital do nosso portal interno seguindo a WCAG 2.2. Próximo passo: capacitação de toda a liderança em comunicação inclusiva.",
    curtidas: 87,
    comentarios: 9,
  },
];

export const noticias = [
  "Empresas inclusivas têm 25% mais retenção de talentos",
  "A importância da acessibilidade digital nas organizações",
  "Como a tecnologia está promovendo a inclusão no mercado",
  "Lei de Cotas: o que muda para pequenas empresas em 2026",
];

export const empresasParceiras = [
  { nome: "Grupo Aurora", setor: "Varejo", vagas: 12 },
  { nome: "Nortis Tecnologia", setor: "Tecnologia", vagas: 8 },
  { nome: "Banco Serena", setor: "Financeiro", vagas: 5 },
  { nome: "Vivaz Digital", setor: "Produto digital", vagas: 4 },
];

export const conversas = [
  {
    id: "c1",
    nome: "Grupo Aurora",
    previa: "Olá! Gostaríamos de agendar uma conversa sobre a vaga.",
    tempo: "10min",
    naoLidas: 2,
  },
  {
    id: "c2",
    nome: "Nortis Tecnologia",
    previa: "Sua candidatura avançou para a etapa de entrevista.",
    tempo: "1h",
    naoLidas: 0,
  },
  {
    id: "c3",
    nome: "Banco Serena",
    previa: "Obrigado pelo interesse! Retornamos em breve.",
    tempo: "2d",
    naoLidas: 0,
  },
];

export const notificacoes = [
  {
    id: "n1",
    titulo: "Sua candidatura foi visualizada",
    detalhe: "Grupo Aurora visualizou seu perfil para a vaga de Assistente Administrativo.",
    tempo: "há 20 minutos",
    tipo: "candidatura" as const,
  },
  {
    id: "n2",
    titulo: "3 novas vagas compatíveis com seu perfil",
    detalhe: "Vagas remotas com suporte a leitor de tela em São Paulo.",
    tempo: "há 3 horas",
    tipo: "vaga" as const,
  },
  {
    id: "n3",
    titulo: "Nortis Tecnologia começou a seguir você",
    detalhe: "Empresa verificada do setor de tecnologia.",
    tempo: "ontem",
    tipo: "rede" as const,
  },
];
