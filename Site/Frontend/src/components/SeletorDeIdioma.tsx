import { useId } from "react";
import { Languages } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIdioma } from "@/hooks/useIdioma";
import { IDIOMAS, ehIdioma } from "@/i18n/idiomas";
import { cn } from "@/lib/utils";

/**
 * O seletor de idioma do site, igual em todo lugar (cabeçalho, login, cadastro, configurações).
 *
 * Troca os textos na hora, sem recarregar, e guarda a escolha (no aparelho e, com sessão, na conta). Tem rótulo de verdade
 * (invisível, mas lido por leitor de tela) além do ícone, e cada idioma aparece escrito nele mesmo ("English"): quem não lê
 * português precisa reconhecer o controle justamente antes de entender o resto da tela.
 */
export function SeletorDeIdioma({ className }: { className?: string }) {
  const { idioma, trocar, t } = useIdioma();
  const id = useId();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Languages className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Label htmlFor={id} className="sr-only">
        {t("idioma.escolher")}
      </Label>
      <Select value={idioma} onValueChange={(valor) => ehIdioma(valor) && trocar(valor)}>
        <SelectTrigger id={id} className="h-10 w-[8.5rem] sm:w-[9.5rem]" aria-label={t("idioma.escolher")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IDIOMAS.map((item) => (
            <SelectItem key={item.codigo} value={item.codigo} lang={item.locale}>
              {item.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
