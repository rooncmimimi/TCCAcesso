# Acessibilidade do app ACESSO

Auditoria e decisões de acessibilidade do app Android (`App/AcessoApk`). Conferido no código em
27/10/2026, branch `app/telas-mobile-autenticacao`.

> **Plataforma.** O app é **Android nativo (Java + XML)**. Não usa React Native nem Expo, e **não há
> versão para iPhone**: quem usa iPhone acessa o ACESSO pelo site, no navegador. Os recursos do iOS
> aparecem abaixo só como referência para quem orienta usuários; a compatibilidade do site com o
> VoiceOver **não** foi verificada nesta auditoria.

O ponto de partida é: **o celular já tem leitor de tela, ampliação, fonte grande, contraste e controle
por voz.** O app não refaz esses recursos. Ele precisa (a) funcionar bem com eles e (b) ajudar a pessoa a
encontrá-los. O que o sistema não oferece e faz diferença no ACESSO é desenvolvido no app.

## Categoria 1 — Recursos do celular que a pessoa ativa

A tela **Acessibilidade no seu celular** (`TelaAcessibilidade`, aberta por "Configurar acessibilidade
agora" na apresentação e por Perfil › "Acessibilidade do celular") explica cada recurso Android abaixo e
leva às configurações. Os caminhos são os do Android puro; mudam um pouco por fabricante.

| Recurso | Sistema | O que faz | Como ativar | Exige adaptação no app? | Situação |
|---|---|---|---|---|---|
| TalkBack (leitor de tela) | Android | Lê a tela em voz alta; toque para ouvir, toque duplo para ativar | Configurações › Acessibilidade › TalkBack (atalho: segurar os 2 botões de volume por 3 s) | Sim (Categoria 2) | Adaptado; falta teste em aparelho |
| Tamanho do texto e da tela | Android | Aumenta letras e elementos | Configurações › Acessibilidade › Tamanho da exibição e texto (ou Tela › Tamanho da fonte) | Sim: textos em `sp`, nada de altura fixa | Adaptado (teste automático); falta conferir em aparelho |
| Ampliação | Android | Lupa na tela (toque triplo ou botão) | Configurações › Acessibilidade › Ampliação | Não | — |
| Texto em alto contraste, correção e inversão de cores | Android | Texto mais nítido, cores para daltonismo, cores invertidas | Configurações › Acessibilidade › Cor e movimento / Texto e exibição | Não; o app já tem contraste AA e não depende só de cor | — |
| Selecionar para ouvir | Android | Lê em voz alta o texto tocado, sem TalkBack | Configurações › Acessibilidade › Selecionar para ouvir | Não (usa os textos da tela) | — |
| Acesso por voz (Voice Access) | Android | Controla o celular falando ("tocar Entrar") | Configurações › Acessibilidade › Acesso por voz (app Voice Access) | Sim: botões com nome visível ou descrição | Atendido pelos rótulos e descrições |
| Acesso com interruptor | Android | Controle por interruptor, teclado ou rosto | Configurações › Acessibilidade › Acesso com interruptor | Sim: tudo alcançável por foco, sem gestos | Atendido (o app não tem gestos obrigatórios) |
| Legenda instantânea | Android | Legendas automáticas do que toca no celular | Configurações › Acessibilidade › Legenda instantânea | Não | — |
| Transcrição e notificação de som | Android | Fala ao redor em texto; avisa sons com vibração/luz | App "Transcrição instantânea e notificação de som" | Não | — |
| Remover animações / Tempo para agir | Android | Menos movimento; mais tempo para avisos | Configurações › Acessibilidade › Cor e movimento; › Tempo para agir | Não (o app não tem animações nem avisos que somem sozinhos) | — |
| VoiceOver | iOS | Leitor de tela | Ajustes › Acessibilidade › VoiceOver | Não se aplica (sem app iOS) | — |
| Zoom | iOS | Lupa na tela | Ajustes › Acessibilidade › Zoom | Não se aplica | — |
| Texto Maior (Dynamic Type) | iOS | Aumenta o texto | Ajustes › Acessibilidade › Tela e Tamanho do Texto › Texto Maior | Não se aplica | — |
| Aumentar Contraste, Inverter, Filtros de Cor | iOS | Contraste e cores | Ajustes › Acessibilidade › Tela e Tamanho do Texto | Não se aplica | — |
| Controle por Voz | iOS | Controla o iPhone falando | Ajustes › Acessibilidade › Controle por Voz | Não se aplica | — |
| AssistiveTouch | iOS | Botão na tela para gestos e botões físicos | Ajustes › Acessibilidade › Toque › AssistiveTouch | Não se aplica | — |
| Controle Assistivo | iOS | Controle por interruptor | Ajustes › Acessibilidade › Controle Assistivo | Não se aplica | — |
| Conteúdo Falado / Legendas ao Vivo / Reconhecimento de Sons | iOS | Leitura de seleção, legendas, alertas de som | Ajustes › Acessibilidade › (cada item) — Legendas ao Vivo não está em todos os idiomas | Não se aplica | — |

## Categoria 2 — Recursos do celular que o app precisa respeitar

Existir no celular não garante que funcione no app. O que o código faz para cada um:

| Requisito | Como o app atende | Conferido por |
|---|---|---|
| Fonte ampliada | Todo `textSize` em `sp`; botões com `minHeight` (não altura fixa); telas com rolagem | `LayoutsAcessiveisTeste` (falha se aparecer `dp` em texto ou botão com altura fixa) |
| Nome falado de cada controle | Botões com texto visível; botões só com ícone com `contentDescription`; campos com rótulo do `TextInputLayout` | `LayoutsAcessiveisTeste`, lint |
| Imagens | Decorativas fora do TalkBack (`importantForAccessibility="no"` ou `@null`); fotos de publicações com o texto alternativo do autor | `LayoutsAcessiveisTeste`, leitura do código |
| Cabeçalhos | Títulos de tela e de seção com `accessibilityHeading` (navegação por cabeçalho no TalkBack, Android 9+) | Leitura dos layouts |
| Avisos e erros | Mensagens de status e de estado em "live region" (o TalkBack lê sozinho), com ícone + texto (não só cor); no cadastro o foco vai ao primeiro campo com erro | Leitura do código |
| Contadores | Mensagens não lidas faladas no botão ("3 mensagens não lidas"); selo de notificações com a descrição em português do Material ("3 novas notificações") | Código e recursos do Material 1.12 |
| Mudanças importantes | Mensagem recebida com a conversa aberta é anunciada ("Nova mensagem de X: ...") | `NovidadesConversaTeste` (a decisão); o anúncio em si precisa de aparelho |
| Estado de botões | "Curtir" vira "Curtido" no texto e no ícone (não só na cor); "Seguir"/"Seguindo" | Leitura do código |
| Área de toque | Mínimo 48dp (estilos `Estilo.Acesso.Botao*`, `ItemMenu`) | `LayoutsAcessiveisTeste` |
| Contraste | Todas as combinações de texto ≥ 4,5:1 (menor: 4,81:1); contorno de campo 4,83:1 | Cálculo WCAG sobre `cores.xml` (abaixo) |
| Gestos | Nenhuma ação depende de deslizar, puxar ou gesto com vários dedos | Busca no código |
| Movimento | O app não usa animações próprias | Busca no código |

Contraste calculado (fórmula da WCAG 2.x) sobre `res/values/cores.xml`:

| Texto / fundo | Razão | Mínimo |
|---|---|---|
| texto principal / fundo | 16,89:1 | 4,5 |
| texto secundário / cartão | 7,58:1 | 4,5 |
| texto secundário / fundo cinza | 6,74:1 | 4,5 |
| branco / verde (botão principal) | 5,03:1 | 4,5 |
| verde (link) / fundo | 4,81:1 | 4,5 |
| erro / cartão | 5,33:1 | 4,5 |
| faixa de erro, sucesso, aviso | 11,81 / 6,52 / 11,49:1 | 4,5 |
| contorno de campo / cartão | 4,83:1 | 3,0 (componente) |
| borda de cartão / cartão | 1,30:1 | decorativa: o cartão se identifica pelo conteúdo (não exigido) |

## Categoria 3 — O que o app desenvolve

| Necessidade | Decisão | Situação |
|---|---|---|
| Ajudar a encontrar os recursos do celular | Guia `TelaAcessibilidade` (não duplica o sistema; explica e leva às configurações) | Feito |
| Mensagens de erro acessíveis | Erro no campo + resumo em "live region"; mesmas mensagens da API | Já existia |
| Comunicação acessível entre candidato e empresa | Anúncio de mensagem recebida no chat; balões lidos como "Nome: texto, hora" | Anúncio feito; leitura dos balões já existia |
| Descrição de imagens | Texto alternativo que o autor escreve ao publicar (`descricoesAnexos`) | Exibição já existia; **publicar com imagem ainda não existe no app** |
| Busca e candidatura simples | Filtros de modalidade e público, candidatura em uma confirmação | Já existia |
| Preferências de acessibilidade dentro do app (fonte, contraste, leitura) | **Não fazer**: o Android já oferece, e o app respeita (Categoria 2). O site tem essas opções porque o navegador não tem as mesmas | Decidido |
| Libras (VLibras) | O site usa o VLibras; o app não. Exige escolher SDK/serviço | **Pendente — decisão da equipe** |
| Legendas e transcrições | O app não exibe vídeo nem áudio hoje. Se o feed passar a mostrar vídeos (o backend aceita), exigir legenda/transcrição | Não necessário agora |

## Como testar em um aparelho (o que ainda falta)

Nada abaixo foi feito em aparelho real ou emulador (o ambiente desta auditoria não tinha
virtualização). Passo a passo para a equipe:

1. **TalkBack**: ative, percorra apresentação → login → cadastro (provoque um erro e veja se o foco vai
   ao campo) → feed (curtir/descurtir: o estado é falado?) → vaga → candidatura → conversa (peça para
   alguém responder com a conversa aberta: o aviso "Nova mensagem de…" é lido?) → Perfil › Acessibilidade
   do celular. Anote o que for lido sem sentido ou não for alcançável.
2. **Fonte no máximo** (Tamanho da exibição e texto no maior): nenhuma tela pode cortar texto ou esconder
   botão; role todas as telas, inclusive cadastro e edição de perfil.
3. **Acesso por voz**: diga "tocar Entrar", "tocar Curtir", "tocar Enviar" nas telas principais.
4. **Acesso com interruptor ou teclado** (Bluetooth ou emulador): tudo precisa ser alcançável por
   Tab/setas, sem toque.
5. **Confirmação de e-mail**: com o TalkBack ligado, veja se a contagem "Reenviar código em N s" do botão
   fica sendo repetida a cada segundo quando ele está em foco (se ficar, trocar por texto fixo + aviso no
   fim da espera).
6. Opcional: **Accessibility Scanner** (app do Google, Play Store) em cada tela.
