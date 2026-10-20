import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";

/**
 * Campo de senha com botão de mostrar e ocultar, usado em todos os campos de senha do Site. O botão
 * fica dentro do campo, sem mudar o layout, e vem logo depois dele na ordem de tabulação (sem
 * `tabIndex`), para quem usa só o teclado também conferir a senha (WCAG 2.1.1).
 */
type PropsSenha = Omit<React.ComponentProps<"input">, "type"> & {
  /** Rótulos do botão; sem eles, usa os do dicionário no idioma escolhido. */
  rotuloMostrar?: string;
  rotuloOcultar?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PropsSenha>(
  ({ className, rotuloMostrar, rotuloOcultar, ...props }, ref) => {
    const t = useT().comum;
    const [visivel, setVisivel] = React.useState(false);
    const mostrar = rotuloMostrar ?? t.mostrarSenha;
    const ocultar = rotuloOcultar ?? (rotuloMostrar ? rotuloMostrar : t.ocultarSenha);

    return (
      <div className="relative">
        <Input
          type={visivel ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisivel((atual) => !atual)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-r-md"
          aria-label={visivel ? ocultar : mostrar}
          aria-pressed={visivel}
        >
          {visivel ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
