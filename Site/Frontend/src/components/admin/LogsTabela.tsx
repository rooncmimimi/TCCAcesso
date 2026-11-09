import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIdioma } from "@/hooks/useIdioma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { DetalheLogSheet } from "@/components/admin/DetalheLogSheet";
import { listarLogs, type LogAdmin } from "@/services/admin.service";
import { formatarDataHora } from "@/utils/formatacao";
import { ListaCarregando, ListaComErro, ListaVazia } from "@/components/ui/estados-de-lista";

/**
 * Visualizador de `registros_auditoria`, somente leitura: os registros são imutáveis e não há rota de
 * escrita em nenhuma camada. Com `entidadeId` e `entidadeTipo`, mostra só os logs daquele recurso;
 * é reaproveitado nos detalhes de usuário, publicação e comentário.
 */
export function LogsTabela({
  entidadeId,
  entidadeTipo,
}: { entidadeId?: string; entidadeTipo?: string } = {}) {
  const { t } = useIdioma();
  const [pagina, setPagina] = useState(1);
  const [acao, setAcao] = useState("");
  const [detalhe, setDetalhe] = useState<LogAdmin | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "logs", pagina, acao, entidadeId, entidadeTipo],
    queryFn: () =>
      listarLogs({
        page: pagina,
        limit: 10,
        acao: acao || undefined,
        entidadeId,
        entidadeTipo,
      }),
  });

  const logs = data?.logs ?? [];

  return (
    <div>
      {!entidadeId && (
        <form
          className="flex flex-wrap items-end gap-3 p-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            setPagina(1);
          }}
        >
          <div className="min-w-56">
            <Label htmlFor="filtro-acao">{t("admin.logsTabela.acao")}</Label>
            <Input
              id="filtro-acao"
              value={acao}
              onChange={(evento) => setAcao(evento.target.value)}
              placeholder="Ex.: BLOQUEAR_USUARIO"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="min-h-11">
            Filtrar
          </Button>
        </form>
      )}

      {isLoading ? (
        <ListaCarregando rotulo={t("admin.logsTabela.carregandoOsRegistrosDe")} linhas={5} />
      ) : isError ? (
        <ListaComErro mensagem={t("admin.logsTabela.naoFoiPossivelCarregarOsLogs")} aoTentarDeNovo={() => refetch()} />
      ) : logs.length === 0 ? (
        <ListaVazia icone={ScrollText} mensagem={t("admin.logsTabela.nenhumRegistroDeAuditoria")} />
      ) : (
        <>
          <Table>
            <caption className="sr-only">{t("admin.logsTabela.registrosDeAuditoria")}</caption>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.logsTabela.acao")}</TableHead>
                <TableHead>{t("admin.logsTabela.entidade")}</TableHead>
                <TableHead>{t("admin.logsTabela.admin")}</TableHead>
                <TableHead>{t("vagaDetalhe.descricao")}</TableHead>
                <TableHead>{t("admin.logsTabela.data")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-secondary/50"
                  onClick={() => setDetalhe(log)}
                >
                  <TableCell className="font-mono text-xs font-semibold">
                    <button
                      type="button"
                      className="text-left underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={(evento) => {
                        evento.stopPropagation();
                        setDetalhe(log);
                      }}
                    >
                      {log.acao}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.entidadeTipo ?? "—"}
                  </TableCell>
                  <TableCell>{log.administrador?.nome ?? "Conta removida"}</TableCell>
                  <TableCell className="max-w-72 truncate">{log.descricao ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatarDataHora(log.criadoEm)}
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

      <DetalheLogSheet log={detalhe} open={Boolean(detalhe)} onOpenChange={(aberto) => !aberto && setDetalhe(null)} />
    </div>
  );
}
