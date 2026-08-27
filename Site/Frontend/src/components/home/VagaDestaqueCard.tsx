import { Link } from "@tanstack/react-router";
import { CheckCircle2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Vaga } from "@/types";

/** Card compacto de vaga em destaque, usado na página inicial. */
export function VagaDestaqueCard({ vaga }: { vaga: Vaga }) {
  const nomeEmpresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa parceira";
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");

  return (
    <Card className="h-full border-border shadow-none transition-shadow hover:shadow-card">
      <CardContent className="p-5">
        <Link
          to="/vaga/$vagaId"
          params={{ vagaId: vaga.id }}
          className="text-lg font-bold hover:underline focus-visible:underline"
        >
          {vaga.titulo}
        </Link>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {nomeEmpresa} · {vaga.modalidade}
          {local ? ` · ${local}` : ""}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {vaga.exclusivaPcd && (
            <li>
              <Badge variant="secondary" className="gap-1 font-medium">
                <CheckCircle2 className="size-3" aria-hidden="true" /> Exclusiva PCD
              </Badge>
            </li>
          )}
          {vaga.contrato && (
            <li>
              <Badge variant="secondary" className="gap-1 font-medium">
                {vaga.contrato}
              </Badge>
            </li>
          )}
          {local && (
            <li>
              <Badge variant="secondary" className="gap-1 font-medium">
                <MapPin className="size-3" aria-hidden="true" /> {local}
              </Badge>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
