import { Search } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversa } from "@/lib/api-types";
import { initials } from "@/lib/session";
import { cn } from "@/lib/utils";
import { fotoParticipante, formatarDataRelativa, nomeParticipante, participanteOposto } from "./utils";

type ListaConversasProps = {
  conversas: Conversa[];
  usuarioId: string | null;
  conversaSelecionadaId: string | null;
  carregando: boolean;
  erro: boolean;
  mensagemErro?: string;
  onSelecionar: (conversa: Conversa) => void;
};

export function ListaConversas({
  conversas,
  usuarioId,
  conversaSelecionadaId,
  carregando,
  erro,
  mensagemErro,
  onSelecionar,
}: ListaConversasProps) {
  const [busca, setBusca] = useState("");

  const filtradas = conversas.filter((conversa) => {
    if (!busca.trim()) return true;
    const nome = nomeParticipante(participanteOposto(conversa, usuarioId));
    return nome.toLowerCase().includes(busca.trim().toLowerCase());
  });

  return (
    <nav aria-label="Lista de conversas" className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <label htmlFor="buscar-conversas" className="sr-only">
          Buscar conversas
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="buscar-conversas"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar conversas…"
            className="h-11 pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {carregando && (
          <ul className="space-y-1 p-2" aria-label="Carregando conversas">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!carregando && erro && (
          <Alert variant="destructive" className="m-3">
            <AlertTitle>Não foi possível carregar as conversas</AlertTitle>
            <AlertDescription>{mensagemErro ?? "Tente novamente em instantes."}</AlertDescription>
          </Alert>
        )}

        {!carregando && !erro && filtradas.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground" role="status">
            {conversas.length === 0
              ? "Você ainda não tem conversas. Candidate-se a uma vaga para começar a conversar com empresas."
              : "Nenhuma conversa encontrada para essa busca."}
          </p>
        )}

        {!carregando && !erro && filtradas.length > 0 && (
          <ul className="space-y-0.5 p-2">
            {filtradas.map((conversa) => {
              const contato = participanteOposto(conversa, usuarioId);
              const nome = nomeParticipante(contato);
              const foto = fotoParticipante(contato);
              const ativa = conversa.id === conversaSelecionadaId;
              const naoLidas = conversa.mensagensNaoLidas ?? 0;
              return (
                <li key={conversa.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionar(conversa)}
                    aria-current={ativa ? "true" : undefined}
                    className={cn(
                      "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 text-left transition-colors min-h-11",
                      ativa ? "bg-primary-soft" : "hover:bg-secondary",
                    )}
                  >
                    <Avatar className="size-11 shrink-0">
                      {foto && <AvatarImage src={foto} alt="" />}
                      <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                        {initials(nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className={cn("truncate", naoLidas > 0 ? "font-extrabold" : "font-bold")}>{nome}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {conversa.ultimaMensagemPrevia || "Sem mensagens ainda"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">{formatarDataRelativa(conversa.updated_at)}</p>
                      {naoLidas > 0 && (
                        <Badge className="mt-1" aria-label={`${naoLidas} mensagens não lidas`}>
                          {naoLidas}
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
