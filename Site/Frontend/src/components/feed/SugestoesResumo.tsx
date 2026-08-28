import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Compass, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { seguidoresService } from "@/services/empresas.service";

/** Prévia compacta de "Descobrir" na barra lateral do feed — só 3 pessoas, com link para a página completa. */
export function SugestoesResumo() {
  const { data, isLoading } = useQuery({
    queryKey: ["descobrir-pessoas-resumo"],
    queryFn: () => seguidoresService.sugestoes(3),
  });

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Compass className="size-4 text-primary" aria-hidden="true" /> Pessoas para conhecer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando…
          </div>
        ) : (
          <ul className="space-y-2">
            {data?.map((pessoa) => (
              <li key={pessoa.id}>
                <Link
                  to="/perfil/$usuarioId"
                  params={{ usuarioId: pessoa.id }}
                  className="flex items-center gap-2 rounded-lg py-1 hover:bg-secondary focus-visible:bg-secondary"
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={urlArquivo(pessoa.fotoPerfil)} alt="" />
                    <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                      {initials(pessoa.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 truncate text-sm font-medium">{pessoa.nome}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="ghost" size="sm" className="w-full">
          <Link to="/descobrir">Ver mais sugestões</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
