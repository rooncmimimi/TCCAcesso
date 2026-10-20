import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { rotuloOuValor } from "@/components/admin/rotulos";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import denunciaService, {
  type EntidadeDenunciaTipo,
  type StatusDenuncia,
} from "@/services/denuncia.service";
import { useT } from "@/i18n";
import { formatarDataLocal } from "@/utils/formatacao";

const STATUS_OPCOES: (StatusDenuncia | "todos")[] = [
  "todos",
  "pendente",
  "em_analise",
  "resolvida",
  "rejeitada",
  "arquivada",
];

const TIPO_OPCOES: (EntidadeDenunciaTipo | "todos")[] = [
  "todos",
  "postagem",
  "comentario",
  "usuario",
  "mensagem",
  "vaga",
  "empresa",
];

const STATUS_TOM: Record<StatusDenuncia, "sucesso" | "atencao" | "perigo" | "neutro"> = {
  pendente: "atencao",
  em_analise: "atencao",
  resolvida: "sucesso",
  rejeitada: "perigo",
  arquivada: "neutro",
};

/** Fila de denúncias, com filtros por status e tipo e link para o detalhe de cada uma. */
export function DenunciasTabela() {
  const t = useT();
  const td = t.admin.denuncias;
  const [pagina, setPagina] = useState(1);
  const [status, setStatus] = useState<(typeof STATUS_OPCOES)[number]>("todos");
  const [tipo, setTipo] = useState<(typeof TIPO_OPCOES)[number]>("todos");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "denuncias", pagina, status, tipo],
    queryFn: () =>
      denunciaService.listarDenuncias({
        page: pagina,
        limit: 10,
        status: status === "todos" ? undefined : status,
        entidadeTipo: tipo === "todos" ? undefined : tipo,
      }),
  });

  const denuncias = data?.denuncias ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 p-4">
        <div className="w-48">
          <Select
            value={status}
            onValueChange={(valor) => {
              setStatus(valor as (typeof STATUS_OPCOES)[number]);
              setPagina(1);
            }}
          >
            <SelectTrigger aria-label={td.filtroStatusAria}>
              <SelectValue placeholder={td.statusPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPCOES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "todos" ? td.todosStatus : td.status[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={tipo}
            onValueChange={(valor) => {
              setTipo(valor as (typeof TIPO_OPCOES)[number]);
              setPagina(1);
            }}
          >
            <SelectTrigger aria-label={td.filtroTipoAria}>
              <SelectValue placeholder={td.tipoPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OPCOES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "todos" ? td.todosTipos : td.tipos[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
          {Array.from({ length: 5 }).map((_, indice) => (
            <Skeleton key={indice} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{td.erro}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t.comum.tentarNovamente}
          </Button>
        </div>
      ) : denuncias.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Flag className="size-8" aria-hidden="true" />
          <p className="text-sm">{td.vazio}</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td.colunas.tipo}</TableHead>
                <TableHead>{td.colunas.motivo}</TableHead>
                <TableHead>{td.colunas.denunciante}</TableHead>
                <TableHead>{td.colunas.status}</TableHead>
                <TableHead>{td.colunas.data}</TableHead>
                <TableHead className="text-right">{t.admin.comum.acoes}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {denuncias.map((denuncia) => (
                <TableRow key={denuncia.id}>
                  <TableCell>{rotuloOuValor(td.tipos, denuncia.entidadeTipo)}</TableCell>
                  <TableCell>{rotuloOuValor(t.moderacao.motivos, denuncia.motivo)}</TableCell>
                  <TableCell className="max-w-40 truncate">{denuncia.denunciante?.nome ?? t.admin.comum.usuarioRemovido}</TableCell>
                  <TableCell>
                    <StatusBadge tom={STATUS_TOM[denuncia.status]}>
                      {rotuloOuValor(td.status, denuncia.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatarDataLocal(denuncia.criadoEm)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/admin/denuncias/$denunciaId" params={{ denunciaId: denuncia.id }}>
                        {t.admin.comum.verDetalhes}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <PaginacaoTabela
            pagina={data?.pagina ?? 1}
            totalPaginas={data?.totalPaginas ?? 1}
            total={data?.total ?? 0}
            onPaginaChange={setPagina}
          />
        </>
      )}
    </div>
  );
}
