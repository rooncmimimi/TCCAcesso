import { useIdioma } from "@/hooks/useIdioma";

/**
 * Os mesmos números do gráfico, em tabela.
 *
 * Não é um extra: é a alternativa de quem não lê o gráfico — por leitor de tela, por não distinguir
 * as cores, ou porque o gráfico simplesmente não ajuda. Fica numa `<details>` para não dobrar o
 * tamanho da tela, mas está sempre ali, a um clique, e o nome diz o que tem dentro.
 */
export function TabelaDoGrafico({
  titulo,
  colunaNome,
  linhas,
}: {
  titulo: string;
  colunaNome: string;
  linhas: ReadonlyArray<{ nome: string; total: number }>;
}) {
  const { t } = useIdioma();
  const total = linhas.reduce((soma, linha) => soma + linha.total, 0);

  return (
    <details className="mt-3 rounded-md border border-border bg-muted/30 p-2 text-sm">
      <summary className="min-h-11 cursor-pointer font-semibold text-primary">
        {t("admin.graficosRelatorios.verEmTabela")}
      </summary>

      <table className="mt-2 w-full border-collapse text-left">
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-1.5 pr-3 font-semibold">
              {colunaNome}
            </th>
            <th scope="col" className="py-1.5 text-right font-semibold">
              {t("admin.graficosRelatorios.quantidade")}
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.nome} className="border-b border-border/60">
              <th scope="row" className="py-1.5 pr-3 font-normal">
                {linha.nome}
              </th>
              <td className="py-1.5 text-right tabular-nums">{linha.total}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="py-1.5 pr-3 font-semibold">
              {t("admin.graficosRelatorios.total")}
            </th>
            <td className="py-1.5 text-right font-semibold tabular-nums">{total}</td>
          </tr>
        </tfoot>
      </table>
    </details>
  );
}
