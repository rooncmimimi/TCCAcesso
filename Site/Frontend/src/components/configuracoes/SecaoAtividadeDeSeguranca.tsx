import { useQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dataHoraCurta } from "@/lib/dispositivo";
import segurancaService from "@/services/seguranca.service";
import { useEstadoDaSeguranca } from "@/hooks/useEstadoDaSeguranca";

/**
 * Seção "Atividade de segurança": o histórico recente da própria conta (dispositivo novo confirmado, senha alterada,
 * conta protegida). Nunca mostra código nem token. Só aparece com o recurso ligado.
 */
export function SecaoAtividadeDeSeguranca() {
  const { data: estado } = useEstadoDaSeguranca();

  const { data: eventos, isLoading, isError, refetch } = useQuery({
    queryKey: ["seguranca", "eventos"],
    queryFn: () => segurancaService.listarEventos(20),
    enabled: Boolean(estado?.habilitado),
  });

  if (!estado?.habilitado) return null;

  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-1.5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="size-5" aria-hidden="true" /> Atividade de segurança
        </CardTitle>
        <CardDescription>Os últimos acontecimentos de segurança desta conta. Se algum não foi você, proteja a conta abaixo.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando atividade…
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>Não foi possível carregar a atividade de segurança.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !eventos || eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>
        ) : (
          <ol aria-label="Atividade de segurança, da mais recente para a mais antiga" className="space-y-2">
            {eventos.map((evento) => (
              <li key={evento.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{evento.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={evento.criadoEm}>{dataHoraCurta(evento.criadoEm)}</time>
                  {evento.dispositivo ? ` · ${evento.dispositivo}` : ""}
                  {evento.ip ? ` · IP ${evento.ip}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
