import { Languages } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IDIOMAS, type CodigoIdioma } from "@/components/cadastro/idioma";

/**
 * Seletor de idioma do cadastro, no topo da página.
 *
 * Troca os textos do fluxo na hora, sem recarregar e sem gravar nada: a escolha vive só enquanto o
 * cadastro durar. Tem rótulo visível (não só o ícone) porque quem não lê português precisa achar
 * este controle justamente antes de entender o resto da tela.
 */
export function SeletorIdioma({
  idioma,
  aoTrocar,
  rotulo,
}: {
  idioma: CodigoIdioma;
  aoTrocar: (novo: CodigoIdioma) => void;
  rotulo: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Languages className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Label htmlFor="idioma-cadastro" className="sr-only">
        {rotulo}
      </Label>
      <Select value={idioma} onValueChange={(valor) => aoTrocar(valor as CodigoIdioma)}>
        <SelectTrigger id="idioma-cadastro" className="h-10 w-[8.5rem] sm:w-[9.5rem]" aria-label={rotulo}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IDIOMAS.map((item) => (
            <SelectItem key={item.codigo} value={item.codigo}>
              {item.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
