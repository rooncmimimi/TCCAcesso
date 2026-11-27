import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TextosCadastro } from "@/components/cadastro/idioma";

/**
 * Aviso de que já existe conta com o e-mail digitado, com o caminho para entrar nela.
 *
 * Antes, quem já tinha conta de candidato e tentava se cadastrar de novo (por exemplo, para chegar à
 * conta de empresa) só via um aviso passageiro de "e-mail já cadastrado" no fim da segunda etapa, sem
 * saída. Aqui o aviso fica na tela, é anunciado (`role="alert"`) e traz o botão para entrar — que, no
 * caminho "Sou empresa", leva a intenção junto (`depois`) e continua na empresa depois do login.
 */
export function AvisoEmailJaCadastrado({ t, depois }: { t: TextosCadastro; depois?: "empresa" }) {
  return (
    <div role="alert" className="mt-4 space-y-3 rounded-xl border-2 border-primary/40 bg-primary-soft/40 p-4">
      <p className="text-sm font-semibold">{t.emailJaTemConta}</p>
      <Button asChild className="min-h-11 gap-2">
        <Link to="/entrar" search={{ depois }}>
          <LogIn className="size-4" aria-hidden="true" /> {t.entrarComEstaConta}
        </Link>
      </Button>
    </div>
  );
}
