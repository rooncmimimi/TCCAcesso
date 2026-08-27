import { useState } from "react";
import { Check, CheckCheck, MoreVertical } from "lucide-react";
import type { Mensagem } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { formatarHora } from "./utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DenunciarDialog } from "@/components/moderacao/DenunciarDialog";

export function BolhaMensagem({ mensagem, propria }: { mensagem: Mensagem; propria: boolean }) {
  const [denunciando, setDenunciando] = useState(false);

  return (
    <li className={cn("group flex items-center gap-1", propria ? "justify-end" : "justify-start")}>
      {!propria && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
              aria-label="Mais opções da mensagem"
            >
              <MoreVertical className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDenunciando(true)}
            >
              Denunciar mensagem
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm sm:max-w-[65%]",
          propria
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-secondary text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{mensagem.conteudo}</p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[11px]",
            propria ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          <span>{formatarHora(mensagem.created_at)}</span>
          {propria &&
            (mensagem.lida ? (
              <CheckCheck aria-label="Mensagem lida" className="size-3.5" />
            ) : (
              <Check aria-label="Mensagem enviada" className="size-3.5" />
            ))}
        </div>
      </div>

      {!propria && (
        <DenunciarDialog
          open={denunciando}
          onOpenChange={setDenunciando}
          entidadeTipo="mensagem"
          entidadeId={mensagem.id}
        />
      )}
    </li>
  );
}
