import { BadgeCheck } from "lucide-react";
import { urlArquivo } from "@/utils/arquivos";
import { useT } from "@/i18n";
import type { Empresa } from "@/types";

/** Card de empresa parceira exibido na página inicial. */
export function EmpresaParceiraCard({ empresa }: { empresa: Empresa }) {
  const t = useT();
  const nome = empresa.nomeFantasia ?? empresa.razaoSocial;
  const logo = urlArquivo(empresa.logo);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border p-4">
      {logo ? (
        <img
          src={logo}
          alt={t.vagas.logoDe(nome)}
          className="size-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft font-display font-extrabold text-primary"
        >
          {nome?.[0] ?? "?"}
        </span>
      )}
      <span className="min-w-0">
        <span className="flex items-center gap-1 truncate font-bold">
          <span className="truncate">{nome}</span>
          {empresa.empresaVerificada && (
            <span className="inline-flex shrink-0 items-center text-primary" title={t.comum.empresaVerificadaTitulo}>
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t.comum.empresaVerificada}</span>
            </span>
          )}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {empresa.setor ?? t.vagas.empresaParceira}
          {typeof empresa.totalVagas === "number" ? ` · ${t.vagas.totalVagas(empresa.totalVagas)}` : ""}
        </span>
      </span>
    </div>
  );
}
