import { useEffect, useRef, type ReactNode } from "react";
import { Ban, Hourglass, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type EmpresaStatus = {
  statusAprovacao?: string;
  motivoReprovacao?: string | null;
  motivoSuspensao?: string | null;
};

/**
 * Conteúdo (ícone + heading + texto) exibido no lugar do painel/perfil
 * enquanto a empresa não está aprovada — cobre os 3 estados que impedem o
 * acesso normal (`pendente`, `reprovada`, `suspensa`). O heading recebe
 * foco ao montar para ser lido automaticamente pelo sistema de voz
 * existente (`useAutoSpeech` reage a `focusin` + `data-speak`), nunca uma
 * chamada manual a `speak()`.
 *
 * `acoes` é um slot opcional (ex.: "Sair da conta", "Verificar novamente")
 * — quem usa este componente decide quais ações fazem sentido no contexto
 * (a tela dedicada de `AppShell` usa as duas; os usos pontuais em
 * `PerfilEmpresa`/`dashboard/empresa`, mantidos como redundância
 * defensiva, não precisam repetir "Sair da conta" porque o cabeçalho ali
 * já tem essa opção).
 */
export function AvisoAprovacaoEmpresa({
  empresa,
  acoes,
}: {
  empresa: EmpresaStatus;
  acoes?: ReactNode;
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const status = empresa.statusAprovacao;
  const pendente = status === "pendente";
  const suspensa = status === "suspensa";

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  const icone = pendente ? (
    <Hourglass className="size-7" />
  ) : suspensa ? (
    <Ban className="size-7" />
  ) : (
    <ShieldAlert className="size-7" />
  );

  const titulo = pendente
    ? "Sua empresa está em análise"
    : suspensa
      ? "Conta empresarial suspensa"
      : "Seu cadastro empresarial não foi aprovado";

  const motivo = suspensa ? empresa.motivoSuspensao : empresa.motivoReprovacao;

  const descricaoFalada = pendente
    ? "Sua empresa está em análise. Seu cadastro foi recebido e está aguardando a aprovação de um administrador do ACESSO. Você receberá uma notificação quando a análise for concluída."
    : suspensa
      ? `Conta empresarial suspensa. Sua empresa foi suspensa pela moderação do ACESSO.${motivo ? ` Motivo: ${motivo}` : ""}`
      : `Seu cadastro empresarial não foi aprovado.${motivo ? ` Motivo: ${motivo}` : ""}`;

  const descricaoVisivel = pendente
    ? "Seu cadastro foi recebido e está aguardando a aprovação de um administrador do ACESSO. Você receberá uma notificação quando a análise for concluída. Enquanto isso, publicar vagas, editar o perfil da empresa e visualizar candidaturas ficam indisponíveis."
    : suspensa
      ? "Sua empresa foi suspensa pela moderação do ACESSO. Enquanto a suspensão estiver ativa, o acesso à plataforma permanece bloqueado."
      : "A equipe do ACESSO analisou seu cadastro e ele não foi aprovado. Os recursos empresariais (publicar vagas, editar o perfil, visualizar candidaturas) ficam indisponíveis enquanto esse status não mudar.";

  return (
    <Card className="mt-4 shadow-card">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
        <span
          aria-hidden="true"
          className={`grid size-14 place-items-center rounded-full ${
            pendente ? "bg-amber-100 text-amber-700" : "bg-destructive/10 text-destructive"
          }`}
        >
          {icone}
        </span>

        <h1
          ref={tituloRef}
          tabIndex={-1}
          data-speak={descricaoFalada}
          className="text-2xl font-extrabold outline-none"
        >
          {titulo}
        </h1>

        <p className="max-w-md text-muted-foreground">{descricaoVisivel}</p>

        {!pendente && motivo ? (
          <p className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <strong>Motivo:</strong> {motivo}
          </p>
        ) : null}

        {acoes ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{acoes}</div> : null}
      </CardContent>
    </Card>
  );
}
