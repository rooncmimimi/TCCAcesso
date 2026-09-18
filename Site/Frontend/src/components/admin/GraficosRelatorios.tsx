import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CandidaturaPorStatus } from "@/services/admin.service";

// As variáveis `--chart-*` guardam valores `oklch(...)` (ver `styles/globals.css`), então são
// usadas direto: dentro de `hsl(...)` virariam CSS inválido, e o `fill` do SVG cairia no preto,
// quase invisível no modo escuro.
const CORES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const configVisaoGeral = {
  total: { label: "Total", color: "var(--chart-1)" },
} satisfies ChartConfig;

const configCandidaturas = {
  total: { label: "Candidaturas", color: "var(--chart-2)" },
} satisfies ChartConfig;

type RelatoriosChartsProps = {
  visaoGeral: { categoria: string; total: number }[];
  candidaturasPorStatus: CandidaturaPorStatus[];
};

export function GraficosRelatorios({ visaoGeral, candidaturasPorStatus }: RelatoriosChartsProps) {
  const dadosCandidaturas = candidaturasPorStatus.map((item) => ({
    status: item.status,
    total: Number(item.total),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Visão geral da plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={configVisaoGeral} className="max-h-72 w-full">
            <BarChart data={visaoGeral}>
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
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Candidaturas por status</CardTitle>
        </CardHeader>
        <CardContent>
          {dadosCandidaturas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ainda não há candidaturas registradas.
            </p>
          ) : (
            <ChartContainer config={configCandidaturas} className="max-h-72 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                <Pie data={dadosCandidaturas} dataKey="total" nameKey="status" innerRadius={50}>
                  {dadosCandidaturas.map((entry, index) => (
                    <Cell key={entry.status} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                {/* Legenda visível: o gráfico não pode depender só da cor da fatia
                    para ser compreendido (WCAG 1.4.1). */}
                <ChartLegend content={<ChartLegendContent nameKey="status" />} className="flex-wrap gap-x-4 gap-y-1" />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
