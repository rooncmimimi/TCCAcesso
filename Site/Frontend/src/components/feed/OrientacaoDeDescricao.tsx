/**
 * Orientação contextual para descrever uma imagem (texto alternativo). Fixa e escrita à mão: não
 * analisa a imagem, só ensina a pessoa a descrevê-la. Fica fechada por padrão para não pesar na tela.
 */
export function OrientacaoDeDescricao() {
  return (
    <details className="rounded-md border border-border bg-muted/30 p-2 text-[11px] leading-snug">
      <summary className="min-h-8 cursor-pointer text-xs font-semibold text-primary">Como descrever bem esta imagem</summary>
      <div className="mt-2 space-y-2">
        <p>
          A descrição é lida por quem usa leitor de tela e aparece se a imagem não carregar. Imagine que está contando a foto por telefone para alguém.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Diga o que importa: quem ou o que aparece, o que está acontecendo e onde.</li>
          <li>Se a imagem tem texto (um cartaz, um gráfico), escreva o texto ou o que o gráfico mostra.</li>
          <li>Seja breve: uma ou duas frases. Não precisa começar com “imagem de” ou “foto de”.</li>
          <li>Conte o que a imagem acrescenta à sua publicação, não tudo o que existe nela.</li>
        </ul>
        <p>
          <span className="font-semibold">Imagem informativa:</span> mostra algo que a publicação precisa. Descreva sempre.
          <br />
          <span className="font-semibold">Imagem decorativa:</span> só enfeita e não traz informação nova. Marque “decorativa” e ela será ignorada por leitores de tela.
        </p>
        <p className="italic">Exemplo: “Equipe de cinco pessoas sorrindo em volta de uma mesa, comemorando a primeira contratação da empresa.”</p>
      </div>
    </details>
  );
}
