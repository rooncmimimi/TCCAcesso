import * as Sentry from "@sentry/react-native";

import { SENTRY_DSN } from "../config/env";

/**
 * Único lugar do app que fala com o Sentry (Fase 25). Sempre opcional —
 * `SENTRY_DSN` (config/env.ts) é `null` sem `.env` configurado, e neste
 * caso `inicializarObservabilidade` nem chama `Sentry.init`: nenhuma tela/
 * serviço depende deste recurso pra funcionar (mesmo raciocínio já usado
 * para `OPENROUTER_API_KEY` no Backend). O flag `ativo` abaixo é a fonte de
 * verdade LOCAL de "o Sentry foi de fato inicializado" — nunca presume o
 * comportamento do SDK sem isso (não confirmado nesta sessão se
 * `captureException` antes de `init` é seguro em toda versão).
 *
 * Deliberadamente FORA do escopo desta fase (pendência, não fabricado):
 * upload de source maps durante o build (exige `organization`/`project`/
 * `SENTRY_AUTH_TOKEN` de uma conta Sentry real, mesma classe de bloqueio já
 * documentada para `EXPO_TOKEN`/`eas init` na Fase 24) — sem isso, o
 * Sentry ainda recebe e agrupa os erros normalmente, só que com o stack
 * trace apontando pro bundle minificado em vez do código-fonte legível.
 */
let ativo = false;

export function inicializarObservabilidade(): void {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    // Volume moderado de propósito — sem uma conta real pra calibrar
    // contra tráfego de verdade, mais alto que isso arriscaria estourar
    // cota de um plano gratuito só com navegação normal.
    tracesSampleRate: 0.2,
  });
  ativo = true;
}

/**
 * Reporta um erro capturado (nunca um crash não tratado — esse é o
 * `ErrorBoundary`, ver `ErrorBoundary.tsx`). Sempre seguro de chamar mesmo
 * sem `inicializarObservabilidade` ter sido chamada ou sem DSN configurado
 * — vira só um `console.error` local, a única exceção deliberada à regra
 * de "nunca console.*" do resto do app: o próprio propósito deste módulo é
 * garantir que um erro SEMPRE apareça em algum lugar, mesmo sem Sentry.
 */
export function capturarErro(erro: unknown, contexto?: Record<string, unknown>): void {
  if (ativo) {
    Sentry.captureException(erro, contexto ? { extra: contexto } : undefined);
    return;
  }

  console.error("[observabilidade] Sentry não configurado — erro capturado localmente:", erro, contexto);
}

/** Identifica o usuário atual nos próximos eventos — chamado pelo `AuthProvider` no login/restauração de sessão, limpo no logout. Nunca inclui nome/e-mail: só o `id`, o suficiente pra cruzar relatos da mesma conta sem mandar dado pessoal pro Sentry. */
export function definirUsuarioObservabilidade(usuarioId: string | null): void {
  if (!ativo) return;
  Sentry.setUser(usuarioId ? { id: usuarioId } : null);
}
