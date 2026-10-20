import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PainelAcessibilidade } from "@/components/acessibilidade/PainelAcessibilidade";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useSessao } from "@/hooks/useSessao";
import acessibilidadeService, { preferenciasParaApi } from "@/services/acessibilidade.service";
import { extrairMensagemErro } from "@/services/api";
import { metaPagina, SeletorIdioma, dic, useT } from "@/i18n";

export const Route = createFileRoute("/boas-vindas")({
  head: () => metaPagina(dic().boasVindas.meta),
  component: BoasVindas,
});

function BoasVindas() {
  const t = useT().boasVindas;
  const { rascunho, salvar } = useAcessibilidade();
  const { usuario, atualizar, autenticado } = useSessao();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-secondary">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <SeletorIdioma compacto id="seletor-idioma-boas-vindas" />
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">{t.passo}</p>
        <h1 className="mt-2 text-3xl font-extrabold">
          {usuario?.nome ? t.boasVindasNome(usuario.nome.split(" ")[0]) : t.boasVindas}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {t.texto}
        </p>

        <Card className="mt-8 shadow-card">
          <CardContent className="p-5 sm:p-6">
            <PainelAcessibilidade />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 mt-8 flex flex-wrap gap-3 border-t border-border bg-secondary py-4">
          <Button
            className="min-h-12 text-base"
            onClick={async () => {
              salvar();
              if (autenticado) {
                try {
                  await acessibilidadeService.salvar(preferenciasParaApi(rascunho));

                } catch (erro) {
                  toast.error(extrairMensagemErro(erro, t.erroSalvar));
                }
              }
              atualizar({ onboarded: true });
              toast.success(t.salvo);
              navigate({ to: "/feed" });
            }}
          >
            <Check aria-hidden="true" /> {t.salvarEIr}
          </Button>
          <Button
            variant="ghost"
            className="min-h-12 text-base"
            onClick={() => navigate({ to: "/feed" })}
          >
            {t.pular} <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </main>
    </div>
  );
}
