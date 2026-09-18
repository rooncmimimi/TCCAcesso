/**
 * Único ponto do app que lê variáveis de ambiente. O app consome o mesmo backend do Site.
 *
 * Tudo que começa com `EXPO_PUBLIC_` é embutido no bundle, então só entram valores públicos (ver
 * `.env.example`). Em desenvolvimento, `localhost` não alcança o computador a partir do emulador
 * Android (use 10.0.2.2) nem de um aparelho com Expo Go (use o IP da máquina na rede); o valor
 * padrão só evita uma URL indefinida.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

/**
 * DSN do Sentry, opcional: sem ele o envio de erros fica desligado e o app funciona normalmente. O
 * DSN de cliente não é segredo (o próprio Sentry o expõe no código do cliente), por isso pode ser
 * `EXPO_PUBLIC_*`.
 */
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || null;
