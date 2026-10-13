import type { ReactNode } from "react";

/**
 * Caixa de ajuda logo abaixo de um campo, explicando por que aquele dado é pedido.
 *
 * Não é um aviso de erro: usa o tom suave da marca (`--primary-soft`), fica sempre visível e é
 * ligada ao campo por `aria-describedby`, então o leitor de tela lê a explicação junto do rótulo.
 * Quando o campo também tem erro, o `aria-describedby` do campo cita os dois ids, nesta ordem:
 * erro primeiro, ajuda depois.
 */
export function CampoAjuda({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-foreground">
      {children}
    </p>
  );
}
