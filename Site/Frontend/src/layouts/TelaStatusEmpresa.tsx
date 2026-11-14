import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, RefreshCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { AvisoAprovacaoEmpresa } from "@/components/perfil/AvisoAprovacaoEmpresa";
import { useSessao } from "@/hooks/useSessao";
import type { Empresa } from "@/types";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Tela exibida pelo `EstruturaApp` no lugar do app enquanto a empresa não está aprovada (pendente,
 * reprovada ou suspensa). Não usa `CabecalhoApp` nem `SuporteRodape`: nenhum link para feed, vagas,
 * mensagens ou perfil pode aparecer atrás dela, só a marca, o status e a saída da conta. O rodapé
 * de suporte ficou de fora porque a maioria dos links levaria de volta a esta tela; o contato por
 * e-mail resolve.
 */
export function TelaStatusEmpresa({ empresa }: { empresa: Empresa }) {
  const { t } = useIdioma();
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

      {/* `id="conteudo"` e `tabIndex={-1}` pelo mesmo motivo dos outros layouts: o `<main>` é um marco
          de verdade e pode receber o foco. O link "pular para o conteúdo" NÃO entra aqui: ele existe
          para contornar bloco repetido (WCAG 2.4.1), e nesta tela não há nenhum — antes do conteúdo
          só vem a marca, que nem foco recebe. Um link que avança para o elemento seguinte seria uma
          parada de tabulação a troco de nada. */}
      <main id="conteudo" tabIndex={-1} className="w-full max-w-lg outline-none">
        <AvisoAprovacaoEmpresa
          empresa={empresa}
          acoes={
            <>
              {pendente ? (
                <Button variant="outline" onClick={verificarStatus} disabled={verificando}>
                  <RefreshCcw className={verificando ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
                  {t("layouts.telaStatusEmpresa.verificarNovamente")}
                </Button>
              ) : null}
              <Button variant="destructive" onClick={() => void sairDaConta()}>
                <LogOut className="size-4" aria-hidden="true" />
                {t("layouts.telaStatusEmpresa.sairDaConta")}
              </Button>
            </>
          }
        />
      </main>

      <a
        href="mailto:projetoacessoinclusivo@gmail.com"
        className="text-sm font-semibold text-muted-foreground underline-offset-2 hover:underline"
      >
        {t("rodape.faleConosco")}
      </a>
    </div>
  );
}
