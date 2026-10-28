# ACESSO para iPhone (Expo)

Versão do app ACESSO que roda no iPhone, feita com Expo (React Native, SDK 58) e TypeScript. Fica
separada do app Android (`App/AcessoApk`, Java), que continua igual. Usa a mesma API do site
(`Site/Backend`) e as mesmas regras, mensagens e cores do app Android.

> **Situação:** testado com Jest (unidade + contrato contra a API rodando localmente, 10 cenários), TypeScript,
> ESLint, `expo-doctor` e pela versão web no navegador em tamanho de iPhone. **Ainda não foi aberto
> em um iPhone de verdade nem no simulador** (o ambiente usado não tinha Mac). Esse é o próximo passo.

## Como abrir no iPhone (sem Mac e sem conta paga da Apple)

1. No iPhone, instale o app **Expo Go** (App Store).
2. No computador (Windows, Linux ou Mac), com Node.js 20 ou mais novo:
   ```bash
   cd App/AcessoExpo
   npm install
   npx expo start
   ```
3. Aponte a câmera do iPhone para o QR code que aparece no terminal e abra no Expo Go.
   Se o iPhone e o computador não estiverem na mesma rede, use `npx expo start --tunnel`.

O app usa a API publicada (`https://acesso-backend.onrender.com/api`). A primeira chamada pode levar
até um minuto, porque o servidor gratuito "acorda". Para usar outra API (por exemplo, a do seu
computador), crie `App/AcessoExpo/.env.local` com:

```
EXPO_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:3000/api
```

Não coloque senhas nem chaves em variáveis `EXPO_PUBLIC_`: elas vão dentro do app.

Para instalar como app de verdade (TestFlight/App Store) é preciso conta no Apple Developer Program e
um build pelo EAS (`npx eas-cli build -p ios`).

## O que já funciona

- Apresentação, entrar (com preenchimento automático de senhas do iPhone), criar conta de pessoa,
  confirmar e-mail por código, esqueci a senha, termos.
- Sessão guardada no Keychain (expo-secure-store), renovada sozinha; a renovação é única por vez
  (o refresh token da API é rotativo).
- Abas nativas do iPhone: Início (feed, publicar texto, curtir, comentários com respostas, pesquisa de
  pessoas, empresas e vagas, perfil de outras contas com seguir), Vagas (busca com filtros, detalhe,
  candidatura) ou Painel (empresa), Notificações (com selo de não lidas) e Perfil (candidaturas,
  sair).
- Empresa em análise, reprovada ou suspensa vê só a situação da empresa.
- Guia "Acessibilidade no iPhone" (VoiceOver, Texto Maior, Zoom, Controle por Voz etc.).

Ainda não existe aqui (use o site ou o app Android): cadastro de empresa, publicar vaga, editar
perfil, conversas (mensagens) e publicação com imagem.

## Acessibilidade

- Textos acompanham o **Texto Maior** (nenhum tamanho fixo); telas com rolagem.
- Botões e campos com no mínimo 48 pontos de altura; nome falado em todos os controles.
- Títulos marcados como cabeçalho (rotor do VoiceOver); erros escritos (não só cor) e anunciados.
- Estado de "Curtido", "Não lida" e filtros escritos no texto, não só na cor.
- Imagens decorativas escondidas do VoiceOver; fotos de publicações com o texto alternativo do autor.
- Mesmas cores do app Android (contraste AA conferido em `App/AcessoApk/docs/ACESSIBILIDADE.md`).

Falta conferir em aparelho: VoiceOver em todas as telas, Texto Maior no máximo, Controle por Voz.

## Desenvolvimento

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint (expo lint)
npm test            # testes de unidade (Jest)
ACESSO_API_TESTE_URL=http://localhost:3000/api npx jest contrato   # contrato com uma API de TESTE
npx expo export --platform ios   # confere que o pacote do iOS compila
```

O teste de contrato cria contas e publicações: nunca aponte para a API de produção. Opcionalmente,
`ACESSO_API_TESTE_EMPRESA_EMAIL` e `ACESSO_API_TESTE_EMPRESA_SENHA` de uma empresa aprovada nessa API
liberam o teste de vaga e candidatura.

Estrutura: telas em `src/app` (Expo Router), chamadas à API em `src/api`, sessão em `src/sessao`,
componentes em `src/componentes`, regras e formatação em `src/utilitarios`, testes em `src/__tests__`.
