/** Peças usadas pela lista e pela tela de um tutorial da Central de Ajuda. */
import { Link } from "@tanstack/react-router";
import { ChevronDown, Mail } from "lucide-react";

import type { PerguntaFrequente } from "@/dados/perguntasAjuda";
import type { Publico, Tutorial } from "@/dados/tutoriaisAjuda";
import { useIdioma } from "@/hooks/useIdioma";

/** O cartão inteiro é o link: um alvo grande, sem "saiba mais" repetido em cada um. */
export function CartaoDeTutorial({ tutorial, publico }: { tutorial: Tutorial; publico: Publico }) {
  const { t } = useIdioma();
  const Icone = tutorial.icone;

  return (
    <li className="flex">
      <Link
        to="/ajuda"
        search={{ tema: tutorial.tema, publico }}
        className="group flex w-full gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
      >
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icone className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-base font-bold group-hover:underline">{t(tutorial.titulo)}</span>
          <span className="text-sm text-muted-foreground">{t(tutorial.resumo)}</span>
          <span className="mt-auto pt-1 text-xs font-semibold text-primary">
            {t("ajuda.quantosPassos", { var1: tutorial.passos.length })}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Perguntas em `<details>` nativo: abre e fecha por teclado e por toque, e o leitor de tela anuncia o
 * estado, sem nada escrito à mão para isso.
 */
export function ListaDePerguntas({
  perguntas,
  publico,
  abertas = false,
  temaAtual,
}: {
  perguntas: readonly PerguntaFrequente[];
  publico: Publico;
  /** Nos resultados da busca a resposta já vem aberta: a pessoa procurou por ela. */
  abertas?: boolean;
  /** Dentro de um tutorial, o link para o próprio tutorial não faz sentido. */
  temaAtual?: string;
}) {
  const { t } = useIdioma();

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {perguntas.map((item) => (
        // A chave muda com `abertas` para o estado aberto/fechado recomeçar ao entrar e sair da busca.
        <details key={`${item.id}-${abertas}`} open={abertas} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            {t(item.pergunta)}
            <ChevronDown className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-2 px-5 pb-4 text-sm">
            <p>{t(item.resposta)}</p>
            {item.tema && item.tema !== temaAtual ? (
              <Link
                to="/ajuda"
                search={{ tema: item.tema, publico }}
                className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2"
              >
                {t("ajuda.verPassoAPasso")}
              </Link>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}

export function PrecisaDeMais() {
  const { t } = useIdioma();

  return (
    <section
      aria-labelledby="ajuda-contato"
      className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary p-6 text-primary-foreground"
    >
      <div>
        <h2 id="ajuda-contato" className="text-lg font-bold">
          {t("ajuda.naoResolveu")}
        </h2>
        <p className="mt-1 text-sm">{t("ajuda.naoResolveuTexto")}</p>
      </div>
      <Link
        to="/fale-conosco"
        className="inline-flex min-h-12 items-center gap-2 rounded-md bg-background px-5 font-semibold text-foreground"
      >
        <Mail className="size-4" aria-hidden="true" /> {t("ajuda.falarComAEquipe")}
      </Link>
    </section>
  );
}
