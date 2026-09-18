import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, RefreshCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { AvisoAprovacaoEmpresa } from "@/components/perfil/AvisoAprovacaoEmpresa";
import { useSessao } from "@/hooks/useSessao";
import type { Empresa } from "@/types";

/**
 * Tela exibida pelo `EstruturaApp` no lugar do app enquanto a empresa não está aprovada (pendente,
 * reprovada ou suspensa). Não usa `CabecalhoApp` nem `SuporteRodape`: nenhum link para feed, vagas,
 * mensagens ou perfil pode aparecer atrás dela, só a marca, o status e a saída da conta. O rodapé
 * de suporte ficou de fora porque a maioria dos links levaria de volta a esta tela; o contato por
 * e-mail resolve.
 */
export function TelaStatusEmpresa({ empresa }: { empresa: Empresa }) {
  const { sair } = useSessao();
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(false);

  const pendente = empresa.statusAprovacao === "pendente";

  async function sairDaConta() {
    await sair();
    navigate({ to: "/" });
  }

  /**
   * Recarrega a página inteira, e não só a sessão: alguma query montada antes desta tela pode ter
   * guardado um 403 em cache, e o reload garante estado limpo. Se a empresa já foi aprovada, o
   * `EstruturaApp` libera o app; senão, esta tela volta.
   */
  function verificarStatus() {
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
                <Button variant="outline" onClick={verificarStatus} disabled={verificando}>
                  <RefreshCcw className={verificando ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
                  Verificar novamente
                </Button>
              ) : null}
              <Button variant="destructive" onClick={() => void sairDaConta()}>
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
