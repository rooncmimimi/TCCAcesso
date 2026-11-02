import { forwardRef, type ComponentProps } from "react";

import { ESTADOS_BR } from "@/dados/estados";
import { cn } from "@/lib/utils";

/**
 * Seleção do estado brasileiro pela sigla. É um `<select>` nativo de propósito: funciona por teclado, por
 * leitor de tela e em celular sem nenhum código a mais, e a sigla que sai é a que o servidor aceita.
 *
 * Só serve para quem mora no Brasil; para os demais países o formulário continua com o campo de 2 letras.
 * O estilo acompanha o `Input`, para os dois campos parecerem da mesma família.
 */
export const EstadoSelect = forwardRef<HTMLSelectElement, ComponentProps<"select"> & { placeholder?: string }>(
  ({ className, placeholder = "Selecione", ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    >
      <option value="">{placeholder}</option>
      {ESTADOS_BR.map((estado) => (
        <option key={estado.sigla} value={estado.sigla}>
          {estado.sigla} — {estado.nome}
        </option>
      ))}
    </select>
  ),
);
EstadoSelect.displayName = "EstadoSelect";
