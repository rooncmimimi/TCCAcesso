import { Languages } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { IDIOMAS, ehIdioma } from "./tipos";
import { useIdioma, useT } from "./useT";

/**
 * Seletor de idioma do Site, presente no topo das páginas.
 *
 * Tem rótulo (escondido só visualmente) além do ícone, e cada idioma aparece no próprio nome —
 * quem não lê o idioma atual precisa reconhecer o seu sem depender da tradução. A troca vale na
 * hora, em todas as telas, sem recarregar.
 */
export function SeletorIdioma({
  className,
  id = "seletor-idioma",
  compacto = false,
}: {
  className?: string;
  id?: string;
  /** Só a sigla (PT, EN, ES), para cabeçalhos apertados. O nome completo continua no rótulo. */
  compacto?: boolean;
}) {
  const { idioma, definir } = useIdioma();
  const t = useT();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Languages className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Label htmlFor={id} className="sr-only">
        {t.comum.idioma}
      </Label>
      <Select value={idioma} onValueChange={(valor) => ehIdioma(valor) && definir(valor)}>
        <SelectTrigger
          id={id}
          className={compacto ? "h-10 w-auto gap-1 px-2" : "h-10 w-[8.5rem] sm:w-[9.5rem]"}
          aria-label={t.comum.idioma}
        >
          <SelectValue>{compacto ? idioma.toUpperCase() : undefined}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {IDIOMAS.map((item) => (
            <SelectItem key={item.codigo} value={item.codigo} lang={item.htmlLang}>
              {item.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
