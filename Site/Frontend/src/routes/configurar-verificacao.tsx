import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { Accessibility } from "lucide-react";

import { Logo } from "@/components/Logo";
import { ConfiguradorTotp } from "@/components/seguranca/ConfiguradorTotp";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessao } from "@/hooks/useSessao";

/**
 * Configuração obrigatória da verificação em duas etapas, para quem a conta exige (administrador).
 *
 * É para onde o login leva o administrador que ainda não a ativou (`destinoAposEntrar`) e para onde o
 * `EstruturaApp` o manda se ele tentar abrir qualquer outra página. O servidor nega todo o painel até a
 * ativação, então não há atalho: configurar é o único caminho, e só exige estar com a sessão aberta (por
 * isso nunca há trava permanente). Fica fora do `EstruturaApp` justamente para não redirecionar para si.
 */
export const Route = createFileRoute("/configurar-verificacao")({
  head: () => ({
    meta: [
      { title: "Ative a verificação em duas etapas — ACESSO" },
      { name: "description", content: "Proteja o acesso administrativo com um aplicativo autenticador." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfigurarVerificacao,
});

function ConfigurarVerificacao() {
  const { usuario, inicializado, autenticado, recarregar, sair } = useSessao();
  const navigate = useNavigate();

  if (!inicializado) {
    return (
      <AutenticacaoLayout className="max-w-lg">
        <div role="status" className="flex items-center gap-3 py-6">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Carregando sua sessão…</p>
        </div>
      </AutenticacaoLayout>
    );
  }

  if (!autenticado || !usuario) {
    return <Navigate to="/entrar" replace />;
  }

  // Já configurada (ou a conta não é obrigada a isso): não há o que fazer aqui.
  if (usuario.mfaConfigurado || !usuario.mfaExigido) {
    return <Navigate to={usuario.tipo === "administrador" ? "/admin" : "/configuracoes/seguranca"} replace />;
  }

  async function concluir() {
    await recarregar();
    void navigate({ to: "/admin", replace: true });
  }

  async function sairDaConta() {
    await sair();
    void navigate({ to: "/entrar", replace: true });
  }

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
          <Logo />
        </Link>
        <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label="Configurações de acessibilidade">
          <Link to="/configuracoes/acessibilidade">
            <Accessibility aria-hidden="true" />
            <span className="hidden sm:inline">Acessibilidade</span>
          </Link>
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-extrabold">Proteja o acesso administrativo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Administradores precisam da verificação em duas etapas antes de usar o painel. Sua senha continua valendo;
              o código do aplicativo é a segunda camada.
            </p>
          </div>

          <ConfiguradorTotp aoConcluir={concluir} />

          <Button type="button" variant="ghost" className="min-h-11 w-full" onClick={sairDaConta}>
            <LogOut aria-hidden="true" /> Sair da conta
          </Button>
        </CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}
