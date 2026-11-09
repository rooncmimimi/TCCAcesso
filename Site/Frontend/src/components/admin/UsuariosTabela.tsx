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
import { useIdioma } from "@/hooks/useIdioma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useSessao } from "@/hooks/useSessao";
import { ListaCarregando, ListaComErro, ListaVazia } from "@/components/ui/estados-de-lista";
import {
  ativarUsuario,
  desativarUsuario,
  listarUsuarios,
  type UsuarioAdmin,
} from "@/services/admin.service";

const TIPOS = ["todos", "candidato", "empresa", "administrador"] as const;

/**
 * Usuários da plataforma, com filtros, bloqueio e desbloqueio e link para o detalhe. A exclusão de conta não
 * é oferecida ao administrador: quem exclui a conta é a própria pessoa (Configurações › Conta).
 */
export function UsuariosTabela() {
  const { t } = useIdioma();
  const { usuario: usuarioLogado } = useSessao();

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
    enabled: Boolean(usuarioLogado),
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
          <Label htmlFor="busca-usuarios">{t("admin.usuariosTabela.buscarPorNome")}</Label>
          <Input
            id="busca-usuarios"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder={t("admin.usuariosTabela.nomeDoUsuario")}
            className="mt-1"
          />
        </div>
        <div className="w-48">
          <Label htmlFor="tipo-usuarios">{t("admin.usuariosTabela.tipo")}</Label>
          <Select
            value={tipo}
            onValueChange={(valor) => {
              setTipo(valor as (typeof TIPOS)[number]);
              setPagina(1);
            }}
          >
            <SelectTrigger id="tipo-usuarios" className="mt-1">
              <SelectValue placeholder={t("admin.usuariosTabela.todos")} />
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
        <ListaCarregando rotulo={t("admin.usuariosTabela.carregandoOsUsuarios")} linhas={5} />
      ) : isError ? (
        <ListaComErro mensagem={t("admin.usuariosTabela.naoFoiPossivelCarregarOs")} aoTentarDeNovo={() => refetch()} />
      ) : usuarios.length === 0 ? (
        <ListaVazia icone={Users} mensagem={t("admin.usuariosTabela.nenhumUsuarioEncontradoCom")} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.usuariosTabela.nome")}</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>{t("admin.usuariosTabela.tipo")}</TableHead>
                <TableHead>{t("admin.usuariosTabela.situacao")}</TableHead>
                <TableHead className="text-right">{t("admin.usuariosTabela.acoes")}</TableHead>
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
                  {/* `whitespace-nowrap` mantém o e-mail numa linha só. A `Table` já tem scroll
                      horizontal, que só aparece quando o conteúdo passa da largura da coluna;
                      com `break-all`, o e-mail quebraria a cada caractere e a tabela ficaria
                      ilegível em telas menores. */}
                  <TableCell className="whitespace-nowrap">{usuario.email}</TableCell>
                  <TableCell className="capitalize">{usuario.tipoUsuario}</TableCell>
                  <TableCell>
                    <StatusBadge tom={usuario.ativo ? "sucesso" : "perigo"}>
                      {usuario.ativo ? "Ativo" : "Bloqueado"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
                    </div>
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
