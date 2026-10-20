import { useEffect, useRef, type ReactNode } from "react";
import { Ban, Hourglass, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n";

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
  const ta = useT().perfil.aviso;
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

  const titulo = pendente ? ta.tituloPendente : suspensa ? ta.tituloSuspensa : ta.tituloReprovada;

  const motivo = suspensa ? empresa.motivoSuspensao : empresa.motivoReprovacao;

  const descricaoFalada = pendente
    ? ta.falaPendente
    : suspensa
      ? ta.falaSuspensa(motivo ?? "")
      : ta.falaReprovada(motivo ?? "");

  const descricaoVisivel = pendente ? ta.textoPendente : suspensa ? ta.textoSuspensa : ta.textoReprovada;

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
            <strong>{ta.motivo}:</strong> {motivo}
          </p>
        ) : null}

        {acoes ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{acoes}</div> : null}
      </CardContent>
    </Card>
  );
}
