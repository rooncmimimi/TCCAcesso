# Idioma do site e tradução de publicações

O site passa a ter **português, inglês e espanhol**, com a escolha guardada (no aparelho e, se você ligar, na conta), e as publicações, comentários e vagas ganham o botão **Traduzir**. A entrega é em **ondas**: a base e as telas principais agora, o resto nas próximas.

## O que muda para a pessoa

- **Seletor de idioma** no cabeçalho (visitante e logado), no login e no cadastro; e uma seção **Idioma do site** em Configurações → Acessibilidade. A troca vale na hora, sem recarregar.
- **Quem manda:** a escolha da pessoa; sem escolha, o idioma do navegador (se for um dos três); senão português. O `lang` da página acompanha (leitor de tela e tradutor do navegador dependem dele).
- **Com a conta:** o idioma acompanha a pessoa em qualquer dispositivo. No login, o da conta vale; se a conta ainda não tem um e a pessoa já escolheu neste aparelho (por exemplo, no cadastro), a escolha sobe para a conta. Sem o recurso ligado no servidor, o idioma vale só no aparelho, e a tela diz qual dos dois aconteceu.
- **Traduzir:** em cada publicação, comentário e vaga (card e página). É um clique, nunca automático; **Ver original** volta ao texto escrito. O botão diz o que traduz e para quê ("Traduzir a publicação para inglês"), e o estado sai numa região `status`.

## Onda 1: o que já está traduzido

Cabeçalho (visitante e logado) e rodapé; páginas 404 e de erro; login (com e-mail não confirmado e conta pausada) e o botão do Google; cadastro de candidato (já era); feed (lista, formulário de nova publicação, cartão da publicação, comentários, "pessoas para conhecer") e os avisos das ações do feed; vagas (lista, filtros, cartão e página da vaga, incluindo modalidade, público e recursos de acessibilidade); a seção de idioma.

## O que ainda NÃO está traduzido (próximas ondas)

Fica em português, sem erro: perfil e edição de perfil, mensagens, notificações, painel de indicadores, painel administrativo, **Configurações** (acessibilidade, privacidade, segurança, senha, conta), as telas de verificação por e-mail e de conta comprometida, recuperar e redefinir senha, confirmar e-mail, cadastro de empresa e `cadastro/dados`, anexos das publicações (galeria, visualizador e a descrição de imagem), compartilhar, denunciar, página inicial pública, Termos e Privacidade, a pergunta de leitura por voz, e o **título da aba** do navegador (vem de uma configuração estática de cada rota).

Também não traduzidos, por não serem do Site: as **mensagens de erro do servidor** e os **e-mails** (código, aviso de novo acesso, recuperação de senha). O servidor continua respondendo em português.

## Como o idioma é guardado

| Onde | Chave | Quando |
| --- | --- | --- |
| Aparelho | `localStorage` `acesso:idioma` | Sempre. |
| Conta | `preferencias_acessibilidade.idioma` | Só com `IDIOMA_NA_CONTA_HABILITADO=true` e a migration 0011. Nulo = "ainda não escolheu". |

**Migration 0011** (`0011_idioma_na_conta.sql`): acrescenta **uma coluna nula** e uma restrição (`pt`, `en` ou `es`). Não altera nenhuma linha existente nem apaga nada; traz no cabeçalho como voltar atrás. A chave nasce **desligada**; o servidor confere ao iniciar e avisa se estiver ligada sem a migration. "Redefinir tudo" da acessibilidade **não** mexe no idioma.

## Como a tradução funciona (e o que ela não faz)

- O motor é o **tradutor embutido do navegador** (APIs `Translator` e `LanguageDetector` do Chrome). Roda **no aparelho**: o texto da publicação **não é enviado a nenhum serviço**, nada é pago e nada é guardado no servidor.
- O navegador detecta o idioma do texto; se não conseguir (texto curto), supõe inglês quando o site está em português, e português nos outros casos. Se o texto já está no idioma da pessoa, diz isso.
- **Só no Chrome recente** (versões com essas APIs). Na primeira vez de cada par de idiomas o navegador **baixa um modelo**, e o botão mostra "Preparando a tradução…".
- **Navegador sem a API, ou que não responde:** depois de alguns segundos (8 s para a disponibilidade, 5 s para a detecção, 30 s para traduzir, até 3 min com download do modelo) a tela mostra a explicação ("use o tradutor do navegador: botão direito, Traduzir para...") e o original continua lá. A tela nunca fica presa.
- A tradução fica **em memória enquanto a aba está aberta**; editar a publicação, ou trocar o idioma do site, descarta a tradução antiga.
- É tradução automática: pode errar. O aviso "Traduzido do inglês para o português" fica visível ao lado.

## Como acrescentar texto ou idioma

- Textos: `src/i18n/dicionarios/pt.ts` é a **fonte**; `en.ts` e `es.ts` precisam ter as mesmas chaves (o compilador cobra, e um teste confere as variáveis `{nome}` e que nenhum texto ficou igual ao português por esquecimento). Plural: `chave` e `chave_um` (1 usa `_um`; qualquer outro número usa a base).
- Na tela: `const { t } = useIdioma();` e `t("chave", { nome })`. Sem provedor, o componente fica em português (os testes antigos seguem valendo).
- Idioma novo: `src/i18n/idiomas.ts`, um dicionário novo e o `CHECK` da coluna (migration nova).

## Testes

- **Backend:** 1065 testes. 15 novos: texto da migration, aviso de migration ausente, model só com a coluna quando a chave está ligada, serviço que só grava com a chave ligada, validador. 4 mutações nessas proteções, todas pegas.
- **Rodada funcional contra Postgres descartável** (PGlite): com a chave ligada e a 0011 aplicada, 18/18 (conta nova com idioma nulo; gravar `en`, `pt`, `es` e `null`; recusar `fr`, `EN`, `pt-BR`, vazio e número; salvar outras preferências sem apagar o idioma; "Redefinir tudo" não mexe nele; contas independentes; sem sessão = 401; o próprio banco recusa valor fora da lista). Chave desligada: o campo não aparece e o idioma enviado é ignorado (com e sem a 0011 no banco). Chave ligada **sem** a 0011: falha como previsto, com o aviso no log.
- **Site:** 79 testes novos (622 no total) (idiomas, tradutor de texto, paridade dos dicionários, provedor com a conta, hook de tradução com motor falso, motor do navegador com limites de tempo, seletor e telas em três idiomas). 14 mutações (tradução presa ao texto antigo, tradução automática, "ver original" que não volta, idioma da conta ignorado, visitante falando com o servidor...), todas pegas.
- **Navegador real (Chrome embutido):** troca para inglês no login, entrada (a escolha de visitante subiu para a conta: `en` no banco), feed e vagas em inglês (inclusive o plural e o tempo relativo), idioma persistindo depois de recarregar. Também **achou um defeito**: neste navegador a API de tradução existe mas não responde, e a tela ficava presa em "Traduzindo…". Corrigido com os limites de tempo acima.

**Não verificado:** a **tradução de verdade**. O navegador embutido não tem o motor por trás da API, então o fluxo completo (detectar, baixar o modelo, traduzir) foi testado só com motor simulado e com a API simulada. Falta testar num **Chrome real**. Também não verificado: leitor de tela real nas telas em inglês e espanhol, e a revisão das traduções por uma pessoa fluente (estão escritas com cuidado, mas são minhas).

## Limites que continuam

- O **título da aba** e os textos de compartilhamento (`og:`) seguem em português.
- **Datas, moeda e números** usam o idioma da pessoa onde já foram ligados (tempo relativo, salário da vaga); o resto ainda não.
- Traduzir **comentários e publicações muito longos** de uma vez pode demorar; o limite de 30 s existe para isso.
- O texto traduzido **não é lido em voz alta com o idioma certo** pela leitura por voz do site (ela usa a voz do idioma da página).
