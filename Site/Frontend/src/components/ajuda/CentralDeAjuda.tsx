import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Search, UserRound, X } from "lucide-react";

import { CartaoDeTutorial, ListaDePerguntas, PrecisaDeMais } from "@/components/ajuda/PecasDaAjuda";
import { TutorialDeAjuda } from "@/components/ajuda/TutorialDeAjuda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { perguntasDe, type PerguntaFrequente } from "@/dados/perguntasAjuda";
import {
  CATEGORIAS,
  COMECE_POR_AQUI,
  PUBLICOS,
  TUTORIAIS,
  tutoriaisDe,
  type Categoria,
  type Publico,
  type TemaDeAjuda,
  type Tutorial,
} from "@/dados/tutoriaisAjuda";
import { useIdioma } from "@/hooks/useIdioma";
import { combinaComABusca, palavrasDaBusca } from "@/lib/buscaNaAjuda";
import type { ChaveBase } from "@/i18n/dicionarios";

const TITULO_DA_CATEGORIA: Record<Categoria, ChaveBase> = {
  comecar: "ajuda.categoria.comecar",
  usar: "ajuda.categoria.usar",
  conta: "ajuda.categoria.conta",
};

const AREA = {
  candidato: { icone: UserRound, titulo: "ajuda.paraCandidatos", descricao: "ajuda.paraCandidatosDescricao" },
  empresa: { icone: Building2, titulo: "ajuda.paraEmpresas", descricao: "ajuda.paraEmpresasDescricao" },
} as const;

/**
 * A Central de Ajuda, em duas áreas (candidatos e empresas): busca, caminho sugerido, tutoriais por
 * assunto e perguntas frequentes; escolhido um tutorial (`?tema=`), o passo a passo.
 *
 * Área e tutorial ficam no endereço, então dá para mandar o link a alguém e o Voltar do navegador
 * funciona. Ao trocar de tutorial o foco vai para o título: quem usa leitor de tela ouve onde chegou.
 */
export function CentralDeAjuda({ tema, publico = "candidato" }: { tema?: TemaDeAjuda; publico?: Publico }) {
  const tutorial = TUTORIAIS.find((t) => t.tema === tema);
  // Um link para um tutorial de empresa aberto "na área de candidato" mostra a área certa.
  const area = tutorial && !tutorial.publicos.includes(publico) ? tutorial.publicos[0] : publico;
  const [consulta, setConsulta] = useState("");
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const anterior = useRef(tema);

  useEffect(() => {
    // Só quando a pessoa troca de tela aqui dentro; na primeira carga o foco fica onde o navegador pôs.
    // Trocar de área não mexe no foco: ele continua no botão que a pessoa acabou de usar.
    if (anterior.current === tema) return;
    anterior.current = tema;
    tituloRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [tema]);

  if (tutorial) {
    return (
      <div className="mx-auto max-w-5xl">
        <TutorialDeAjuda tutorial={tutorial} publico={area} tituloRef={tituloRef} />
      </div>
    );
  }

  return <Inicio area={area} consulta={consulta} aoBuscar={setConsulta} tituloRef={tituloRef} />;
}

function Inicio({
  area,
  consulta,
  aoBuscar,
  tituloRef,
}: {
  area: Publico;
  consulta: string;
  aoBuscar: (valor: string) => void;
  tituloRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const { t } = useIdioma();
  const campoRef = useRef<HTMLInputElement>(null);
  const palavras = palavrasDaBusca(consulta);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="rounded-3xl bg-primary-soft px-5 py-8 text-center sm:px-10 sm:py-10">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">{t("ajuda.link")}</p>
        <h1 ref={tituloRef} tabIndex={-1} className="mt-1 text-3xl font-extrabold outline-none sm:text-4xl">
          {t("ajuda.titulo")}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">{t("ajuda.subtitulo")}</p>

        <form role="search" className="relative mx-auto mt-6 max-w-xl text-left" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="busca-da-ajuda" className="sr-only">
            {t("ajuda.buscarRotulo")}
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={campoRef}
            id="busca-da-ajuda"
            type="search"
            autoComplete="off"
            value={consulta}
            onChange={(e) => aoBuscar(e.target.value)}
            placeholder={t("ajuda.buscarExemplo")}
            className="h-14 rounded-full bg-background pl-12 pr-14 text-base [&::-webkit-search-cancel-button]:hidden"
          />
          {consulta ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 size-11 -translate-y-1/2 rounded-full"
              aria-label={t("ajuda.limparBusca")}
              onClick={() => {
                aoBuscar("");
                campoRef.current?.focus();
              }}
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
          ) : null}
        </form>
      </header>

      <nav aria-label={t("ajuda.escolhaAArea")} className="mt-6">
        <ul className="grid gap-3 sm:grid-cols-2">
          {PUBLICOS.map((publico) => {
            const { icone: Icone, titulo, descricao } = AREA[publico];
            const atual = publico === area;
            return (
              <li key={publico} className="flex">
                <Link
                  to="/ajuda"
                  search={{ publico }}
                  replace
                  aria-current={atual ? "page" : undefined}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 transition-colors ${
                    atual ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"
                  }`}
                >
                  <Icone className="size-7 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-lg font-bold">{t(titulo)}</span>
                    <span className="block text-sm">{t(descricao)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {palavras.length > 0 ? <Resultados area={area} palavras={palavras} /> : <ConteudoDaArea area={area} />}

      <PrecisaDeMais />
    </div>
  );
}

function ConteudoDaArea({ area }: { area: Publico }) {
  const { t } = useIdioma();
  const tutoriais = tutoriaisDe(area);
  const caminho = COMECE_POR_AQUI[area].flatMap((tema) => tutoriais.filter((x) => x.tema === tema));

  return (
    <>
      <section aria-labelledby="ajuda-comece" className="mt-10">
        <h2 id="ajuda-comece" className="text-xl font-bold">
          {t("ajuda.comecePorAqui")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("ajuda.comecePorAquiTexto")}</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {caminho.map((item, indice) => (
            <li key={item.tema} className="flex">
              <Link
                to="/ajuda"
                search={{ tema: item.tema, publico: area }}
                className="group flex w-full flex-col gap-2 rounded-xl border-t-4 border-primary bg-card p-4 shadow-sm"
              >
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {indice + 1}
                </span>
                <span className="font-bold group-hover:underline">{t(item.titulo)}</span>
                <ArrowRight className="mt-auto size-4 text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {CATEGORIAS.map((categoria) => {
        const daCategoria = tutoriais.filter((x) => x.categoria === categoria);
        if (daCategoria.length === 0) return null;
        return (
          <section key={categoria} aria-labelledby={`ajuda-${categoria}`} className="mt-10">
            <h2 id={`ajuda-${categoria}`} className="mb-3 text-xl font-bold">
              {t(TITULO_DA_CATEGORIA[categoria])}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {daCategoria.map((item) => (
                <CartaoDeTutorial key={item.tema} tutorial={item} publico={area} />
              ))}
            </ul>
          </section>
        );
      })}

      <section aria-labelledby="ajuda-perguntas" className="mt-10">
        <h2 id="ajuda-perguntas" className="mb-3 text-xl font-bold">
          {t("ajuda.perguntasFrequentes")}
        </h2>
        <ListaDePerguntas perguntas={perguntasDe(area)} publico={area} />
      </section>
    </>
  );
}

function Resultados({ area, palavras }: { area: Publico; palavras: string[] }) {
  const { t } = useIdioma();

  const buscar = (publico: Publico) => ({
    tutoriais: tutoriaisDe(publico).filter((x: Tutorial) =>
      combinaComABusca([t(x.titulo), t(x.resumo), ...x.passos.map((p) => t(p.texto))], palavras),
    ),
    perguntas: perguntasDe(publico).filter((p: PerguntaFrequente) => combinaComABusca([t(p.pergunta), t(p.resposta)], palavras)),
  });

  const aqui = buscar(area);
  const total = aqui.tutoriais.length + aqui.perguntas.length;
  const outra: Publico = area === "candidato" ? "empresa" : "candidato";
  const la = buscar(outra);
  const totalLa = la.tutoriais.length + la.perguntas.length;

  return (
    <div className="mt-8 space-y-8">
      {/* `role="status"`: quem não vê a lista mudar ouve quantos resultados apareceram. */}
      <p role="status" className="text-sm font-semibold">
        {total === 0 ? t("ajuda.nadaEncontrado") : total === 1 ? t("ajuda.umResultado") : t("ajuda.resultados", { var1: total })}
      </p>

      {aqui.tutoriais.length > 0 ? (
        <section aria-labelledby="ajuda-r-tutoriais">
          <h2 id="ajuda-r-tutoriais" className="mb-3 text-xl font-bold">
            {t("ajuda.tutoriais")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {aqui.tutoriais.map((item) => (
              <CartaoDeTutorial key={item.tema} tutorial={item} publico={area} />
            ))}
          </ul>
        </section>
      ) : null}

      {aqui.perguntas.length > 0 ? (
        <section aria-labelledby="ajuda-r-perguntas">
          <h2 id="ajuda-r-perguntas" className="mb-3 text-xl font-bold">
            {t("ajuda.perguntasFrequentes")}
          </h2>
          <ListaDePerguntas perguntas={aqui.perguntas} publico={area} abertas />
        </section>
      ) : null}

      {/* A resposta pode estar na outra área: oferece ir lá, mantendo o que foi digitado. */}
      {total === 0 && totalLa > 0 ? (
        <Link
          to="/ajuda"
          search={{ publico: outra }}
          replace
          className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-primary px-4 font-semibold text-primary"
        >
          {t(outra === "empresa" ? "ajuda.verNaAreaDeEmpresas" : "ajuda.verNaAreaDeCandidatos", { var1: totalLa })}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
