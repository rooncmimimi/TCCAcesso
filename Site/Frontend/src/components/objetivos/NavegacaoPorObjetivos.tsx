import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { objetivosPara, type Objetivo } from "@/dados/objetivos";
import { useSessao } from "@/hooks/useSessao";
import { alternarPasso, contarFeitos, lerProgresso, proximoPasso, recomecar, type Progresso } from "@/lib/progressoDeObjetivos";
import { useIdioma } from "@/hooks/useIdioma";

function Passos({ objetivo, progresso, aoMudar }: { objetivo: Objetivo; progresso: Progresso; aoMudar: (p: Progresso) => void }) {
  const { t } = useIdioma();
  const idBase = useId();
  const feitos = progresso[objetivo.id] ?? [];
  const proximo = proximoPasso(objetivo, progresso);
  const total = objetivo.passos.length;
  const quantos = contarFeitos(objetivo, progresso);

  return (
    <section aria-labelledby={`${idBase}-titulo`} className="mt-6 space-y-4 rounded-xl border-2 border-primary/40 p-4">
      <div>
        <h2 id={`${idBase}-titulo`} className="text-xl font-bold">
          {objetivo.titulo}
        </h2>
        <p className="text-sm text-muted-foreground">{objetivo.resumo}</p>
        <p role="status" className="mt-2 text-sm font-semibold text-primary">
          {quantos === total ? "Você concluiu todos os passos." : `${quantos} de ${total} passos feitos.`}
        </p>
      </div>

      <ol className="space-y-3">
        {objetivo.passos.map((passo, i) => {
          const feito = feitos.includes(passo.id);
          const ehProximo = proximo?.id === passo.id;

          return (
            <li key={passo.id} className={`rounded-lg border p-3 ${ehProximo ? "border-primary bg-primary-soft/40" : "border-border"}`}>
              <div className="flex items-start gap-3">
                <Checkbox id={`${idBase}-${passo.id}`} className="mt-1" checked={feito} onCheckedChange={() => aoMudar(alternarPasso(progresso, objetivo.id, passo.id))} />
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor={`${idBase}-${passo.id}`} className="min-h-11 cursor-pointer text-sm font-bold leading-snug">
                    <span className="sr-only">Passo {i + 1}: </span>
                    {passo.titulo}
                    {passo.opcional ? <span className="ml-2 text-xs font-normal text-muted-foreground">(opcional)</span> : null}
                    {ehProximo ? <span className="ml-2 text-xs font-bold text-primary">{t("objetivos.navegacaoPorObjetivos.proximoPasso")}</span> : null}
                    {feito ? <span className="sr-only"> (feito)</span> : null}
                  </Label>
                  <p className="text-sm text-muted-foreground">{passo.descricao}</p>
                  <Button asChild variant={ehProximo ? "default" : "outline"} className="min-h-11 gap-2">
                    <Link to={passo.para}>
                      {passo.acao} <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <Button type="button" variant="ghost" className="min-h-11" onClick={() => aoMudar(recomecar(progresso, objetivo.id))} disabled={feitos.length === 0}>
        {t("objetivos.navegacaoPorObjetivos.recomecarEsteObjetivo")}
      </Button>
    </section>
  );
}

/**
 * "O que você quer fazer?": a pessoa escolhe um objetivo e vê só os passos dele, em ordem, com o
 * próximo destacado. Marcar um passo como feito é só uma ajuda guardada neste navegador. Os objetivos
 * mudam conforme quem está usando (candidato, empresa ou visitante).
 */
export function NavegacaoPorObjetivos() {
  const { t } = useIdioma();
  const { usuario } = useSessao();
  const objetivos = objetivosPara(usuario?.tipo ?? null);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<Progresso>(() => lerProgresso());

  if (objetivos.length === 0) {
    return (
      <p role="status" className="mt-6 text-sm text-muted-foreground">
        {t("objetivos.navegacaoPorObjetivos.osCaminhosGuiadosSaoPara")}
      </p>
    );
  }

  const atual = objetivos.find((o) => o.id === escolhido) ?? null;

  return (
    <div className="mt-6">
      <ul className="grid gap-3 sm:grid-cols-2">
        {objetivos.map((o) => {
          const quantos = contarFeitos(o, progresso);
          const selecionado = o.id === escolhido;

          return (
            <li key={o.id}>
              <Button type="button" variant={selecionado ? "default" : "outline"} aria-pressed={selecionado} className="h-auto min-h-16 w-full justify-start gap-3 px-4 py-3 text-left" onClick={() => setEscolhido(o.id)}>
                {quantos === o.passos.length ? <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /> : <Circle className="size-5 shrink-0" aria-hidden="true" />}
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{o.titulo}</span>
                  <span className="block whitespace-normal text-xs font-normal opacity-90">{o.resumo}</span>
                  {quantos > 0 ? <span className="mt-1 block text-xs font-semibold">{quantos === o.passos.length ? "Concluído" : `${quantos} de ${o.passos.length} passos feitos`}</span> : null}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>

      {atual ? <Passos objetivo={atual} progresso={progresso} aoMudar={setProgresso} /> : <p className="mt-6 text-sm text-muted-foreground">{t("objetivos.navegacaoPorObjetivos.escolhaUmObjetivoParaVerOs")}</p>}
    </div>
  );
}
