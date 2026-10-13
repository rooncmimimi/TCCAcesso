import { useId, useState } from "react";

/**
 * O asterisco que marca um campo obrigatório, com a dica "Campo obrigatório".
 *
 * A dica aparece de três formas, porque depender só do hover deixaria de fora quem usa teclado e
 * quem usa toque: `mouseenter`/`mouseleave` para mouse, `focus`/`blur` para teclado e `click` para
 * toque (no celular o toque gera foco, e o clique alterna a dica, então ela também fecha no
 * segundo toque).
 *
 * Para leitor de tela o asterisco em si é decorativo (`aria-hidden`): quem anuncia a obrigatoriedade
 * é o `aria-label` do botão e, principalmente, o `required`/`aria-required` do próprio campo. O
 * asterisco nunca é a única pista — o campo é obrigatório no HTML, no zod e no backend.
 */
export function MarcaObrigatorio({ texto = "Campo obrigatório" }: { texto?: string }) {
  const dicaId = useId();
  const [visivel, setVisivel] = useState(false);

  return (
    <span className="relative inline-block align-baseline">
      <button
        type="button"
        aria-label={texto}
        aria-describedby={visivel ? dicaId : undefined}
        className="cursor-help px-0.5 font-bold text-destructive focus-visible:rounded-sm"
        onMouseEnter={() => setVisivel(true)}
        onMouseLeave={() => setVisivel(false)}
        onFocus={() => setVisivel(true)}
        onBlur={() => setVisivel(false)}
        onClick={() => setVisivel((atual) => !atual)}
      >
        <span aria-hidden="true">*</span>
      </button>

      {visivel && (
        <span
          id={dicaId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-1 w-max max-w-[12rem] -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md"
        >
          {texto}
        </span>
      )}
    </span>
  );
}

/** Legenda do topo do formulário, explicando o asterisco antes de ele aparecer nos campos. */
export function LegendaObrigatorio({ texto = "Campo obrigatório" }: { texto?: string }) {
  return (
    <p className="mb-6 text-sm text-muted-foreground">
      <span aria-hidden="true" className="font-bold text-destructive">
        *
      </span>{" "}
      {texto}
    </p>
  );
}
