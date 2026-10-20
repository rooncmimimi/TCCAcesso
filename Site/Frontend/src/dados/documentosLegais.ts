/**
 * Termos de Uso e Política de Privacidade do ACESSO.
 *
 * O conteúdo descreve o que a plataforma realmente faz: cada dado citado existe no banco, cada
 * serviço externo citado está configurado, e cada direito descrito corresponde a uma tela ou a um
 * endpoint que existe. Escrever o que o sistema faz é o que torna um documento desses verdadeiro.
 *
 * ⚠️ Revisão jurídica pendente. Este texto foi redigido a partir do funcionamento do sistema, não
 * por advogado. Antes de o ACESSO operar com usuários reais, alguém habilitado precisa revisá-lo —
 * sobretudo as partes de dado sensível (declaração de deficiência) e de responsabilidade.
 *
 * `VERSAO_DOCUMENTOS` é gravada junto do aceite (`usuarios.termos_versao`): é o que permite saber
 * depois qual texto cada pessoa aceitou. **Mude a versão sempre que mudar o conteúdo** — senão o
 * registro de aceite passa a apontar para um texto que não é mais o que foi aceito.
 */
export const VERSAO_DOCUMENTOS = "2026-10-20";

/** Quando `true`, as telas avisam que o documento ainda não vale. */
export const CONTEUDO_PENDENTE = false;

export type Secao = { titulo: string; paragrafos: string[] };
export type DocumentoLegal = {
  chave: "termos" | "privacidade";
  titulo: string;
  resumo: string;
  secoes: Secao[];
};

export const TERMOS_DE_USO: DocumentoLegal = {
  chave: "termos",
  titulo: "Termos de Uso",
  resumo: `As regras de uso da plataforma ACESSO. Versão ${VERSAO_DOCUMENTOS}.`,
  secoes: [
    {
      titulo: "1. O que é o ACESSO",
      paragrafos: [
        "O ACESSO é uma rede profissional voltada à inclusão no mercado de trabalho, feita para pessoas com deficiência, profissionais de 50 anos ou mais e empresas que praticam contratação inclusiva.",
        "A plataforma conecta pessoas candidatas e empresas: permite montar um perfil profissional, publicar e procurar vagas, candidatar-se, trocar mensagens e publicar conteúdo na comunidade.",
        "O ACESSO não é uma agência de emprego nem participa da relação de trabalho entre quem contrata e quem é contratado. A decisão de contratar, e tudo o que dela decorre, é da empresa.",
        "O uso da plataforma é gratuito para pessoas candidatas e para empresas.",
      ],
    },
    {
      titulo: "2. Quem pode criar conta",
      paragrafos: [
        "Para criar uma conta é preciso ter 16 anos ou mais e fornecer informações verdadeiras sobre si.",
        "Conta de pessoa candidata: criada por uma pessoa física, para si mesma. Cada pessoa deve ter uma única conta.",
        "Conta de empresa: criada a partir de uma conta de pessoa candidata já existente, por alguém autorizado a representar a empresa. As duas contas ficam vinculadas, mas permanecem separadas, com acessos próprios.",
        "A conta de empresa passa por análise da equipe do ACESSO antes de poder publicar vagas. A análise verifica se a empresa existe e se o cadastro é coerente; ela pode ser recusada, e o motivo é informado.",
        "Você é responsável por manter sua senha em segredo e por tudo o que acontece na sua conta. Se suspeitar de acesso indevido, troque a senha e encerre as outras sessões em Configurações.",
      ],
    },
    {
      titulo: "3. O que você pode fazer",
      paragrafos: [
        "Pessoa candidata: montar e editar um perfil profissional, enviar currículo, declarar deficiência, candidatar-se a vagas, seguir pessoas e empresas, trocar mensagens, publicar na comunidade e ajustar as preferências de acessibilidade.",
        "Empresa: manter um perfil institucional, publicar e gerenciar vagas, ver e responder candidaturas, trocar mensagens com pessoas candidatas e publicar na comunidade.",
        "Você mantém a titularidade do conteúdo que publica. Ao publicar, autoriza o ACESSO a exibir esse conteúdo na plataforma para quem as suas configurações de privacidade permitirem — nada além disso.",
      ],
    },
    {
      titulo: "4. O que não é permitido",
      paragrafos: [
        "Publicar vaga com exigência discriminatória, ou usar a plataforma para discriminar por deficiência, idade, raça, cor, etnia, sexo, orientação sexual, identidade de gênero, religião, origem ou condição social.",
        "Fingir ser outra pessoa ou empresa, usar dados de terceiros, ou criar conta de empresa sem autorização para representá-la.",
        "Publicar vaga inexistente, cobrar qualquer valor de pessoas candidatas, ou pedir dados bancários, documentos de pagamento ou senhas por meio da plataforma.",
        "Assediar, ameaçar, difamar ou importunar outras pessoas; publicar conteúdo ilegal, violento ou sexual.",
        "Coletar dados de outras pessoas por meios automatizados, tentar burlar os controles de acesso da plataforma, ou atacar a disponibilidade do serviço.",
        "Usar currículos ou dados de contato obtidos aqui para finalidade diferente de processo seletivo.",
      ],
    },
    {
      titulo: "5. Moderação",
      paragrafos: [
        "Qualquer pessoa pode denunciar conteúdo ou conta pela própria plataforma. As denúncias são analisadas pela equipe do ACESSO.",
        "Conteúdo que viole estes Termos pode ser removido. Contas podem ser bloqueadas, e empresas podem ser suspensas ou ter o cadastro reprovado. Nesses casos o motivo é registrado e informado a quem foi afetado.",
        "A decisão pode ser contestada pelo canal de contato indicado no item 9.",
      ],
    },
    {
      titulo: "6. Encerrar a conta",
      paragrafos: [
        "Você pode pausar a conta a qualquer momento: ela deixa de aparecer para outras pessoas e é reativada quando você entrar de novo e confirmar.",
        "Você também pode excluir a conta definitivamente. A exclusão apaga seu perfil, currículo, candidaturas, publicações, mensagens e preferências. É irreversível.",
        "Podem permanecer, pelo tempo necessário: registros que a lei obrigue a guardar, e dados estritamente necessários à defesa em processo. O detalhe está na Política de Privacidade.",
      ],
    },
    {
      titulo: "7. Disponibilidade e limites de responsabilidade",
      paragrafos: [
        "O ACESSO é oferecido como está. A plataforma pode ficar indisponível para manutenção, por falha técnica ou por indisponibilidade dos serviços de infraestrutura de que depende.",
        "O ACESSO não garante que uma candidatura resultará em contratação, nem responde pelas decisões, condutas ou informações de empresas e de pessoas candidatas.",
        "O conteúdo publicado por quem usa a plataforma é de responsabilidade de quem publicou. O ACESSO atua sobre esse conteúdo quando é denunciado ou quando toma conhecimento, conforme o item 5.",
        "A plataforma verifica a existência da empresa no cadastro, mas isso não é garantia sobre a idoneidade dela ou sobre a veracidade de cada vaga. Desconfie de pedidos de dinheiro ou de dados sensíveis e denuncie.",
      ],
    },
    {
      titulo: "8. Mudanças nestes Termos",
      paragrafos: [
        "Estes Termos podem mudar. Cada versão tem um identificador, e o ACESSO registra qual versão você aceitou ao criar a conta e quando.",
        "Quando houver mudança relevante, o ACESSO avisará pelo e-mail cadastrado ou na própria plataforma, informando a data em que a nova versão passa a valer.",
        "Continuar usando a plataforma depois dessa data significa concordar com a versão nova. Se você não concordar, pode excluir a conta, como descrito no item 6.",
      ],
    },
    {
      titulo: "9. Contato e foro",
      paragrafos: [
        "Dúvidas, denúncias e pedidos sobre estes Termos: projetoacessoinclusivo@gmail.com.",
        "Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro do domicílio do usuário para resolver controvérsias, conforme o Código de Defesa do Consumidor.",
      ],
    },
  ],
};

export const POLITICA_DE_PRIVACIDADE: DocumentoLegal = {
  chave: "privacidade",
  titulo: "Política de Privacidade",
  resumo: `Como o ACESSO trata os seus dados pessoais. Versão ${VERSAO_DOCUMENTOS}.`,
  secoes: [
    {
      titulo: "1. Quem trata os seus dados",
      paragrafos: [
        "O ACESSO é o controlador dos dados pessoais tratados na plataforma, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).",
        "Contato para assuntos de privacidade, incluindo o exercício dos seus direitos: projetoacessoinclusivo@gmail.com.",
      ],
    },
    {
      titulo: "2. Quais dados são coletados",
      paragrafos: [
        "Ao criar a conta: nome completo, e-mail, telefone, CPF, data de nascimento, cidade e estado, além da senha, que é guardada apenas como hash e nunca em texto. O cadastro não pergunta o país: o ACESSO registra o Brasil em todas as contas.",
        "No perfil profissional, se você quiser preencher: título profissional, escolaridade, resumo, experiências, formações, habilidades, certificados, LinkedIn, GitHub, disponibilidade, pretensão salarial, foto e capa.",
        "Currículo: o arquivo que você enviar, quando enviar. É opcional.",
        "Declaração de deficiência e necessidades de acessibilidade, se você quiser declarar. São dados sensíveis e recebem o tratamento descrito no item 4.",
        "Uso da plataforma: candidaturas, vagas favoritadas, publicações, comentários, curtidas, compartilhamentos, mensagens, pessoas e empresas que você segue, bloqueios e denúncias que fizer.",
        "Preferências de acessibilidade e de notificação, para a plataforma abrir do jeito que você configurou.",
        "Segurança e funcionamento: sessões ativas com dispositivo e endereço IP, registros de auditoria de ações sensíveis, e o identificador da sua conta Google se você entrar por ela — nunca a sua senha do Google.",
        "De empresas: CNPJ, razão social, nome fantasia, setor, porte, endereço, site, descrição institucional, cultura inclusiva, logo e capa, além dos dados de quem responde pela conta.",
      ],
    },
    {
      titulo: "3. Por que cada dado é pedido, e com qual base legal",
      paragrafos: [
        "Executar o contrato (art. 7º, V): nome, e-mail, senha, telefone, data de nascimento, localidade, perfil profissional, currículo, candidaturas e mensagens. Sem eles a plataforma não funciona; por isso são obrigatórios no cadastro os dados da conta e os dados pessoais, e opcionais o currículo e a foto.",
        "Legítimo interesse (art. 7º, IX): CPF e CNPJ, guardados cifrados, para evitar contas duplicadas e confirmar que a empresa existe; e também segurança da conta, moderação de conteúdo, registros de auditoria e melhoria da plataforma.",
        "Consentimento (art. 7º, I e art. 11, I): declaração de deficiência e demais informações sensíveis que você escolher colocar no perfil. Você escolhe informar, e pode retirar a qualquer momento.",
      ],
    },
    {
      titulo: "4. Dados sensíveis: deficiência e acessibilidade",
      paragrafos: [
        "Declarar deficiência é sempre opcional. A plataforma funciona sem essa informação.",
        "A deficiência que você declara faz parte do seu perfil: ela aparece na seção de deficiências e fica visível para quem puder ver o seu perfil, inclusive empresas. Se não quiser que apareça, não declare, ou remova a declaração.",
        "O ACESSO não usa a declaração para pontuar ou classificar candidaturas.",
        "As preferências de acessibilidade da plataforma (contraste, tamanho de letra, leitura por voz, VLibras e semelhantes) são outra coisa: ficam na sua conta só para a tela abrir do jeito que você configurou, e não são exibidas no seu perfil.",
        "Você pode remover a declaração de deficiência a qualquer momento no seu perfil, e ela deixa de aparecer imediatamente.",
      ],
    },
    {
      titulo: "5. Com quem os dados são compartilhados",
      paragrafos: [
        "Empresas: quando você se candidata a uma vaga, a empresa daquela vaga recebe seu perfil, seu currículo e os dados necessários ao processo. Sem candidatura, uma empresa vê apenas o que o seu perfil mostra publicamente.",
        "Outras pessoas: o que você publica na comunidade e o seu perfil público ficam visíveis para quem suas configurações de privacidade permitirem. Você controla isso em Configurações › Privacidade.",
        "Provedores de infraestrutura, que tratam dados apenas para operar o serviço: Supabase (banco de dados e armazenamento de arquivos), Render (servidor da aplicação), Vercel (hospedagem do site), Brevo (envio de e-mails de confirmação e recuperação de senha) e Expo (entrega de notificações push).",
        "Google (entrar com a conta Google): apenas se você optar por esse caminho. O ACESSO recebe do Google o identificador da conta, o e-mail e o nome, e envia a ele apenas o necessário para a autenticação.",
        "Fontes de letra e VLibras: ao abrir o Site, o seu navegador busca as fontes de letra no Google Fonts e a fonte para dislexia no CDNFonts, e esses serviços recebem o seu endereço IP e dados técnicos do navegador, como acontece em qualquer pedido pela internet. Se você ativar o VLibras nas preferências de acessibilidade, o navegador também carrega o tradutor de Libras do Governo Federal (vlibras.gov.br), que passa a receber esses mesmos dados técnicos.",
        "IBGE: a lista de cidades é consultada no serviço público do IBGE para o preenchimento de localidade. Nenhum dado seu é enviado nessa consulta.",
        "Descrição automática de imagens: se você pedir uma sugestão de texto alternativo para uma imagem, aquela imagem é enviada a um serviço externo de inteligência artificial (OpenRouter) só para gerar a sugestão. É uma ação sua, nunca automática, e nenhum outro dado do seu perfil acompanha a imagem.",
        "Autoridades: mediante ordem judicial ou requisição legal, na medida exigida.",
        "O ACESSO não vende dados pessoais e não os compartilha para publicidade.",
      ],
    },
    {
      titulo: "6. Por quanto tempo os dados ficam guardados",
      paragrafos: [
        "Enquanto a sua conta existir, os dados do seu perfil ficam guardados para a plataforma funcionar.",
        "Conta pausada: os dados são mantidos e deixam de aparecer para outras pessoas, até você reativar.",
        "Conta excluída: perfil, currículo, candidaturas, publicações, mensagens e preferências são apagados, e o arquivo do currículo é removido do armazenamento.",
        "Podem ser mantidos depois da exclusão: registros de auditoria de ações sensíveis e dados necessários ao cumprimento de obrigação legal ou à defesa em processo, pelo prazo legal aplicável.",
      ],
    },
    {
      titulo: "7. Segurança",
      paragrafos: [
        "Senhas são guardadas apenas como hash, com algoritmo próprio para isso. Ninguém no ACESSO consegue ler a sua senha.",
        "CPF e CNPJ são guardados cifrados, com um hash separado usado apenas para detectar duplicidade.",
        "Currículos ficam em armazenamento privado e só são acessíveis por link temporário e assinado, gerado após a verificação de quem pode vê-los. Não existe link público de currículo.",
        "O acesso é feito por sessão autenticada, com renovação automática e possibilidade de encerrar sessões de outros dispositivos.",
        "Nenhum sistema é imune a incidentes. Se ocorrer um incidente de segurança com risco relevante a você, o ACESSO comunicará você e a Autoridade Nacional de Proteção de Dados, como manda a LGPD.",
      ],
    },
    {
      titulo: "8. Os seus direitos",
      paragrafos: [
        "Você pode: confirmar que tratamos seus dados e acessá-los; corrigir dados incompletos ou desatualizados; pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados fora da lei; pedir a portabilidade; saber com quem compartilhamos; revogar consentimento; e se opor a um tratamento feito com base em legítimo interesse.",
        "Boa parte disso está na própria plataforma: editar e apagar dados no perfil, ajustar visibilidade em Configurações › Privacidade, remover a declaração de deficiência, e pausar ou excluir a conta em Configurações › Conta.",
        "Para o que não estiver na plataforma, escreva para projetoacessoinclusivo@gmail.com. Respondemos no menor prazo possível, observado o prazo legal.",
        "Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).",
      ],
    },
    {
      titulo: "9. Cookies e armazenamento no navegador",
      paragrafos: [
        "O ACESSO não usa cookies de publicidade nem de rastreamento, e não compartilha dados com redes de anúncios.",
        "O navegador guarda localmente apenas o necessário para você continuar conectado e para manter as suas preferências de acessibilidade. Limpar os dados do site encerra a sessão e restaura as preferências padrão.",
      ],
    },
    {
      titulo: "10. Mudanças nesta Política",
      paragrafos: [
        "Esta Política pode mudar. Cada versão tem um identificador, e o ACESSO registra qual versão você aceitou ao criar a conta e quando.",
        "Mudanças relevantes são comunicadas pelo e-mail cadastrado ou na plataforma, com a data em que passam a valer.",
      ],
    },
  ],
};

export const DOCUMENTOS: Record<DocumentoLegal["chave"], DocumentoLegal> = {
  termos: TERMOS_DE_USO,
  privacidade: POLITICA_DE_PRIVACIDADE,
};
