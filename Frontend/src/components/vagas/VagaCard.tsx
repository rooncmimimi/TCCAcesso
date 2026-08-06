import { Link } from "@tanstack/react-router";
import { Heart, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Vaga } from "@/types";
import { cn } from "@/lib/utils";

export function VagaCard({
  vaga,
  favoritada,
  onFavoritar,
  favoritando,
}: {
  vaga: Vaga;
  favoritada: boolean;
  onFavoritar: () => void;
  favoritando: boolean;
}) {
  const nomeEmpresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa";
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");

  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <Link
              to="/vaga/$vagaId"
              params={{ vagaId: vaga.id }}
              className="text-lg font-bold hover:underline focus-visible:underline"
            >
              {vaga.titulo}
            </Link>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {nomeEmpresa} {vaga.contrato ? `· ${vaga.contrato}` : ""}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" /> {vaga.modalidade}
              {local ? ` · ${local}` : ""}
            </p>
            <p className="mt-3 line-clamp-2 text-sm">{vaga.descricao}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {vaga.exclusivaPcd && (
                <li>
                  <Badge variant="secondary" className="font-medium">
                    Exclusiva PCD
                  </Badge>
                </li>
              )}
              <li>
                <Badge variant="secondary" className="font-medium">
                  {vaga.status}
                </Badge>
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <Button asChild className="min-h-12 flex-1 sm:flex-none">
              <Link to="/vaga/$vagaId" params={{ vagaId: vaga.id }}>
                Ver vaga
              </Link>
            </Button>
            <Button
              variant="outline"
              className="min-h-12 shrink-0"
              aria-pressed={favoritada}
              aria-label={favoritada ? "Remover vaga dos favoritos" : "Favoritar vaga"}
              disabled={favoritando}
              onClick={onFavoritar}
            >
              <Heart
                className={cn("size-4", favoritada && "fill-primary text-primary")}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
