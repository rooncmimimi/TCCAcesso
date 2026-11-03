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
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import denunciaService, {
  MOTIVO_ROTULO,
  type EntidadeDenunciaTipo,
  type MotivoDenuncia,
  type StatusDenuncia,
} from "@/services/denuncia.service";

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

const MOTIVO_OPCOES = Object.keys(MOTIVO_ROTULO) as MotivoDenuncia[];

const ATRIBUICAO_OPCOES = ["todas", "minhas", "sem_responsavel"] as const;
const ATRIBUICAO_ROTULO: Record<(typeof ATRIBUICAO_OPCOES)[number], string> = {
  todas: "Todas as denúncias",
  minhas: "Atribuídas a mim",
  sem_responsavel: "Sem responsável",
};

const STATUS_ROTULO: Record<StatusDenuncia, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  resolvida: "Resolvida",
  rejeitada: "Rejeitada",
  arquivada: "Arquivada",
};

const STATUS_TOM: Record<StatusDenuncia, "sucesso" | "atencao" | "perigo" | "neutro"> = {
  pendente: "atencao",
  em_analise: "atencao",
  resolvida: "sucesso",
  rejeitada: "perigo",
  arquivada: "neutro",
};

const TIPO_ROTULO: Record<EntidadeDenunciaTipo, string> = {
  postagem: "Postagem",
  comentario: "Comentário",
  usuario: "Usuário",
  mensagem: "Mensagem",
  vaga: "Vaga",
  empresa: "Empresa",
};

/** Fila de denúncias, com filtros por status e tipo e link para o detalhe de cada uma. */
export function DenunciasTabela() {
  const [pagina, setPagina] = useState(1);
  const [status, setStatus] = useState<(typeof STATUS_OPCOES)[number]>("todos");
  const [tipo, setTipo] = useState<(typeof TIPO_OPCOES)[number]>("todos");
  const [motivo, setMotivo] = useState<MotivoDenuncia | "todos">("todos");
  const [atribuicao, setAtribuicao] = useState<(typeof ATRIBUICAO_OPCOES)[number]>("todas");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "denuncias", pagina, status, tipo, motivo, atribuicao],
    queryFn: () =>
      denunciaService.listarDenuncias({
        page: pagina,
        limit: 10,
        status: status === "todos" ? undefined : status,
        entidadeTipo: tipo === "todos" ? undefined : tipo,
        motivo: motivo === "todos" ? undefined : motivo,
        atribuicao: atribuicao === "todas" ? undefined : atribuicao,
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
            <SelectTrigger aria-label="Filtrar por status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPCOES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "todos" ? "Todos os status" : STATUS_ROTULO[item]}
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
            <SelectTrigger aria-label="Filtrar por tipo de entidade">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OPCOES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "todos" ? "Todos os tipos" : TIPO_ROTULO[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={motivo}
            onValueChange={(valor) => {
              setMotivo(valor as MotivoDenuncia | "todos");
              setPagina(1);
            }}
          >
            <SelectTrigger aria-label="Filtrar por motivo">
              <SelectValue placeholder="Motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os motivos</SelectItem>
              {MOTIVO_OPCOES.map((item) => (
                <SelectItem key={item} value={item}>
                  {MOTIVO_ROTULO[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Select
            value={atribuicao}
            onValueChange={(valor) => {
              setAtribuicao(valor as (typeof ATRIBUICAO_OPCOES)[number]);
              setPagina(1);
            }}
          >
            <SelectTrigger aria-label="Filtrar por responsável">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              {ATRIBUICAO_OPCOES.map((item) => (
                <SelectItem key={item} value={item}>
                  {ATRIBUICAO_ROTULO[item]}
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
          <p className="text-sm text-muted-foreground">Não foi possível carregar as denúncias.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : denuncias.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Flag className="size-8" aria-hidden="true" />
          <p className="text-sm">Nenhuma denúncia encontrada com esses filtros.</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Denunciante</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {denuncias.map((denuncia) => (
                <TableRow key={denuncia.id}>
                  <TableCell>{TIPO_ROTULO[denuncia.entidadeTipo] ?? denuncia.entidadeTipo}</TableCell>
                  <TableCell>{MOTIVO_ROTULO[denuncia.motivo] ?? denuncia.motivo}</TableCell>
                  <TableCell className="max-w-40 truncate">{denuncia.denunciante?.nome ?? "Usuário removido"}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm">
                    {denuncia.administradorResponsavel?.nome ?? <span className="text-muted-foreground">Sem responsável</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tom={STATUS_TOM[denuncia.status]}>
                      {STATUS_ROTULO[denuncia.status]}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(denuncia.criadoEm).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/admin/denuncias/$denunciaId" params={{ denunciaId: denuncia.id }}>
                        Ver detalhes
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
