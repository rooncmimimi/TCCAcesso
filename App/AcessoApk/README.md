# ACESSO — App mobile

Aplicativo mobile do ACESSO (React Native + Expo, SDK 57).

## Começando

```bash
npm install
cp .env.example .env   # no Windows: copy .env.example .env
npm start
```

Aponte `EXPO_PUBLIC_API_URL` (em `.env`) para a API do `Site/Backend`
rodando localmente (`http://localhost:3000/api` por padrão).

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | Abre o Metro Bundler (Expo Go ou build de desenvolvimento) |
| `npm run android` / `npm run ios` | Abre direto num emulador/simulador |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Suíte de testes (Jest + Testing Library) |
| `npm run e2e` | Fluxos E2E (Maestro) — ver `.maestro/README.md` antes de rodar |

## Testes

Suíte unitária/integração roda com `npm test` (nenhum passo extra
necessário — todo acesso a rede/armazenamento/serviços nativos já é
mockado por arquivo). Os fluxos E2E (`.maestro/`) são um projeto à parte,
com pré-requisitos próprios (Maestro CLI, uma build instalada, uma conta de
teste) — ver `.maestro/README.md`.

## Build (EAS)

Perfis de build em `eas.json` (`development`/`preview`/`production`). Ver a
seção "Build do app mobile (EAS)" no README na raiz do repositório para os
pré-requisitos (conta Expo, `eas init`, segredo `EXPO_TOKEN`) antes de rodar
`eas build` — nenhum deles está configurado ainda.

## Arquitetura

`Screen → Service → API`: cada domínio (`src/feed/`, `src/vagas/`,
`src/autenticacao/` etc.) é um módulo flat com `types.ts` + `<Domínio>Service.ts` +
`index.ts`, espelhando o contrato real do `Site/Backend` (conferido nas
rotas, controllers e validators do backend, nunca presumido). Preferências
locais (`src/acessibilidade/`, `src/seguranca/`) usam
`AsyncStorage`; a sessão (tokens) usa `expo-secure-store`
(`src/armazenamento/armazenamentoSeguro.ts`) — nunca o mesmo mecanismo para as duas
coisas.
