import { Briefcase, Building2, FileCheck2, Users } from "lucide-react";
import type { HomePublica } from "@/types";

const ITENS: {
  chave: keyof NonNullable<HomePublica["estatisticas"]>;
  label: string;
  icon: typeof Users;
}[] = [
  { chave: "usuarios", label: "usuários cadastrados", icon: Users },
  { chave: "vagas", label: "vagas publicadas", icon: Briefcase },
  { chave: "empresas", label: "empresas parceiras", icon: Building2 },
  { chave: "candidaturas", label: "candidaturas enviadas", icon: FileCheck2 },
];

/**
 * Faixa de estatísticas reais da plataforma. Só exibe os itens que vierem
 * preenchidos pela API — nunca inventa números.
 */
export function EstatisticasFaixa({ estatisticas }: { estatisticas?: HomePublica["estatisticas"] }) {
  const visiveis = ITENS.filter(
    (item) => estatisticas && typeof estatisticas[item.chave] === "number",
  );

  if (visiveis.length === 0) return null;

  return (
    <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
      {visiveis.map((item) => (
        <div key={String(item.chave)}>
          <dt className="sr-only">{item.label}</dt>
          <dd className="flex items-start gap-2">
            <item.icon className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="block font-display text-2xl font-extrabold text-primary">
                {Number(estatisticas?.[item.chave]).toLocaleString("pt-BR")}
              </span>
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
