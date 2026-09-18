import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Layout das páginas de autenticação (entrar, cadastro, recuperar e redefinir senha, confirmar
 * e-mail): cartão centralizado, fora do `EstruturaApp`, porque ainda não há sessão.
 *
 * Tem o link "Pular para o conteúdo principal" (WCAG 2.4.1), como o `EstruturaApp` e a página
 * inicial: mesmo com poucos links antes do formulário (logo e "Configurações de acessibilidade"),
 * eles se repetem em todas essas páginas.
 */
export function AutenticacaoLayout({
  children,
  className,
}: {
  children: ReactNode;
  /**
   * Sobrepõe a largura máxima padrão (`max-w-md`); o cadastro, por exemplo, usa `max-w-lg` por ter
   * dois formulários possíveis.
   */
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
