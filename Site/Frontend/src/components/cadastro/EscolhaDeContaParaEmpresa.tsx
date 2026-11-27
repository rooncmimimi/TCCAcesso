import { Link } from "@tanstack/react-router";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * A pergunta que vem antes do cadastro de uma empresa, para quem não está logado: "você já tem conta de
 * candidato?".
 *
 * A empresa nasce de uma conta de candidato. Antes, "Sou empresa" levava todo mundo direto ao
 * cadastro de candidato — e quem já tinha conta esbarrava em "e-mail já cadastrado", sem saber o que
 * fazer. Aqui os dois caminhos ficam lado a lado, com o mesmo peso:
 *
 * - **já tenho conta** → entra por ela (`/entrar?depois=empresa`) e continua na empresa;
 * - **ainda não tenho** → cria a conta pessoal (`/cadastro/candidato?depois=empresa`), e a empresa vem
 *   logo em seguida.
 */
export function EscolhaDeContaParaEmpresa() {
  const { t } = useIdioma();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">{t("cadastro.empresa.primeiroASuaContaPessoal")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("cadastro.empresa.contaDaEmpresaFicaVinculada")}</p>
      </div>

      <section aria-labelledby="empresa-ja-tenho" className="space-y-3 rounded-xl border-2 border-primary/40 bg-primary-soft/40 p-4">
        <h2 id="empresa-ja-tenho" className="flex items-center gap-2 text-base font-bold">
          <LogIn className="size-5 shrink-0 text-primary" aria-hidden="true" /> {t("cadastro.empresa.jaTenhoContaDeCandidato")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("cadastro.empresa.jaTenhoDescricao")}</p>
        <Button asChild className="min-h-12 w-full text-base">
          <Link to="/entrar" search={{ depois: "empresa" }}>
            {t("cadastro.empresa.entrarEContinuar")} <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>

      <section aria-labelledby="empresa-ainda-nao" className="space-y-3 rounded-xl border border-border p-4">
        <h2 id="empresa-ainda-nao" className="flex items-center gap-2 text-base font-bold">
          <UserPlus className="size-5 shrink-0 text-primary" aria-hidden="true" /> {t("cadastro.empresa.aindaNaoTenhoConta")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("cadastro.empresa.aindaNaoTenhoDescricao")}</p>
        <Button asChild variant="outline" className="min-h-12 w-full text-base">
          <Link to="/cadastro/candidato" search={{ depois: "empresa" }}>
            {t("cadastro.empresa.criarMinhaContaDeCandidato")} <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
