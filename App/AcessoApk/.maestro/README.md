# Testes E2E (Maestro)

## Status honesto antes de tudo

Estes fluxos foram escritos **e nunca executados**. O ambiente em que foram
escritos não tinha SDK Android nem emulador, então não houve como instalar o
Maestro CLI, gerar uma build do app e rodar `maestro test` para confirmar
que passam.

O que FOI feito com cuidado: cada rótulo (`tapOn`, `assertVisible`) usado
abaixo foi conferido contra o `accessibilityLabel`/texto real do componente
correspondente no código-fonte no momento em que este arquivo foi escrito —
nunca inventado ou "chutado" de memória. Ainda assim, sem uma execução real,
não há garantia de que:

- o app compila e instala numa build de teste (existem `eas.json` e o
  workflow `eas-build.yml`, mas os fluxos não rodam no CI);
- o tempo de carregamento de cada tela é suficiente para o Maestro encontrar
  o elemento (nenhum `extendedWaitUntil`/timeout foi ajustado contra um app
  de verdade);
- um `accessibilityLabel` não mudou entre a escrita deste arquivo e a
  próxima vez que alguém rodar isto (o app continua em desenvolvimento).

**Antes de confiar nestes fluxos** (num CI, por exemplo), rode-os uma vez
localmente contra um emulador/dispositivo de verdade e corrija o que
divergir — trate a primeira execução como parte de validar o fluxo, não como
"os testes já passam".

## Por que Maestro (não Detox)

Maestro não exige integração nativa nenhuma no projeto (sem código C++/
Gradle/Xcode a manter) — só fala com o app já instalado através da árvore de
acessibilidade, a mesma que o TalkBack/VoiceOver já usam. Isso combina bem
com um app cuja acessibilidade já é levada a sério em cada tela (todo
`accessibilityLabel` usado aqui já existe por causa disso, não foi
adicionado só para o teste).

## Pré-requisitos para rodar de verdade

1. [Instalar o Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro) (não é um pacote npm — não faz parte de `package.json`).
2. Uma build do app instalada num emulador Android/simulador iOS rodando, OU um dispositivo físico conectado.
3. **Uma conta de teste real já cadastrada** no ambiente contra o qual for rodar (local ou de homologação — nunca produção de verdade sem combinar antes). Ver decisão abaixo sobre por quê os fluxos não se cadastram sozinhos.
4. Rodar com as credenciais como variável de ambiente:

```bash
maestro test .maestro/flows --env ACESSO_TEST_EMAIL="teste@exemplo.com" --env ACESSO_TEST_SENHA="SenhaDeTeste123!"
```

## Por que os fluxos usam uma conta já existente (`env`), em vez de se cadastrarem sozinhos

A regra para dados de teste neste projeto é: são sempre descartáveis e
sempre limpos até o fim (residual verificado por SQL cru, não
só por um log de sucesso). Um fluxo de Maestro só interage pela UI — não tem
como fazer essa varredura de resíduo. Cadastrar uma conta nova a cada
execução deixaria um `Usuario`/`Candidato` real (e, se o e-mail de
confirmação estiver configurado, um e-mail de verdade) para trás a cada
rodada, sem limpeza possível pela própria UI (não existe endpoint público de
autoexclusão que não exija reautenticar, e mesmo que existisse, um fluxo que
falha no meio nunca chegaria a essa etapa). Por isso: uma conta de teste
**dedicada e reutilizável** (do mesmo jeito que qualquer suíte de E2E de
produção real trata isso) é a escolha certa aqui — nunca fabricada,
provisionada por quem for rodar.

O fluxo `02_feed_publicar_e_curtir.yaml` é a exceção parcial: ele CRIA uma
publicação (não existe outro jeito de testar "curtir" sem conteúdo), mas
**exclui a própria publicação no final**, usando a ação real de "Excluir
publicação" da tela — o fluxo é responsável por não deixar rastro,
mesmo sem acesso a SQL.

## Fluxos disponíveis

| Arquivo | O que cobre |
|---|---|
| `flows/00_login.yaml` | Subfluxo (via `runFlow`), nunca roda sozinho — login com a conta de `env`. |
| `flows/01_navegacao_basica_e_logout.yaml` | Fumaça: login → visita as 5 abas → Configurações → Sair. |
| `flows/02_feed_publicar_e_curtir.yaml` | Publica um texto no feed → curte → exclui a própria publicação (sem resíduo). |

**Deliberadamente fora desta fase**: vagas, mensagens, denúncia/bloqueio,
modo empresa. A lista de vagas do feed é conteúdo real e imprevisível (o
rótulo de cada item é montado a partir de dados reais — `título, empresa,
local, modalidade`, sem valor fixo pra apontar sem rodar contra o app de
verdade) — escrever um fluxo "às cegas" contra um seletor que pode nem
existir seria pior do que não escrever nada. Ficam registrados como próximo
passo natural assim que alguém puder iterar contra um app rodando de
verdade (o que esta sessão não consegue fazer).
