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
import { useIdioma } from "@/hooks/useIdioma";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { ListaCarregando, ListaComErro, ListaVazia } from "@/components/ui/estados-de-lista";
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
  mensagem: "admin.denunciasTabela.mensagem",
  vaga: "Vaga",
  empresa: "Empresa",
};

/** Fila de denúncias, com filtros por status e tipo e link para o detalhe de cada uma. */
export function DenunciasTabela() {
  const { t } = useIdioma();
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
            <SelectTrigger aria-label={t("admin.denunciasTabela.filtrarPorStatus")}>
              <SelectValue placeholder={t("admin.denunciasTabela.status")} />
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
            <SelectTrigger aria-label={t("admin.denunciasTabela.filtrarPorTipoDeEntidade")}>
              <SelectValue placeholder={t("admin.denunciasTabela.tipo")} />
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
            <SelectTrigger aria-label={t("admin.denunciasTabela.filtrarPorMotivo")}>
              <SelectValue placeholder={t("admin.denunciasTabela.motivo")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">{t("admin.denunciasTabela.todosOsMotivos")}</SelectItem>
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
            <SelectTrigger aria-label={t("admin.denunciasTabela.filtrarPorResponsavel")}>
              <SelectValue placeholder={t("admin.denunciasTabela.responsavel")} />
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
        <ListaCarregando rotulo={t("admin.denunciasTabela.carregandoAsDenuncias")} linhas={5} />
      ) : isError ? (
        <ListaComErro mensagem={t("admin.denunciasTabela.naoFoiPossivelCarregarAs")} aoTentarDeNovo={() => refetch()} />
      ) : denuncias.length === 0 ? (
        <ListaVazia icone={Flag} mensagem={t("admin.denunciasTabela.nenhumaDenunciaEncontradaCom")} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.denunciasTabela.tipo")}</TableHead>
                <TableHead>{t("admin.denunciasTabela.motivo")}</TableHead>
                <TableHead>{t("admin.denunciasTabela.denunciante")}</TableHead>
                <TableHead>{t("admin.denunciasTabela.responsavel")}</TableHead>
                <TableHead>{t("admin.denunciasTabela.status")}</TableHead>
                <TableHead>{t("admin.denunciasTabela.data")}</TableHead>
                <TableHead className="text-right">{t("admin.denunciasTabela.acoes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {denuncias.map((denuncia) => (
                <TableRow key={denuncia.id}>
                  <TableCell>{TIPO_ROTULO[denuncia.entidadeTipo] ?? denuncia.entidadeTipo}</TableCell>
                  <TableCell>{MOTIVO_ROTULO[denuncia.motivo] ?? denuncia.motivo}</TableCell>
                  <TableCell className="max-w-40 truncate">{denuncia.denunciante?.nome ?? "Usuário removido"}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm">
                    {denuncia.administradorResponsavel?.nome ?? <span className="text-muted-foreground">{t("admin.denunciasTabela.semResponsavel")}</span>}
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
