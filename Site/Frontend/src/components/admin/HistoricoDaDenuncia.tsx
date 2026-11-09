import type { EventoDaDenuncia } from "@/services/denuncia.service";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Histórico de tratamento da denúncia, do mais antigo ao mais novo: o registro dela e tudo o que a
 * moderação fez depois (assumir, resolver, rejeitar, arquivar, abrir o contexto de uma mensagem). Vem dos
 * registros de auditoria; nada é inventado aqui.
 */
export function HistoricoDaDenuncia({
  registradaEm,
  denunciante,
  eventos,
}: {
  registradaEm: string;
  denunciante: string | null;
  eventos: EventoDaDenuncia[];
}) {
  const { t } = useIdioma();
  const quando = (data: string) => new Date(data).toLocaleString("pt-BR");

  return (
    <ol className="mt-3 space-y-3" aria-label={t("admin.historicoDaDenuncia.historicoDeTratamento")}>
      <li className="border-l-2 border-border pl-3 text-sm">
        <p className="font-semibold">Denúncia registrada{denunciante ? ` por ${denunciante}` : ""}</p>
        <p className="text-xs text-muted-foreground">
          <time dateTime={registradaEm}>{quando(registradaEm)}</time>
        </p>
      </li>

      {eventos.map((evento) => (
        <li key={evento.id} className="border-l-2 border-primary pl-3 text-sm">
          <p className="font-semibold">{evento.descricao ?? evento.acao}</p>
          <p className="text-xs text-muted-foreground">
            <time dateTime={evento.criadoEm}>{quando(evento.criadoEm)}</time>
            {evento.administrador ? ` · ${evento.administrador.nome}` : ""}
          </p>
        </li>
      ))}

      {eventos.length === 0 && (
        <li className="pl-3 text-sm text-muted-foreground">{t("admin.historicoDaDenuncia.ninguemTratouEstaDenunciaAinda")}</li>
      )}
    </ol>
  );
}
