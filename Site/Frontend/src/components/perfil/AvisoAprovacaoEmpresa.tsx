import { useEffect, useRef } from "react";
import { Hourglass, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Exibida no lugar do painel/perfil enquanto a empresa não está aprovada.
 * O heading recebe foco ao montar para ser lido automaticamente pelo
 * sistema de voz existente (useAutoSpeech reage a `focusin` + `data-speak`).
 */
export function AvisoAprovacaoEmpresa({
  empresa,
}: {
  empresa: { statusAprovacao?: string; motivoReprovacao?: string | null };
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const pendente = empresa.statusAprovacao === "pendente";

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <Card className="mt-4 shadow-card">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
        <span
          aria-hidden="true"
          className={`grid size-14 place-items-center rounded-full ${
            pendente ? "bg-amber-100 text-amber-700" : "bg-destructive/10 text-destructive"
          }`}
        >
          {pendente ? <Hourglass className="size-7" /> : <ShieldAlert className="size-7" />}
        </span>

        <h1
          ref={tituloRef}
          tabIndex={-1}
          data-speak={
            pendente
              ? "Sua empresa está em análise. Seu cadastro foi recebido e está aguardando a aprovação de um administrador do ACESSO. Você receberá uma notificação quando a análise for concluída."
              : `Seu cadastro empresarial não foi aprovado.${empresa.motivoReprovacao ? ` Motivo: ${empresa.motivoReprovacao}` : ""}`
          }
          className="text-2xl font-extrabold outline-none"
        >
          {pendente ? "Sua empresa está em análise" : "Seu cadastro empresarial não foi aprovado"}
        </h1>

        <p className="max-w-md text-muted-foreground">
          {pendente
            ? "Seu cadastro foi recebido e está aguardando a aprovação de um administrador do ACESSO. Você receberá uma notificação quando a análise for concluída. Enquanto isso, publicar vagas, editar o perfil da empresa e visualizar candidaturas ficam indisponíveis."
            : "A equipe do ACESSO analisou seu cadastro e ele não foi aprovado. Os recursos empresariais (publicar vagas, editar o perfil, visualizar candidaturas) ficam indisponíveis enquanto esse status não mudar."}
        </p>

        {!pendente && empresa.motivoReprovacao ? (
          <p className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <strong>Motivo:</strong> {empresa.motivoReprovacao}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
