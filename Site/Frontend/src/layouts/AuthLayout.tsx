import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Layout compartilhado das páginas de autenticação (entrar, cadastro,
 * recuperar/redefinir senha, confirmar e-mail) — cartão centralizado,
 * fora do `AppShell` (não há sessão ainda nessas telas).
 *
 * Auditoria de acessibilidade (Rodada 3): nenhuma destas 5 páginas tinha
 * link "Pular para o conteúdo principal" — o `AppShell` (páginas
 * autenticadas) e a home já tinham (WCAG 2.4.1, Bypass Blocks), mas quem
 * ainda não tem conta, a primeira coisa que a plataforma pede, ironicamente
 * ficava sem esse recurso. Mesmo com poucos links antes do formulário
 * (logo + "Configurações de acessibilidade"), o critério vale para
 * qualquer bloco repetido entre páginas — os dois já se repetem em todas
 * as 5. Mesmo padrão visual/técnico do `AppShell.tsx`, não uma segunda
 * implementação.
 */
export function AuthLayout({
  children,
  className,
}: {
  children: ReactNode;
  /** Sobrepõe a largura máxima padrão (`max-w-md`) — ex.: cadastro usa `max-w-lg` (dois formulários possíveis). */
  className?: string;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-secondary px-4 py-10">
      <a
        href="#conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Pular para o conteúdo principal
      </a>
      <div id="conteudo" tabIndex={-1} className={cn("w-full max-w-md outline-none", className)}>
        {children}
      </div>
    </div>
  );
}
