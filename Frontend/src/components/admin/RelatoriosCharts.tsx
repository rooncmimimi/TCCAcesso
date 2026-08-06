import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricasAdmin } from "@/types";

const CORES = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

/** Gráficos de relatórios administrativos com resumo textual alternativo (WCAG 1.1.1). */
export function RelatoriosCharts({ metricas }: { metricas: MetricasAdmin }) {
  const geral = [
    { nome: "Usuários", total: metricas.usuarios ?? 0 },
    { nome: "Candidatos", total: metricas.candidatos ?? 0 },
    { nome: "Empresas", total: metricas.empresas ?? 0 },
    { nome: "Vagas", total: metricas.vagas ?? 0 },
    { nome: "Publicações", total: metricas.postagens ?? 0 },
    { nome: "Candidaturas", total: metricas.candidaturas ?? 0 },
  ];

  const resumoTextual = geral.map((item) => `${item.nome}: ${item.total}`).join(", ");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Visão geral da plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full" role="img" aria-label={`Gráfico de barras com totais gerais. ${resumoTextual}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geral}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Resumo em texto: {resumoTextual}. Há {metricas.empresasPendentes ?? 0} empresas aguardando aprovação.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Distribuição de usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="h-72 w-full"
            role="img"
            aria-label={`Gráfico de pizza. Candidatos: ${metricas.candidatos ?? 0}. Empresas: ${metricas.empresas ?? 0}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { nome: "Candidatos", valor: metricas.candidatos ?? 0 },
                    { nome: "Empresas", valor: metricas.empresas ?? 0 },
                  ]}
                  dataKey="valor"
                  nameKey="nome"
                  outerRadius={90}
                  label
                >
                  {[0, 1].map((i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Resumo em texto: {metricas.candidatos ?? 0} candidatos e {metricas.empresas ?? 0} empresas cadastradas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
