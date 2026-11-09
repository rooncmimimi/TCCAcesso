import { useEffect, useRef, type ReactNode } from "react";
import { Ban, Hourglass, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useIdioma } from "@/hooks/useIdioma";

type EmpresaStatus = {
  statusAprovacao?: string;
  motivoReprovacao?: string | null;
  motivoSuspensao?: string | null;
};

/**
 * Aviso exibido no lugar do painel ou do perfil enquanto a empresa não está aprovada (pendente,
 * reprovada ou suspensa). O título recebe foco ao montar e é lido pelo `useLeituraAutomatica` (que
 * reage a `focusin` e `data-speak`).
 *
 * `acoes` é um espaço opcional para botões como "Sair da conta" e "Verificar novamente": a
 * `TelaStatusEmpresa` usa os dois, e os usos em `PerfilEmpresa` e no dashboard da empresa dispensam
 * "Sair da conta", que já está no cabeçalho.
 */
export function AvisoAprovacaoEmpresa({
  empresa,
  acoes,
}: {
  empresa: EmpresaStatus;
  acoes?: ReactNode;
}) {
  const { t } = useIdioma();
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
    ? t("perfil.avisoAprovacaoEmpresa.suaEmpresaEstaEmAnalise")
    : suspensa
      ? t("perfil.avisoAprovacaoEmpresa.contaEmpresarialSuspensa")
      : t("perfil.avisoAprovacaoEmpresa.seuCadastroEmpresarialNaoFoi");

  const motivo = suspensa ? empresa.motivoSuspensao : empresa.motivoReprovacao;

  const descricaoFalada = pendente
    ? t("perfil.avisoAprovacaoEmpresa.suaEmpresaEstaEmAnaliseSeu")
    : suspensa
      ? `Conta empresarial suspensa. Sua empresa foi suspensa pela moderação do ACESSO.${motivo ? ` Motivo: ${motivo}` : ""}`
      : `Seu cadastro empresarial não foi aprovado.${motivo ? ` Motivo: ${motivo}` : ""}`;

  const descricaoVisivel = pendente
    ? t("perfil.avisoAprovacaoEmpresa.seuCadastroFoiRecebidoEEsta")
    : suspensa
      ? t("perfil.avisoAprovacaoEmpresa.suaEmpresaFoiSuspensaPela")
      : t("perfil.avisoAprovacaoEmpresa.aEquipeDoAcessoAnalisouSeu");

  return (
    <Card className="mt-4 shadow-card">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
        <span
          aria-hidden="true"
          className={`grid size-14 place-items-center rounded-full ${
            pendente ? "bg-warning/15 text-warning-foreground" : "bg-destructive/10 text-destructive"
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
            <strong>{t("perfil.avisoAprovacaoEmpresa.motivo")}</strong> {motivo}
          </p>
        ) : null}

        {acoes ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{acoes}</div> : null}
      </CardContent>
    </Card>
  );
}
