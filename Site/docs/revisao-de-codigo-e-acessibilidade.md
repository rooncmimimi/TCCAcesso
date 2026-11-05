# Revisão de código e acessibilidade (05/11/2026)

Rodada de auditoria pedida depois dos quatro blocos: melhorar o código, melhorar a acessibilidade, testar com as
ferramentas disponíveis e conferir se os recursos fazem sentido para quem usa o ACESSO (pessoas com deficiência e
profissionais 50+). Complementa [acessibilidade-avancada-verificacoes.md](acessibilidade-avancada-verificacoes.md),
que continua sendo o documento das pendências que dependem de aparelhos e pessoas reais.

## 1. O que foi testado, e com o quê

| Ferramenta | Onde | Resultado |
|---|---|---|
| `axe-core` em jsdom, nas telas **com login** (o que faltava: não havia conta de teste) | 19 casos novos em `components/acessibilidadeAxeAutenticado.test.tsx`: painel do candidato e da empresa, minhas vagas, candidaturas, mensagens, perfil, feed, Minha Acessibilidade, simulador, configurações e os diálogos de editar perfil, nova vaga e denúncia — cada um nos estados que a pessoa vê (carregando, vazio, com dados, com erro) | **3 falhas reais**, corrigidas (seção 2) |
| `axe-core` no navegador (Chromium do app) | 8 rotas públicas, depois das mudanças | Sem violações (fora a regra `region` no widget do VLibras, que é de terceiros) |
| Medição de **alvo de toque** (WCAG 2.5.8) no navegador, contando o rótulo clicável junto do controle | `/`, `/vagas`, `/entrar`, `/cadastro`, `/comunicacao`, `/profissoes`, `/objetivos`, `/configuracoes/acessibilidade` | **2 falhas reais**, corrigidas (seção 2) |
| **Espaçamento de texto** (WCAG 1.4.12): entrelinha 1,5, letras 0,12em, palavras 0,16em, parágrafos 2em | 6 rotas | **Passou.** Nada de texto é cortado. O único recorte é a imagem decorativa do topo (`aria-hidden`), ampliada de propósito |
| **Refluxo** a 320 px (WCAG 1.4.10, equivalente a 400% de zoom) | 9 rotas | **Passou.** Nenhuma precisa de rolagem lateral |

## 2. O que estava errado e foi corrigido

| # | Problema | Onde | Por que importa |
|---|---|---|---|
| 1 | **Campos de arquivo sem nome** (`axe`: crítico). Os campos escondidos de "adicionar foto/vídeo à publicação", "foto do perfil" e "capa" não tinham rótulo. Esconder na tela **não** tira do alcance do leitor de tela: a pessoa encontrava "campo de arquivo" sem saber de quê | `FormularioPostagem`, `FotoUploader`, `CapaUploader` (e o currículo no cadastro) | Atinge quem usa leitor de tela, parte central do público |
| 2 | **Título de aviso quebrando a ordem dos títulos.** `AlertTitle` era um `<h5>`; numa página cujo único título é o `<h1>`, um erro criava a sequência h1 → h5 | `components/ui/alert.tsx` (usado nas mensagens) | Quem navega de título em título (leitor de tela) perde a estrutura |
| 3 | **As 7 tabelas da administração não anunciavam nada**: nem "carregando", nem o erro. O resto do site anuncia | `components/admin/*Tabela.tsx` | Quem modera o site também pode usar leitor de tela |
| 4 | **Interruptores de 20 px de altura**, abaixo do mínimo de 24 px da WCAG 2.5.8 — justamente nas Configurações de acessibilidade, onde se liga "proteção contra tremores" e "alvos maiores" | `components/ui/switch.tsx` (todos os interruptores do site) | Atinge quem tem pouca precisão de movimento |
| 5 | **Link "Esqueceu a senha?" com 20 px** de altura. É um link solto, então não vale a exceção de link no meio de uma frase | `routes/entrar.tsx` | Mesma razão do item 4, na tela de entrada |
| 6 | **A pergunta do primeiro acesso não avisava quem já usa leitor de tela.** Aceitar a leitura por voz do ACESSO com NVDA, JAWS, Narrador, VoiceOver ou TalkBack ligado faz cada item ser falado **duas vezes** | `ConsentimentoVozDialog`, e a descrição do recurso em Configurações | Ver a seção 4 |

## 3. Limpeza de código

Duas repetições viraram um lugar só, e em ambos os casos a repetição **era** a causa da falha de acessibilidade:

- **`components/ui/campo-de-arquivo-oculto.tsx`** — o padrão "campo de arquivo escondido + botão visível que o aciona"
  estava copiado em 4 telas, e 3 delas esqueciam o nome acessível. Agora o rótulo é obrigatório pelo TypeScript: não
  dá para repetir o erro. Onde já existe um `<label for>` de verdade (importar currículo, enviar currículo), o `<label>`
  continua, porque é o caminho melhor: abre o seletor sem JavaScript.
- **`components/ui/estados-de-lista.tsx`** (`ListaCarregando`, `ListaComErro`, `ListaVazia`) — os três estados de uma
  lista estavam copiados em 7 tabelas da administração, todas sem anúncio. Agora: carregando é `role="status"` com
  `aria-busy` e um texto que o leitor de tela lê (o retângulo cinza não é lido), o erro é `role="alert"` (dito na hora)
  com o botão de tentar de novo, e a lista vazia é `role="status"`. 21 blocos de JSX viraram 21 linhas.

O padrão "carregando / erro / vazio" aparece em 31 arquivos. Só os 7 da administração foram trocados nesta rodada,
porque eram os que estavam errados; os outros já anunciavam certo e a troca seria mexer no que funciona. Ficam como
próximos candidatos naturais.

**O que foi examinado e deixado como está:** a duplicação entre `routes/cadastro/candidato.tsx` e
`routes/cadastro/empresa.tsx` (767 e 699 linhas). As linhas repetidas são fechamento de JSX e `className`, não lógica:
as partes comuns de verdade já estão em `components/cadastro/comuns.tsx` e `Campo.tsx`. Refatorar os dois assistentes
seria risco sem ganho claro.

## 4. Os recursos fazem sentido para quem usa o ACESSO?

O que foi conferido, recurso a recurso, pensando no público (pessoas com deficiência e profissionais 50+):

**Faz sentido, e foi confirmado na tela:** a leitura em voz alta com marcação de palavra; a régua; o resumo da vaga em
linguagem simples; os alvos maiores; a proteção contra tremores; os atalhos; a varredura com um botão; os cartões de
comunicação; o dicionário de profissões; a navegação por objetivos. Todos são **opcionais e desligáveis**, nenhum
exige diagnóstico, e nenhum muda o que a empresa vê sem autorização.

**Um problema de fundo, corrigido nesta rodada:** a leitura por voz do ACESSO é para quem **não** usa leitor de tela.
Com os dois ligados, cada botão é falado duas vezes — e quem mais sofreria com isso é justamente quem o site quer
servir. Não há como o site descobrir sozinho se há um leitor de tela em uso (nenhum navegador informa isso, e tentar
adivinhar erraria), então o caminho honesto é **avisar**: a pergunta do primeiro acesso e a descrição em Configurações
agora dizem, com todas as letras, para quem já usa NVDA, JAWS, Narrador, VoiceOver ou TalkBack escolher "não".

**O que ainda não faz sentido pleno, e não foi resolvido aqui:**

1. **Parte do site não está traduzida.** Com o site em inglês ou espanhol, a página inicial e várias telas seguem em
   português. A narração já acompanha o idioma do texto (correção anterior), mas o texto em si continua em português.
   Para quem escolheu outro idioma, isso é uma barreira real, não um detalhe.
2. **Nenhum teste com pessoa real.** Tudo aqui é ferramenta e leitura de código. O axe acha entre 30% e 57% dos
   problemas, pela própria documentação dele. Ordem de leitura, clareza do texto, se um anúncio ajuda ou atrapalha e se
   a varredura serve para quem usa acionador — nada disso uma ferramenta responde. Os roteiros para esse teste estão
   prontos em [acessibilidade-avancada-verificacoes.md](acessibilidade-avancada-verificacoes.md), seções 4 e 5.
3. **O asterisco de "campo obrigatório"** no cadastro tem área de toque pequena (altura de uma linha). Vale a exceção
   da WCAG para alvos dentro de uma frase, e a obrigatoriedade nunca depende só dele (o campo é `required` no HTML, no
   validador e no backend), então foi deixado como está — mas fica registrado.

## 5. Estado dos testes

Frontend: **104 arquivos, 1490 testes**, mais `tsc`, `eslint` (0 erros; 2 avisos antigos em `ui/badge.tsx` e
`ui/button.tsx`) e `vite build`. Sem migration, sem dependência nova, sem custo adicional.
