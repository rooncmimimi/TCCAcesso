import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ambienteService } from "@/services/ambiente.service";
import type { FormularioDoAmbiente } from "@/lib/ambienteDaVagaForm";
import { useIdioma } from "@/hooks/useIdioma";

type Props = {
  valor: FormularioDoAmbiente;
  aoMudar: (proximo: FormularioDoAmbiente) => void;
  /** Itens do mapa que a moderação já verificou (só na edição). Alterar um deles derruba o selo. */
  origens?: Record<string, "declarado" | "verificado">;
};

const NATIVO = "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * Formulário do ambiente da vaga: o que a entrevista oferece, a prévia sensorial e o mapa de
 * acessibilidade física. TUDO é opcional: deixar em "Não informar" não grava nada, e a vaga mostra "a
 * empresa não informou". A empresa só DECLARA o mapa físico: o selo "verificado" é da moderação.
 */
export function SecaoAmbienteDaVaga({ valor, aoMudar, origens = {} }: Props) {
  const { t } = useIdioma();
  const idBase = useId();
  const { data: catalogo, isError } = useQuery({ queryKey: ["vagas", "catalogo-acessibilidade"], queryFn: () => ambienteService.catalogo(), staleTime: 60 * 60 * 1000 });

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("vagas.secaoAmbienteDaVaga.naoFoiPossivelCarregarAsOpcoes")}
      </p>
    );
  }

  if (!catalogo) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("vagas.secaoAmbienteDaVaga.carregandoAsOpcoesDoAmbienteDe")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">{t("vagas.secaoAmbienteDaVaga.tudoAquiEOpcionalOQueVoce")}</p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold">{t("vagas.secaoAmbienteDaVaga.oQueAEntrevistaOferece")}</legend>
        <ul className="grid gap-1 sm:grid-cols-2">
          {catalogo.entrevista.map((o) => (
            <li key={o.chave} className="flex items-center gap-3">
              <Checkbox
                id={`${idBase}-ent-${o.chave}`}
                checked={valor.entrevista.includes(o.chave)}
                onCheckedChange={(v) => aoMudar({ ...valor, entrevista: v === true ? [...valor.entrevista, o.chave] : valor.entrevista.filter((c) => c !== o.chave) })}
              />
              <Label htmlFor={`${idBase}-ent-${o.chave}`} className="flex min-h-11 flex-1 cursor-pointer items-center text-sm font-normal leading-snug">
                {o.rotulo}
              </Label>
            </li>
          ))}
        </ul>
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-ent-obs`} className="text-sm">
            Observação sobre a entrevista (opcional)
          </Label>
          <Textarea id={`${idBase}-ent-obs`} rows={2} maxLength={500} value={valor.entrevistaObservacao} onChange={(e) => aoMudar({ ...valor, entrevistaObservacao: e.target.value })} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold">{t("vagas.secaoAmbienteDaVaga.comoEOAmbienteDeTrabalhoPrevia")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {catalogo.ambienteSensorial.map((c) => (
            <div key={c.chave} className="space-y-1">
              <Label htmlFor={`${idBase}-sens-${c.chave}`} className="text-sm">
                {c.rotulo}
              </Label>
              <select
                id={`${idBase}-sens-${c.chave}`}
                className={NATIVO}
                value={valor.sensorial[c.chave] ?? ""}
                onChange={(e) => aoMudar({ ...valor, sensorial: { ...valor.sensorial, [c.chave]: e.target.value } })}
              >
                <option value="">{t("vagas.secaoAmbienteDaVaga.naoInformar")}</option>
                {c.opcoes.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-rotina`} className="text-sm">
            Como é a rotina (opcional)
          </Label>
          <Textarea id={`${idBase}-rotina`} rows={2} maxLength={500} value={valor.rotina} onChange={(e) => aoMudar({ ...valor, rotina: e.target.value })} placeholder={t("vagas.secaoAmbienteDaVaga.exDas9hAs15hComPausaLivreAs11h")} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold">{t("vagas.secaoAmbienteDaVaga.acessibilidadeFisicaDoLocal")}</legend>
        <p className="text-xs text-muted-foreground">{t("vagas.secaoAmbienteDaVaga.voceDeclaraOSeloVerificadoSoA")}</p>
        <ul className="space-y-3">
          {catalogo.itensFisicos.map((i) => {
            const item = valor.fisico[i.chave] ?? { situacao: "", detalhe: "" };
            const verificado = origens[i.chave] === "verificado";

            return (
              <li key={i.chave} className="grid gap-2 sm:grid-cols-[12rem_10rem_1fr] sm:items-end">
                <Label htmlFor={`${idBase}-fis-${i.chave}`} className="text-sm">
                  {i.rotulo}
                  {verificado ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">
                      <BadgeCheck className="size-3.5" aria-hidden="true" /> verificado
                    </span>
                  ) : null}
                </Label>
                <select
                  id={`${idBase}-fis-${i.chave}`}
                  className={NATIVO}
                  value={item.situacao}
                  onChange={(e) => aoMudar({ ...valor, fisico: { ...valor.fisico, [i.chave]: { ...item, situacao: e.target.value } } })}
                >
                  <option value="">{t("vagas.secaoAmbienteDaVaga.naoInformar")}</option>
                  {catalogo.situacoesFisicas.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label={`Detalhe sobre ${i.rotulo} (opcional)`}
                  maxLength={200}
                  disabled={!item.situacao}
                  placeholder={t("vagas.secaoAmbienteDaVaga.detalheOpcional")}
                  value={item.detalhe}
                  onChange={(e) => aoMudar({ ...valor, fisico: { ...valor.fisico, [i.chave]: { ...item, detalhe: e.target.value } } })}
                />
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
