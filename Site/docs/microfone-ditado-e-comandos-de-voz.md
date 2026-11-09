# Microfone: ditado e comandos de voz (08/11/2026)

Relato: **"o sistema de gravar áudio não funciona mesmo tendo internet e utilizando o navegador que
suporta"**. O ACESSO não grava áudio em lugar nenhum — o que existe é o reconhecimento de fala do
navegador (Web Speech API), em dois lugares: o **ditado** (`hooks/useDitado`) e os **comandos de voz**
(`hooks/useComandoDeVoz`). O problema era real, e eram cinco causas somadas, todas invisíveis na tela.

## 1. Por que não funcionava

| # | O que acontecia | Por quê | O que a pessoa via |
|---|---|---|---|
| 1 | **O navegador encerrava a escuta sozinha** no primeiro silêncio | O Chrome fecha o turno depois de alguns segundos sem fala, **mesmo com `continuous = true`**. O código não reabria | Falava para um microfone já desligado. Pior para quem precisa de tempo para organizar a frase — boa parte do público do ACESSO |
| 2 | **Terminava sem nada e sem erro** | O `onend` só desligava o indicador. Sem resultado e sem `onerror`, nenhuma mensagem era escrita | Nada. O botão voltava para "Ditar texto" e pronto |
| 3 | **Ficava travado depois de um erro** | Em vários navegadores o `onerror` chega **sem** o `onend` depois. A referência da sessão continuava presa, e `iniciar()` começava com `if (… \|\| reconhecimento.current) return;` | O indicador "Microfone ligado" não saía mais, e clicar de novo não fazia absolutamente nada |
| 4 | **Parar virava mensagem de erro** | `abort`/`stop` disparam `onerror` com `aborted`, que é o fim normal | Mensagem vermelha depois de uma escuta que deu certo |
| 5 | **A leitura em voz do próprio ACESSO entrava pelo microfone** | Nada calava a síntese de fala ao abrir o microfone | Em quem usa o site sem fone, o reconhecimento ouvia o site, não a pessoa |

E, acima de tudo: **microfone bloqueado para o site no navegador**, que é a causa mais comum de "não
funciona" com internet e navegador certos. O site não dizia nada até a pessoa tentar.

## 2. O que mudou

**`lib/microfone.ts` (novo).** O chão comum dos dois recursos: o construtor do reconhecimento, o idioma
de escuta, as mensagens em linguagem simples, soltar uma sessão com segurança, calar a voz do site e o
estado da permissão. Os dois hooks tinham as mesmas falhas, cada um à sua maneira; agora têm um lugar só.

**Ditado (`useDitado`).**

- **Recomeço automático**: enquanto a pessoa não apertar "Parar ditado", cada fim de turno do navegador
  reabre a escuta (400 ms de respiro). Depois de **4 voltas seguidas sem ouvir nada**, desiste e explica —
  não fica tentando para sempre.
- **Nunca termina calado**: sem nada reconhecido, a mensagem diz o que houve e o que conferir.
- **Nunca trava**: erro sem `onend` encerra o estado do mesmo jeito, e `iniciar()` solta uma sessão
  pendurada em vez de desistir em silêncio.
- `aborted` e `no-speech` não viram mensagem de falha (o segundo só conta uma volta de silêncio).
- Erros definitivos (`not-allowed`, `audio-capture`, `network`, `service-not-allowed`,
  `language-not-supported`) **param** a escuta: insistir não adianta e consumiria o microfone à toa.
- Uma mensagem específica nunca é substituída por uma genérica.
- A escuta abre no idioma do site **com região** (`pt-BR`, `en-US`, `es-ES`); antes ia `<html lang>` cru
  ("pt", "en"), e o reconhecimento do Chrome erra muito mais assim.
- A voz do ACESSO é calada ao abrir o microfone.

**Comandos de voz (`useComandoDeVoz`).** Mesmo cuidado, sem recomeço automático (um comando é uma frase
curta; insistir sozinho com o microfone aberto seria pior). Além disso, os 10 segundos sem nada agora
**dizem** que nada foi ouvido, em vez de só sumir.

**Na tela.**

- O ditado mostra **"Já ouvimos: …"** enquanto a pessoa fala. Sem isso, com a escuta atravessando as
  pausas, ela falaria frases seguidas sem ver nada acontecer. Não é uma região "ao vivo" de propósito:
  um leitor de tela repetindo o texto inteiro a cada frase atrapalharia — o texto é lido na revisão.
- O texto de apoio diz que **o microfone continua ligado nas pausas** e que se para no botão.
- **Aviso de microfone bloqueado**, antes de qualquer tentativa, com o caminho certo para o aparelho
  (cadeado no computador, Permissões no Android, Ajustes no iPhone). Sai da tela sozinho quando a pessoa
  libera, sem recarregar a página (`PermissionStatus.onchange`).
- Nos comandos de voz, pedir um comando com o microfone bloqueado responde na hora, em vez de abrir uma
  escuta que o navegador vai recusar calada.

## 3. Como foi verificado

- **30 testes novos** escritos contra o que o navegador faz de verdade, não contra o caminho feliz:
  `hooks/useDitado.test.tsx` (10), `hooks/useComandoDeVoz.test.tsx` (10), `lib/microfone.test.ts` (10).
  Escritos **antes** da correção e rodados contra o código anterior: **6 dos 10 do ditado falhavam** —
  o recomeço depois do fim de turno, o contador de silêncio, o fim sem mensagem, o erro sem `onend`, o
  `aborted` virando erro e a voz do site não ser calada. São os problemas 1 a 5 da seção 1.
- **4 testes de tela** em `components/acessibilidade/CampoComDitado.test.tsx`: a revisão não abre no meio
  da frase quando o navegador encerra o turno, o texto já ouvido aparece, o aviso das pausas e o aviso de
  microfone bloqueado.
- **No navegador** (Chromium do app, com o microfone realmente negado para o site): a consulta de
  permissão responde `denied` e o painel de comandos de voz mostra, na hora, "O microfone está bloqueado
  para este site no seu navegador" com o caminho do cadeado.
- Suíte inteira do front, `tsc`, `eslint` e `vite build`.

## 4. O que continua em aberto

- **Nada foi testado com microfone real, por uma pessoa falando.** O navegador do app não tem microfone
  liberado, e as telas de ditado ficam atrás do login. Os roteiros de teste real estão em
  [acessibilidade-avancada-verificacoes.md](acessibilidade-avancada-verificacoes.md).
- **O reconhecimento continua sendo o do navegador.** Firefox não oferece nenhum (a tela já indica o
  ditado do sistema: Windows + H no computador, microfone do teclado no celular), e Chrome e Edge mandam
  o áudio a um serviço online deles — o ACESSO não escolhe isso e avisa nas duas telas.
- **Sem custo novo**: nenhuma dependência, nenhum serviço pago, nenhuma migration.
