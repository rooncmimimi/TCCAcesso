import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * O que a pessoa vê, no lugar de uma ação que pede "senha atual", quando a conta entra só pelo
 * Google e ainda não tem senha (etapa 6 da auditoria do login com Google).
 *
 * Diz o motivo e leva ao único caminho: definir uma senha, em Configurações → Alterar senha, com um
 * código enviado ao e-mail da conta. Mostrar o campo "senha atual" aqui seria um beco sem saída: não
 * há o que digitar.
 */
export function AvisoSemSenha({ recurso }: { recurso: string }) {
  return (
    <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-secondary/40 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-semibold">Sua conta entra com o Google e ainda não tem senha.</span>{" "}
          <span className="text-muted-foreground">Para {recurso}, defina uma senha antes.</span>
        </p>
      </div>
      <Button asChild variant="outline" className="min-h-11">
        <Link to="/configuracoes/senha">Definir senha</Link>
      </Button>
    </div>
  );
}
