# Acessibilidade avançada: auditoria (Bloco 0) e planejamento

Branch `feat/acessibilidade-avancada`, criada a partir de `7f4ede0` (mesmo ponto do `origin/main`),
com o cursor de leitura por setas como primeiro commit. Nada foi publicado, mesclado ou implantado,
e o banco de produção não foi tocado.

Este documento tem três partes: o que existe hoje, o que cada bloco vai fazer e o que cada item do
Bloco 1 entregou (seção 4, atualizada ao fim do bloco).

## 1. Auditoria: o que existe

| Área | Onde está | Estado | O que falta / melhoria |
|---|---|---|---|
| Painel de preferências | `components/acessibilidade/PainelAcessibilidade.tsx`, rota `/configuracoes/acessibilidade`, boas-vindas | Funciona. Pré-visualização ao vivo (rascunho), salvar, descartar e redefinir. Textos fixos em português (fora do dicionário pt/en/es). | Novos controles entram como `ToggleRow`/`SliderRow`. `keyboardNav` existe no tipo mas não tem controle (o site já é todo operável por teclado). |
| Preferências | `contexts/AcessibilidadeContext.ts`, `AcessibilidadeProvider.tsx` | 14 campos, guardados no `localStorage` (`acesso:a11y-prefs`). Aplicadas como classes `a11y-*` e variáveis CSS na raiz. | Só um subconjunto sincroniza com a conta (`acessibilidade.service.ts`). Preferências novas ficam locais, sem migration. A coluna `linguagemSimplificada` existe no banco e no validador mas **nenhuma tela a usa**. |
| Sincronização com a conta | `services/acessibilidade.service.ts`, `Backend/models/PreferenciaAcessibilidade.js` | tema, contraste, dislexia, escala, espaçamento, animações, voz, consentimento, velocidade, Libras, foco. | Sincronizar as novas exigiria migration (fora do Bloco 1). |
| Leitura por voz | `contexts/VozProvider.tsx` (`falar`, `parar`), `hooks/useLeituraAutomatica.ts` | Fala o elemento focado ou clicado, diálogos e toasts. Respeita a velocidade. `lang` fixo em `pt-BR`. **Sem pausa, sem retomada, sem evento `boundary`**, e não lê blocos longos de texto. | Itens 1 e 2 do Bloco 1. A língua falada não acompanha o idioma do site (en/es). |
| `leitorSemantico` | `lib/leitorSemantico.ts` | Funções puras que descrevem um elemento (nome, função, estado, descrição). Bem coberto por testes. | Reaproveitado pelo cursor de leitura. |
| Cursor de leitura por setas | `lib/cursorDeLeitura.ts`, `hooks/useCursorDeLeitura.ts` | Entregue antes deste bloco. Opcional, desligado por padrão. | Testado só com a voz simulada. |
| Avisos (toasts) | `components/ui/sonner.tsx`, `<Toaster />` em `__root.tsx` | Sonner com duração padrão (4 s). Um aviso explícito de 10 s em `SessaoProvider`. **Sem botão de fechar e sem opção de manter.** Lidos em voz por `useLeituraAutomatica`. | Item 4 do Bloco 1. |
| Texto alternativo | `components/feed/CampoDescricaoImagem.tsx`, `POST` de sugestão em `postagemRoutes.js` | Já oferece "Descrever com IA" (OpenRouter, modelos **gratuitos** em `env.js`) e escrita manual. A sugestão nunca é salva sozinha e é editável. | A imagem sai do servidor para um serviço externo ao clicar: precisa constar na política de privacidade. Orientação contextual e aviso de imagem sem descrição ficam para o Bloco 3. |
| Estrutura de vaga | `Backend/models/Vaga.js`, `types/index.ts`, `routes/vaga.$vagaId.tsx` | Título, descrição, `requisitos` (um texto único), `beneficios`, salário, modalidade, contrato, cidade/estado, `cargaHoraria` (texto), público-alvo, `recursosAcessibilidade` (lista), `acessibilidade` (texto), status. | **Não existe** campo de atividades separado, requisito obrigatório x desejável, nem etapas da seleção. O resumo não pode inventar: dirá "não informado" nesses casos. |
| Candidatura | `Backend/models/Candidatura.js` | Só `status` e `mensagem`. | Nenhum campo de adaptação: o Bloco 2 precisa de tabela nova e migration. |
| Dados sensíveis (verificado em `utils/candidatoPrivacidade.js`) | `CandidatoDeficiencia`, `Deficiencia`, `Candidato.necessidadesAcessibilidade` | (1) A **categoria** de deficiência declarada (`deficiencias`) está na lista de campos **públicos**: qualquer pessoa autenticada vê. Só o texto livre (`observacoes`) fica escondido de terceiros. (2) Uma empresa que tenha **qualquer candidatura** do candidato (em qualquer status) passa a ver **todos** os campos privados, inclusive `necessidadesAcessibilidade`, sem autorização específica daquela candidatura. (3) `necessidadesAcessibilidade` é texto livre, editável no perfil. | Decisão do Bloco 2, **não alterada aqui**: a regra pedida (autorização específica por candidatura, nada compartilhado por padrão) contradiz (1) e (2). Mudar isso altera o que empresas e pessoas veem hoje e precisa da sua validação. |
| Navegação por teclado e marcos | `layouts/EstruturaApp.tsx`, `AutenticacaoLayout.tsx`, `CabecalhoApp.tsx` | Link "Pular para o conteúdo principal", `<main id="conteudo">`, `<header>`, `<nav aria-label>`. Foco visível reforçável. | Sem rodapé como `<footer>` verificado. |
| Retomada e tempo | `lib/etapaCadastro.ts`, rotas de cadastro | O cadastro guarda a etapa para retomar. | Sem aviso de expiração nem rascunho de formulários de candidatura. Item 10. |
| i18n | `i18n/dicionarios`, `IdiomaProvider` | pt/en/es no site. | Textos novos de acessibilidade seguem o painel atual (português fixo), a traduzir depois. |
| Testes | Vitest + Testing Library; 49 arquivos, 718 testes antes deste bloco | Sem `axe` nem checagem automática de acessibilidade. | Verificação manual e por testes de comportamento. |
| Leitores de tela reais | — | **Nunca testado** com NVDA, JAWS, VoiceOver ou TalkBack. | Declarado como limitação em todos os relatórios. |

## 2. Princípios que valem para todos os blocos

- Custo adicional **R$ 0,00**: APIs do navegador, React, CSS e regras determinísticas. Nenhuma dependência nova.
- Nada de IA nova. A sugestão de texto alternativo que já existe não é ampliada neste bloco.
- Preferências de interface (este bloco) são locais ao navegador. Necessidades profissionais e dados
  sensíveis (Bloco 2 em diante) ficam no backend, com autorização por candidatura.
- Não afirmar compatibilidade universal. Cada limitação de navegador é registrada na seção 4.
- WCAG 2.2 como referência. Nenhuma declaração de conformidade sem auditoria externa.

## 3. Planejamento por bloco

**Bloco 1 — leitura e compreensão (este).** Destaque palavra por palavra; régua de leitura; resumo da
vaga em linguagem simples; avisos persistentes; glossário; modo foco; modo leitura; cores
personalizadas; modo daltonismo; mais tempo; "Onde estou?"; "Explique esta página"; assistente de
preenchimento; histórico de instruções. Tudo no Site, sem migration.

**Bloco 2 — inclusão nas candidaturas.** Minha Acessibilidade; perfil de adaptações; preferências de
comunicação; solicitação de adaptações por candidatura; prévia de privacidade; pausar e continuar;
simulador. Exige tabelas novas e migration, e a auditoria de quem vê dados de deficiência.

**Bloco 3 — empresas e ambientes.** Entrevista adaptável; prévia sensorial; mapa de acessibilidade
física; vídeo da vaga em Libras; legendas e transcrição; revisão de texto alternativo; avaliador de
vagas; comparador; explicação de requisitos. Exige campos novos em `vagas`.

**Bloco 4 — motricidade e comunicação.** Varredura com um botão; proteção contra tremores; alvos
maiores; atalhos; comandos de voz; ditado (com vocabulário contextual); central de comunicação
alternativa; dicionário visual de profissões; navegação por objetivos.

Ordem sujeita a revisão: o Bloco 2 depende de decisões de modelo de dados que precisam da sua
validação antes de qualquer migration.

## 4. Bloco 1: o que foi entregue

Tudo no Site (frontend). Sem migration, sem dependência nova, sem serviço externo, sem mexer no
backend nem no banco. As novas preferências ficam só no navegador (`localStorage`).

| # | Recurso | Onde | Estado |
|---|---|---|---|
| 1 | Destaque palavra por palavra | `contexts/LeituraDestacadaProvider.tsx`, `lib/leituraDestacada.ts`, `TextoOuvivel`, cursor de leitura | Pronto. Pausar, continuar e parar em `ControleDeLeitura`. Plano B por frase, plano C por bloco. |
| 2 | Régua de leitura | `components/acessibilidade/ReguaDeLeitura.tsx` | Pronto. Mouse, foco, cursor de leitura e Alt + ↑/↓. Altura e escurecimento ajustáveis. |
| 3 | Resumo da vaga em linguagem simples | `lib/resumoVaga.ts`, `components/vagas/ResumoVagaSimples.tsx` | Pronto, com os limites dos dados (ver abaixo). |
| 4 | Avisos que não somem | `components/ui/sonner.tsx`, `lib/avisos.ts` | Pronto. Botão de fechar e limite de 5 minutos. |
| 5 | Glossário | `dados/glossario.ts`, `PaineisDeAjuda.tsx` | Pronto (18 termos). Lista e busca, com os termos da página em destaque. Na página da vaga, abaixo da descrição, dos requisitos e dos benefícios, um bloco fechado "Termos deste texto" (`TermosDoTexto.tsx`) explica os termos que aquele texto usa. A dica fica ao lado do texto, não em cada palavra: marcar palavras soltas dentro do texto traduzido não é confiável. |
| 6 | Modo foco | CSS (`.a11y-focus-mode`) | Pronto: esconde `aside`, rodapé e `data-secundario`. |
| 7 | Modo leitura | CSS (`.a11y-reading-mode`) | Pronto. Fonte Atkinson Hyperlegible (licença SIL OFL 1.1, arquivos `woff2` em `src/assets/fonts/atkinson`, servidos pelo próprio site, sem dependência nova e sem pedir nada a terceiros), sem serifa (Verdana) ou serifada (Georgia), e fundo padrão, creme ou escuro. O verde da marca foi ajustado nos fundos creme (5,9:1) e escuro (7,7:1), onde passava de 4,5:1 por pouco ou não passava. A mesma fonte passa a valer também no modo "fonte para dislexia", que a citava sem carregá-la. |
| 8 | Cores personalizadas | `SecaoLeituraEFoco.tsx`, `lib/contraste.ts` | Pronto. Só `#rrggbb` chega ao CSS. Mostra o contraste de cada par e avisa. Os fundos suaves do tema (`secondary`, `muted`, `accent`) e as bordas seguem o fundo escolhido, e os links das telas de entrada e cadastro (que não têm `main`) usam a cor de link escolhida. |
| 9 | Modo para daltonismo | CSS (`.a11y-colorblind`) | Pronto: laranja e azul no lugar de vermelho e verde, símbolo em erro e aviso, links sublinhados. Os selos de status já tinham texto. |
| 10 | Mais tempo | `lib/rascunhoDeFormulario.ts`, `hooks/useRascunhoDeFormulario.ts`, `lib/prazoDoCodigo.ts`, `PrazoDoCodigo.tsx` | Pronto. (a) Rascunho automático nos textos longos de perfil, experiência, formação, nova vaga, edição de vaga e perfil da empresa. (b) Na tela do código por e-mail (verificação de dispositivo), mostra até que horas o código vale, sem contagem regressiva; faltando 3 minutos (ou vencido) avisa uma vez e oferece "Preciso de mais tempo: enviar outro código", que usa o reenvio que já existia. O prazo é o do servidor (15 min): nada foi estendido nem encurtado. A sessão se renova sozinha com o refresh token. A confirmação de e-mail do cadastro **não** ganhou o aviso porque o site não sabe a que horas o e-mail foi enviado (o código pode vir do link). |
| 11 | Onde estou? | `lib/ondeEstou.ts` | Pronto. Página, etapa do cadastro, seção e ação principal (heurística). |
| 12 | Explique esta página | `dados/explicacoesPaginas.ts` | Pronto para as rotas principais; as demais dizem que não há explicação. |
| 13 | Assistente de preenchimento | `dados/dicasDeCampo.ts`, `DicaDeCampoBotao.tsx` | Pronto nos textos livres do Site: título e sobre mim do perfil, descrição de experiência e de formação, descrição, requisitos, benefícios e acessibilidade da vaga (nova e edição), descrição e cultura de inclusão da empresa. O exemplo nunca é colocado no campo. |
| 14 | Histórico de instruções | `lib/historicoInstrucoes.ts`, `SalvarInstrucao.tsx` | Pronto. Só neste navegador, no máximo 50 itens. |

O acesso a "Onde estou?", "Explique esta página", glossário e histórico está no botão fixo
**Ajuda de leitura** (canto inferior esquerdo), que também tem ajustes rápidos.

### Limites dos dados da vaga (por que o resumo diz "não informado")

O cadastro de vagas não tem campo para atividades separadas da descrição, requisitos obrigatórios x
desejáveis, nem etapas da seleção. O resumo **não inventa** esses dados: usa o início da descrição,
mostra os requisitos como a empresa os escreveu, diz que não foram separados e informa "A empresa não
informou" nas etapas. Para ter esses dados de verdade é preciso incluir campos nas vagas (Bloco 3).

### Limitações de navegador (registradas, não universais)

- **Destaque por palavra** depende do evento `boundary` da voz e da CSS Custom Highlight API
  (Chrome/Edge 105+, Safari 17.2+, Firefox 140+). **Testado de verdade apenas no navegador do app
  com as vozes locais "Microsoft Maria" e "Daniel"**, onde as palavras vieram em ordem e certas.
  Vozes de rede costumam não emitir `boundary`: nelas o destaque cai para frase e o aviso na tela diz
  isso. Esse plano B foi testado só com voz simulada.
- `speechSynthesis.pause()`/`resume()` é irregular (no Chrome do Android equivale a cancelar, e algumas vozes de rede travam ao retomar). Por isso, quando já se sabe até onde a voz foi (houve `boundary`), a pausa é feita por **reinício**: cancela, guarda a palavra e, ao continuar, fala o que faltava. Sem esse ponto, ou com fila de falas, usa o `pause()` nativo. Coberto por testes com voz simulada; **não** testado em celular de verdade.
- A voz fala no idioma do site (`<html lang>`: pt-BR, en-US, es-ES). Se o aparelho não tiver voz nesse idioma, o navegador escolhe a que tiver.
- **Não testado** com NVDA, JAWS, VoiceOver, TalkBack nem com dispositivo de acionamento.

### Pendências deixadas de propósito para o fim de todos os blocos

| Pendência | Por quê | O que fazer no fim |
|---|---|---|
| **Destaque por palavra em voz de rede e em celular** | Funciona com as vozes locais do computador (Microsoft Maria e Daniel, revisto em 04/11/2026 depois da mudança na pausa). Vozes de rede (as "Google" do Chrome) e várias do Android não emitem o evento `boundary`; nelas o site cai para destaque por frase. Esse caminho só foi testado com voz simulada e o celular nunca foi testado. | Testar no Chrome com uma voz Google e em um Android real. Decidir se vale embutir um motor de voz próprio (software livre), que daria palavra por palavra em qualquer aparelho ao custo de peso e de uma voz mais robótica. |
| Pausa por reinício em aparelho real | Coberta por testes com voz simulada. A prova ao vivo no navegador do app saiu contaminada pela leitura por setas, que falava cada botão clicado. | Testar pausar e continuar em um Android e no Chrome com voz de rede. |
| Leitores de tela (NVDA, JAWS, VoiceOver, TalkBack) e dispositivo de acionamento | Não há nenhum disponível no ambiente de desenvolvimento. | Teste manual com pessoas e aparelhos reais. |
| Verificação automática com `axe` | Exige uma dependência de desenvolvimento nova, que depende de aprovação. | Aprovar e rodar nas telas principais. |

### Testes

O resultado completo e o estado do Git estão no relatório entregue junto deste bloco.
