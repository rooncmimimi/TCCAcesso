import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronRight, ClipboardCheck, ZoomIn } from "lucide-react";

import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import { ListaDePerguntas, PrecisaDeMais } from "@/components/ajuda/PecasDaAjuda";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { perguntasDe } from "@/dados/perguntasAjuda";
import { imagemDoPrint, tutoriaisDe, type PrintDoPasso, type Publico, type Tutorial } from "@/dados/tutoriaisAjuda";
import { useIdioma } from "@/hooks/useIdioma";

/** Altura que um print comprido procura não passar, sem ficar estreito a ponto de não se ler. */
const ALTURA_MAXIMA = 560;
const LARGURA_MINIMA = 360;

/**
 * Um tutorial: onde a pessoa está, o que separar antes, os passos (cada um pode ser ouvido), as
 * perguntas sobre o assunto, o botão para a tela de verdade e o próximo tutorial da área.
 */
export function TutorialDeAjuda({
  tutorial,
  publico,
  tituloRef,
}: {
  tutorial: Tutorial;
  publico: Publico;
  tituloRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const { t } = useIdioma();
  const daArea = tutoriaisDe(publico);
  const posicao = daArea.findIndex((x) => x.tema === tutorial.tema);
  const anterior = daArea[posicao - 1];
  const proximo = daArea[posicao + 1];
  const perguntas = perguntasDe(publico).filter((p) => p.tema === tutorial.tema);

  return (
    <>
      <nav aria-label={t("ajuda.voceEstaEm")}>
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          <li>
            <Link to="/ajuda" search={{ publico }} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline">
              {t("ajuda.link")}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            <Link to="/ajuda" search={{ publico }} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline">
              {t(publico === "empresa" ? "ajuda.paraEmpresas" : "ajuda.paraCandidatos")}
            </Link>
          </li>
          <li className="flex items-center gap-1 text-muted-foreground" aria-current="page">
            <ChevronRight className="size-4" aria-hidden="true" />
            {t(tutorial.titulo)}
          </li>
        </ol>
      </nav>

      <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="min-w-0">
          <h1 ref={tituloRef} tabIndex={-1} className="text-3xl font-extrabold outline-none">
            {t(tutorial.titulo)}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{t(tutorial.resumo)}</p>
          <p className="mt-1 text-sm font-semibold text-primary">{t("ajuda.quantosPassos", { var1: tutorial.passos.length })}</p>

          {tutorial.antes ? (
            <section aria-labelledby="ajuda-antes" className="mt-5 rounded-xl border-2 border-primary/30 bg-primary-soft/40 p-4">
              <h2 id="ajuda-antes" className="flex items-center gap-2 text-base font-bold">
                <ClipboardCheck className="size-5 shrink-0 text-primary" aria-hidden="true" /> {t("ajuda.antesDeComecar")}
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
                {tutorial.antes.map((chave) => (
                  <li key={chave}>{t(chave)}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <ol className="mt-6 space-y-6">
            {tutorial.passos.map((passo, indice) => (
              <li key={passo.texto} id={`passo-${indice + 1}`} className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 sm:p-5">
                <p aria-hidden="true" className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">{indice + 1}</span>
                  {t("ajuda.passoDe", { var1: indice + 1, var2: tutorial.passos.length })}
                </p>
                <TextoOuvivel rotulo={t("ajuda.ouvirPasso", { var1: indice + 1 })}>
                  <p className="text-base leading-relaxed">{t(passo.texto)}</p>
                </TextoOuvivel>
                {passo.print ? <ImagemDoPasso print={passo.print} numero={indice + 1} /> : null}
              </li>
            ))}
          </ol>

          {tutorial.observacao ? <p className="mt-6 text-sm text-muted-foreground">{t(tutorial.observacao)}</p> : null}

          <Button asChild className="mt-8 min-h-12 gap-2 text-base">
            <Link to={tutorial.acao.para}>
              {t(tutorial.acao.rotulo)} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>

          {perguntas.length > 0 ? (
            <section aria-labelledby="ajuda-sobre-isso" className="mt-10">
              <h2 id="ajuda-sobre-isso" className="mb-3 text-xl font-bold">
                {t("ajuda.perguntasSobreIsso")}
              </h2>
              <ListaDePerguntas perguntas={perguntas} publico={publico} temaAtual={tutorial.tema} />
            </section>
          ) : null}

          <nav aria-label={t("ajuda.outrosTutoriais")} className="mt-10 grid gap-3 sm:grid-cols-2">
            {anterior ? <Vizinho tutorial={anterior} publico={publico} sentido="anterior" /> : <span className="hidden sm:block" />}
            {proximo ? <Vizinho tutorial={proximo} publico={publico} sentido="proximo" /> : null}
          </nav>
        </article>

        {/* Em tela larga fica ao lado e acompanha a rolagem; em tela estreita vai para o fim. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label={t("ajuda.nestaArea")} className="rounded-xl border border-border bg-card p-3">
            <p className="px-2 pb-1 text-sm font-bold">{t("ajuda.nestaArea")}</p>
            <ul>
              {daArea.map((item) => {
                const atual = item.tema === tutorial.tema;
                return (
                  <li key={item.tema}>
                    <Link
                      to="/ajuda"
                      search={{ tema: item.tema, publico }}
                      aria-current={atual ? "page" : undefined}
                      className={
                        atual
                          ? "flex min-h-11 items-center rounded-md bg-primary-soft px-2 text-sm font-bold text-primary"
                          : "flex min-h-11 items-center rounded-md px-2 text-sm hover:bg-muted"
                      }
                    >
                      {t(item.titulo)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      </div>

      <PrecisaDeMais />
    </>
  );
}

/** O print do passo, com o botão que o abre grande, na própria página (sem perder o lugar). */
function ImagemDoPasso({ print, numero }: { print: PrintDoPasso; numero: number }) {
  const { t, idioma } = useIdioma();
  const imagem = imagemDoPrint(print.nome, idioma);
  const larguraMaxima = Math.min(imagem.largura, Math.max(LARGURA_MINIMA, Math.round((ALTURA_MAXIMA * imagem.largura) / imagem.altura)));

  return (
    <figure className="mt-3 space-y-1">
      <img
        src={imagem.src}
        alt={t(print.alt)}
        width={imagem.largura}
        height={imagem.altura}
        loading="lazy"
        decoding="async"
        style={{ maxWidth: `min(100%, ${larguraMaxima}px)` }}
        className="h-auto w-full rounded-lg border border-border bg-background shadow-sm"
      />
      <figcaption>
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" className="min-h-11 gap-1.5 px-2 text-sm font-semibold text-primary">
              <ZoomIn className="size-4" aria-hidden="true" />
              {t("ajuda.ampliarImagem", { var1: numero })}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] w-[min(96vw,72rem)] max-w-none overflow-auto">
            <DialogHeader>
              <DialogTitle>{t("ajuda.imagemDoPasso", { var1: numero })}</DialogTitle>
              <DialogDescription>{t(print.alt)}</DialogDescription>
            </DialogHeader>
            <img src={imagem.src} alt="" width={imagem.largura} height={imagem.altura} className="mx-auto h-auto max-w-full rounded-lg border border-border" />
          </DialogContent>
        </Dialog>
      </figcaption>
    </figure>
  );
}

function Vizinho({ tutorial, publico, sentido }: { tutorial: Tutorial; publico: Publico; sentido: "anterior" | "proximo" }) {
  const { t } = useIdioma();
  const proximo = sentido === "proximo";

  return (
    <Link
      to="/ajuda"
      search={{ tema: tutorial.tema, publico }}
      className={`group flex min-h-16 flex-col justify-center rounded-xl border border-border bg-card px-4 py-3 hover:border-primary ${proximo ? "sm:items-end sm:text-right" : ""}`}
    >
      <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        {proximo ? null : <ArrowLeft className="size-3.5" aria-hidden="true" />}
        {t(proximo ? "ajuda.proximo" : "ajuda.anterior")}
        {proximo ? <ArrowRight className="size-3.5" aria-hidden="true" /> : null}
      </span>
      <span className="font-bold group-hover:underline">{t(tutorial.titulo)}</span>
    </Link>
  );
}
