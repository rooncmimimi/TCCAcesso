import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lista dos requisitos de senha, marcada em tempo real conforme a pessoa digita.
 *
 * As mesmas cinco regras de `regrasSenha` no backend (`validators/autenticacaoValidator.js`), para
 * a tela nunca prometer algo que a API vai recusar.
 *
 * Acessibilidade: o estado de cada item não depende de cor — há ícone e, para leitor de tela, as
 * palavras "atendido"/"ainda não atendido". A lista inteira fica numa região `aria-live="polite"`,
 * então quem usa leitor ouve o requisito ser atendido sem precisar sair do campo de senha. É
 * `polite` de propósito: `assertive` interromperia a digitação a cada tecla.
 */

const REQUISITOS = [
  { rotulo: "Pelo menos 8 caracteres", testar: (s: string) => s.length >= 8 && s.length <= 72 },
  { rotulo: "Uma letra maiúscula", testar: (s: string) => /[A-Z]/.test(s) },
  { rotulo: "Uma letra minúscula", testar: (s: string) => /[a-z]/.test(s) },
  { rotulo: "Um número", testar: (s: string) => /\d/.test(s) },
  { rotulo: "Um caractere especial", testar: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const;

export function RequisitosSenha({
  id,
  senha,
  rotulos,
  atendidoTexto = "atendido",
  pendenteTexto = "ainda não atendido",
}: {
  id: string;
  senha: string;
  /** Os cinco rótulos no idioma escolhido, na mesma ordem das regras. */
  rotulos?: readonly string[];
  atendidoTexto?: string;
  pendenteTexto?: string;
}) {
  return (
    <ul id={id} aria-live="polite" className="space-y-1.5">
      {REQUISITOS.map((requisito, indice) => {
        const atendido = requisito.testar(senha);
        const rotulo = rotulos?.[indice] ?? requisito.rotulo;

        return (
          <li key={requisito.rotulo} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                atendido ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {atendido ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            </span>
            <span className={atendido ? "font-medium text-foreground" : "text-muted-foreground"}>
              {rotulo}
            </span>
            <span className="sr-only">{atendido ? atendidoTexto : pendenteTexto}</span>
          </li>
        );
      })}
    </ul>
  );
}
