import { useRef, type ReactNode } from "react";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLeituraDestacada } from "@/hooks/useLeituraDestacada";
import { useVoz } from "@/hooks/useVoz";
import { cn } from "@/lib/utils";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Um bloco de texto com o botão "Ouvir" ao lado: lê o conteúdo em voz alta com a palavra atual
 * destacada (`useLeituraDestacada`). O botão fica fora do conteúdo lido, para a voz não dizer
 * "Ouvir" no meio do texto. Funciona com ou sem a opção "Leitura por voz" ligada, porque é um pedido
 * explícito da pessoa. Navegador sem `speechSynthesis`: o botão não aparece.
 */
export function TextoOuvivel({
  rotulo,
  children,
  className,
}: {
  /** Nome acessível do botão, por exemplo "Ouvir a descrição da vaga". */
  rotulo: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useIdioma();
  const conteudo = useRef<HTMLDivElement>(null);
  const { suportado } = useVoz();
  const { ler } = useLeituraDestacada();

  return (
    <div className={cn(className)}>
      <div ref={conteudo}>{children}</div>
      {suportado && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 min-h-11 gap-1.5 px-2 text-xs font-semibold text-primary"
          aria-label={rotulo}
          onClick={() => {
            if (conteudo.current) ler(conteudo.current);
          }}
        >
          <Volume2 className="size-4" aria-hidden="true" /> {t("acessibilidade.textoOuvivel.ouvir")}
        </Button>
      )}
    </div>
  );
}
