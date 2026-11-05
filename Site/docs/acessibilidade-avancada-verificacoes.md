# Verificações de acessibilidade: o que foi feito e o que depende de pessoas e aparelhos reais

Fecha as quatro pendências deixadas para o fim dos blocos (destaque por palavra e voz própria, pausa em
aparelho real, leitores de tela e acionadores, `axe`). Cada seção diz **o que foi feito**, **o que foi medido** e
**o que continua sem teste real**. Nada aqui declara conformidade com a WCAG: ela é só referência.

| Pendência | Estado |
|---|---|
| `axe` | **Feito** (seção 1), com limites. |
| Destaque por palavra em voz de rede | **Resolvido por estimativa** (destaque aproximado), **sem motor próprio**. A precisão em aparelhos reais depende da seção 3. |
| Decisão sobre motor de voz próprio | **Decidido: não embutir agora**, com critérios para reavaliar. Ver [acessibilidade-avancada-voz-propria.md](acessibilidade-avancada-voz-propria.md). |
| Pausa em aparelho real | **Ferramenta pronta** (diagnóstico de voz). **Falta rodar** em Android e outros aparelhos (seção 3). Medido só no Chromium do app, no Windows. |
| Leitores de tela e acionadores reais | **Roteiros prontos** (seções 4 e 5). **Falta executar** com os programas e aparelhos reais. Nenhum foi usado até agora. |

## 1. `axe-core`

**Dependência:** `axe-core` 4.14.0, **só de desenvolvimento** (`devDependencies`), licença MPL-2.0, sem custo. Não vai
para o site publicado (só os testes a importam). O hash do pacote baixado conferiu com o do `package-lock.json`.
A entrada no lockfile foi reduzida ao `axe-core`: o `npm` também tentava acrescentar entradas opcionais do Tailwind
sem relação com isto.

**Onde roda:**
1. **Nos testes** (`lib/verificarAcessibilidade.ts`, `components/acessibilidadeAxe.test.tsx`, e um caso no teste do
   diagnóstico): 18 casos com os componentes dos Blocos 3 e 4 em vários estados (diálogo aberto, varredura andando, tabela
   do comparador, etc.). O jsdom **não tem layout**, então ficam desligadas as regras de contraste, tamanho de alvo,
   regiões roláveis e marcos da página inteira.
2. **No Chromium do app**, na tela de verdade (com layout, contraste e tamanho de alvo), com uma cópia **temporária** do
   `axe.min.js` servida pelo mesmo servidor de desenvolvimento e apagada no fim. Rotas varridas: `/`, `/entrar`,
   `/cadastro`, `/vagas`, `/comunicacao`, `/profissoes`, `/objetivos`, `/sobre-nos`, `/termos`, `/privacidade`,
   `/fale-conosco`, `/configuracoes/acessibilidade`. Combinações: tema claro, **escuro**, **alto contraste**, e, a
   375 px, alvos "maior" com varredura ligada, régua, daltonismo, painel da varredura andando e menu de ajuda aberto.

**O que o axe achou e foi corrigido** (as páginas antigas também):

| Regra | Onde | Correção |
|---|---|---|
| Contraste (4,47:1; mínimo 4,5:1) | Links verdes sobre o fundo tingido da página: `/entrar`, `/cadastro`, `/fale-conosco` | `--primary`, `--primary-strong` e `--ring` passam de `#178035` para `#16772f` (5,65:1 com branco; 5,0:1 sobre `#edf2f9`). |
| Contraste (4,1 a 4,39:1) | Texto branco com 85% a 90% de opacidade sobre o verde: início, "Sobre nós", horário das mensagens próprias | Opacidade removida (texto branco pleno). |
| `label-content-name-mismatch` | Link do logo ("Voltar para a página inicial", texto visível "ACESSO"), em 9 telas e nos dicionários pt/en/es | Nome acessível passa a conter o texto visível: "ACESSO, voltar para a página inicial". |
| `landmark-one-main` | `/entrar`, `/cadastro`, `/fale-conosco` (`AutenticacaoLayout`) | O contêiner do conteúdo virou `<main>`. |
| `heading-order` | `/termos`, `/privacidade` (h1 direto para h3); `/profissoes` (minha); `/configuracoes/acessibilidade` | Seções do documento legal em h2 na página inteira (h3 só dentro do diálogo); fichas de profissão em h2; o painel de acessibilidade ganhou um título h2 só para leitor de tela. |

**O que o axe achou e NÃO foi corrigido:** a regra `region` (conteúdo fora de marcos) no `#vlibras-access-wrapper`, que é o
**widget do VLibras**, de terceiros (Governo Federal): não é código do ACESSO. Está desligada nas verificações
de página inteira, e este é o único motivo.

**Resultado no fim:** nenhuma violação nas rotas e combinações acima.

**Limites do axe (importante):** a própria documentação do axe diz que ele acha só uma parte dos problemas. Passar
não prova que uma tela é acessível: ele não avalia se a ordem de leitura faz sentido, se um texto é claro, se um
anúncio é útil nem como a tela se comporta com um leitor de tela. **Não foram varridas** as telas que exigem login
(painéis, perfil, mensagens, candidaturas, administração): o ambiente de desenvolvimento não tem conta de teste.
Elas só passaram pelos testes de componentes (jsdom). Quem tiver uma conta de teste deve repetir a varredura nelas.

**Como repetir no navegador:**
1. Copie `node_modules/axe-core/axe.min.js` para `Site/Frontend/public/__axe-temporario.min.js` (não commitar).
2. Abra a página no servidor de desenvolvimento e, no console, carregue o script (`document.createElement('script')`
   com `src="/__axe-temporario.min.js"`) e rode `await axe.run(document)`.
3. Apague o arquivo temporário.

## 2. Destaque por palavra e voz própria

Ver [acessibilidade-avancada-voz-propria.md](acessibilidade-avancada-voz-propria.md). Em resumo: foi criado o destaque
**aproximado** para vozes que não informam as palavras (`lib/leituraEstimada.ts`), com 25 testes automáticos (relógio
simulado: pausa congela, continuar solta, velocidade, prefixo, calibração), e a decisão é **não embutir motor próprio
agora**, por licença (GPL-3.0), peso e falta de medição em aparelhos reais.

## 3. Aparelhos reais: voz, destaque e pausa

**Ferramenta:** a página **Teste da leitura em voz alta** (`/diagnostico-de-voz`; também em Configurações → Leitura,
foco e cores → "Testar a leitura em voz alta neste aparelho"). Tem **três etapas**, em português comum: (1) ouvir um
trecho e dizer o que se viu na marcação das palavras; (2) apertar Pausar e Continuar e dizer o que aconteceu; (3)
opcional, um **teste automático** em que o ACESSO fala duas frases e explica o resultado ("Bom", "Atenção", "Problema"
ou "Não deu para saber"), com os números em "Detalhes técnicos". Por baixo, ele mede **quantas palavras a voz informa** e
**se o `pause()` do navegador pausa, cancela ou trava**. No fim há **Copiar resultado**, um texto para enviar a quem
acompanha o projeto, e a lista de vozes fica recolhida. Nada é enviado pela página.

**Medido até agora (um aparelho):** Windows 11, navegador do app (Chromium 152), vozes locais "Microsoft Daniel" e
"Microsoft Maria" (português do Brasil): **16 de 16 palavras informadas**, primeiro evento em 150 ms; `pause()` marcou
pausado e a fala **voltou até o fim** depois de `resume()`. É **um** aparelho com voz **local**: nada disso vale para
Android, iPhone, Mac nem para vozes de rede.

**Roteiro para quem for testar** (cada aparelho, uns 2 minutos):
1. Abra `/diagnostico-de-voz` no navegador do aparelho, com o volume alto e em lugar silencioso.
2. **Etapa 1:** aperte **Ouvir**, observe a marcação das palavras e responda "O que você viu".
3. **Etapa 2:** aperte **Ouvir** de novo; na barra que aparece embaixo, **Pausar**, espere uns 5 segundos, **Continuar**;
   responda as duas perguntas.
4. **Etapa 3:** aperte **Fazer o teste automático** e espere uns 20 segundos.
5. Para comparar com **uma voz que usa a internet** (as "Google", no Chrome) e **uma instalada**, abra "Vozes instaladas
   neste aparelho", escolha a voz e repita a etapa 3.
6. Aperte **Copiar resultado** e guarde o texto (um por aparelho e voz).

**Aparelhos que fazem sentido cobrir** (preencher conforme forem testados):

| Aparelho | Navegador | Voz testada | Palavras informadas | `pause()` | Destaque que a pessoa viu | Pausa/continuar na leitura real | Data |
|---|---|---|---|---|---|---|---|
| Windows 11 (app) | Chromium 152 | Microsoft Daniel (local) | 16 de 16 | pausa e volta | (não conferido por pessoa) | (não conferido por pessoa) | 05/11/2026 |
| Android | Chrome | padrão | _a testar_ | _a testar_ | | | |
| Android | Chrome | Google (de rede) | _a testar_ | _a testar_ | | | |
| iPhone ou iPad | Safari | padrão | _a testar_ | _a testar_ | | | |
| Mac | Safari | padrão | _a testar_ | _a testar_ | | | |
| Windows | Chrome | Google (de rede) | _a testar_ | _a testar_ | | | |
| Windows | Firefox | padrão | _a testar_ | _a testar_ | | | |

**O que fazer com o resultado:**
- `pause()` **cancela** a fala ou **trava ao retomar** → a pausa por reinício do ACESSO é necessária naquele aparelho (e já
  está ligada quando há eventos de palavra). Se a voz **não informa palavras**, a pausa nativa é usada: nesse caso,
  anotar se travou.
- Palavras **não informadas** + destaque aproximado "às vezes errado" ou "errado" → alimenta os critérios de
  reavaliação do motor próprio.

## 4. Roteiro: leitores de tela

**Não foi usado nenhum leitor de tela real** (NVDA, JAWS, Narrator, VoiceOver, TalkBack) até hoje. O que existe é a
verificação do axe, testes de nomes e papéis, e a árvore de acessibilidade do Chromium (vista com `read_page`: marco
`main`, link "Pular para o conteúdo principal", botões com nomes únicos como "Ouvir: Preciso de ajuda."). **Isso não é
um leitor de tela e não substitui o teste.**

**Combinações sugeridas** (todas gratuitas, exceto o JAWS, que tem modo de demonstração):

| Sistema | Leitor | Navegador |
|---|---|---|
| Windows | NVDA (gratuito) | Firefox e Chrome |
| Windows | Narrator (já vem no Windows 11) | Edge |
| Windows | JAWS (demonstração) | Chrome ou Edge |
| macOS e iOS | VoiceOver | Safari |
| Android | TalkBack | Chrome |

**Antes de começar:** em Configurações → Acessibilidade, deixe a **"Leitura por voz" do ACESSO desligada** (ela fala por
cima do leitor de tela e foi pensada para quem não usa um) e a "Navegar pelo conteúdo com as setas" desligada.

**Roteiro por tela** (marcar cada linha: passou, falhou ou parcial; anotar o que foi anunciado):

| # | Tela | O que fazer | O que deve acontecer |
|---|---|---|---|
| 1 | Entrar | Navegar do começo ao fim e preencher o formulário. | O primeiro item é "Pular para o conteúdo principal"; há um marco principal; cada campo é anunciado com o rótulo; um erro de validação é anunciado sem a pessoa procurar. |
| 2 | Vagas e uma vaga | Abrir a lista, filtrar, abrir uma vaga. | Títulos em ordem; o resumo em linguagem simples e o botão "Ouvir" têm nome; as seções "Ambiente de trabalho" e "Entrevista adaptável" dizem "a empresa não informou" quando for o caso. |
| 3 | Vídeo da vaga | Ir até o player. | Os controles do vídeo são anunciados; o botão "Ampliar o vídeo" tem nome; a transcrição aparece lida logo abaixo; sem vídeo, o aviso é lido. |
| 4 | Comparar vagas | Incluir 2 vagas e abrir "Comparar". | A tabela tem legenda; cada célula é lida com o cabeçalho da coluna e da linha; "Diferente" é lido. |
| 5 | Candidatura | Abrir "Candidatar-se" e percorrer as 3 etapas. | O foco vai para o diálogo e fica nele; o título e "Etapa 1 de 3" são anunciados; a caixa "O que esta vaga já oferece na entrevista" é lida; a autorização é uma caixa de seleção com o texto completo; `Esc` fecha. |
| 6 | Central de comunicação | Percorrer os cartões; abrir "Mostrar". | Cada botão diz a frase ("Mostrar em tela cheia: ..."); o diálogo da frase grande é anunciado e fecha. |
| 7 | Dicionário de profissões | Abrir uma ficha. | A "ilustração" é lida pela descrição; os detalhes abrem e fecham e são anunciados. |
| 8 | Objetivos | Escolher um objetivo e marcar um passo. | A lista é numerada; "Próximo passo" e "(feito)" são lidos; a contagem "1 de 3 passos feitos" é anunciada. |
| 9 | Atalhos | Apertar `?` e `G` depois `V`. | Com o leitor em **modo de navegação**, o leitor costuma ficar com as letras: anotar se os atalhos do ACESSO funcionam ou se conflitam. Em campos, não devem agir. |
| 10 | Varredura | Ligar em Configurações e iniciar. | O painel é anunciado; ele **não** fica falando a cada passo; iniciar, pausar e parar são anunciados. (A varredura foi feita para quem não usa leitor de tela: o que importa aqui é não atrapalhar.) |
| 11 | Ajuda de leitura | Abrir o menu. | Todos os botões têm nome; "Onde estou?" e "Explique esta página" são lidos. |
| 12 | Verificação do mapa físico (administração) | Abrir uma vaga e "Mapa físico". | Os itens são caixas de seleção com o nome do item; "Verificado em..." é lido; os botões desabilitados são anunciados como indisponíveis. |

**Resultados (preencher):**

| Data | Leitor + versão | Navegador + versão | Tela (#) | Resultado | O que foi anunciado de errado ou faltando |
|---|---|---|---|---|---|
| | | | | | |

## 5. Roteiro: acionadores (varredura com um botão)

**Nenhum acionador, nem aparelho que emule teclas, foi usado.** A varredura foi verificada com teclas simuladas
(Espaço, Enter, `Esc`, setas e uma tecla extra) em testes automáticos e no navegador do app.

**Como testar:** qualquer acionador que **emule teclado** (uma interface USB para acionador que envie Espaço ou Enter),
ou um teclado em que só duas teclas são usadas. Para o Windows e o Android, o recurso de varredura do próprio sistema
(Acesso por Switch, no Android; Controle por Botão, no iOS) é **complementar**: o ACESSO não o substitui nem o
desativa.

**Tarefas** (uma pessoa que usa acionador no dia a dia deve conduzir, ou ao menos orientar):

| # | Tarefa | Só com o acionador | Resultado esperado |
|---|---|---|---|
| 1 | Ligar a varredura em Configurações e iniciar | Selecionar | O contorno amarelo e preto aparece e anda no ritmo escolhido. |
| 2 | Ir até "Vagas" no menu e abrir | Selecionar o grupo "Navegação", depois o link | A página das vagas abre; a varredura recomeça do começo. |
| 3 | Abrir uma vaga e ouvir o resumo | Selecionar a vaga, depois "Ouvir" | A leitura começa e o contorno continua visível. |
| 4 | Abrir "Candidatar-se" e percorrer só o diálogo | Selecionar o botão; escolher "Continuar" | A varredura percorre **só** o diálogo (não vai ao que está atrás). |
| 5 | Pausar, avançar item a item e voltar | Botões do painel | Pausar para; Avançar e Voltar andam um item. |
| 6 | Mudar a velocidade | "Mais devagar" e "Mais rápido" | O tempo por item muda e fica salvo. |
| 7 | Sair de um grupo e parar | `Esc` (ou o botão) | Sai do grupo; depois para a varredura. |
| 8 | Responder em um campo de texto | Selecionar o campo; usar o ditado ou um cartão da Central de comunicação | **Limite conhecido:** com **um único acionador**, não dá para digitar (Espaço e Enter são do texto). |

**Anotar em cada tarefa:** se foi concluída sem ajuda; quanto tempo levou; quantas vezes selecionou o item errado;
se o ritmo estava confortável (e qual velocidade a pessoa escolheu); o que cansou.

**Resultados (preencher):**

| Data | Pessoa (função, sem dados pessoais) | Acionador / como foi emulado | Tarefa (#) | Concluiu? | Tempo | Seleções erradas | Observação |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 6. O que continua dependendo de você

1. Rodar o diagnóstico de voz nos aparelhos da tabela da seção 3 e enviar os relatórios.
2. Executar o roteiro da seção 4 com pelo menos NVDA + Firefox, Narrator + Edge, VoiceOver + Safari e TalkBack + Chrome.
3. Executar o roteiro da seção 5 com uma pessoa que use acionador, ou ao menos com uma interface de acionador por USB.
4. Repetir a varredura do `axe` nas telas que exigem login, com uma conta de teste.
5. Decidir sobre a licença GPL-3.0 **somente se** os critérios de reavaliação do motor próprio forem atingidos.
