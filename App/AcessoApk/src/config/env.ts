/**
 * Configuração centralizada de ambiente do app — nenhum outro arquivo deve
 * ler `process.env` diretamente nem hardcodar o endereço da API.
 *
 * O backend é o mesmo que o site já usa (Site/Backend) — o app é só mais um
 * cliente HTTP dele, nunca um backend próprio.
 *
 * Variáveis `EXPO_PUBLIC_*` em `.env`/`.env.local` são inlineadas pelo Expo
 * automaticamente (sem pacote extra) — ver `.env.example`. Nunca colocar
 * segredo aqui: tudo que começa com `EXPO_PUBLIC_` vai parar no bundle
 * público do app, então só serve para valores não sensíveis como esta URL.
 *
 * Nota para a Fase 3 (cliente Axios): "localhost" não chega no servidor de
 * desenvolvimento a partir de um emulador Android (usar 10.0.2.2) nem de um
 * aparelho físico via Expo Go (usar o IP da máquina na rede local) — este
 * fallback serve só para não deixar a constante indefinida antes de existir
 * uma tela real que a use.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";
