# Acessibilidade avançada: Bloco 4 (motricidade e comunicação)

Complementa [acessibilidade-avancada.md](acessibilidade-avancada.md), [acessibilidade-avancada-bloco2.md](acessibilidade-avancada-bloco2.md) e
[acessibilidade-avancada-bloco3.md](acessibilidade-avancada-bloco3.md). **Este bloco não tem migration:** as preferências ficam só no
navegador (como as do Bloco 1) e os cartões e o progresso dos objetivos ficam em `localStorage`. Nada novo vai ao servidor.

## 1. Auditoria (o que já existia)

| Recurso pedido | O que existia | Decisão |
|---|---|---|
| Ditado | `useDitado`, `CampoComDitado` com revisão e vocabulário contextual (Bloco 2), usado só na mensagem da candidatura e no simulador. | Reaproveitado. Extraí o painel de ditado (`PainelDeDitado`) e criei `DitadoParaCampo`, que dita para um campo **que já existe**, sem trocá-lo. |
| Alvos maiores | `min-h-11` (44 px) nos botões; nenhuma preferência. | Preferência de tamanho (padrão, grande, maior) por CSS. |
| Atalhos de teclado | Nenhum (só `Esc` e as setas do cursor de leitura). | Novos. |
| Comandos de voz | Só leitura em voz (`VozProvider`); nenhum reconhecimento de comando. | Novos, reaproveitando a API de reconhecimento já usada no ditado. |
| Proteção contra tremores | Botões já desativam durante o envio, mas sem regra geral. | Camada global. |
| Varredura | Nenhuma. | Nova. |
| Central de comunicação, dicionário, objetivos | Nada. As "preferências de comunicação" do Bloco 2 são outra coisa (o que a pessoa autoriza compartilhar). | Novos. |

## 2. O que foi implementado

### Varredura com um botão
`lib/varredura.ts` (descobre os controles), `lib/motorDeVarredura.ts` (estado puro), `hooks/useVarredura.ts` (relógio e teclas),
`components/acessibilidade/BarraDeVarredura.tsx` (painel e contorno).

- Percorre botões, links com destino, campos, seletores, caixas de seleção, opções e papéis interativos. **Fica de fora:** o que não tem nome
  (decorativo), o que está escondido, desligado, `aria-hidden`, `inert`, recortado como "só para leitor de tela" e o próprio painel.
- **Grupos:** primeiro percorre blocos (cabeçalho, menu, cada seção, cada formulário); selecionar um bloco entra nele. Grupo com um controle só
  e controle sem grupo viram itens diretos. Pode ser desligado.
- **Camada de cima:** com diálogo ou menu aberto, só ele é percorrido.
- **Acionamento:** Espaço, Enter, uma tecla extra à escolha, o botão Selecionar do painel (mouse ou toque) e dispositivos que emulem teclas.
- **Controles:** iniciar, pausar, continuar, avançar, voltar, selecionar, sair do grupo, parar, velocidade (0,6 a 5 s). `Esc` sai do grupo e,
  fora de grupo, para. Com a varredura pausada, as setas andam item a item.
- **Campo de texto:** selecionar um campo coloca o foco nele e pausa; `Esc` volta à varredura. Enquanto se digita, Espaço e Enter são do texto.
- **Anúncios:** o passo automático **não** é anunciado (falaria sem parar); anunciam-se início, pausa, seleção, grupo e passo manual.
- A página muda (diálogo, lista, troca de rota): a lista é refeita mantendo a posição quando o item destacado ainda existe.
- Não substitui a varredura do Windows, do Android nem de dispositivos assistivos: é uma alternativa dentro da própria página.

### Proteção contra tremores
`lib/guardaDeAcionamentos.ts`, `hooks/useGuardaDeAcionamentos.ts`, `AvisoDeCliqueIgnorado.tsx`.
- **Para todos:** o envio do mesmo formulário duas vezes em menos de 0,5 s é ignorado.
- **Opcional (intervalo de 0,3 a 2 s):** um segundo toque no **mesmo** controle dentro do intervalo é ignorado, com aviso visível. Outros
  controles não são afetados; campos de texto, seletores e controles deslizantes não entram; `data-permite-repeticao` isenta (botões + e −).
  Um toque ignorado não renova a janela.

### Alvos maiores
`data-target-size` na raiz (`padrao`, `grande` 56 px, `maior` 72 px) em `styles/globals.css`: botões, resumos, campos, links de navegação,
caixas, opções e interruptores. Links no meio de um texto corrido não são alargados. O painel da varredura é limitado a 56 px.

### Atalhos de teclado
`lib/atalhos.ts`, `hooks/useAtalhosDeTeclado.ts`, `AjudaDeAtalhos.tsx`. **G e depois** I (início), V (vagas), M (mensagens), N (notificações),
P (perfil), D (painel), A (Minha Acessibilidade), C (configurações de acessibilidade), O (objetivos), F (Fale conosco); **/** abre a pesquisa;
**?** mostra a lista. Não agem com Ctrl, Alt ou Meta, com a pessoa digitando, com diálogo aberto nem com a tecla segurada. A lista tem o
interruptor para desligar (WCAG 2.1.4). Visitantes só têm os públicos.

### Comandos de voz
`lib/comandosDeVoz.ts`, `hooks/useComandoDeVoz.ts`, `ComandosDeVoz.tsx`. Menu "Ajuda de leitura" → "Falar um comando". O microfone só liga
quando a pessoa pede, ouve **uma** frase (máx. 10 s), mostra "Microfone ligado" com o botão Parar e mostra em texto o que ouviu e o que fez.
Entende: ir para (vagas, perfil, mensagens, notificações, início, Minha Acessibilidade, configurações...), pesquisar vagas (com termo), voltar,
próxima página, candidatar-me (**só abre** a candidatura), ativar ou desativar modo leitura e modo foco, parar leitura e mostrar atalhos.
**Excluir, apagar, remover, enviar, publicar e sair da conta são recusados** com explicação. Frase fora da lista: "não entendi", sem palpite.
Não guarda áudio. No Chrome e no Edge o navegador usa um serviço online para reconhecer a fala, então precisa de internet (a tela avisa).
`/vagas` passou a aceitar `?q=termo`.

### Ditado ampliado
Além da mensagem da candidatura e do simulador: "Sobre mim" (perfil), descrição de experiência e de formação, publicação do feed, biografia
do cadastro e mensagem do chat. O texto passa pela revisão e pelo vocabulário contextual e só entra no campo quando a pessoa confirma.

### Central de comunicação alternativa
`/comunicacao`: 17 cartões em 4 grupos (as frases pedidas, mais algumas) com **Mostrar** (tela cheia, letras grandes), **Ouvir** e **Copiar**,
e cartões da própria pessoa (até 24, 140 caracteres, só neste navegador). Nas **Mensagens**, o botão "Frases prontas" **coloca** a frase no campo;
a pessoa revisa e envia.

### Dicionário visual de profissões
`/profissoes`: 15 fichas (atividades, ferramentas, habilidades, exemplo de rotina), busca sem acento, leitura em voz e link para
`/vagas?q=`. A "imagem ilustrativa" é um **ícone grande com descrição em texto** (sem imagens de terceiros, sem licença a cumprir, custo zero).
Nenhuma ficha promete salário, horário ou vaga.

### Navegação por objetivos
`/objetivos`: os seis objetivos pedidos para candidatos, três para empresas e um para visitantes. Só os passos necessários, em ordem, com
"Próximo passo" destacado e marcação de passos feitos (só no navegador). Nenhum passo faz algo pela pessoa.

## 3. Limitações reais

- **Varredura:** não foi testada com dispositivo acionador real nem com um aparelho que emule teclas. Foi verificada com teclas simuladas, em
  jsdom e no navegador embutido do app (Chromium), a 375 px.
- Quem só tem **um acionador** consegue percorrer e acionar, mas **não digita** em campos (Espaço e Enter são do texto). Para essas pessoas, o
  caminho é ditado, cartões de comunicação e os recursos do sistema operacional.
- Depois de acionar algo que **troca a tela**, a varredura recomeça do começo.
- **Comandos de voz e ditado:** dependem da API de reconhecimento de fala do navegador. Firefox não oferece. Em Chrome e Edge o áudio é
  processado por um serviço online do navegador. Não foram testados com microfone real nem com áudio real.
- Com um **diálogo modal** aberto, o painel da varredura fica fora dele: ele funciona por ponteiro e pelas teclas globais (verificado: a
  varredura percorreu e fechou diálogos por teclas). Quem navega por Tab provavelmente não alcança o painel, porque o diálogo prende o foco;
  isso **não foi testado** com teclado real.
- **Alvos maiores:** links dentro de parágrafos não crescem. Ainda não foi feita auditoria de leiaute em todas as telas com o tamanho "maior".
- **Leitores de tela:** nenhum leitor de tela real foi usado. O painel e os avisos usam `role="status"`, nomes acessíveis e anúncios só nos
  eventos, mas isso não substitui o teste com NVDA, JAWS, VoiceOver ou TalkBack.
- Os cartões, o progresso dos objetivos e as preferências somem se os dados do navegador forem limpos e não acompanham a pessoa em outro aparelho.
- WCAG 2.2 é usada só como referência (alvos, atalhos de um caractere, foco). Não se declara conformidade sem auditoria.
