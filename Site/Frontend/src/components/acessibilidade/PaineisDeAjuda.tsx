import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SalvarInstrucao } from "@/components/acessibilidade/SalvarInstrucao";
import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";
import { useHistoricoInstrucoes } from "@/hooks/useHistoricoInstrucoes";
import { explicacaoDaPagina } from "@/dados/explicacoesPaginas";
import { GLOSSARIO, type TermoDoGlossario } from "@/dados/glossario";
import { frasesDeOndeEstou, type OndeEstou } from "@/lib/ondeEstou";
import { useIdioma } from "@/hooks/useIdioma";

/** O que foi lido da página ANTES de abrir o diálogo (o Radix esconde o resto da página do DOM acessível). */
export type FotoDaPagina = {
  caminho: string;
  onde: OndeEstou;
  /** Termos do glossário que aparecem no texto da página. */
  termos: string[];
};

export function PainelOndeEstou({ foto }: { foto: FotoDaPagina }) {
  const { t } = useIdioma();
  const frases = frasesDeOndeEstou(foto.onde);

  if (frases.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("acessibilidade.paineisDeAjuda.naoConseguiIdentificarAPagina")}</p>;
  }

  return (
    <div className="space-y-3">
      <TextoOuvivel rotulo={t("acessibilidade.paineisDeAjuda.ouvirOndeVoceEsta")}>
        <ul className="space-y-1.5 text-sm">
          {frases.map((frase) => (
            <li key={frase}>{frase}</li>
          ))}
        </ul>
      </TextoOuvivel>
      <SalvarInstrucao titulo={`Onde estou: ${foto.onde.pagina ?? foto.caminho}`} texto={frases.join(" ")} />
    </div>
  );
}

export function PainelExplicaPagina({ foto }: { foto: FotoDaPagina }) {
  const { t } = useIdioma();
  const explicacao = explicacaoDaPagina(foto.caminho);
  const nome = explicacao?.nome ?? foto.onde.pagina ?? t("acessibilidade.paineisDeAjuda.estaPagina");
  // Sem uma explicação escrita para a rota, só diz o nome: não supõe o que a página faz.
  const texto =
    explicacao?.texto ?? t("acessibilidade.paineisDeAjuda.voceEstaNaPaginaAindaNaoTemos", { var1: nome });
  const passos = explicacao?.proximosPassos;

  return (
    <div className="space-y-3">
      <TextoOuvivel rotulo={t("acessibilidade.paineisDeAjuda.ouvirAExplicacaoDaPagina")}>
        <p className="text-sm">{texto}</p>
        {passos && (
          <p className="mt-2 text-sm">
            <span className="font-semibold">{t("acessibilidade.paineisDeAjuda.oQueFazerAqui")} </span>
            {passos}
          </p>
        )}
      </TextoOuvivel>
      <SalvarInstrucao titulo={t("acessibilidade.paineisDeAjuda.pagina", { var1: nome })} texto={[texto, passos].filter(Boolean).join(" ")} />
    </div>
  );
}

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Termo({ termo }: { termo: TermoDoGlossario }) {
  const { t } = useIdioma();

  return (
    <li className="rounded-lg border border-border p-3">
      <h4 className="text-sm font-bold">{termo.termo}</h4>
      <TextoOuvivel rotulo={t("acessibilidade.paineisDeAjuda.ouvirAExplicacaoDe", { var1: termo.termo })}>
        <p className="mt-1 text-sm">{termo.explicacao}</p>
        {termo.exemplo && <p className="mt-1 text-sm text-muted-foreground">Exemplo: {termo.exemplo}</p>}
      </TextoOuvivel>
      <SalvarInstrucao titulo={`Glossário: ${termo.termo}`} texto={`${termo.explicacao}${termo.exemplo ? ` Exemplo: ${termo.exemplo}` : ""}`} />
    </li>
  );
}

export function PainelGlossario({ foto }: { foto: FotoDaPagina }) {
  const { t } = useIdioma();
  const [busca, setBusca] = useState("");

  const { daPagina, filtrados } = useMemo(() => {
    const consulta = semAcento(busca).trim();
    const todos = consulta
      ? GLOSSARIO.filter((t) => semAcento(t.termo).includes(consulta) || t.variantes.some((v) => semAcento(v).includes(consulta)))
      : GLOSSARIO;
    const ids = new Set(foto.termos);
    return {
      daPagina: consulta ? [] : GLOSSARIO.filter((t) => ids.has(t.id)),
      filtrados: todos.filter((t) => consulta || !ids.has(t.id)),
    };
  }, [busca, foto.termos]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="glossario-busca" className="text-sm font-semibold">
          {t("acessibilidade.paineisDeAjuda.buscarUmTermo")}
        </Label>
        <Input id="glossario-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("acessibilidade.paineisDeAjuda.porExemploClt")} />
      </div>

      {daPagina.length > 0 && (
        <section aria-labelledby="glossario-da-pagina" className="space-y-2">
          <h3 id="glossario-da-pagina" className="text-sm font-bold">
            {t("acessibilidade.paineisDeAjuda.termosQueAparecemNestaPagina")}
          </h3>
          <ul className="space-y-2">
            {daPagina.map((t) => (
              <Termo key={t.id} termo={t} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="glossario-todos" className="space-y-2">
        <h3 id="glossario-todos" className="text-sm font-bold">
          {busca.trim()
            ? t("acessibilidade.paineisDeAjuda.resultadoDaBusca")
            : daPagina.length > 0
              ? t("acessibilidade.paineisDeAjuda.outrosTermos")
              : t("acessibilidade.paineisDeAjuda.todosOsTermos")}
        </h3>
        {filtrados.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t("acessibilidade.paineisDeAjuda.nenhumTermoEncontrado", { termo: busca.trim() })}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtrados.map((t) => (
              <Termo key={t.id} termo={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function PainelHistorico() {
  const { t } = useIdioma();
  const { itens, remover, limpar } = useHistoricoInstrucoes();
  const [confirmando, setConfirmando] = useState(false);

  if (itens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("acessibilidade.paineisDeAjuda.vocaAindaNaoSalvouNada", { botao: t("acessibilidade.salvarInstrucao.salvarParaConsultarDepois") })}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("acessibilidade.paineisDeAjuda.ficaSoNesteNavegadorVocePode")}</p>
      <ul className="space-y-2">
        {itens.map((item) => (
          <li key={item.id} className="rounded-lg border border-border p-3">
            <h4 className="text-sm font-bold">{item.titulo}</h4>
            <TextoOuvivel rotulo={`Ouvir: ${item.titulo}`}>
              <p className="mt-1 text-sm">{item.texto}</p>
            </TextoOuvivel>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11 gap-1.5 text-destructive"
              aria-label={t("acessibilidade.paineisDeAjuda.removerDoHistorico", { var1: item.titulo })}
              onClick={() => remover(item.id)}
            >
              <Trash2 className="size-4" aria-hidden="true" /> {t("acessibilidade.paineisDeAjuda.remover")}
            </Button>
          </li>
        ))}
      </ul>

      {confirmando ? (
        <div role="group" aria-label={t("acessibilidade.paineisDeAjuda.confirmarApagarOHistorico")} className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{t("acessibilidade.paineisDeAjuda.apagarTudo")}</span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="min-h-11"
            onClick={() => {
              limpar();
              setConfirmando(false);
            }}
          >
            {t("acessibilidade.paineisDeAjuda.simApagarTudo")}
          </Button>
          <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => setConfirmando(false)}>
            {t("post.cancelar")}
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => setConfirmando(true)}>
          {t("acessibilidade.paineisDeAjuda.apagarTodoOHistorico")}
        </Button>
      )}
    </div>
  );
}
