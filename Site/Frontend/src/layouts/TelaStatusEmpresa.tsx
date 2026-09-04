import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, RefreshCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { AvisoAprovacaoEmpresa } from "@/components/perfil/AvisoAprovacaoEmpresa";
import { useSession } from "@/contexts/SessionContext";
import type { Empresa } from "@/types";

/**
 * Tela dedicada exibida por `AppShell` no lugar do app inteiro enquanto a
 * empresa autenticada não está aprovada (`pendente`/`reprovada`/`suspensa`).
 *
 * Deliberadamente NÃO usa `AppHeader`/`SuporteRodape`: nenhum link de
 * navegação para feed, vagas, mensagens ou o menu de perfil pode aparecer
 * "atrás" desta tela — só a marca, o status e a saída da conta. Sem rodapé
 * de suporte por decisão consciente (não pelo esquecimento): a maioria dos
 * seus links leva a rotas também envolvidas por `AppShell`, que voltariam a
 * cair nesta mesma tela — um "Fale conosco" por e-mail cobre a necessidade
 * de contato sem gerar um link que não leva a lugar nenhum.
 */
export function TelaStatusEmpresa({ empresa }: { empresa: Empresa }) {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(false);

  const pendente = empresa.statusAprovacao === "pendente";

  async function handleSair() {
    await signOut();
    navigate({ to: "/" });
  }

  /**
   * Recarrega a página inteira (não só `recarregar()` do `SessionContext`)
   * de propósito: um `useQuery` de qualquer página que tenha chegado a
   * montar antes desta tela assumir a tela (ex.: a janela entre o app abrir
   * e a sessão hidratar) pode ter ficado com um 403 já em cache; um reload
   * completo garante estado limpo — nenhuma query antiga, nenhum cache
   * inconsistente — e já busca a sessão do zero. Se um administrador já
   * aprovou o cadastro, o próprio `AppShell` libera o app normalmente; caso
   * contrário, esta mesma tela volta a aparecer.
   */
  function handleVerificar() {
    setVerificando(true);
    window.location.reload();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <Logo />

      <main className="w-full max-w-lg">
        <AvisoAprovacaoEmpresa
          empresa={empresa}
          acoes={
            <>
              {pendente ? (
                <Button variant="outline" onClick={handleVerificar} disabled={verificando}>
                  <RefreshCcw className={verificando ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
                  Verificar novamente
                </Button>
              ) : null}
              <Button variant="destructive" onClick={() => void handleSair()}>
                <LogOut className="size-4" aria-hidden="true" />
                Sair da conta
              </Button>
            </>
          }
        />
      </main>

      <a
        href="mailto:projetoacessoinclusivo@gmail.com"
        className="text-sm font-semibold text-muted-foreground underline-offset-2 hover:underline"
      >
        Fale conosco
      </a>
    </div>
  );
}
