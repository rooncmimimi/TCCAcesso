import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { CampoAjuda } from "@/components/cadastro/CampoAjuda";
import { MarcaObrigatorio } from "@/components/cadastro/MarcaObrigatorio";

/**
 * Um campo do cadastro: rótulo permanente, controle, caixa de ajuda e mensagem de erro.
 *
 * Existe para a ligação de acessibilidade ser sempre a mesma e nunca depender de alguém lembrar:
 * o rótulo é um `<label for>` de verdade (nunca placeholder), o erro tem `role="alert"` e a função
 * `descricao` (em `descricao.ts`) devolve o `aria-describedby` já na ordem certa — erro primeiro,
 * ajuda depois —, que é a ordem em que o leitor de tela deve ouvir.
 */
export function Campo({
  id,
  rotulo,
  ajuda,
  erro,
  acao,
  obrigatorio,
  dicaObrigatorio,
  children,
}: {
  id: string;
  rotulo: string;
  /** Explicação curta de por que o dado é pedido. Some quando não é necessária. */
  ajuda?: ReactNode;
  erro?: string;
  /** Link alinhado à direita do rótulo, como o "Esqueceu a senha?" do login. */
  acao?: ReactNode;
  /** Acrescenta o asterisco com a dica "Campo obrigatório" ao lado do rótulo. */
  obrigatorio?: boolean;
  /** Texto da dica, no idioma escolhido. */
  dicaObrigatorio?: string;
  /** O controle, que recebe `id` e `aria-describedby={descricao(id, ajuda, erro)}`. */
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-semibold">
          {rotulo}
          {obrigatorio && <MarcaObrigatorio texto={dicaObrigatorio} />}
        </Label>
        {acao}
      </div>

      {children}

      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {ajuda && <CampoAjuda id={`${id}-ajuda`}>{ajuda}</CampoAjuda>}
    </div>
  );
}
