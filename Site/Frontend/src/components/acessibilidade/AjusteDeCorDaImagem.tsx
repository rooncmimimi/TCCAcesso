import { useId } from "react";
import { Eye } from "lucide-react";

import { Label } from "@/components/ui/label";
import { useIdioma } from "@/hooks/useIdioma";
import { AJUSTES } from "@/lib/ajusteDeCorDaImagem";

/**
 * Ajuste de cor **de uma imagem só**, ligado por quem está olhando.
 *
 * O que ele é, exatamente:
 *
 * - **nunca automático.** Nada acontece sem a pessoa escolher. Foto de gente, logotipo e capa
 *   continuam como são — mexer na aparência de alguém ou na identidade de uma empresa sem pedir
 *   seria outro problema, não uma solução;
 * - **nunca toca no arquivo.** É um filtro de pintura do navegador (`filter: url(#...)`), aplicado
 *   na hora de desenhar. O arquivo no Storage não muda, nada é reenviado, e "Original" devolve a
 *   imagem num clique. Funciona até em imagem de outro domínio, porque não lê pixel nenhum;
 * - **não corrige a visão de ninguém.** Dois dos ajustes são ferramentas de leitura (mais cor, ou
 *   nenhuma cor). Os três de simulação servem para quem PUBLICA conferir a própria imagem, e são
 *   aproximações — não reproduzem como outra pessoa enxerga, e não substituem perguntar a ela.
 */

/** Os filtros declarados, num `<svg>` sem tamanho. Precisa estar no documento para o `url(#)` achar. */
export function FiltrosDeCor({ prefixo }: { prefixo: string }) {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
      <defs>
        {AJUSTES.filter((a) => a.matriz || a.saturacao !== undefined).map((a) => (
          <filter id={`${prefixo}-${a.id}`} key={a.id} colorInterpolationFilters="sRGB">
            {a.matriz ? (
              <feColorMatrix type="matrix" values={a.matriz} />
            ) : (
              <feColorMatrix type="saturate" values={String(a.saturacao)} />
            )}
          </filter>
        ))}
      </defs>
    </svg>
  );
}

/** O seletor. Fica fechado numa linha só: quem não precisa dele nem repara. */
export function SeletorDeAjusteDeCor({
  valor,
  aoMudar,
  idDaImagem,
}: {
  valor: string;
  aoMudar: (id: string) => void;
  /** O que o filtro vai afetar, para o rótulo dizer de que imagem se trata. */
  idDaImagem?: string;
}) {
  const { t } = useIdioma();
  const id = useId();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold">
        <Eye className="size-3.5" aria-hidden="true" />
        {t("acessibilidade.ajusteDeCorDaImagem.verCoresDesta")}
      </Label>
      <select
        id={id}
        value={valor}
        aria-describedby={idDaImagem}
        onChange={(e) => aoMudar(e.target.value)}
        className="min-h-9 rounded-md border border-input bg-background px-2 text-xs"
      >
        {AJUSTES.map((a) => (
          <option key={a.id} value={a.id}>
            {t(a.rotulo)}
          </option>
        ))}
      </select>
    </div>
  );
}
