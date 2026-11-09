import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogoDeAdaptacoes, EscolhaDeCompartilhamento, MinhaAcessibilidade } from "@/types/adaptacoes";
import { useIdioma } from "@/hooks/useIdioma";
import { Frase } from "@/i18n/Frase";

type Props = {
  catalogo: CatalogoDeAdaptacoes;
  perfil: MinhaAcessibilidade;
  escolha: EscolhaDeCompartilhamento;
  aoMudar: (proxima: EscolhaDeCompartilhamento) => void;
};

const rotulosDe = (itens: { chave: string; rotulo: string }[], chaves: string[]) =>
  chaves.map((chave) => itens.find((i) => i.chave === chave)?.rotulo ?? chave).join(", ");

/**
 * A escolha, candidatura por candidatura, do que compartilhar com a empresa. Tudo começa
 * DESLIGADO: nada do perfil vai sozinho. O que está no perfil da pessoa aparece só como lembrete
 * ("do seu perfil"); marcar é sempre uma decisão dela.
 */
export function EscolhaDeAdaptacoes({ catalogo, perfil, escolha, aoMudar }: Props) {
  const { t } = useIdioma();
  const idBase = useId();
  const doPerfil = new Set(perfil.adaptacoes);
  const comunicacao = perfil.comunicacao;
  const temComunicacao = comunicacao.canaisPreferidos.length > 0 || comunicacao.canaisAEvitar.length > 0 || Boolean(comunicacao.melhorHorario);

  function alternarAdaptacao(chave: string, marcada: boolean) {
    const atuais = new Set(escolha.adaptacoes);
    if (marcada) atuais.add(chave);
    else atuais.delete(chave);

    aoMudar({ ...escolha, adaptacoes: catalogo.adaptacoes.filter((a) => atuais.has(a.chave)).map((a) => a.chave) });
  }

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <Frase
          chave="candidatura.escolhaDeAdaptacoes.nadaDoSeuPerfilEEnviado"
          partes={[(texto) => <strong>{texto}</strong>]}
        />
      </p>

      {catalogo.grupos.map((grupo) => {
        const itens = catalogo.adaptacoes.filter((a) => a.grupo === grupo.chave);

        return (
          <fieldset key={grupo.chave} className="space-y-2">
            <legend className="text-sm font-bold">{grupo.rotulo}</legend>
            <ul className="space-y-1">
              {itens.map((item) => {
                const id = `${idBase}-${item.chave}`;

                return (
                  <li key={item.chave} className="flex items-start gap-3 py-1">
                    <Checkbox
                      id={id}
                      className="mt-1"
                      checked={escolha.adaptacoes.includes(item.chave)}
                      onCheckedChange={(v) => alternarAdaptacao(item.chave, v === true)}
                    />
                    <Label htmlFor={id} className="text-sm font-normal leading-snug">
                      {item.rotulo}
                      {doPerfil.has(item.chave) ? <span className="ml-2 rounded bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">{t("candidatura.escolhaDeAdaptacoes.doSeuPerfil")}</span> : null}
                    </Label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}

      {temComunicacao ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold">{t("candidatura.escolhaDeAdaptacoes.comoPrefiroSerContatadoA")}</legend>
          {comunicacao.canaisPreferidos.length > 0 ? (
            <OpcaoDeCompartilhar
              id={`${idBase}-canais-preferidos`}
              marcada={escolha.comunicacao.canaisPreferidos}
              aoMudar={(v) => aoMudar({ ...escolha, comunicacao: { ...escolha.comunicacao, canaisPreferidos: v } })}
              rotulo={`Meus canais preferidos: ${rotulosDe(catalogo.canaisPreferidos, comunicacao.canaisPreferidos)}`}
            />
          ) : null}
          {comunicacao.canaisAEvitar.length > 0 ? (
            <OpcaoDeCompartilhar
              id={`${idBase}-canais-evitar`}
              marcada={escolha.comunicacao.canaisAEvitar}
              aoMudar={(v) => aoMudar({ ...escolha, comunicacao: { ...escolha.comunicacao, canaisAEvitar: v } })}
              rotulo={`Prefiro evitar: ${rotulosDe(catalogo.canaisAEvitar, comunicacao.canaisAEvitar)}`}
            />
          ) : null}
          {comunicacao.melhorHorario ? (
            <OpcaoDeCompartilhar
              id={`${idBase}-horario`}
              marcada={escolha.comunicacao.melhorHorario}
              aoMudar={(v) => aoMudar({ ...escolha, comunicacao: { ...escolha.comunicacao, melhorHorario: v } })}
              rotulo={t("candidatura.escolhaDeAdaptacoes.melhorHorario", { horario: comunicacao.melhorHorario })}
            />
          ) : null}
          {comunicacao.observacao ? (
            <OpcaoDeCompartilhar
              id={`${idBase}-obs-comunicacao`}
              marcada={escolha.observacaoDeComunicacao}
              aoMudar={(v) => aoMudar({ ...escolha, observacaoDeComunicacao: v })}
              rotulo={t("candidatura.escolhaDeAdaptacoes.observacaoSobreComunicacao", { observacao: comunicacao.observacao })}
            />
          ) : null}
        </fieldset>
      ) : null}

      {perfil.deficiencias.length > 0 || perfil.observacao ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold">{t("candidatura.escolhaDeAdaptacoes.informacoesSensiveisDoSeu")}</legend>
          <p className="text-xs text-muted-foreground">{t("candidatura.escolhaDeAdaptacoes.soCompartilheSeAcharNecessario")}</p>
          {perfil.deficiencias.length > 0 ? (
            <OpcaoDeCompartilhar
              id={`${idBase}-deficiencia`}
              marcada={escolha.deficiencia}
              aoMudar={(v) => aoMudar({ ...escolha, deficiencia: v })}
              rotulo={`A categoria de deficiência que declarei: ${perfil.deficiencias.map((d) => d.nome).join(", ")}`}
            />
          ) : null}
          {perfil.observacao ? (
            <OpcaoDeCompartilhar
              id={`${idBase}-obs-adaptacao`}
              marcada={escolha.observacaoDeAdaptacao}
              aoMudar={(v) => aoMudar({ ...escolha, observacaoDeAdaptacao: v })}
              rotulo={t("candidatura.escolhaDeAdaptacoes.observacaoSobreAdaptacoes", { observacao: perfil.observacao })}
            />
          ) : null}
        </fieldset>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${idBase}-outra`} className="text-sm font-bold">
          Outra necessidade, só para esta candidatura (opcional)
        </Label>
        <Textarea
          id={`${idBase}-outra`}
          rows={3}
          maxLength={300}
          value={escolha.outra}
          onChange={(e) => aoMudar({ ...escolha, outra: e.target.value })}
          aria-describedby={`${idBase}-outra-ajuda`}
        />
        <p id={`${idBase}-outra-ajuda`} className="text-xs text-muted-foreground">
          {t("candidatura.escolhaDeAdaptacoes.descrevaOQuePrecisa")}
        </p>
      </div>
    </div>
  );
}

function OpcaoDeCompartilhar({ id, marcada, aoMudar, rotulo }: { id: string; marcada: boolean; aoMudar: (v: boolean) => void; rotulo: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <Checkbox id={id} className="mt-1" checked={marcada} onCheckedChange={(v) => aoMudar(v === true)} />
      <Label htmlFor={id} className="text-sm font-normal leading-snug">
        {rotulo}
      </Label>
    </div>
  );
}
