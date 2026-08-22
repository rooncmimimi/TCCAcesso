import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Unlock, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { useSession } from "@/lib/session";
import {
  ativarUsuario,
  desativarUsuario,
  listarUsuarios,
  type UsuarioAdmin,
} from "@/services/admin.service";

const TIPOS = ["todos", "candidato", "empresa", "administrador"] as const;

export function UsuariosTabela() {
  const { user } = useSession();

  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("todos");
  const [alvo, setAlvo] = useState<UsuarioAdmin | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "usuarios", pagina, busca, tipo],
    queryFn: () =>
      listarUsuarios({
        page: pagina,
        limit: 10,
        nome: busca || undefined,
        tipoUsuario: tipo === "todos" ? undefined : tipo,
      }),
    enabled: Boolean(user),
  });

  const mutacao = useMutation({
    mutationFn: (usuario: UsuarioAdmin) =>
      usuario.ativo ? desativarUsuario(usuario.id) : ativarUsuario(usuario.id),
    onSuccess: (_dados, usuario) => {
      toast.success(usuario.ativo ? "Usuário bloqueado." : "Usuário desbloqueado.");
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      setAlvo(null);
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível concluir a ação."),
  });

  const usuarios = data?.usuarios ?? [];

  return (
    <div>
      <form
        className="flex flex-wrap items-end gap-3 p-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          setPagina(1);
        }}
      >
        <div className="min-w-56 flex-1">
          <Label htmlFor="busca-usuarios">Buscar por nome</Label>
          <Input
            id="busca-usuarios"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Nome do usuário"
            className="mt-1"
          />
        </div>
        <div className="w-48">
          <Label htmlFor="tipo-usuarios">Tipo</Label>
          <Select
            value={tipo}
            onValueChange={(valor) => {
              setTipo(valor as (typeof TIPOS)[number]);
              setPagina(1);
            }}
          >
            <SelectTrigger id="tipo-usuarios" className="mt-1">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "todos" ? "Todos" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="min-h-11">
          Filtrar
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
          {Array.from({ length: 5 }).map((_, indice) => (
            <Skeleton key={indice} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os usuários.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Users className="size-8" aria-hidden="true" />
          <p className="text-sm">Nenhum usuário encontrado com esses filtros.</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/admin/usuarios/$usuarioId"
                      params={{ usuarioId: usuario.id }}
                      className="hover:underline"
                    >
                      {usuario.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="break-all">{usuario.email}</TableCell>
                  <TableCell className="capitalize">{usuario.tipoUsuario}</TableCell>
                  <TableCell>
                    <StatusBadge tom={usuario.ativo ? "sucesso" : "perigo"}>
                      {usuario.ativo ? "Ativo" : "Bloqueado"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={usuario.ativo ? "outline" : "default"}
                      onClick={() => setAlvo(usuario)}
                      aria-label={`${usuario.ativo ? "Bloquear" : "Desbloquear"} ${usuario.nome}`}
                    >
                      {usuario.ativo ? (
                        <>
                          <Lock className="size-4" aria-hidden="true" /> Bloquear
                        </>
                      ) : (
                        <>
                          <Unlock className="size-4" aria-hidden="true" /> Desbloquear
                        </>
                      )}
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

      <ConfirmarAcaoDialog
        open={Boolean(alvo)}
        onOpenChange={(aberto) => !aberto && setAlvo(null)}
        titulo={alvo?.ativo ? "Bloquear usuário" : "Desbloquear usuário"}
        descricao={`Confirma ${alvo?.ativo ? "bloquear" : "desbloquear"} o acesso de "${alvo?.nome}"?`}
        textoConfirmar={alvo?.ativo ? "Bloquear" : "Desbloquear"}
        destrutivo={Boolean(alvo?.ativo)}
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate(alvo)}
      />
    </div>
  );
}
