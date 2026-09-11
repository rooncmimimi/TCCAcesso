import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Campo de senha com botão de mostrar/ocultar (item 8/9 da auditoria do
 * Site — todo campo de senha da plataforma usa este componente, em vez de
 * cada tela reimplementar o próprio estado de visibilidade).
 *
 * O botão fica DENTRO do campo (não altera o layout ao redor de quem já
 * usa `<Input type="password" />`) e é alcançável por teclado logo depois
 * do campo na ordem natural do DOM — sem `tabIndex`, quem navega só por
 * teclado também consegue conferir a senha digitada (WCAG 2.1.1).
 */
const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(
  ({ className, ...props }, ref) => {
    const [visivel, setVisivel] = React.useState(false);

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
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
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
