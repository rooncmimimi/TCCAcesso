## Visitante (não autenticado)

O visitante é qualquer pessoa que abre o Site (`Site/Frontend`) sem sessão: nunca entrou, ainda não criou conta, já saiu da conta ou teve a sessão salva expirada. Esta seção descreve apenas o Site. O aplicativo Android (`App/AcessoApk`) é um projeto separado e está fora do escopo.

**Convenções.** "Tela" é a rota do Site (React + TanStack Router). "API" é o método e o caminho no backend Express, sempre sob o prefixo `/api`. Textos entre aspas são as mensagens que o Site mostra hoje, ou que a API devolve, em português; em inglês e espanhol o Site e a API mostram as traduções correspondentes. Quando a API recusa uma ação por validação (422), o Site mostra a primeira mensagem da lista `erros`; sem ela, a `mensagem` geral da resposta; e, se a resposta não trouxer nenhuma (por exemplo, falha de rede), um texto padrão da própria tela. Tudo foi conferido no código da branch atual.

**O que existe sem login**

- Rotas livres: `/`, `/sobre-nos`, `/termos`, `/privacidade`, `/vagas`, `/vaga/:vagaId`, `/configuracoes/acessibilidade`, `/entrar`, `/cadastro` (só redireciona), `/cadastro/candidato`, `/cadastro/empresa` (para o visitante só mostra um aviso), `/recuperar-senha`, `/redefinir-senha`, `/confirmar-email`, `/retorno-google` e `/boas-vindas`.
- Rotas que mandam o visitante para `/entrar`: `/feed`, `/descobrir`, `/mensagens`, `/notificacoes`, `/minha-atividade`, `/perfil`, `/perfil/:usuarioId`, `/postagem/:postagemId`, `/dashboard` (e `/dashboard/candidato`, `/dashboard/empresa`), `/admin/*` e todas as `/configuracoes/*`, exceto `/configuracoes/acessibilidade` (UC-V05).
- Não existe busca global para o visitante: a barra de busca só aparece no cabeçalho de quem tem sessão, e `GET /api/busca` exige login. A única busca pública é o filtro da lista de vagas (UC-V08).
- Feed, mensagens, notificações, seguir, denunciar, bloquear, perfil público e configurações da conta são funções comuns (UC-G) e exigem login. No Site, o perfil de pessoas e de empresas (`/perfil/:usuarioId`) também exige login; na API, os endpoints de empresa `GET /api/empresas/:id` e `GET /api/empresas/usuario/:usuarioId` respondem sem token para empresas de perfil público (UC-V37).
- Idioma e acessibilidade também existem para contas autenticadas (UC-G38 a UC-G40); aqui descrevemos só o comportamento do visitante, em que tudo fica salvo no navegador e não vai para nenhuma conta.
- API pública sem tela: alguns endpoints respondem sem login e nenhuma tela do Site os mostra (UC-V37).
- Limite geral da API: 300 requisições a cada 15 minutos por IP; acima disso a resposta é 429 "Muitas requisições. Tente novamente em alguns minutos."

### Resumo dos casos de uso

| ID | Caso de uso | Resumo |
| --- | --- | --- |
| UC-V01 | Ver a página inicial | Apresentação do ACESSO, vagas em destaque, empresas parceiras e atalhos para cadastro, login e acessibilidade. |
| UC-V02 | Conhecer o ACESSO em "Sobre nós" | Página institucional com missão, pilares, passos de uso e contato. |
| UC-V03 | Ler os Termos de Uso e a Política de Privacidade | Páginas inteiras dos dois documentos legais, na versão 2026-10-20, no idioma escolhido. |
| UC-V04 | Falar com a equipe por e-mail | Atalho "Fale conosco" que abre o programa de e-mail do visitante; diferenças do visitante em relação ao rodapé de suporte (UC-G01). |
| UC-V05 | Ser levado ao login ao tentar abrir uma área restrita | Rotas privadas redirecionam o visitante para `/entrar`. |
| UC-V06 | Voltar ao início a partir de uma página de erro | Tela "Página não encontrada" ou "Esta página não carregou" com saída para `/`. |
| UC-V07 | Ver a lista de vagas abertas | Lista paginada (10 por página) de vagas abertas de empresas aprovadas. |
| UC-V08 | Buscar e filtrar vagas | Filtros por texto, cidade, modalidade, público da vaga e recursos de acessibilidade. |
| UC-V09 | Ver o detalhe de uma vaga | Página completa da vaga, somente leitura. |
| UC-V10 | Tentar favoritar, candidatar-se ou conversar sem conta | O Site avisa que é preciso uma conta de candidato; nada é gravado. |
| UC-V11 | Criar a conta de candidato: etapa 1 (Conta) | E-mail, CPF, senha e aceite dos documentos legais. |
| UC-V12 | Informar os dados pessoais e criar a conta: etapa 2 | Nome, telefone, nascimento, cidade e UF; a conta é criada e a sessão começa. |
| UC-V13 | Ler os Termos e a Política durante o cadastro | Diálogo de leitura que não perde o que já foi digitado. |
| UC-V14 | Importar o currículo no cadastro: etapa 3 | Envia PDF ou DOCX (até 5 MB) e recebe um rascunho para revisar. |
| UC-V15 | Montar o perfil profissional no cadastro: etapa 3 | Título, escolaridade, resumo, experiências, formações, habilidades e currículo, tudo opcional. |
| UC-V16 | Configurar a acessibilidade e concluir o cadastro: etapa 4 | Painel de preferências e botão "Finalizar cadastro". |
| UC-V17 | Retomar um cadastro inacabado | Após o login, o candidato volta direto à etapa 3; a retomada tem limitações. |
| UC-V18 | Começar o cadastro de empresa pelo caminho "Sou empresa" | Passa primeiro pelo cadastro de candidato; o visitante não cria empresa direto. |
| UC-V19 | Cadastrar-se com a conta Google | Autenticação no Google e vínculo da conta ao cadastro de candidato. |
| UC-V20 | Entrar com a conta Google | Login de quem já vinculou o Google; trata conflito de e-mail e falhas. |
| UC-V21 | Confirmar o e-mail | Por link do e-mail ou digitando o código de 6 dígitos. |
| UC-V22 | Reenviar a confirmação de e-mail | Novo código, com intervalo mínimo de 60 segundos e limite por IP. |
| UC-V23 | Entrar com e-mail e senha | Login, com tratamento de erro, e-mail não confirmado e destino por tipo de conta. |
| UC-V24 | Reativar conta pausada ao entrar | Confirmação de reativação no próprio login. |
| UC-V25 | Solicitar a recuperação de senha | Pede o link de redefinição por e-mail, com resposta sempre genérica. |
| UC-V26 | Redefinir a senha pelo link do e-mail | Nova senha com o token do link, válido por 15 minutos e de uso único. |
| UC-V27 | Redefinir a senha pelo código de 6 dígitos | Alternativa por e-mail e código, com no máximo 5 tentativas. |
| UC-V28 | Trocar o idioma da interface | Diferenças do visitante em relação à troca de idioma comum (UC-G40). |
| UC-V29 | Ajustar aparência e leitura | Diferenças do visitante no grupo "Visual" do painel de acessibilidade (UC-G38). |
| UC-V30 | Ajustar navegação e interação | Diferenças do visitante no grupo "Navegação e interação" do painel (UC-G38). |
| UC-V31 | Responder ao convite de leitura por voz | Onde o convite aparece para o visitante e onde a resposta fica guardada (UC-G39). |
| UC-V32 | Usar a leitura por voz | Detalhes de funcionamento da leitura por voz sem conta (UC-G38). |
| UC-V33 | Usar o VLibras | Detalhes de funcionamento do tradutor de Libras sem conta (UC-G38). |
| UC-V34 | Salvar, descartar ou redefinir as preferências de acessibilidade | Gravação no navegador, sem conta, e regras de sincronização no login e no cadastro (UC-G38). |
| UC-V35 | Ajustar a acessibilidade na tela de boas-vindas | Rota existente, mas sem link no Site hoje. |
| UC-V36 | Pular para o conteúdo principal | Telas do visitante que têm o atalho de teclado (UC-G01). |
| UC-V37 | Consultar a API pública sem passar pelas telas | Endpoints que respondem sem login e que nenhuma tela do Site mostra. |

---

## Visitante — Conhecer a plataforma

### UC-V01 — Ver a página inicial

- **Ator:** Visitante. Secundário: Sistema (API pública).
- **Descrição:** O visitante abre `/` e vê o que é o ACESSO, algumas vagas em destaque e empresas parceiras, com atalhos para criar conta, entrar e configurar a acessibilidade.
- **Pré-condições:** Não ter sessão salva no navegador. Quem tem sessão válida é enviado a `/feed` e nunca vê esta tela.
- **Fluxo principal:**
  1. O visitante abre `/`.
  2. O sistema consulta `GET /api/publico/home`, sem token, e mostra o cabeçalho: logo, seletor de idioma, "Acessibilidade", "Sobre nós", "Entrar" e "Criar conta".
  3. O sistema mostra a abertura: selo "Acessibilidade desde o primeiro clique", título "Conectando talentos PCD a oportunidades que transformam vidas.", subtítulo e dois botões: "Quero encontrar vagas" (leva a `/cadastro`) e "Sou empresa" (leva a `/cadastro/candidato?depois=empresa`).
  4. O sistema mostra o cartão "Recursos ativos nesta página" (quatro itens informativos) com o botão "Configurar acessibilidade agora" (leva a `/configuracoes/acessibilidade`) e a seção "Recursos do sistema" (leitura por voz, VLibras integrado, ajuste fino da leitura, empresas verificadas).
  5. O sistema mostra "Vagas em destaque": até 4 cartões com título (link para `/vaga/:id`), empresa, selo de empresa verificada, modalidade, cidade e UF, e selos de público-alvo (quando não é "Todos os públicos"), de tipo de contrato e de local. O botão "Ver todas" leva a `/vagas`.
  6. Havendo empresas aprovadas, mostra "Empresas parceiras": até 12 cartões com logo (ou inicial), nome, selo de verificada, setor (ou "Empresa parceira") e o total de vagas abertas ("N vagas").
  7. Mostra a chamada final "Comece pela sua acessibilidade", com o botão "Criar minha conta" (leva a `/cadastro`), e o rodapé com "Sobre nós", "Fale conosco" e a linha "ACESSO · Plataforma de inclusão profissional · WCAG 2.2".
  8. Cerca de 0,7 segundo depois, se o navegador suportar voz e a pessoa ainda não tiver respondido, o sistema abre o convite de leitura por voz (UC-V31).
- **Fluxos alternativos e exceções:**
  - Enquanto carrega, aparecem 4 espaços reservados. Se a consulta falhar: "Não foi possível carregar as vagas em destaque agora." Se não houver vagas: "Em breve novas vagas em destaque por aqui." A seção "Empresas parceiras" some quando a lista vem vazia ou a consulta falha.
  - "Quero encontrar vagas" leva ao cadastro, não à lista de vagas. Para ver vagas sem conta, o caminho é "Ver todas" ou o link "Vagas" do cabeçalho público (UC-V07).
  - Os cartões de empresas parceiras não são clicáveis.
  - Em telas estreitas (menos de 640 px), o botão "Acessibilidade" do cabeçalho fica só com o ícone e o botão "Sobre nós" some do cabeçalho (o link do rodapé continua).
  - Limitação atual: a API também devolve contadores (`estatisticas`: empresas, vagas abertas, candidatos e candidaturas) e as 3 publicações públicas mais recentes, mas a tela atual não exibe nenhum dos dois.
  - Limitação atual: empresa aprovada sem nome fantasia (campo opcional no cadastro) aparece em "Empresas parceiras" sem nome (inicial "?" e, se houver logo, texto alternativo "Logo de undefined") e, nas vagas em destaque, como "Empresa parceira". Isso acontece porque `GET /api/publico/home` não devolve a razão social. Na lista `/vagas` o nome cai para a razão social normalmente.
  - Limitação atual: o subtítulo de "Recursos do sistema" diz que o que se configura "acompanha sua conta em qualquer dispositivo", o que não vale para o cursor ampliado nem para os valores de espaçamento (UC-V30).
- **Pós-condições:** Nenhuma. É somente leitura.
- **Regras de negócio:**
  - Destaque é vaga com `status = aberta`, não oculta pela moderação (`oculta = false`) e de empresa com cadastro aprovado. A API devolve as 6 mais recentes; a tela exibe 4 (`PublicoService.paginaInicial`).
  - Parceiras são as 12 empresas aprovadas mais recentes, cada uma com a contagem de vagas abertas e não ocultas (`PublicoService.paginaInicial`).
  - A publicação de prévia só considera publicações públicas e ativas de autores com perfil público (`PublicoService.paginaInicial`).
  - A consulta da página inicial usa um cliente HTTP sem token e sem o cabeçalho `Accept-Language`.
- **Telas e endpoints:** `/` (tela); `GET /api/publico/home` (API pública); `/vagas`, `/cadastro`, `/cadastro/candidato`, `/sobre-nos`, `/configuracoes/acessibilidade` (destinos dos links).

### UC-V02 — Conhecer o ACESSO em "Sobre nós"

- **Ator:** Visitante.
- **Descrição:** O visitante lê a página institucional: o que é o ACESSO, seus pilares e como usar.
- **Pré-condições:** Nenhuma.
- **Fluxo principal:**
  1. O visitante abre `/sobre-nos` (pelo link "Sobre nós" do cabeçalho ou do rodapé da página inicial).
  2. O sistema mostra o cabeçalho (logo, seletor de idioma, "Entrar" e "Criar conta") e a abertura: selo "Sobre o ACESSO", título "Inclusão profissional que começa na acessibilidade da própria plataforma" e um parágrafo de apresentação.
  3. Mostra "Nossos pilares": Missão, Acessibilidade e Empresas verificadas.
  4. Mostra "Como funciona": quatro passos numerados (Crie sua conta, Personalize sua experiência, Encontre oportunidades, Converse em tempo real).
  5. Mostra "Fale com a gente", com o e-mail `projetoacessoinclusivo@gmail.com`, a frase "Dúvidas, sugestões e denúncias são bem-vindas a qualquer momento." e o botão "Criar minha conta" (leva a `/cadastro`), e o rodapé "ACESSO · WCAG 2.2 · VLibras integrado".
- **Fluxos alternativos e exceções:**
  - O texto acompanha o idioma escolhido (UC-V28).
  - A página é estática: não chama a API e, por isso, não tem estado de erro.
  - Limitação atual: o primeiro passo diz "Cadastre-se como candidato ou empresa em poucos minutos", mas não existe cadastro direto de empresa; o caminho passa pelo cadastro de candidato (UC-V18).
- **Pós-condições:** Nenhuma.
- **Regras de negócio:** O texto vem do dicionário de idiomas (`src/i18n/pt/sobre.ts`).
- **Telas e endpoints:** `/sobre-nos` (tela). Nenhum endpoint.

### UC-V03 — Ler os Termos de Uso e a Política de Privacidade

- **Ator:** Visitante.
- **Descrição:** O visitante lê, em página própria, os dois documentos legais da plataforma.
- **Pré-condições:** Nenhuma.
- **Fluxo principal:**
  1. O visitante abre `/termos` ou `/privacidade`. Nenhum link da página inicial ou dos rodapés aponta para elas hoje; chega-se por endereço direto ou pelo botão "Abrir em nova aba" do diálogo do cadastro (UC-V13).
  2. O sistema mostra o cabeçalho (logo, seletor de idioma e botão "Início"), o título, o resumo com a linha "Versão 2026-10-20" e o texto em seções dentro de um cartão.
  3. Os Termos de Uso têm 9 seções (o que é o ACESSO, quem pode criar conta, o que se pode fazer, o que não é permitido, moderação, encerrar a conta, disponibilidade e responsabilidade, mudanças, contato e foro).
  4. A Política de Privacidade tem 10 seções (quem trata os dados, dados coletados, base legal, dados sensíveis de deficiência e acessibilidade, compartilhamento, prazo de guarda, segurança, direitos, cookies e armazenamento, mudanças).
- **Fluxos alternativos e exceções:**
  - O texto muda junto com o idioma. Português é a versão de referência; em inglês e espanhol aparece uma nota de que são traduções de cortesia.
  - A página não tem o link "Pular para o conteúdo principal" (UC-V36).
- **Pós-condições:** Nenhuma. A leitura não registra aceite; o aceite só é gravado no cadastro (UC-V12).
- **Regras de negócio:**
  - A versão atual é `VERSAO_DOCUMENTOS = "2026-10-20"`, gravada junto do aceite em `usuarios.termos_versao` (`src/dados/documentosLegais.ts`).
  - Os Termos (seção 2) exigem 16 anos ou mais. O formulário não verifica a idade (UC-V12).
  - O código-fonte registra que o texto ainda aguarda revisão jurídica; a tela não mostra esse aviso porque `CONTEUDO_PENDENTE = false`.
  - Os Termos (seção 6) e a Política (seção 6) dizem que, em conta pausada, os dados "deixam de aparecer para outras pessoas". O código não implementa isso (UC-V24).
- **Telas e endpoints:** `/termos`, `/privacidade` (telas). Nenhum endpoint.

### UC-V04 — Falar com a equipe por e-mail

- **Ator:** Visitante.
- **Descrição:** O visitante usa o link "Fale conosco" para escrever à equipe. O bloco "Precisa de ajuda?" (rodapé de suporte) é o mesmo mostrado às contas autenticadas e está descrito em UC-G01; aqui ficam só os pontos de contato em que ele aparece para o visitante.
- **Pré-condições:** Ter um programa de e-mail configurado no aparelho.
- **Fluxo principal:**
  1. O visitante clica em "Fale conosco" no rodapé da página inicial, no e-mail do cartão de contato de "Sobre nós", ou no bloco "Precisa de ajuda?" no fim de `/vagas`, `/vaga/:id` e `/configuracoes/acessibilidade`.
  2. O navegador abre o programa de e-mail com um rascunho para `projetoacessoinclusivo@gmail.com`.
- **Fluxos alternativos e exceções:** Não há formulário de contato no Site, e nada é enviado pelo Site. No bloco "Precisa de ajuda?", "Acessibilidade" leva a `/configuracoes/acessibilidade`, enquanto "Privacidade" e "Segurança" levam ao login para o visitante (UC-V05).
- **Pós-condições:** Nenhuma no sistema.
- **Regras de negócio:** O mesmo endereço é o canal de contato dos Termos (seção 9) e da Política (seções 1 e 8).
- **Telas e endpoints:** `/`, `/sobre-nos`, `/vagas`, `/vaga/:vagaId`, `/configuracoes/acessibilidade` (telas); link `mailto:`. Nenhum endpoint.

### UC-V05 — Ser levado ao login ao tentar abrir uma área restrita

- **Ator:** Visitante.
- **Descrição:** Quando o visitante tenta abrir uma tela que exige conta, o Site o redireciona para a tela de login.
- **Pré-condições:** Sem sessão.
- **Fluxo principal:**
  1. O visitante digita ou clica num endereço restrito (por exemplo `/feed`, `/mensagens`, `/perfil/:id`, `/dashboard`, `/admin`, `/configuracoes/conta`).
  2. O sistema espera a sessão ser lida do navegador e mostra "Carregando sua sessão…" (dentro da estrutura de página com o cabeçalho público).
  3. Sem sessão, o sistema leva o visitante a `/entrar`.
- **Fluxos alternativos e exceções:**
  - No detalhe de uma vaga, o nome da empresa é um link para `/perfil/:usuarioId`; para o visitante isso termina em `/entrar`.
  - Em `/dashboard`, o redirecionamento por tipo de conta só ocorre depois do login; sem sessão vai a `/entrar`.
  - Depois do login não há retorno à página pedida: o destino é `/feed` (ou `/admin`, ou a retomada do cadastro; UC-V23 e UC-V17).
  - Se alguém chamar a API diretamente sem token, recebe 401 "Token não informado." (`autenticacaoMiddleware`).
- **Pós-condições:** Nenhuma.
- **Regras de negócio:** O bloqueio de tela (`GuardaAcesso`) só cuida da experiência. A proteção real está na API (`autenticacaoMiddleware` e `exigirTipoUsuarioMiddleware`).
- **Telas e endpoints:** Todas as rotas restritas listadas na introdução (telas); `/entrar` (destino). API: qualquer rota autenticada responde 401 sem token.

### UC-V06 — Voltar ao início a partir de uma página de erro

- **Ator:** Visitante.
- **Descrição:** Se o endereço não existe, ou uma tela falha ao carregar, o visitante tem uma saída para o início. As mesmas telas valem para qualquer tipo de conta; não há caso equivalente em UC-G, por isso este é o caso de referência.
- **Pré-condições:** Nenhuma.
- **Fluxo principal:**
  1. O visitante abre um endereço inexistente.
  2. O sistema mostra "404 — Página não encontrada: A página que você procura não existe ou foi movida."
  3. O visitante clica em "Voltar ao início" (leva a `/`).
- **Fluxos alternativos e exceções:**
  - Em falha inesperada ao renderizar uma tela, o sistema mostra "Esta página não carregou", com "Tentar novamente" (recarrega a rota) e "Ir para o início".
  - Essas duas telas não têm seletor de idioma, mas seguem o idioma já escolhido.
  - Quem tem sessão e clica em "Voltar ao início" cai em `/`, que o leva a `/feed`.
- **Pós-condições:** Nenhuma.
- **Regras de negócio:** Textos em `src/i18n/pt/erros.ts`.
- **Telas e endpoints:** Telas de erro do roteador (`src/routes/__root.tsx`). Nenhum endpoint.

---

## Visitante — Vagas públicas

### UC-V07 — Ver a lista de vagas abertas

- **Ator:** Visitante. Secundário: Sistema.
- **Descrição:** O visitante consulta as vagas abertas das empresas aprovadas, sem precisar de conta. É a mesma tela usada por candidatos, empresas e administradores (as ações extras do candidato estão em UC-C17); este é o caso de referência da listagem.
- **Pré-condições:** Nenhuma.
- **Fluxo principal:**
  1. O visitante abre `/vagas` (link "Vagas" do cabeçalho público, que some em telas pequenas, ou "Ver todas" na página inicial).
  2. O sistema chama `GET /api/vagas?page=1&limit=10`, sem token, e mostra "Vagas inclusivas", a contagem ("N oportunidades publicadas.") e o formulário de filtros (UC-V08).
  3. Cada vaga aparece num cartão com: título (link), empresa (nome fantasia, senão razão social, senão "Empresa") com selo "Empresa verificada" quando houver, tipo de contrato, modalidade e local, as duas primeiras linhas da descrição, selo de público-alvo (se não for "Todos os públicos"), até 3 recursos de acessibilidade, selo de status ("Aberta") e os botões "Ver vaga" e coração de favoritar.
  4. Havendo mais de uma página, o visitante navega com "Página anterior" e "Próxima página" (10 vagas por página, "Página X de Y").
- **Fluxos alternativos e exceções:**
  - Carregando: 3 espaços reservados ("Carregando vagas"). Erro: "Não foi possível carregar as vagas." com "Tentar novamente". Lista vazia: "Nenhuma vaga encontrada com esses filtros."
  - O cabeçalho público tem logo, seletor de idioma, "Vagas", "Entrar" e "Criar conta". No fim da página há o bloco "Precisa de ajuda?" (UC-V04).
  - Limitação atual: `GET /api/vagas` e `GET /api/vagas/:id` não consultam o campo `oculta`, que a moderação usa para esconder uma vaga. Só a página inicial, a busca global e `GET /api/publico/vagas` o consultam. Pelo código, uma vaga ocultada pela moderação ainda pode aparecer aqui e abrir pelo link.
- **Pós-condições:** Nenhuma.
- **Regras de negócio:**
  - Só aparecem vagas com `status = aberta` (padrão) de empresas com `status_aprovacao = aprovada`; vaga de empresa pendente, reprovada ou suspensa não aparece (`VagaService.listar`).
  - Ordem: mais recentes primeiro. O Site pede 10 por página; a API usa 10 quando `limit` não vem e aceita até 100.
- **Telas e endpoints:** `/vagas` (tela); `GET /api/vagas` (API pública).

### UC-V08 — Buscar e filtrar vagas

- **Ator:** Visitante.
- **Descrição:** O visitante restringe a lista de vagas pelos filtros do formulário.
- **Pré-condições:** Estar em `/vagas`.
- **Fluxo principal:**
  1. O visitante preenche um ou mais campos: "Buscar vaga" (texto; "Cargo, empresa ou palavra-chave"), "Cidade" (ex.: São Paulo), "Modalidade" (Todas as modalidades, Presencial, Híbrido, Remoto) e "Público da vaga" (Todos os públicos, Aberta a todos os públicos, Exclusiva para pessoas com deficiência, Exclusiva para pessoas 50+, Para pessoas com deficiência e 50+).
  2. Marca, se quiser, "Recursos de acessibilidade da vaga": Intérprete de Libras, Tecnologia assistiva, Ambiente físico acessível, Banheiro adaptado, Elevador ou rampa de acesso, Jornada adaptável e Ferramentas digitais acessíveis.
  3. Clica em "Buscar", ou aperta Enter no campo de texto, ou aperta Enter no campo de cidade sem escolher sugestão.
  4. O sistema volta à página 1 e chama `GET /api/vagas` com `q`, `cidade`, `modalidade`, `publicoAlvo` e `recursosAcessibilidade` (valores separados por vírgula); campo vazio não é enviado.
- **Fluxos alternativos e exceções:**
  - Nada é aplicado antes de "Buscar": mudar um campo só altera o rascunho. Não há botão "Limpar filtros"; para remover um filtro, o visitante volta a "Todos" ou limpa o campo e busca de novo. Os filtros não ficam na URL: recarregar a página os apaga.
  - "Todos os públicos" significa sem filtro; é diferente de "Aberta a todos os públicos", que envia `publicoAlvo=geral`.
  - A cidade sugere nomes do IBGE (até 8), aceita texto livre e avisa "Nenhuma sugestão encontrada" quando nada combina. Se o IBGE falhar: "Não foi possível carregar sugestões de cidade agora. Você ainda pode digitar normalmente." Como o filtro não tem campo de UF, o navegador baixa do IBGE a lista completa de municípios (cerca de 5.500) já ao abrir `/vagas`, e a guarda em memória durante a sessão da aba, apesar de o comentário do código dizer que isso nunca acontece no carregamento da página.
  - A opção "Outro recurso" não é oferecida como filtro.
  - Limitação atual: o texto de "Buscar vaga" é enviado como `q`, mas `VagaService.listar` só lê o parâmetro `search`. Pelo código, o texto digitado não altera o resultado; os demais filtros funcionam. Mesmo o `search` da API procura só em título, descrição e requisitos, não no nome da empresa, ao contrário do que o texto de ajuda do campo sugere.
- **Pós-condições:** Nenhuma.
- **Regras de negócio:**
  - Cidade: contém o texto, sem diferenciar maiúsculas e minúsculas (acentos contam). Modalidade e público: valor exato.
  - Recursos: a vaga precisa ter todos os recursos marcados (`Op.contains`).
  - A API ainda aceita `estado`, `contrato`, `exclusivaPcd`, `empresaId` e `status` (com `status` diferente de `aberta`, vagas arquivadas ou encerradas também saem); a tela não oferece esses filtros.
- **Telas e endpoints:** `/vagas` (tela); `GET /api/vagas` (API pública); sugestões de cidade vêm da API pública do IBGE (`servicodados.ibge.gov.br`), consultada pelo navegador.

### UC-V09 — Ver o detalhe de uma vaga

- **Ator:** Visitante.
- **Descrição:** O visitante abre uma vaga e lê todas as informações publicadas. É a mesma tela das contas autenticadas (as ações do candidato estão em UC-C18); este é o caso de referência da leitura pública.
- **Pré-condições:** Ter o link da vaga, ou clicar no título ou em "Ver vaga" na lista ou na página inicial.
- **Fluxo principal:**
  1. O visitante abre `/vaga/:vagaId`.
  2. O sistema chama `GET /api/vagas/:id`, sem token, e mostra "Voltar para as vagas", o título, a empresa (nome com link para o perfil, selo "Verificada"), cidade e UF, modalidade e contrato.
  3. Mostra selos de status, de público-alvo (se não for "Todos os públicos") e "Salário:" (quando informado).
  4. Mostra o cartão com as seções que tiverem conteúdo: Descrição, Requisitos, Benefícios, Recursos de acessibilidade (selos), Detalhes adicionais de acessibilidade e Carga horária.
- **Fluxos alternativos e exceções:**
  - Vaga inexistente, identificador inválido (a API responde 422) ou de empresa não aprovada (404 "Vaga não encontrada."): o sistema mostra "Vaga não encontrada — Esta vaga pode ter sido encerrada ou removida pela empresa.", com "Tentar novamente" e "Ver todas as vagas". Qualquer outra falha da consulta (inclusive de rede) mostra o mesmo cartão.
  - Vaga arquivada (status `pausada`, rótulo "Arquivada") ou encerrada abre normalmente pelo link direto, com o selo do status; o botão de candidatura fica desabilitado.
  - O link do nome da empresa leva a `/perfil/:usuarioId`, que redireciona o visitante ao login (UC-V05).
  - O menu "Denunciar vaga" não aparece para o visitante.
  - Limitação atual: o selo "Salário:" mostra o valor como a API o devolve. A coluna é decimal no banco, o driver do PostgreSQL entrega esse tipo como texto (por exemplo `2500.00`) e a tela só aplica a formatação em reais quando o valor chega como número. Pelo código, o visitante vê o número cru, sem "R$" nem separador de milhar (vale conferir com uma vaga que tenha salário).
  - Limitação atual: a API do detalhe devolve o objeto da empresa sem filtrar campos (o `include` não restringe atributos). A tela não os exibe, mas a resposta contém, entre outros, o texto cifrado e o hash do CNPJ (`cnpjCifrado`, `cnpjHash`), o identificador da conta de candidato vinculada (`usuarioCandidatoId`), endereço, CEP, situação de aprovação e dados de moderação, além de id, nome e foto da conta da empresa. Pelo código; a listagem `GET /api/vagas`, ao contrário, restringe os atributos da empresa.
- **Pós-condições:** Nenhuma.
- **Regras de negócio:** `VagaService.buscarPorId` só esconde vaga de empresa não aprovada; a empresa dona e o administrador continuam vendo. A rota usa autenticação opcional (`autenticacaoOpcionalMiddleware`): sem token, vale como visitante anônimo.
- **Telas e endpoints:** `/vaga/:vagaId` (tela); `GET /api/vagas/:id` (API com autenticação opcional).

### UC-V10 — Tentar favoritar, candidatar-se ou conversar sem conta

- **Ator:** Visitante.
- **Descrição:** O visitante tenta uma ação de candidato e o Site o orienta a entrar com uma conta de candidato.
- **Pré-condições:** Estar em `/vagas` ou `/vaga/:vagaId`, sem sessão.
- **Fluxo principal:**
  1. Na lista, o visitante clica no coração de uma vaga.
  2. O sistema não faz nenhuma chamada e mostra o aviso "Entre com uma conta de candidato para favoritar vagas."
  3. No detalhe, o botão "Candidatar-se" aparece desabilitado e o texto "Entre com uma conta de candidato para se candidatar a esta vaga." fica abaixo dele.
- **Fluxos alternativos e exceções:**
  - No detalhe, os botões "Favoritar" e "Conversar com a empresa" não são exibidos para o visitante.
  - O texto de orientação não é um link; o caminho é "Entrar" ou "Criar conta" no cabeçalho (UC-V23, UC-V11).
  - Por API, `POST /api/vagas/:id/candidaturas` e `POST /api/vagas/:vagaId/favoritar` respondem 401 sem token e 403 para conta que não seja candidato.
- **Pós-condições:** Nenhuma.
- **Regras de negócio:** Candidatar, favoritar e conversar são exclusivos de conta de candidato (`exigirTipoUsuarioMiddleware("candidato")` em `vagaRoutes.js`).
- **Telas e endpoints:** `/vagas`, `/vaga/:vagaId` (telas); `POST /api/vagas/:vagaId/candidaturas` e `POST /api/vagas/:vagaId/favoritar` (API autenticada, não chamadas pelo visitante).

---

## Visitante — Cadastro de candidato

Os casos UC-V11 a UC-V17 descrevem o assistente de cadastro do ponto de vista de quem ainda não tem conta. O mesmo percurso, já como candidato, aparece resumido em UC-C01 a UC-C03; em caso de dúvida, vale a descrição daqui.

### UC-V11 — Criar a conta de candidato: etapa 1 (Conta)

- **Ator:** Visitante. Secundário: Google (opcional, UC-V19).
- **Descrição:** O visitante começa o cadastro informando e-mail, CPF e senha e aceitando os documentos legais.
- **Pré-condições:** Sem sessão. (O Site não impede quem já tem sessão de abrir esta tela: sem `?retomar=true`, ela mostra a etapa 1 normalmente.)
- **Fluxo principal:**
  1. O visitante abre `/cadastro/candidato` (por "Criar conta", "Criar minha conta" ou "Quero encontrar vagas"). `/cadastro` não tem tela: redireciona para cá, e `?perfil=empresa` vira `?depois=empresa`.
  2. O sistema mostra logo, seletor de idioma (com o nome do idioma por extenso), "Acessibilidade", o indicador "Etapa 1 de 4 — Conta" (as etapas são Conta, Dados pessoais, Perfil, Acessibilidade) e o título "Crie sua conta — Só o essencial para começar. Os dados do seu perfil vêm depois.", com o botão "Continuar com Google" quando disponível.
  3. O visitante preenche: E-mail (até 150 caracteres), CPF (máscara 000.000.000-00; a ajuda diz que é "guardado cifrado, só para evitar contas duplicadas" e "nunca aparece no seu perfil público"), Senha (com botão mostrar/ocultar e lista ao vivo dos 5 requisitos) e marca "Li e aceito os Termos de Uso e a Política de Privacidade do ACESSO."
  4. Clica em "Continuar". O sistema valida só esses campos e abre a etapa 2 (UC-V12). Nada é enviado ao servidor nesta etapa.
- **Fluxos alternativos e exceções:**
  - Mensagens: "Informe seu e-mail.", "Digite um endereço de e-mail válido.", "Informe seu CPF.", "Digite um CPF válido, com 11 números.", "A senha deve ter entre 8 e 72 caracteres.", "A senha deve conter ao menos uma letra minúscula." (e maiúscula, número, caractere especial) e "É preciso aceitar os Termos de Uso e a Política de Privacidade para criar a conta." Enquanto houver erro, a etapa não avança. Campos obrigatórios têm asterisco com a dica "Campo obrigatório".
  - Do CPF só se confere o formato (11 dígitos); os dígitos verificadores não são validados, nem no Site nem na API.
  - Link "Já tem uma conta? Entrar" (leva a `/entrar`). Trocar o idioma no meio do formulário não apaga o que foi digitado.
  - Nada é guardado no servidor: fechar a aba antes de "Criar conta" (UC-V12) descarta tudo.
- **Pós-condições:** Nenhuma gravação; os dados ficam só na memória do navegador.
- **Regras de negócio:**
  - Senha de 8 a 72 caracteres com minúscula, maiúscula, número e caractere especial (`regrasSenha`, `autenticacaoValidator.js`).
  - A conta de empresa nasce de uma conta de candidato; por isso todo cadastro começa aqui (`cadastro/index.tsx`).
  - A obrigatoriedade do aceite dos documentos é validada só no Site (caixa obrigatória); ver a regra de UC-V12 sobre a API.
- **Telas e endpoints:** `/cadastro` (redireciona), `/cadastro/candidato` (tela). Nenhum endpoint na etapa; a verificação de e-mail e CPF duplicados acontece no envio (UC-V12).

### UC-V12 — Informar os dados pessoais e criar a conta: etapa 2

- **Ator:** Visitante. Secundários: Sistema e provedor de e-mail (Brevo).
- **Descrição:** O visitante informa os dados pessoais e cria a conta de candidato; a sessão começa na hora.
- **Pré-condições:** Etapa 1 válida.
- **Fluxo principal:**
  1. O sistema mostra "Etapa 2 de 4 — Dados pessoais" e "Informações pessoais — É assim que as empresas vão te reconhecer na plataforma."
  2. O visitante preenche: Nome completo (3 a 150 caracteres), Telefone (máscara (00) 00000-0000, 10 ou 11 dígitos, "Com DDD"), Data de nascimento (calendário), Cidade (sugestões do IBGE para a UF digitada, texto livre, 2 a 100 caracteres) e Estado (UF de 2 letras, em maiúsculas).
  3. O visitante clica em "Criar conta". O sistema envia `POST /api/auth/register/candidato` com nome, e-mail, senha, telefone e CPF (só dígitos), `pais: "BR"`, data, cidade, UF, `termosVersao: "2026-10-20"` e o idioma da interface (e o código do Google, se houver; UC-V19).
  4. O backend cria usuário e perfil de candidato numa transação e devolve a sessão. O Site já entra na conta, busca `GET /api/candidatos/me` e abre a etapa 3 (UC-V14 e UC-V15).
- **Fluxos alternativos e exceções:**
  - "Voltar" retorna à etapa 1 com os dados mantidos.
  - Mensagens do Site: "Informe seu nome completo (ao menos 3 caracteres).", "Informe seu telefone.", "Digite um telefone válido, com DDD.", "Informe sua data de nascimento.", "A data de nascimento não pode estar no futuro.", "Informe a cidade onde você mora." e "Informe a UF com 2 letras."
  - Respostas da API, exibidas como aviso: 409 "Este e-mail já está cadastrado." ou "Este CPF já está cadastrado."; 422 com o primeiro erro de validação; 429 "Muitas tentativas de autenticação. Tente novamente mais tarde." (10 tentativas com falha por IP em 15 minutos); 400 "A verificação com o Google expirou. Entre com o Google novamente." (UC-V19); falha inesperada "Não foi possível concluir o cadastro agora. Tente novamente."
  - Falha depois da conta criada: o Site cria a conta e lê o perfil (`GET /api/candidatos/me`) no mesmo bloco. Se a leitura falhar, o aviso mostra a mensagem da API ou, sem ela, "Não foi possível criar sua conta agora.", como se a conta não existisse, mas ela já existe e a sessão já está aberta. Enviar o formulário de novo devolve 409 "Este e-mail já está cadastrado."; o caminho é entrar (UC-V23), o que leva à retomada do cadastro (UC-V17).
  - O país foi removido do formulário: o Site envia sempre `BR` (`PAIS_PADRAO`).
  - Deficiências não são perguntadas no cadastro. Não há campo nem escolha de deficiência em nenhuma das 4 etapas; a declaração é feita depois, no perfil (seção do Candidato).
  - Limitações atuais:
    - A UF aceita quaisquer 2 letras (não confere se existe), e os Termos exigem 16 anos, mas só se confere que a data não está no futuro.
    - A data de nascimento é obrigatória e é gravada, mas hoje não altera as vagas exibidas, apesar do texto de ajuda da tela ("Ajuda a mostrar vagas afirmativas para pessoas 50+ quando for o seu caso"): o código só a usa para exigir que esteja preenchida ao concluir o cadastro.
    - O validador `normalizeEmail` grava o e-mail normalizado: tudo em minúsculas; Gmail e googlemail.com (que vira gmail.com) sem pontos e sem o trecho `+...`; Outlook/Hotmail/Live/MSN e iCloud/me.com sem `+...`; Yahoo sem o trecho depois do último `-`; domínios do Yandex viram yandex.ru. Exemplo: `maria.silva@gmail.com` é gravado como `mariasilva@gmail.com`. O login não aplica essa normalização (UC-V23).
- **Pós-condições:**
  - Em `usuarios`: tipo candidato, `email_verificado = false`, senha em hash bcrypt, idioma da interface, data e versão do aceite (`termos_aceitos_em`, `termos_versao`) e `google_id` se houver. Em `candidatos`: CPF cifrado (AES-256-GCM) com hash SHA-256 para detectar duplicidade, país `BR`, nascimento, cidade e UF. `cadastro_concluido_em` continua vazio.
  - Sessão aberta: token de acesso (30 minutos por padrão) e refresh token (30 dias) guardados no navegador, e conexão em tempo real.
  - Se o provedor de e-mail estiver configurado, sai um e-mail "Confirme seu e-mail — ACESSO" com botão e código de 6 dígitos válidos por 15 minutos (envio opcional; falha não desfaz o cadastro). Sem a URL do Site configurada no servidor, o e-mail traz só o código.
  - As preferências de acessibilidade que estiverem na tela são gravadas na conta em segundo plano (`PUT /api/acessibilidade`).
- **Regras de negócio:**
  - O cadastro de candidato não exige confirmar o e-mail para entrar (`AutenticacaoService.cadastrarCandidato`; `Site/docs/confirmacao-de-email-no-cadastro.md`).
  - Telefone: 10 a 20 caracteres; CPF: 11 dígitos; UF: 2 letras; data no formato AAAA-MM-DD e não futura (`validarCadastroCandidato`).
  - A data do aceite vem do servidor; a versão é a que a tela mostrou (`registroDeAceite`). A obrigatoriedade do aceite é validada só no Site: na API, `termosVersao` é opcional, e sem ela a conta é criada com `termos_aceitos_em` e `termos_versao` vazios. Quem chamar a API direto cria conta sem registro de aceite.
- **Telas e endpoints:** `/cadastro/candidato` (tela); `POST /api/auth/register/candidato`; `GET /api/candidatos/me`; `PUT /api/acessibilidade` (em segundo plano).

### UC-V13 — Ler os Termos e a Política durante o cadastro

- **Ator:** Visitante.
- **Descrição:** O visitante lê os documentos legais sem sair do formulário.
- **Pré-condições:** Estar na etapa 1 do cadastro de candidato (o mesmo diálogo e o mesmo aceite existem na etapa de revisão do cadastro de empresa, UC-E01).
- **Fluxo principal:**
  1. O visitante clica em "Termos de Uso" ou em "Política de Privacidade" dentro da frase do aceite.
  2. O sistema abre um diálogo com o título, o resumo (com a versão), o texto com rolagem própria, o link "Abrir em nova aba" (abre `/termos` ou `/privacidade`) e o botão "Voltar ao cadastro".
  3. O visitante lê, fecha o diálogo (botão ou Esc) e continua no mesmo ponto do formulário.
- **Fluxos alternativos e exceções:** Abrir o documento nunca marca a caixa de aceite; marcar é uma ação separada. O diálogo prende o foco do teclado e o devolve ao link ao fechar.
- **Pós-condições:** Nenhuma.
- **Regras de negócio:** O diálogo é usado no lugar de um link para não perder o que foi digitado (`DocumentoLegalDialog`).
- **Telas e endpoints:** `/cadastro/candidato` (tela); `/termos`, `/privacidade` (nova aba). Nenhum endpoint.

### UC-V14 — Importar o currículo no cadastro: etapa 3

- **Ator:** Visitante, já com a conta criada e a sessão aberta. Secundário: Sistema.
- **Descrição:** O visitante anexa um currículo para o Site extrair um rascunho de informações. O envio é opcional. As regras do extrator são as mesmas do importador do perfil (UC-C16); aqui está só o que é específico do assistente.
- **Pré-condições:** Etapas 1 e 2 concluídas (ou cadastro retomado, UC-V17).
- **Fluxo principal:**
  1. O sistema mostra "Etapa 3 de 4 — Perfil", "Vamos completar seu perfil profissional" e a caixa "Anexar currículo" com a dica "PDF ou DOCX, até 5 MB. O envio é opcional."
  2. O visitante escolhe um arquivo `.pdf` ou `.docx`. O Site confere tipo e tamanho, mostra "Lendo seu currículo…" e chama `POST /api/candidatos/:id/curriculo/importar` (campo `curriculo`).
  3. O backend extrai o texto localmente, sem inteligência artificial e sem serviço externo, e devolve um rascunho: resumo, experiências, formações, habilidades e, se achar, e-mail, telefone, LinkedIn e GitHub. Nunca procura nem devolve CPF.
  4. O Site preenche o formulário da etapa: "Resumo profissional" e "Habilidades" só se estiverem vazios; as listas de experiências e formações são substituídas pelos blocos de texto encontrados (cargo, empresa e datas em branco; o trecho vira descrição). Aparece "Encontramos estas informações. Revise, corrija e complete antes de salvar." O botão passa a "Trocar arquivo", com o nome do arquivo.
  5. O arquivo só vira currículo oficial ao concluir a etapa (UC-V15).
- **Fluxos alternativos e exceções:**
  - O Site recusa na seleção qualquer arquivo que não seja PDF ou DOCX, ou que passe de 5 MB: aviso "PDF ou DOCX, até 5 MB. O envio é opcional." e o arquivo não é enviado. O seletor de arquivos também só oferece `.pdf` e `.docx`; `.doc` nunca chega ao servidor pelo Site.
  - Falhas do backend (o aviso mostra a mensagem dele): PDF escaneado ("Não foi possível extrair texto deste PDF — ele pode ser uma imagem escaneada…") e DOCX sem texto ("Não foi possível extrair texto deste arquivo DOCX."). Sem mensagem, o Site usa "Não foi possível ler este arquivo. Tente outro, ou preencha manualmente." O anexo é descartado.
  - Só por chamada direta à API: um `.doc` é aceito no envio e recusado na extração ("Extração automática só é suportada para PDF e DOCX…"), e um arquivo acima do limite recebe 400 "Arquivo excede o tamanho máximo permitido."
  - Se o arquivo é lido mas o rascunho não traz resumo, experiências nem formações: "Não foi possível extrair texto deste arquivo (pode ser um PDF digitalizado). Preencha os campos abaixo manualmente." As habilidades não contam nessa conta: o aviso pode aparecer mesmo com o campo Habilidades preenchido pela importação.
  - Importar de novo substitui as listas de experiências e formações em vez de somar (inclusive itens digitados à mão nessas listas); Resumo e Habilidades só são preenchidos se estiverem vazios, então nada do que a pessoa já digitou neles é sobrescrito.
  - Um item importado só será gravado se a pessoa completar cargo, empresa e início (experiência) ou instituição e curso (formação); o resto é ignorado em silêncio (UC-V15).
  - O botão de anexar fica desabilitado enquanto o código do candidato não carrega.
- **Pós-condições:** Importar não grava nada. O arquivo só é salvo no passo final da etapa 3.
- **Regras de negócio:**
  - Extração por palavras-chave (cabeçalhos como "experiência", "formação", "habilidades"), até 6 itens por seção, 25 habilidades e 500 caracteres por trecho (`parsearCurriculo.js`); detalhes em UC-C16.
  - Limite de 5 MB (`MAX_UPLOAD_BYTES`); o importador só trata PDF e DOCX (`extrairTextoDocumento.js`). Só o dono do perfil (ou um administrador) pode importar (`garantirDono`).
- **Telas e endpoints:** `/cadastro/candidato` (tela, etapa 3); `POST /api/candidatos/:id/curriculo/importar`.

### UC-V15 — Montar o perfil profissional no cadastro: etapa 3

- **Ator:** Visitante, já com a conta criada.
- **Descrição:** O visitante preenche, se quiser, o perfil profissional e conclui a etapa 3. O mesmo percurso, visto pelo candidato, está em UC-C02; a edição posterior do perfil está nos casos do Candidato (UC-C06, UC-C10 a UC-C12).
- **Pré-condições:** Conta criada (UC-V12).
- **Fluxo principal:**
  1. O visitante preenche, tudo opcional: Título profissional (até 150 caracteres), Escolaridade (Ensino fundamental, médio, técnico, superior cursando, superior completo, Pós-graduação, Mestrado, Doutorado), Resumo profissional (até 2000), Experiências profissionais, Formação acadêmica e Habilidades (separadas por vírgula).
  2. Em cada experiência informa Cargo, Empresa, Início, Fim e descrição (até 2000 caracteres). Em cada formação informa Instituição e Curso. "Adicionar" cria um item novo e "Remover" apaga o item. Quem não tem experiência marca "Ainda não tenho experiência profissional".
  3. O visitante clica em "Continuar" (ou "Continuar sem currículo", que só aparece enquanto não há arquivo anexado; os dois botões fazem a mesma gravação).
  4. O sistema envia `PUT /api/candidatos/:id` (título, escolaridade, resumo e, se o currículo trouxe, LinkedIn e GitHub). Depois cria cada experiência, formação e habilidade (`POST /api/perfil/experiencias`, `/formacoes`, `/habilidades`) e, se houver arquivo, `PATCH /api/candidatos/:id/curriculo`. Por fim abre a etapa 4.
- **Fluxos alternativos e exceções:**
  - Item incompleto é ignorado em silêncio: experiência exige cargo, empresa e início; formação exige instituição e curso; habilidade vale de 2 a 80 caracteres, sem repetição na lista.
  - Experiência sem "Fim" é gravada como emprego atual. Como a formação não tem campo de término nesta tela, toda formação criada aqui fica "em andamento". O trecho sugerido pela importação é gravado como descrição da formação, mesmo sem aparecer na tela.
  - A caixa "Ainda não tenho experiência profissional" só limpa a lista na tela; não grava nada.
  - Se algo falhar no meio, o aviso mostra a mensagem da API (por exemplo "Informe o cargo (2 a 150 caracteres).", quando o cargo tem 1 letra) ou, sem ela, "Não foi possível salvar seu perfil agora." Os itens já criados não são desfeitos. Tentar de novo cria experiências e formações em duplicidade; uma habilidade com nome que já existe na conta é recusada pelo banco (409, "Este valor já está em uso.") e interrompe a gravação nesse ponto, antes do envio do arquivo.
  - O botão não faz nada enquanto o código do candidato não estiver carregado.
- **Pós-condições:** Título profissional, escolaridade e resumo são sempre gravados no perfil, mesmo em branco (valor vazio, que sobrescreve o que já houvesse); registros de experiência, formação e habilidade criados; currículo guardado em armazenamento privado (nunca vira link público).
- **Regras de negócio:**
  - Cargo e empresa de 2 a 150 caracteres, instituição e curso de 2 a 180, habilidade de 2 a 80, descrição até 2000 (`perfilValidator.js`); habilidade única por candidato (restrição do banco).
  - O arquivo do currículo tem a assinatura do formato conferida e o limite de 5 MB (`uploadMiddleware.js`); o `PATCH` aceita PDF, DOC e DOCX, mas o Site só oferece PDF e DOCX.
- **Telas e endpoints:** `/cadastro/candidato` (tela, etapa 3); `PUT /api/candidatos/:id`; `POST /api/perfil/experiencias`, `POST /api/perfil/formacoes`, `POST /api/perfil/habilidades`; `PATCH /api/candidatos/:id/curriculo`.

### UC-V16 — Configurar a acessibilidade e concluir o cadastro: etapa 4

- **Ator:** Visitante, já com a conta criada.
- **Descrição:** Na última etapa, o visitante ajusta a aparência e os recursos assistivos e finaliza o cadastro.
- **Pré-condições:** Etapa 3 concluída.
- **Fluxo principal:**
  1. O sistema mostra "Etapa 4 de 4 — Acessibilidade", "Deixe o ACESSO do seu jeito" e o painel de preferências com pré-visualização (o mesmo de UC-G38). A tela avisa que nada ali é obrigatório.
  2. O visitante ajusta o que quiser e clica em "Finalizar cadastro".
  3. O sistema chama `POST /api/auth/cadastro/concluir`. O backend confere que país, data de nascimento, cidade e estado estão preenchidos e grava `cadastro_concluido_em`.
  4. O Site atualiza a sessão e leva a `/feed`.
- **Fluxos alternativos e exceções:**
  - Quem veio por "Sou empresa" vê o botão "Continuar para o cadastro da empresa", que leva a `/cadastro/empresa` (UC-V18).
  - Erro da API: o aviso mostra a mensagem do backend (por exemplo "Para concluir o cadastro, preencha: ...") e a pessoa permanece na etapa.
  - Fechar a aba antes de finalizar não perde a conta: no próximo login o cadastro é retomado (UC-V17).
  - Limitação atual: esta etapa não grava as preferências. "Finalizar cadastro" só conclui o cadastro. As escolhas valem na tela enquanto a aba não for recarregada, mas não são salvas nem no navegador nem na conta. Só as preferências que já estavam na tela quando a conta foi criada (fim da etapa 2) foram enviadas à conta. Para guardar de vez, é preciso salvar em Configurações de acessibilidade (UC-V34).
- **Pós-condições:** `usuarios.cadastro_concluido_em` preenchido.
- **Regras de negócio:** A conclusão é idempotente: concluir de novo não reescreve a data. Currículo e foto nunca entram nessa conferência (`AutenticacaoService.concluirCadastro`).
- **Telas e endpoints:** `/cadastro/candidato` (tela, etapa 4); `POST /api/auth/cadastro/concluir`.

### UC-V17 — Retomar um cadastro inacabado

- **Ator:** Visitante com conta de candidato criada e cadastro não finalizado.
- **Descrição:** Ao entrar, quem não terminou o cadastro volta direto à etapa de perfil.
- **Pré-condições:** Conta de candidato com `cadastro_concluido_em` vazio.
- **Fluxo principal:**
  1. O visitante entra por e-mail e senha (UC-V23) ou por Google (UC-V20).
  2. O sistema detecta o cadastro inacabado e leva a `/cadastro/candidato?retomar=true`.
  3. O sistema abre a etapa 3 (UC-V14 e UC-V15), sem pedir de novo e-mail, CPF ou dados pessoais, e busca o código do candidato em `GET /api/candidatos/me`.
  4. O visitante segue pelas etapas 3 e 4 e finaliza (UC-V16).
- **Fluxos alternativos e exceções:**
  - `?retomar=true` só vale para quem está logado como candidato; sem sessão, o parâmetro é ignorado e o cadastro começa na etapa 1.
  - Durante a retomada o link "Já tem uma conta? Entrar" fica oculto.
  - Se a busca do candidato falhar: "Não foi possível salvar seu perfil agora."
  - Contas criadas antes desse campo existir já foram marcadas como concluídas pela migration `0004_pais_do_candidato_e_cadastro_concluido.sql`, e não passam por aqui.
  - Quem reativa uma conta pausada (UC-V24) vai direto ao feed e não passa pela retomada.
  - Limitação atual (recarregar a página): a etapa inicial é decidida na primeira exibição da tela e nunca é recalculada. Ao pressionar F5 em `/cadastro/candidato?retomar=true`, ou abrir esse endereço em outra aba, a sessão salva ainda não foi lida nesse momento, e o assistente abre na etapa 1 (formulário vazio), embora a pessoa esteja logada; o link "Já tem uma conta?" some em seguida. Se ela preencher e enviar, recebe 409 "Este e-mail já está cadastrado." O mesmo vale para recarregar a página nas etapas 3 e 4 logo depois de criar a conta. Para voltar à etapa 3 é preciso sair e entrar de novo.
  - Limitação atual (etapa 3 vazia): a etapa de perfil não carrega o que já foi gravado. Se a pessoa concluiu a etapa 3 e fechou a aba na etapa 4, a retomada reabre a etapa 3 em branco; salvar de novo cria experiências e formações em duplicidade, uma habilidade repetida é recusada pelo banco (UC-V15) e título, escolaridade e resumo deixados em branco sobrescrevem o que já estava gravado.
  - Limitação atual (intenção de empresa): `depois=empresa` não é guardado na conta. O login e o retorno do Google levam à retomada só com `retomar=true`, então quem veio por "Sou empresa" termina no botão "Finalizar cadastro" e em `/feed`. Fora desse botão, nenhum link do Site leva a `/cadastro/empresa`; é preciso abrir o endereço à mão.
- **Pós-condições:** As mesmas das etapas 3 e 4.
- **Regras de negócio:** O sinal é `cadastroConcluidoEm` nulo (`entrar.tsx`, `retorno-google.tsx`).
- **Telas e endpoints:** `/cadastro/candidato?retomar=true` (tela); `GET /api/candidatos/me`, `POST /api/auth/cadastro/concluir`.

### UC-V18 — Começar o cadastro de empresa pelo caminho "Sou empresa"

- **Ator:** Visitante.
- **Descrição:** O visitante que quer cadastrar uma empresa começa pela própria conta de candidato; o cadastro da empresa vem em seguida. Este caso descreve só a porta de entrada; o cadastro institucional está em UC-E01 (e, do lado do candidato, em UC-C25).
- **Pré-condições:** Sem sessão.
- **Fluxo principal:**
  1. O visitante clica em "Sou empresa" na página inicial (leva a `/cadastro/candidato?depois=empresa`).
  2. Faz o cadastro de candidato (UC-V11 a UC-V16, ou por Google, UC-V19). A intenção `depois=empresa` acompanha todo o processo, inclusive o retorno do Google (mas não a retomada, UC-V17).
  3. Na etapa 4 o botão passa a "Continuar para o cadastro da empresa" e leva a `/cadastro/empresa`, agora com sessão de candidato.
  4. As 6 etapas do cadastro da empresa (Empresa, Responsável, Endereço, Apresentação, Conclusão, Acessibilidade) pertencem à seção do ator Empresa.
- **Fluxos alternativos e exceções:**
  - Se o visitante abrir `/cadastro/empresa` sem sessão (ou com sessão que não seja de candidato), vê o aviso "Primeiro, a sua conta pessoal": "No ACESSO a conta da empresa fica vinculada à conta de candidato de quem responde por ela…", com "Criar minha conta de candidato" (leva a `/cadastro/candidato?depois=empresa`) e "Já tem conta de candidato? Entrar".
  - A API recusa o cadastro de empresa sem sessão de candidato: 401 "Para cadastrar uma empresa é preciso entrar com a sua conta de candidato.", ou 403 "Só uma conta de candidato pode cadastrar uma empresa. Entre com a sua conta pessoal."
  - Limitação atual: a página "Sobre nós" diz que se pode "cadastrar-se como candidato ou empresa" (UC-V02), mas não há cadastro direto de empresa.
- **Pós-condições:** As do cadastro de candidato. A empresa só passa a existir ao concluir o cadastro institucional, e o cadastro dela passa pela análise da equipe (Termos, seção 2).
- **Regras de negócio:** A empresa é vinculada à conta de candidato a partir da sessão, nunca de um campo enviado pelo cliente (`cadastrarEmpresa`).
- **Telas e endpoints:** `/` e `/cadastro/candidato?depois=empresa`; `/cadastro/empresa` (tela de aviso para o visitante); `POST /api/auth/register/empresa` (exige sessão de candidato).

---

## Visitante — Cadastro e login com Google

### UC-V19 — Cadastrar-se com a conta Google

- **Ator:** Visitante. Secundário: Google.
- **Descrição:** O visitante usa a conta Google para preencher nome e e-mail e vincular o Google ao novo cadastro de candidato.
- **Pré-condições:** O recurso precisa estar configurado no servidor (variáveis do Google). O botão só aparece se `GET /api/auth/google/disponivel` responder `true`; caso contrário, nem o botão nem o separador "ou" são exibidos. Ainda não existir conta com aquele Google ou aquele e-mail.
- **Fluxo principal:**
  1. Na etapa 1 de `/cadastro/candidato` (ou em `/entrar`), o visitante clica em "Continuar com Google".
  2. O sistema chama `GET /api/auth/google/iniciar` e leva o navegador à tela de consentimento do Google (escopos: identidade, e-mail e perfil; o Google sempre pede para escolher a conta).
  3. O visitante escolhe a conta e autoriza. A senha do Google nunca passa pelo ACESSO.
  4. O Google devolve o visitante ao backend (`GET /api/auth/google/callback`). O backend confere o `state` assinado (10 minutos) e o nonce, valida o ID token e redireciona o navegador para `/retorno-google?codigo=...`. O código de entrega vale 15 minutos.
  5. `/retorno-google` mostra "Confirmando sua conta Google…" e chama `POST /api/auth/google/concluir`. Como não há conta, o Site vai direto a `/cadastro/candidato?google=<código>` (acrescenta `depois=empresa` se veio de "Sou empresa").
  6. A etapa 1 volta com nome e e-mail já preenchidos e o aviso "Conta Google confirmada. Ela será vinculada a este cadastro: <e-mail>. Defina também uma senha — com ela você entra mesmo sem o Google." No lugar do botão do Google.
  7. O visitante completa CPF, senha e aceite e segue as etapas normais (UC-V11 a UC-V16). O envio de `POST /api/auth/register/candidato` leva o código, e o backend vincula a conta pelo identificador (`sub`) verificado do Google.
- **Fluxos alternativos e exceções:**
  - Cancelamento no Google: "Você cancelou a entrada com o Google." Erro geral: "Não foi possível concluir a entrada com o Google. Tente novamente." As duas aparecem num cartão "Não deu certo" com "Voltar para o login".
  - Já existe conta ACESSO com o mesmo e-mail e sem Google vinculado: "Esta conta já existe no ACESSO — Já há uma conta com o e-mail …, criada com senha. Entre com ela — depois você pode vincular o Google nas configurações…", com o botão "Entrar com e-mail e senha". Nada é vinculado automaticamente. Limitação atual: o Site não tem tela para vincular o Google depois do login; só existe `POST /api/auth/google/vincular`, que nenhuma tela chama. A comparação do e-mail do Google com as contas existentes usa o endereço em minúsculas, sem a normalização do cadastro (UC-V12); pelo código, uma conta gravada com e-mail normalizado (por exemplo, Gmail sem pontos) pode não ser reconhecida como conflito, e o cadastro termina em 409 "Este e-mail já está cadastrado." no envio da etapa 2.
  - Código expirado antes de terminar o cadastro: 400 "A verificação com o Google expirou. Entre com o Google novamente."
  - Se a abertura do Google falhar: "Não foi possível abrir a autenticação do Google."
  - Abrir `/retorno-google` sem os parâmetros `codigo` ou `erro` deixa a tela parada em "Confirmando sua conta Google…", sem saída.
  - O e-mail preenchido pode ser editado; o backend não exige que seja o do Google. A conta continua com e-mail não verificado e recebe o e-mail de confirmação como qualquer cadastro.
- **Pós-condições:** As do UC-V12, mais `usuarios.google_id`.
- **Regras de negócio:**
  - `tipoConta` não define o papel: toda conta nova nasce candidato, e ele só carrega a intenção de seguir para a empresa (`GoogleAuthService`).
  - O vínculo é pelo `sub`, nunca pelo e-mail; não há vínculo automático por e-mail (`GoogleAuthService.resolver`).
  - `/auth/google/iniciar` e `/auth/google/concluir` usam o limite de 10 tentativas com falha por 15 minutos por IP.
- **Telas e endpoints:** `/cadastro/candidato`, `/retorno-google` (telas); `GET /api/auth/google/disponivel`, `GET /api/auth/google/iniciar`, `GET /api/auth/google/callback`, `POST /api/auth/google/concluir`, `POST /api/auth/register/candidato`.

### UC-V20 — Entrar com a conta Google

- **Ator:** Visitante com conta já vinculada ao Google. Secundário: Google.
- **Descrição:** O visitante entra no ACESSO usando o Google, sem digitar a senha.
- **Pré-condições:** Recurso disponível (UC-V19) e conta ACESSO com Google vinculado (feito no cadastro por Google, UC-V19).
- **Fluxo principal:**
  1. Em `/entrar`, o visitante clica em "Continuar com Google" e passa pelo Google (passos 2 a 4 do UC-V19).
  2. `/retorno-google` chama `POST /api/auth/google/concluir`. O backend identifica a conta pelo `sub` e aplica as mesmas checagens do login por senha.
  3. O Site guarda os tokens, recarrega o perfil e leva o visitante: candidato com cadastro inacabado a `/cadastro/candidato?retomar=true` (UC-V17), administrador a `/admin`, os demais a `/feed`.
- **Fluxos alternativos e exceções:**
  - Conflito de e-mail, cancelamento e erro: iguais ao UC-V19.
  - Se não houver conta com aquele Google nem com aquele e-mail, o fluxo cai no cadastro (UC-V19).
  - Limitação atual: a tela `/retorno-google` só trata os desfechos "entrar" (com sessão), "conflito" e "cadastrar". Para conta pausada, ou conta de empresa ou administrador com e-mail não confirmado, o backend não devolve erro: `POST /api/auth/google/concluir` responde 200 com `desfecho: "entrar"` e uma marca (`contaPausada` ou `emailNaoVerificado`), sem tokens e sem usuário. O Site apaga o token de acesso guardado, não consegue ler o usuário e cai no aviso genérico "Não foi possível concluir a entrada com o Google. Tente novamente." Conta desativada ou bloqueada recebe 403 ("Usuário desativado."), que termina no mesmo aviso. Para reativar uma conta pausada é preciso entrar por e-mail e senha (UC-V24); para confirmar o e-mail de empresa, UC-V21.
  - Diferente do login por senha, este caminho não aplica as preferências de acessibilidade salvas na conta (só carrega o perfil e adota o idioma da conta).
- **Pós-condições:** Sessão aberta; `ultimo_login` atualizado; idioma da conta adotado.
- **Regras de negócio:** Mesmos portões do login por senha, em `AutenticacaoService.entrarComUsuario`. O Google nunca vincula conta existente sem sessão.
- **Telas e endpoints:** `/entrar`, `/retorno-google` (telas); `GET /api/auth/google/iniciar`, `GET /api/auth/google/callback`, `POST /api/auth/google/concluir`.

---

## Visitante — Confirmação de e-mail

### UC-V21 — Confirmar o e-mail

- **Ator:** Visitante. Secundário: provedor de e-mail (Brevo).
- **Descrição:** O visitante confirma o endereço de e-mail da conta usando o link ou o código de 6 dígitos recebidos.
- **Pré-condições:** Ter recebido o e-mail "Confirme seu e-mail — ACESSO". O e-mail só sai se o provedor estiver configurado no servidor; sem a URL do Site configurada, vem só o código, sem o botão. O código vale 15 minutos.
- **Fluxo principal (pelo link):**
  1. O visitante clica em "Confirmar meu e-mail" na mensagem e abre `/confirmar-email?email=…&codigo=…`.
  2. O sistema mostra "Confirmando seu e-mail…" e chama `POST /api/auth/cadastro/confirmar-email` sozinho, uma única vez.
  3. Dando certo, mostra "E-mail confirmado com sucesso! Agora é só entrar. Se o seu cadastro ficou pela metade, continuamos de onde você parou." com o botão "Entrar no ACESSO" (leva a `/entrar`).
- **Fluxo alternativo (pelo código):** O visitante abre `/confirmar-email` (também há o link "confirmar por código" na tela de cadastro de empresa), informa E-mail e "Código de confirmação" (6 dígitos) e clica em "Confirmar e-mail".
- **Fluxos alternativos e exceções:**
  - Código errado, expirado ou e-mail inexistente: "Código inválido ou expirado." junto ao campo do código, com foco nele (se a confirmação automática do link falhar, o formulário aparece preenchido com esse erro). Depois de 5 tentativas erradas (todas respondidas com "Código inválido ou expirado."), a 6ª tentativa, mesmo com o código correto, recebe "Número de tentativas excedido. Solicite um novo código." e o código é invalidado.
  - E-mail já confirmado: a API responde sucesso "E-mail já confirmado. Você já pode fazer login." sem conferir o código, e o Site mostra a mesma tela de sucesso.
  - Validação do Site: "Informe seu e-mail.", "Informe um e-mail válido.", "O código deve ter 6 dígitos." e "O código deve conter apenas números."
  - 429 "Muitas tentativas de autenticação…" (10 falhas por IP em 15 minutos).
  - O formulário de código não aplica a normalização de e-mail do cadastro (UC-V12): se a conta foi gravada com e-mail normalizado, digitar o endereço original recebe "Código inválido ou expirado."; o link do e-mail funciona, porque já carrega o endereço gravado.
  - A tela leva ao login, e o login pode seguir para a retomada do cadastro (UC-V17).
- **Pós-condições:** `usuarios.email_verificado = true`, código marcado como usado e uma notificação "E-mail confirmado" criada na conta, visível no próximo login.
- **Regras de negócio:**
  - A confirmação é obrigatória para entrar só nas contas de empresa e administrador; candidato entra sem confirmar (`AutenticacaoService.entrarComUsuario`).
  - Código guardado só como hash SHA-256; comparação em tempo constante.
  - O limite de 5 tentativas é conferido no início de cada tentativa (`registro.tentativas >= 5`); o contador só sobe quando o código está errado.
- **Telas e endpoints:** `/confirmar-email` (tela); `POST /api/auth/cadastro/confirmar-email`.

### UC-V22 — Reenviar a confirmação de e-mail

- **Ator:** Visitante. Secundário: provedor de e-mail (Brevo).
- **Descrição:** O visitante pede um novo e-mail de confirmação quando não recebeu o primeiro ou ele expirou.
- **Pré-condições:** Conta criada e ainda não confirmada.
- **Fluxo principal:**
  1. O visitante clica em "Reenviar código" em `/confirmar-email` (informando o e-mail; sem e-mail preenchido, o botão não faz nada). O mesmo pedido existe como "Reenviar e-mail" na tela "Confirme seu e-mail" do login de conta de empresa (UC-V23) e na tela "Falta confirmar seu e-mail" do cadastro de empresa.
  2. O Site chama `POST /api/auth/cadastro/reenviar-confirmacao` e mostra "Um novo código de confirmação foi enviado." (ou "Um novo e-mail de confirmação foi enviado."). O botão passa a "Código reenviado" (ou "E-mail reenviado") e fica desabilitado.
- **Fluxos alternativos e exceções:**
  - A resposta é sempre a mesma, exista ou não a conta, esteja ou não confirmada. O backend só envia se a conta existe, não está confirmada, o provedor está configurado e o último envio foi há pelo menos 60 segundos.
  - Limitação atual: o aviso de sucesso aparece mesmo quando o backend não enviou nada (intervalo de 60 segundos, conta já confirmada ou provedor desligado).
  - Limite de 5 reenvios por IP por hora (contando todos os pedidos): 429 "Muitas solicitações de reenvio. Tente novamente mais tarde."
  - Falha de rede: "Não foi possível reenviar o código agora." (ou "…o e-mail agora.").
  - O pedido de reenvio aplica a normalização de e-mail do cadastro (UC-V12); a confirmação por código, não (UC-V21).
- **Pós-condições:** Códigos anteriores ainda válidos são invalidados e um novo código de 15 minutos é gravado e enviado (só quando o backend de fato envia).
- **Regras de negócio:** Resposta genérica contra enumeração de contas (`reenviarConfirmacaoCadastro`).
- **Telas e endpoints:** `/confirmar-email`, `/entrar`, `/cadastro/empresa` (telas); `POST /api/auth/cadastro/reenviar-confirmacao`.

---

## Visitante — Entrar e recuperar o acesso

### UC-V23 — Entrar com e-mail e senha

- **Ator:** Visitante com conta.
- **Descrição:** O visitante entra no ACESSO e é levado à tela correspondente ao seu tipo de conta.
- **Pré-condições:** Ter conta ativa.
- **Fluxo principal:**
  1. O visitante abre `/entrar` (botão "Entrar" dos cabeçalhos públicos ou links "Entrar" das telas de cadastro, recuperação e confirmação).
  2. O sistema mostra "Entrar no ACESSO — Suas preferências de acessibilidade acompanham sua conta.", o botão "Continuar com Google" (se disponível), os campos E-mail e Senha (com mostrar/ocultar), o link "Esqueceu a senha?" (leva a `/recuperar-senha`) e o botão "Entrar". Há também seletor de idioma e atalho "Acessibilidade", e, abaixo do formulário, "Ainda não tem uma conta? Criar conta gratuita" (leva a `/cadastro`; some nas telas de conta pausada e de e-mail não confirmado).
  3. O visitante preenche e clica em "Entrar". O Site chama `POST /api/auth/login`.
  4. O backend confere a senha e as condições da conta e devolve a sessão. O Site guarda os tokens, adota o idioma da conta, aplica em segundo plano as preferências de acessibilidade da conta (`GET /api/acessibilidade`) e mostra "Login realizado com sucesso!"
  5. Destino: candidato com cadastro inacabado vai a `/cadastro/candidato?retomar=true` (UC-V17); administrador vai a `/admin`; os demais vão a `/feed`.
- **Fluxos alternativos e exceções:**
  - Validação do Site: "Informe seu e-mail.", "Informe um e-mail válido." e "Informe sua senha."
  - 401 "E-mail ou senha inválidos." (a mesma mensagem para e-mail inexistente ou senha errada), mostrada sob o campo da senha. Sem mensagem da API, vale "Não foi possível entrar. Verifique seus dados."
  - 403 "Usuário desativado." Conta bloqueada pela moderação cai aqui também, porque o bloqueio marca a conta como inativa e essa checagem vem antes; o motivo do bloqueio não aparece no login por senha.
  - Conta de empresa ou de administrador com e-mail não confirmado: o login não cria sessão e mostra "Confirme seu e-mail" com "Reenviar e-mail" (UC-V22) e "Voltar". Candidato não é barrado por e-mail não confirmado.
  - Conta pausada: UC-V24.
  - 429 "Muitas tentativas de autenticação. Tente novamente mais tarde." (10 tentativas com falha por IP em 15 minutos). Há trava contra clique duplo.
  - O Site não oferece "lembrar de mim": a sessão fica nos tokens guardados no navegador. O token de acesso dura 30 minutos por padrão e é renovado sozinho com o refresh token (válido por 30 dias a cada emissão).
  - Sessão salva: ao abrir o Site com tokens guardados, o Site chama `GET /api/auth/me`; se o token de acesso expirou, tenta `POST /api/auth/refresh`. Se a renovação falhar, apaga os tokens e a pessoa segue como visitante (se a conta estiver bloqueada, aparece por 10 segundos o motivo informado pela moderação).
  - Limitação atual: o login procura o e-mail digitado só em minúsculas, sem a normalização do cadastro (UC-V12). Quem se cadastrou com `maria.silva@gmail.com` tem a conta gravada como `mariasilva@gmail.com`, e entrar com o endereço com ponto resulta em "E-mail ou senha inválidos." O mesmo vale para `fulano+x@outlook.com` (gravado sem o `+x`) e para os demais casos de normalização. A recuperação de senha e o reenvio de confirmação aplicam a normalização e encontram a conta.
- **Pós-condições:** `ultimo_login` atualizado; nova sessão com data, navegador e IP registrados; conexão em tempo real aberta; as preferências guardadas na conta substituem as do aparelho, campo a campo (inclusive quando a conta guarda os valores padrão; cursor ampliado e valores de espaçamento não fazem parte do que a conta guarda e ficam como estavam).
- **Regras de negócio:**
  - Mensagem de erro genérica e comparação de hash mesmo sem usuário, para dificultar enumeração e ataques de tempo (`AutenticacaoService.entrar`).
  - Ordem das checagens: conta ativa, não bloqueada, e-mail confirmado (só para quem não é candidato) e conta pausada (`entrarComUsuario`).
- **Telas e endpoints:** `/entrar` (tela); `POST /api/auth/login`; `GET /api/acessibilidade` (após o login, em segundo plano); `GET /api/auth/me` e `POST /api/auth/refresh` (sessão salva); `GET /api/auth/google/disponivel` (botão do Google).

### UC-V24 — Reativar conta pausada ao entrar

- **Ator:** Visitante com conta pausada.
- **Descrição:** Quem pausou a própria conta confirma a reativação no próprio login. A pausa em si (Configurações › Conta) é função comum a qualquer tipo de conta e está em UC-G41.
- **Pré-condições:** Conta pausada pelo titular (em Configurações › Conta, disponível a candidato, empresa e administrador; UC-G41). A pausa revoga todas as sessões abertas.
- **Fluxo principal:**
  1. O visitante entra com e-mail e senha corretos (UC-V23).
  2. O backend responde que a conta está pausada e não cria sessão.
  3. O sistema mostra "Sua conta está pausada — Você pausou esta conta anteriormente. Deseja reativá-la e continuar?" (o leitor de voz lê "Sua conta está pausada. Deseja reativá-la agora?").
  4. O visitante clica em "Reativar minha conta". O Site repete `POST /api/auth/login` com `confirmarReativacao: true`.
  5. O sistema mostra "Conta reativada. Bem-vindo de volta!" e leva a `/feed`.
- **Fluxos alternativos e exceções:**
  - "Voltar" cancela e retorna ao formulário.
  - Erro: a mensagem da API ou, sem ela, "Não foi possível reativar a conta."
  - A reativação sempre leva a `/feed`: não faz a retomada do cadastro nem vai a `/admin`.
  - Limitação atual: os Termos (seção 6) e a Política (seção 6) afirmam que a conta pausada deixa de aparecer para outras pessoas. No código, o marcador `pausado_pelo_usuario` só é usado no login e na ação de pausar; nenhuma consulta de perfil, feed ou vagas o considera. A pausa só exige a confirmação da reativação ao entrar e encerra as sessões abertas.
  - Não há reativação pelo login com Google (UC-V20).
- **Pós-condições:** `pausado_pelo_usuario = false`, `pausado_em` vazio e `ultimo_login` atualizado; sessão aberta.
- **Regras de negócio:** `AutenticacaoService.entrarComUsuario` (checa a pausa depois das demais condições).
- **Telas e endpoints:** `/entrar` (tela); `POST /api/auth/login` (com `confirmarReativacao`).

### UC-V25 — Solicitar a recuperação de senha

- **Ator:** Visitante que esqueceu a senha. Secundário: provedor de e-mail (Brevo).
- **Descrição:** O visitante pede um link por e-mail para criar uma nova senha.
- **Pré-condições:** Nenhuma (não é preciso saber se a conta existe).
- **Fluxo principal:**
  1. No login, o visitante clica em "Esqueceu a senha?" e abre `/recuperar-senha` ("Informe seu e-mail para receber um link de redefinição de senha.").
  2. Informa o e-mail e clica em "Enviar link". O Site chama `POST /api/auth/senha/esqueci`.
  3. O sistema mostra "Verifique seu e-mail — Se encontrarmos uma conta associada a este endereço, enviaremos um link para redefinir sua senha. Clique nele para continuar."
  4. O e-mail "Redefinição de senha — ACESSO" traz o botão "Redefinir minha senha" (link `/redefinir-senha?token=...`) e, para quem está no aplicativo, um código de 6 dígitos.
- **Fluxos alternativos e exceções:**
  - Validação: "Informe seu e-mail." e "Informe um e-mail válido."
  - A resposta é idêntica para e-mail inexistente ou conta inativa (bloqueada ou desativada); nada é enviado nesses casos. Conta pausada recebe o e-mail normalmente, e a redefinição não a reativa.
  - 429 "Muitas tentativas de autenticação. Tente novamente mais tarde." (10 pedidos por IP em 15 minutos, contando todos, inclusive os bem-sucedidos). Qualquer erro da chamada aparece como aviso, com a mensagem da API ou, sem ela, "Não foi possível solicitar a recuperação de senha."
  - Erro de envio do e-mail é registrado no servidor e a resposta continua genérica; sem provedor configurado, a resposta é a mesma e nenhum e-mail sai (fora de produção, código e link vão para o log do servidor).
  - Links da tela: "Usar o código do e-mail" (na tela de confirmação, junto de "Está no aplicativo ACESSO?") e "Já tem um código? Redefinir senha" (levam a `/redefinir-senha`) e "Lembrou a senha? Entrar".
  - O e-mail sai no idioma que o visitante escolheu na tela; sem isso, no idioma da conta. O pedido aplica a normalização de e-mail do cadastro (UC-V12), então encontra a conta mesmo com o endereço digitado de outra forma.
- **Pós-condições:** Quando a conta existe e está ativa, códigos e tokens anteriores ainda válidos são invalidados e um novo registro guarda só o hash do código de 6 dígitos e do token (48 bytes aleatórios), com validade de 15 minutos e o IP do pedido.
- **Regras de negócio:** `RecuperacaoSenhaService.solicitar`: resposta genérica contra enumeração; validade de 15 minutos; segredo nunca guardado em claro.
- **Telas e endpoints:** `/recuperar-senha` (tela); `POST /api/auth/senha/esqueci`.

### UC-V26 — Redefinir a senha pelo link do e-mail

- **Ator:** Visitante.
- **Descrição:** O visitante cria uma nova senha usando o link recebido por e-mail.
- **Pré-condições:** Ter um link válido (15 minutos, uso único).
- **Fluxo principal:**
  1. O visitante abre `/redefinir-senha?token=…`.
  2. O sistema mostra "Redefinir senha — Escolha uma nova senha para sua conta.", com "Nova senha" e "Confirmar nova senha" (ambas com mostrar/ocultar) e a dica "Use ao menos 8 caracteres, com maiúscula, minúscula, número e caractere especial."
  3. O visitante preenche e clica em "Redefinir senha". O Site chama `POST /api/auth/senha/redefinir` com o token e a nova senha.
  4. O sistema mostra "Senha redefinida com sucesso! Faça login novamente." e leva a `/entrar`.
- **Fluxos alternativos e exceções:**
  - Validação: as regras de senha de 8 a 72 caracteres, "Confirme a nova senha." e "As senhas não coincidem."
  - Qualquer recusa do servidor (link usado, expirado ou inválido; a API responde "Link ou código inválido ou expirado.", mostrada num aviso) troca o formulário por "Link inválido ou expirado — Este link de redefinição já foi usado, expirou ou é inválido. Solicite um novo link para continuar.", com "Solicitar novo link" (leva a `/recuperar-senha`). Isso vale também para erros de outra natureza, como o limite de tentativas.
  - O token não tem limite de tentativas próprio, porque é aleatório e longo; excesso de falhas cai no limite geral de 10 falhas por 15 minutos por IP.
- **Pós-condições:** Senha nova gravada como hash; `senha_alterada_em` atualizada (os tokens de acesso emitidos antes deixam de valer); registro marcado como usado; todas as sessões revogadas e os tokens de notificação push removidos; notificação "Senha alterada" criada na conta e, se houver provedor, e-mail de aviso.
- **Regras de negócio:** `RecuperacaoSenhaService._redefinirComToken` e `_aplicarNovaSenha`; regras de senha de `regrasSenha`. A redefinição não desbloqueia nem reativa conta.
- **Telas e endpoints:** `/redefinir-senha` (tela); `POST /api/auth/senha/redefinir` (corpo `{ token, novaSenha }`).

### UC-V27 — Redefinir a senha pelo código de 6 dígitos

- **Ator:** Visitante (pensado para quem usa o aplicativo, mas disponível no Site).
- **Descrição:** O visitante redefine a senha informando e-mail e código, quando não usa o link.
- **Pré-condições:** Ter recebido o código (UC-V25), com validade de 15 minutos.
- **Fluxo principal:**
  1. O visitante abre `/redefinir-senha` sem token (pelos links "Usar o código do e-mail" ou "Redefinir senha" em `/recuperar-senha`; o e-mail e o código podem vir preenchidos por `?email=` e `?codigo=`).
  2. O sistema mostra o texto "Prefere usar o link enviado por e-mail? Ele é mais rápido…" e os campos E-mail, "Código de verificação", "Nova senha" e "Confirmar nova senha".
  3. O visitante preenche e clica em "Redefinir senha". O Site chama `POST /api/auth/senha/redefinir` com e-mail, código e nova senha.
  4. Sucesso: "Senha redefinida com sucesso! Faça login novamente." e redirecionamento a `/entrar`.
- **Fluxos alternativos e exceções:**
  - Erros do código aparecem junto ao campo e levam o foco para ele: "Código inválido ou expirado." (inclui e-mail inexistente). Depois de 5 tentativas erradas (todas respondidas com "Código inválido ou expirado."), a 6ª tentativa, mesmo com o código correto, recebe "Número de tentativas excedido. Solicite um novo código." e o código é invalidado.
  - Validação do Site: "O código deve ter 6 dígitos.", "O código deve conter apenas números.", regras de senha e confirmação.
  - Este caminho não aplica a normalização de e-mail do cadastro (UC-V12): quem digitar o endereço original de uma conta gravada com e-mail normalizado recebe "Código inválido ou expirado." O link do e-mail (UC-V26) não tem esse problema.
- **Pós-condições:** As mesmas do UC-V26.
- **Regras de negócio:** Código de 6 dígitos com máximo de 5 tentativas (`MAX_TENTATIVAS`), conferido no início de cada tentativa; o link por token é o mecanismo principal (`RecuperacaoSenhaService`).
- **Telas e endpoints:** `/redefinir-senha` (tela); `POST /api/auth/senha/redefinir` (corpo `{ email, codigo, novaSenha }`).

---

## Visitante — Idioma e acessibilidade antes do login

Idioma e acessibilidade são funções comuns, descritas em UC-G38 a UC-G40. Os casos abaixo mantêm só o que muda para quem não tem sessão: tudo fica guardado no navegador (`localStorage`), nada vai para uma conta, e a conta só entra em jogo no cadastro e no login (UC-V34).

### UC-V28 — Trocar o idioma da interface

- **Ator:** Visitante.
- **Descrição:** O visitante escolhe entre Português, English e Español. O comportamento do seletor é o de UC-G40; aqui ficam as diferenças de quem não tem conta.
- **Pré-condições:** Nenhuma.
- **Fluxo principal:**
  1. O visitante abre o seletor de idioma (PT, EN ou ES nos cabeçalhos compactos; no cadastro de candidato aparece o nome por extenso) e escolhe um idioma, como em UC-G40.
  2. O idioma fica guardado só no navegador (`acesso:idioma`); nenhuma chamada é feita ao servidor.
- **Fluxos alternativos e exceções:**
  - O padrão é Português; o Site não detecta o idioma do navegador. Se o armazenamento do navegador estiver bloqueado, a escolha vale só até fechar a aba.
  - O seletor está na página inicial, "Sobre nós", cabeçalho público de `/vagas` e `/vaga/:id`, `/configuracoes/acessibilidade`, login, cadastro, recuperar e redefinir senha, confirmar e-mail, retorno do Google, boas-vindas, Termos, Política e na tela de aviso de `/cadastro/empresa`. Não há nas telas de erro (404 e "Esta página não carregou").
  - Toda chamada à API leva o idioma em `Accept-Language`, então erros, validações e os e-mails de confirmação e de recuperação saem no idioma da tela. Exceção: a consulta da página inicial (`GET /api/publico/home`) não envia o cabeçalho.
  - Datas e valores em reais seguem o idioma (`pt-BR`, `en-US`, `es-ES`).
- **Pós-condições:** Só local. O cadastro grava o idioma da tela na conta (`usuarios.idioma`). O aviso `PATCH /api/auth/idioma` só ocorre com sessão.
- **Regras de negócio:** Após o login, o idioma salvo na conta substitui o da tela (`adotarIdiomaDaConta`). O português é a fonte, e `en` e `es` têm as mesmas chaves (`src/i18n`).
- **Telas e endpoints:** Seletor presente na maioria das telas públicas; sem endpoint próprio para o visitante. O servidor traduz mensagens a partir de `Accept-Language` (`idiomaMiddleware`).

### UC-V29 — Ajustar aparência e leitura

- **Ator:** Visitante.
- **Descrição:** O visitante personaliza contraste, tema, tipografia e espaçamentos, e vê o efeito na hora. Os controles do grupo "Visual" são os de UC-G38; aqui ficam as diferenças de quem não tem conta.
- **Pré-condições:** Nenhuma. A tela `/configuracoes/acessibilidade` é pública; chega-se por "Acessibilidade" no cabeçalho da página inicial, do login e do cadastro, por "Configurar acessibilidade agora" na página inicial ou pelo rodapé "Precisa de ajuda?" (UC-G01).
- **Fluxo principal:**
  1. O visitante abre `/configuracoes/acessibilidade`. O texto informa: "Sem login, as preferências ficam salvas neste dispositivo."
  2. Ajusta o grupo "Visual" (alto contraste, modo escuro, fonte para dislexia, tamanho da fonte, espaçamentos) como descrito em UC-G38; cada mudança é aplicada na hora à página inteira.
- **Fluxos alternativos e exceções:**
  - O efeito é uma pré-visualização: sem "Salvar preferências" (UC-V34), vale só enquanto a aba não for recarregada. Navegar entre telas não desfaz.
  - A tela é mostrada dentro da estrutura pública (cabeçalho com "Vagas", "Entrar" e "Criar conta"), sem o menu de perfil.
- **Pós-condições:** Nenhuma até o visitante salvar (UC-V34).
- **Regras de negócio:** Preferências aplicadas como classes e variáveis CSS no elemento raiz (`AcessibilidadeProvider`). Faixas dos controles em `PainelAcessibilidade.tsx`.
- **Telas e endpoints:** `/configuracoes/acessibilidade` (tela). Sem endpoint para o visitante (a leitura `GET /api/acessibilidade` só ocorre com sessão).

### UC-V30 — Ajustar navegação e interação

- **Ator:** Visitante.
- **Descrição:** O visitante ajusta o cursor, as animações e o destaque do foco do teclado. Os controles do grupo "Navegação e interação" são os de UC-G38; aqui ficam as diferenças de quem não tem conta.
- **Pré-condições:** Estar em `/configuracoes/acessibilidade` (ou numa etapa de painel de acessibilidade, UC-V16 e UC-V35).
- **Fluxo principal:**
  1. No grupo "Navegação e interação", o visitante liga ou desliga "Cursor ampliado", "Reduzir animações" e "Destaque de foco do teclado" (vem ligado por padrão).
  2. O sistema aplica a mudança na hora, em toda a página. Para guardar, UC-V34.
- **Fluxos alternativos e exceções:**
  - O cursor ampliado nunca é enviado à conta. Do espaçamento de letras e de linhas, vai à conta só um indicador verdadeiro ou falso (`espacamentoTexto`, verdadeiro se letras > 0 ou linhas > 1,6); os valores exatos não são enviados nem restaurados no login (`acessibilidade.service.ts`).
  - Limitação atual: a página inicial promete que o que se configura "acompanha sua conta em qualquer dispositivo" (UC-V01), o que não vale para o cursor ampliado nem para os valores de espaçamento.
- **Pós-condições:** Nenhuma até salvar.
- **Regras de negócio:** Valores padrão em `PREFERENCIAS_PADRAO` (`AcessibilidadeContext.ts`).
- **Telas e endpoints:** `/configuracoes/acessibilidade` (tela).

### UC-V31 — Responder ao convite de leitura por voz

- **Ator:** Visitante.
- **Descrição:** No primeiro acesso, o Site pergunta se a leitura por voz deve ficar ativa. O diálogo é o de UC-G39; aqui ficam as diferenças de quem não tem conta.
- **Pré-condições:** O navegador suporta síntese de voz (`speechSynthesis`) e a pergunta ainda não foi respondida neste aparelho.
- **Fluxo principal:**
  1. O visitante abre a página inicial, `/vagas`, `/vaga/:id` ou `/configuracoes/acessibilidade`.
  2. Cerca de 0,7 segundo depois, o sistema abre o diálogo "Deseja ativar a leitura por voz?" e lê em voz alta: "Olá! Bem-vindo ao ACESSO. Deseja utilizar o sistema de leitura por voz como padrão durante toda a sua navegação? Escolha sim ou não."
  3. O visitante escolhe "Sim, ativar leitura" ou "Não, obrigado".
  4. Com "Sim", o sistema liga a leitura e fala "Leitura por voz ativada. Use a tecla Tab para navegar pelo site." Com "Não", interrompe a fala.
- **Fluxos alternativos e exceções:**
  - O diálogo não se fecha por Esc nem fora dos botões: exige uma resposta.
  - Não aparece nas telas de login, cadastro, recuperação de senha, confirmação, retorno do Google, "Sobre nós", boas-vindas, Termos e Política: elas não montam o diálogo.
  - Navegador sem voz: o convite nunca aparece.
  - "Redefinir tudo" (UC-V34) faz o convite voltar.
  - No login, o valor de `consentimentoVoz` guardado na conta (inclusive "ainda não respondeu") substitui o do aparelho (UC-V34); pelo código, quem respondeu como visitante pode ser perguntado de novo ao entrar numa conta que ainda não respondeu.
- **Pós-condições:** A resposta é gravada na hora no navegador (`acesso:voice-choice`) junto das demais preferências que estiverem na tela (`acesso:a11y-prefs`), sem precisar clicar em "Salvar". Para o visitante não vai à conta.
- **Regras de negócio:** `voiceConsent` registra só a resposta e `screenReader` diz se a leitura está ligada; podem ser desligadas depois sem desfazer a resposta (`AcessibilidadeContext.ts`).
- **Telas e endpoints:** `/`, `/vagas`, `/vaga/:vagaId`, `/configuracoes/acessibilidade` (telas). Sem endpoint para o visitante.

### UC-V32 — Usar a leitura por voz

- **Ator:** Visitante. Secundário: voz do navegador (Web Speech API).
- **Descrição:** Com a leitura ativa, o Site fala o item que a pessoa focou ou clicou. Ligar e desligar a leitura e ajustar a velocidade fazem parte do painel de UC-G38; abaixo estão os detalhes de funcionamento, que valem sem conta.
- **Pré-condições:** Navegador com síntese de voz e leitura ligada (UC-V31 ou o interruptor "Leitura por voz" em `/configuracoes/acessibilidade`).
- **Fluxo principal:**
  1. O visitante liga "Leitura por voz" e, se quiser, ajusta "Velocidade da voz" (UC-G38). O botão "Testar leitura em voz alta" da pré-visualização toca uma frase de exemplo e funciona mesmo com a leitura desligada.
  2. O visitante navega com Tab ou clica. O sistema fala o nome do item, seu tipo (botão, link, campo de texto, caixa de seleção, interruptor, seletor…) e seu estado (desabilitado, marcado, com erro…), no idioma do Site.
  3. Ao abrir um diálogo, o sistema anuncia o contexto dele uma vez (título e descrição). Avisos que aparecem na tela (por exemplo o resultado de uma ação) também são lidos.
- **Fluxos alternativos e exceções:**
  - O leitor não narra a página inteira: só o item em uso.
  - Cartões de vaga têm uma frase própria: "Vaga de <cargo>, empresa <empresa>, <local>, modalidade <modalidade>."
  - Sem suporte de voz no navegador, o interruptor não tem efeito. Trocar de idioma interrompe a fala em andamento. A qualidade da voz depende do navegador e do sistema operacional.
  - Ligar ou desligar a leitura vale na hora, sem salvar (é parte da pré-visualização).
- **Pós-condições:** Nenhuma até salvar (UC-V34).
- **Regras de negócio:** `useLeituraAutomatica` e `lib/leitorSemantico.ts` (nunca falam identificadores, endereços ou atributos técnicos); `VozProvider`.
- **Telas e endpoints:** Todas as telas do Site. Sem endpoint.

### UC-V33 — Usar o VLibras

- **Ator:** Visitante. Secundário: serviço VLibras do Governo Federal.
- **Descrição:** O visitante usa o tradutor oficial de Libras disponível em todas as páginas. O interruptor "VLibras (Libras)" faz parte do painel de UC-G38; abaixo estão os detalhes de funcionamento, que valem sem conta.
- **Pré-condições:** Preferência "VLibras (Libras)" ligada (é o padrão).
- **Fluxo principal:**
  1. O Site carrega o plugin de `vlibras.gov.br` e mostra o botão flutuante do VLibras no canto da tela, em todas as páginas.
  2. O visitante clica no botão e usa o tradutor para ver o conteúdo em Libras.
  3. Em `/configuracoes/acessibilidade`, pode desligar o interruptor "VLibras (Libras)", e o widget é ocultado.
- **Fluxos alternativos e exceções:**
  - Se a preferência já estiver desligada ao abrir o Site, o plugin nem é carregado.
  - Se o serviço do governo estiver fora do ar, o widget não aparece e o resto do Site funciona.
  - A Política (seção 5) informa que o navegador contata `vlibras.gov.br` quando o recurso está ativo.
- **Pós-condições:** Nenhuma até salvar (UC-V34).
- **Regras de negócio:** `VLibras.tsx`; padrão `vlibras: true`.
- **Telas e endpoints:** Todas as telas; configuração em `/configuracoes/acessibilidade`. Sem endpoint do ACESSO.

### UC-V34 — Salvar, descartar ou redefinir as preferências de acessibilidade

- **Ator:** Visitante.
- **Descrição:** O visitante guarda no navegador as preferências escolhidas, descarta as alterações ou volta ao padrão. Os botões são os de UC-G38; aqui ficam as diferenças de quem não tem conta e as regras de sincronização com a conta.
- **Pré-condições:** Estar em `/configuracoes/acessibilidade`.
- **Fluxo principal:**
  1. O visitante ajusta o painel (UC-V29 a UC-V33).
  2. Clica em "Salvar preferências". O sistema grava no navegador (`acesso:a11y-prefs`) e mostra "Preferências de acessibilidade salvas neste dispositivo."
- **Fluxos alternativos e exceções:**
  - "Descartar alterações" só fica habilitado quando há alteração e volta ao último estado salvo.
  - "Redefinir tudo" restaura o padrão, apaga as duas chaves do navegador (preferências e resposta sobre voz) e mostra "Preferências redefinidas. A pergunta sobre voz será feita novamente."
  - Se o navegador bloquear o armazenamento (modo privado), a preferência vale só na memória.
  - Sincronização com a conta: no login por e-mail e senha, as preferências da conta substituem as do aparelho; no cadastro, as que estão na tela são enviadas à conta (UC-V12). O login com Google não faz essa troca (UC-V20). A conta guarda tema, contraste, fonte para dislexia, tamanho da fonte, um indicador de espaçamento (`espacamentoTexto`), reduzir animações, leitura por voz, resposta ao convite de voz, velocidade da voz, VLibras e destaque de foco. Ficam só no navegador: cursor ampliado e os valores exatos de espaçamento de letras e de linhas.
- **Pós-condições:** Preferências no `localStorage` do navegador. Nada vai ao servidor para o visitante.
- **Regras de negócio:** `AcessibilidadeProvider.salvar`; mapeamento com a conta em `acessibilidade.service.ts`.
- **Telas e endpoints:** `/configuracoes/acessibilidade` (tela). Com sessão, o mesmo botão também chama `PUT /api/acessibilidade` e `POST /api/acessibilidade/reset` (comuns, UC-G38).

### UC-V35 — Ajustar a acessibilidade na tela de boas-vindas

- **Ator:** Visitante (ou conta recém-criada).
- **Descrição:** Tela de primeiro acesso com o mesmo painel de acessibilidade, que existe como rota mas hoje não é alcançada por nenhum link do Site.
- **Pré-condições:** Conhecer o endereço `/boas-vindas`. Nenhuma tela ou redirecionamento do Site aponta para ela; o cadastro tem a sua própria etapa 4 (UC-V16).
- **Fluxo principal:**
  1. O visitante abre `/boas-vindas`.
  2. O sistema mostra "Passo 1 de 1", "Bem-vindo(a) ao ACESSO!" (com o primeiro nome, se houver sessão), o texto de apoio e o painel de preferências com pré-visualização.
  3. O visitante ajusta o painel e clica em "Salvar e ir para o feed".
  4. O sistema grava as preferências no navegador e leva a `/feed`.
- **Fluxos alternativos e exceções:**
  - "Pular por agora" leva a `/feed` sem salvar.
  - Sem sessão, `/feed` redireciona para `/entrar` (UC-V05). O aviso mostrado ao salvar, "Preferências salvas na sua conta.", não é exato para o visitante, que só salvou no navegador.
  - Com sessão, o botão também envia as preferências à conta (`PUT /api/acessibilidade`).
- **Pós-condições:** Preferências no navegador (e na conta, quando há sessão).
- **Regras de negócio:** A tela é o ponto de primeiro acesso previsto; hoje funciona como rota isolada.
- **Telas e endpoints:** `/boas-vindas` (tela); `PUT /api/acessibilidade` (só com sessão).

### UC-V36 — Pular para o conteúdo principal

- **Ator:** Visitante que navega por teclado ou leitor de tela.
- **Descrição:** Um atalho no começo da página leva direto ao conteúdo, sem percorrer o cabeçalho. O atalho é o mesmo descrito em UC-G01 para as telas autenticadas; aqui estão as telas do visitante que o têm.
- **Pré-condições:** Estar numa tela que tem o atalho: página inicial, "Sobre nós", `/vagas`, `/vaga/:id`, `/configuracoes/acessibilidade`, login, cadastro de candidato e de empresa, recuperar e redefinir senha, confirmar e-mail e retorno do Google.
- **Fluxo principal:**
  1. O visitante aperta Tab ao abrir a página; o primeiro foco é o link "Pular para o conteúdo principal", que só fica visível ao receber foco.
  2. Ao ativar o link, o foco vai para a região principal da página (`#conteudo`).
- **Fluxos alternativos e exceções:** As telas de Termos, Política e boas-vindas têm a região principal, mas não têm o atalho.
- **Pós-condições:** Nenhuma.
- **Regras de negócio:** Critério WCAG 2.4.1, citado nos componentes (`AutenticacaoLayout`, `EstruturaApp`).
- **Telas e endpoints:** As telas listadas acima. Sem endpoint.

---

## Visitante — API pública sem tela

### UC-V37 — Consultar a API pública sem passar pelas telas

- **Ator:** Visitante (ou qualquer cliente HTTP sem token).
- **Descrição:** Endpoints do backend que respondem sem login e que nenhuma tela do Site chama para o visitante (ou que o Site só chama em segundo plano). Servem a integrações e diagnóstico; nada disso aparece na interface.
- **Pré-condições:** Nenhuma; conhecer o endereço da API.
- **Fluxo principal:**
  1. `GET /api/publico/vagas`: devolve `{ sucesso, vagas }` com vagas abertas e não ocultas, com a empresa resumida (id, nome fantasia, logo, cidade e estado). Aceita `limit` (padrão 10, máximo 50) e `q` (filtra pelo título, até 120 caracteres). O Site tem um método para essa chamada (`publicoService.vagas()`), mas nenhuma tela o usa.
  2. `GET /api/empresas`: lista de empresas, com filtros `search`, `cidade`, `estado`, `setor`, `porte` e `empresaVerificada`, e paginação. `GET /api/empresas/parceiras`: 6 empresas aprovadas (as verificadas primeiro, depois as mais recentes), cada uma com `totalVagas`.
  3. `GET /api/empresas/:id` e `GET /api/empresas/usuario/:usuarioId`: perfil de uma empresa, com as vagas abertas dela (autenticação opcional). Sem token, só funciona para empresa de perfil público; senão responde 403 "Este perfil não está disponível."
  4. `GET /api/deficiencias` e `GET /api/deficiencias/:id`: catálogo de deficiências, em ordem alfabética. No Site, só o perfil de quem tem sessão o consome.
  5. `GET /api/health` (`{ sucesso, status: "ok" }`) e `GET /healthz` (`status`, `service`, `environment`): verificação de funcionamento.
  6. `POST /api/auth/refresh`, com um refresh token válido no corpo: devolve novo token de acesso e novo refresh token. O Site o usa sozinho quando o token de acesso expira (UC-V23).
- **Fluxos alternativos e exceções:**
  - Identificador inválido: 422. Empresa inexistente: 404 "Empresa não encontrada." Refresh token inválido ou revogado: 401 "Sessão inválida."; refresh token ausente: 401 "Refresh token não informado."
  - `POST /api/auth/refresh` tem limite próprio de 30 tentativas com falha por 15 minutos por IP (429 "Muitas tentativas de renovação de sessão. Tente novamente mais tarde."); os demais endpoints entram no limite geral de 300 requisições por 15 minutos.
  - Limitação atual: `GET /api/publico/vagas` não filtra pela aprovação da empresa, ao contrário de `GET /api/vagas` e da vitrine da página inicial; vaga aberta de empresa pendente, reprovada ou suspensa aparece nela.
  - Limitação atual: `GET /api/empresas` não filtra pela situação de aprovação (inclui empresas pendentes, reprovadas e suspensas) e, como `GET /api/empresas/:id` e `/usuario/:usuarioId`, devolve o registro completo da empresa, sem restringir campos. Pelo código, isso inclui o CNPJ decifrado (a Política, seção 7, diz que ele é guardado cifrado), o texto cifrado e o hash do CNPJ, o identificador da conta de candidato vinculada, endereço, CEP e campos de reprovação e suspensão. Ponto de atenção de segurança e privacidade, sem teste em execução.
- **Pós-condições:** Nenhuma. Somente leitura (exceto o `POST /api/auth/refresh`, que troca o par de tokens).
- **Regras de negócio:**
  - `autenticacaoOpcionalMiddleware` nas rotas de empresa: com token válido o servidor sabe quem pergunta (para aplicar bloqueio e privacidade); sem token, vale como visitante anônimo.
  - O perfil de empresa de uma conta bloqueada entre as partes ou privada não é entregue a anônimos (`BloqueioService.garantirVisibilidadePerfil`).
- **Telas e endpoints:** Nenhuma tela. `GET /api/publico/vagas`, `GET /api/empresas`, `GET /api/empresas/parceiras`, `GET /api/empresas/:id`, `GET /api/empresas/usuario/:usuarioId`, `GET /api/deficiencias`, `GET /api/deficiencias/:id`, `GET /api/health`, `GET /healthz`, `POST /api/auth/refresh`.
