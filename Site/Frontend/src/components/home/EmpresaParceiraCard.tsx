import { urlArquivo } from "@/services/uploads.service";
import type { Empresa } from "@/types";

/** Card de empresa parceira exibido na página inicial. */
export function EmpresaParceiraCard({ empresa }: { empresa: Empresa }) {
  const nome = empresa.nomeFantasia ?? empresa.razaoSocial;
  const logo = urlArquivo(empresa.logo);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border p-4">
      {logo ? (
        <img
          src={logo}
          alt={`Logo de ${nome}`}
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
        <span className="block truncate font-bold">{nome}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {empresa.setor ?? "Empresa parceira"}
          {typeof empresa.totalVagas === "number" ? ` · ${empresa.totalVagas} vagas` : ""}
        </span>
      </span>
    </div>
  );
}
