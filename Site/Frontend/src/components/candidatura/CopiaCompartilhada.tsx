import { contarCopia, type CopiaCompartilhada } from "@/types/adaptacoes";
import { tx } from "@/i18n/frases";

/**
 * A lista, em palavras, do que uma cópia leva. Usada na prévia (o que a empresa receberá), no que a
 * pessoa já autorizou e na tela da empresa. Mostra exatamente o que veio, nada a mais.
 */
export function CopiaCompartilhadaLista({ itens, vazio = tx("Nada de acessibilidade será compartilhado.") }: { itens: CopiaCompartilhada | null | undefined; vazio?: string }) {
  if (contarCopia(itens) === 0) {
    return <p className="text-sm text-muted-foreground">{vazio}</p>;
  }

  const c = itens!;

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {c.adaptacoes?.map((a) => (
        <li key={a.chave}>{a.rotulo}</li>
      ))}
      {c.comunicacao?.canaisPreferidos ? <li>{tx("Canais preferidos de contato:")}{" "}{c.comunicacao.canaisPreferidos.map((x) => x.rotulo).join(", ")}</li> : null}
      {c.comunicacao?.canaisAEvitar ? <li>{tx("Prefere evitar:")}{" "}{c.comunicacao.canaisAEvitar.map((x) => x.rotulo).join(", ")}</li> : null}
      {c.comunicacao?.melhorHorario ? <li>{tx("Melhor horário para contato:")}{" "}{c.comunicacao.melhorHorario}</li> : null}
      {c.deficiencias?.length ? <li>{tx("Categoria de deficiência:")}{" "}{c.deficiencias.map((d) => d.nome).join(", ")}</li> : null}
      {c.observacoes?.adaptacao ? <li>{tx("Observação sobre adaptações: “")}{c.observacoes.adaptacao}”</li> : null}
      {c.observacoes?.comunicacao ? <li>{tx("Observação sobre comunicação: “")}{c.observacoes.comunicacao}”</li> : null}
      {c.outra ? <li>{tx("Outra necessidade: “")}{c.outra}”</li> : null}
    </ul>
  );
}
