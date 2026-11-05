import { contarCopia, type CopiaCompartilhada } from "@/types/adaptacoes";

/**
 * A lista, em palavras, do que uma cópia leva. Usada na prévia (o que a empresa receberá), no que a
 * pessoa já autorizou e na tela da empresa. Mostra exatamente o que veio, nada a mais.
 */
export function CopiaCompartilhadaLista({ itens, vazio = "Nada de acessibilidade será compartilhado." }: { itens: CopiaCompartilhada | null | undefined; vazio?: string }) {
  if (contarCopia(itens) === 0) {
    return <p className="text-sm text-muted-foreground">{vazio}</p>;
  }

  const c = itens!;

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {c.adaptacoes?.map((a) => (
        <li key={a.chave}>{a.rotulo}</li>
      ))}
      {c.comunicacao?.canaisPreferidos ? <li>Canais preferidos de contato: {c.comunicacao.canaisPreferidos.map((x) => x.rotulo).join(", ")}</li> : null}
      {c.comunicacao?.canaisAEvitar ? <li>Prefere evitar: {c.comunicacao.canaisAEvitar.map((x) => x.rotulo).join(", ")}</li> : null}
      {c.comunicacao?.melhorHorario ? <li>Melhor horário para contato: {c.comunicacao.melhorHorario}</li> : null}
      {c.deficiencias?.length ? <li>Categoria de deficiência: {c.deficiencias.map((d) => d.nome).join(", ")}</li> : null}
      {c.observacoes?.adaptacao ? <li>Observação sobre adaptações: “{c.observacoes.adaptacao}”</li> : null}
      {c.observacoes?.comunicacao ? <li>Observação sobre comunicação: “{c.observacoes.comunicacao}”</li> : null}
      {c.outra ? <li>Outra necessidade: “{c.outra}”</li> : null}
    </ul>
  );
}
