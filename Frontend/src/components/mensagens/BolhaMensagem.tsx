import { Check, CheckCheck } from "lucide-react";
import type { Mensagem } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { formatarHora } from "./utils";

export function BolhaMensagem({ mensagem, propria }: { mensagem: Mensagem; propria: boolean }) {
  return (
    <li className={cn("flex", propria ? "justify-end" : "justify-start")}>
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
    </li>
  );
}
