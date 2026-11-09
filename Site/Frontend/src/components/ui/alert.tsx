import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        // Nestas três o texto fica na cor normal e quem dá o sentido são a borda, o fundo tingido
        // e o ícone que quem chama passa — nunca a cor sozinha (WCAG 1.4.1). O texto na cor do
        // estado sobre o fundo tingido do mesmo estado perderia contraste.
        success: "border-success/60 bg-success/10 text-foreground",
        warning: "border-warning bg-warning/15 text-foreground",
        info: "border-info/60 bg-info/10 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  // `data-variant`: o modo para daltonismo (globals.css) usa isto para reforçar erro e aviso com
  // um símbolo quando o aviso não traz ícone próprio.
  <div
    ref={ref}
    role="alert"
    data-variant={variant ?? "default"}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

/**
 * Título do aviso. É um parágrafo em negrito, **não** um título de seção: o `Alert` já tem `role="alert"`, que faz
 * o leitor de tela anunciar o aviso inteiro, e um aviso de erro não é uma seção da página. Como `<h5>` (o padrão
 * que veio da biblioteca), ele entrava no índice de títulos logo depois do `<h1>` da página e quebrava a ordem
 * (h1 → h5), que o axe aponta e que atrapalha quem navega de título em título.
 */
const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
