import { useId } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Pie, PieChart, XAxis, Cell } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { HachurasDeGrafico } from "@/components/admin/HachurasDeGrafico";
import { TabelaDoGrafico } from "@/components/admin/TabelaDoGrafico";
import { preenchimentoDaSerie } from "@/lib/hachuras";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";
import type { CandidaturaPorStatus } from "@/services/admin.service";

/**
 * Os gráficos dos relatórios.
 *
 * Três coisas que não dependem de enxergar cor:
 *
 * 1. **hachura**: cada série é pintada com uma textura diferente (`HachurasDeGrafico`), então duas
 *    fatias se separam mesmo em preto e branco, ou para quem confunde justamente aqueles matizes;
 * 2. **número escrito** em cada barra e em cada fatia, em vez de só a altura e o ângulo;
 * 3. **tabela** com os mesmos números, a um clique.
 *
 * As cores vêm de `--chart-1` a `--chart-5`, que o padrão visual escolhido redefine. Elas são
 * `oklch(...)` no CSS, então vão direto no `fill`: dentro de `hsl(...)` virariam CSS inválido e o
 * SVG cairia no preto.
 *
 * O `role="img"` com o resumo no rótulo faz o leitor de tela anunciar o gráfico como uma figura e
 * não tentar ler o SVG por dentro, que não diria nada.
 */

/** Os rótulos de status, iguais aos do `StatusBadge`: a legenda nunca mostra a chave crua. */
const ROTULO_DO_STATUS: Record<string, ChaveBase> = {
  pendente: "status.pendente",
  visualizada: "status.visualizada",
  em_analise: "status.emAnalise",
  aprovada: "status.aprovada",
  rejeitada: "status.rejeitada",
  cancelada: "status.cancelada",
};

const configVisaoGeral = {
  total: { label: "admin.graficosRelatorios.total", color: "var(--chart-1)" },
} satisfies ChartConfig;

const configCandidaturas = {
  total: { label: "admin.graficosRelatorios.candidaturas", color: "var(--chart-2)" },
} satisfies ChartConfig;

type RelatoriosChartsProps = {
  visaoGeral: { categoria: string; total: number }[];
  candidaturasPorStatus: CandidaturaPorStatus[];
};

export function GraficosRelatorios({ visaoGeral, candidaturasPorStatus }: RelatoriosChartsProps) {
  const { t } = useIdioma();
  // Pode haver dois gráficos na mesma tela, e o id de uma `<pattern>` tem de ser único no documento.
  const prefixo = useId().replace(/:/g, "");

  const dadosCandidaturas = candidaturasPorStatus.map((item) => ({
    status: ROTULO_DO_STATUS[item.status] ? t(ROTULO_DO_STATUS[item.status]) : item.status,
    total: Number(item.total),
  }));

  const resumo = (linhas: ReadonlyArray<{ nome: string; total: number }>) =>
    linhas.map((linha) => `${linha.nome}: ${linha.total}`).join("; ");

  const linhasVisaoGeral = visaoGeral.map((item) => ({ nome: item.categoria, total: item.total }));
  const linhasCandidaturas = dadosCandidaturas.map((item) => ({ nome: item.status, total: item.total }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t("admin.graficosRelatorios.visaoGeralDaPlataforma")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={configVisaoGeral}
            className="max-h-72 w-full"
            role="img"
            aria-label={`${t("admin.graficosRelatorios.visaoGeralDaPlataforma")}. ${resumo(linhasVisaoGeral)}`}
          >
            <BarChart data={visaoGeral}>
              <defs>
                <HachurasDeGrafico prefixo={prefixo} />
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="categoria"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill={preenchimentoDaSerie(prefixo, 0)} radius={4}>
                {/* O número escrito: a altura da barra sozinha exige comparar com o eixo. */}
                <LabelList dataKey="total" position="top" className="fill-foreground text-xs" />
              </Bar>
            </BarChart>
          </ChartContainer>

          <TabelaDoGrafico
            titulo={t("admin.graficosRelatorios.visaoGeralDaPlataforma")}
            colunaNome={t("admin.graficosRelatorios.categoria")}
            linhas={linhasVisaoGeral}
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t("admin.graficosRelatorios.candidaturasPorStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          {dadosCandidaturas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("admin.graficosRelatorios.aindaNaoHaCandidaturas")}
            </p>
          ) : (
            <>
              <ChartContainer
                config={configCandidaturas}
                className="max-h-72 w-full"
                role="img"
                aria-label={`${t("admin.graficosRelatorios.candidaturasPorStatus")}. ${resumo(linhasCandidaturas)}`}
              >
                <PieChart>
                  <defs>
                    <HachurasDeGrafico prefixo={prefixo} />
                  </defs>
                      <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                  <Pie
                    data={dadosCandidaturas}
                    dataKey="total"
                    nameKey="status"
                    innerRadius={50}
                    label={({ value }: { value?: number }) => String(value ?? "")}
                    labelLine={false}
                  >
                    {dadosCandidaturas.map((entry, index) => (
                      <Cell key={entry.status} fill={preenchimentoDaSerie(prefixo, index)} />
                    ))}
                  </Pie>
                  {/* Legenda visível: o gráfico não pode depender só da cor da fatia
                      para ser compreendido (WCAG 1.4.1). */}
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} className="flex-wrap gap-x-4 gap-y-1" />
                </PieChart>
              </ChartContainer>

              <TabelaDoGrafico
                titulo={t("admin.graficosRelatorios.candidaturasPorStatus")}
                colunaNome={t("admin.graficosRelatorios.status")}
                linhas={linhasCandidaturas}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
