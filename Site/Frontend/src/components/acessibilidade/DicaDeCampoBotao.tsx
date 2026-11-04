import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import { DICAS_DE_CAMPO, type ChaveDeDica } from "@/dados/dicasDeCampo";

/**
 * Assistente de preenchimento: um botão "Como preencher" ao lado do nome do campo, que abre uma
 * orientação curta com um exemplo. O exemplo é só para ler (e ouvir): **nunca** é colocado no campo,
 * e o componente não lê nem escreve nada do que a pessoa digitou.
 */
export function DicaDeCampoBotao({ dica, nomeDoCampo }: { dica: ChaveDeDica; nomeDoCampo: string }) {
  const [aberta, setAberta] = useState(false);
  const idDoPainel = useId();
  const { orientacao, passos, exemplo } = DICAS_DE_CAMPO[dica];

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 gap-1 px-2 text-xs font-semibold text-primary"
        aria-expanded={aberta}
        aria-controls={idDoPainel}
        onClick={() => setAberta((v) => !v)}
      >
        <CircleHelp className="size-4" aria-hidden="true" />
        Como preencher<span className="sr-only">: {nomeDoCampo}</span>
      </Button>

      <div id={idDoPainel} hidden={!aberta} role="note" className="basis-full rounded-lg border border-border bg-muted/40 p-3 text-sm">
        {aberta && (
          <TextoOuvivel rotulo={`Ouvir a orientação: ${nomeDoCampo}`}>
            <p>{orientacao}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {passos.map((passo) => (
                <li key={passo}>{passo}</li>
              ))}
            </ul>
            <p className="mt-2">
              <span className="font-semibold">Exemplo (invente o seu, este é só uma ilustração): </span>
              {exemplo}
            </p>
          </TextoOuvivel>
        )}
      </div>
    </>
  );
}
