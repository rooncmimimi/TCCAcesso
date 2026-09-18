import * as Sentry from "@sentry/react-native";

import { SENTRY_DSN } from "../config/env";

/**
 * Único ponto do app que fala com o Sentry, sempre opcional: sem `SENTRY_DSN`,
 * `inicializarObservabilidade` nem chama `Sentry.init`, e nada no app depende dele. O flag `ativo`
 * registra se a inicialização aconteceu, para as outras funções não dependerem do comportamento do
 * SDK sem `init`.
 *
 * O build não envia source maps (isso exige organização, projeto e `SENTRY_AUTH_TOKEN` de uma conta
 * real). Os erros chegam e são agrupados normalmente, mas com o stack trace do bundle minificado.
 */
let ativo = false;

export function inicializarObservabilidade(): void {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    // Amostragem moderada: sem tráfego real para calibrar, um valor maior poderia estourar a cota
    // de um plano gratuito.
    tracesSampleRate: 0.2,
  });
  ativo = true;
}

/**
 * Reporta um erro ao Sentry; erros de renderização chegam aqui pelo `ErrorBoundary`. Pode ser
 * chamada sempre: sem DSN vira um `console.error`, a única exceção à regra de não usar `console` no
 * app, para o erro aparecer em algum lugar.
 */
export function capturarErro(erro: unknown, contexto?: Record<string, unknown>): void {
  if (ativo) {
    Sentry.captureException(erro, contexto ? { extra: contexto } : undefined);
    return;
  }

  console.error("[observabilidade] Sentry não configurado — erro capturado localmente:", erro, contexto);
}

/**
 * Identifica a conta nos próximos eventos: o `AutenticacaoProvider` chama ao entrar ou restaurar a
 * sessão e limpa ao sair. Envia só o `id`, nunca nome ou e-mail.
 */
export function definirUsuarioObservabilidade(usuarioId: string | null): void {
  if (!ativo) return;
  Sentry.setUser(usuarioId ? { id: usuarioId } : null);
}
