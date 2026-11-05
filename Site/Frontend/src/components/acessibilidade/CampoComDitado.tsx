import { useId } from "react";

import { Textarea } from "@/components/ui/textarea";
import { PainelDeDitado } from "@/components/acessibilidade/PainelDeDitado";

type Props = {
  id: string;
  valor: string;
  aoMudar: (valor: string) => void;
  rows?: number;
  maxLength?: number;
  /** Texto de ajuda sob o campo. */
  ajuda?: string;
};

/**
 * Campo de texto com ditado. O texto reconhecido NÃO entra no campo sozinho: aparece numa área de
 * revisão, com as correções sugeridas pelo vocabulário do ACESSO (uma a uma, sempre com motivo, e só
 * se a pessoa aceitar), e só é inserido quando ela confirma. Sem suporte do navegador, mostra o
 * caminho alternativo (o ditado do próprio sistema) em vez de um botão que não funciona.
 */
export function CampoComDitado({ id, valor, aoMudar, rows = 4, maxLength, ajuda }: Props) {
  const idBase = useId();

  function inserir(texto: string) {
    const separador = valor && !valor.endsWith(" ") && !valor.endsWith("\n") ? " " : "";
    const novo = `${valor}${separador}${texto}`;

    aoMudar(maxLength ? novo.slice(0, maxLength) : novo);
  }

  return (
    <div className="space-y-2">
      <Textarea id={id} rows={rows} maxLength={maxLength} value={valor} onChange={(e) => aoMudar(e.target.value)} aria-describedby={ajuda ? `${idBase}-ajuda` : undefined} />
      {ajuda ? (
        <p id={`${idBase}-ajuda`} className="text-xs text-muted-foreground">
          {ajuda}
        </p>
      ) : null}

      <PainelDeDitado aoInserir={inserir} />
    </div>
  );
}
