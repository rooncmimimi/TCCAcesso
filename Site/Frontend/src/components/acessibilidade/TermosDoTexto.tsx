import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import { termosNoTexto } from "@/dados/glossario";

/**
 * Dica de glossário junto do texto: se o texto usa termos que o glossário explica (CLT, PJ, home
 * office...), mostra "Termos deste texto" logo abaixo, fechado por padrão. Usa o `<details>` nativo,
 * que já funciona com teclado e leitor de tela. Não altera o texto original nem decide nada pela
 * pessoa, só explica palavras.
 */
export function TermosDoTexto({ texto }: { texto: string | null | undefined }) {
  const termos = termosNoTexto(texto ?? "");
  if (termos.length === 0) return null;

  return (
    <details className="mt-2 rounded-lg border border-border bg-muted/30 text-sm">
      <summary className="min-h-11 cursor-pointer px-3 py-2.5 font-semibold text-primary">
        Termos deste texto ({termos.map((t) => t.termo).join(", ")})
      </summary>
      <ul className="space-y-3 border-t border-border px-3 py-3">
        {termos.map((termo) => (
          <li key={termo.id}>
            <TextoOuvivel rotulo={`Ouvir a explicação de ${termo.termo}`}>
              <p>
                <span className="font-semibold">{termo.termo}:</span> {termo.explicacao}
              </p>
              {termo.exemplo ? <p className="mt-1 text-muted-foreground">Exemplo: {termo.exemplo}</p> : null}
            </TextoOuvivel>
          </li>
        ))}
      </ul>
    </details>
  );
}
