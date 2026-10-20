import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Trash2, Unlock, Users } from "lucide-react";
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
import { ExcluirContaDialog } from "@/components/admin/ExcluirContaDialog";
import { rotuloOuValor } from "@/components/admin/rotulos";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { useSessao } from "@/hooks/useSessao";
import { dic, useT } from "@/i18n";
import { extrairMensagemErro } from "@/services/api";
import {
  ativarUsuario,
  desativarUsuario,
  listarUsuarios,
  removerUsuario,
  type UsuarioAdmin,
} from "@/services/admin.service";

const TIPOS = ["todos", "candidato", "empresa", "administrador"] as const;

/** Usuários da plataforma, com filtros, bloqueio e desbloqueio, exclusão e link para o detalhe. */
export function UsuariosTabela() {
  const t = useT();
  const tu = t.admin.usuarios;
  const { usuario: usuarioLogado } = useSessao();

  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("todos");
  const [alvo, setAlvo] = useState<UsuarioAdmin | null>(null);
  const [alvoExclusao, setAlvoExclusao] = useState<UsuarioAdmin | null>(null);
  const [motivoExclusao, setMotivoExclusao] = useState("");

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
      const textos = dic().admin.usuarios;
      toast.success(usuario.ativo ? textos.bloqueadoOk : textos.desbloqueadoOk);
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      setAlvo(null);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, dic().admin.comum.erroAcao)),
  });

  const mutacaoExclusao = useMutation({
    mutationFn: (usuario: UsuarioAdmin) => removerUsuario(usuario.id, motivoExclusao.trim() || undefined),
    onSuccess: () => {
      toast.success(dic().admin.usuarios.excluidoOk);
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      setAlvoExclusao(null);
      setMotivoExclusao("");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, dic().admin.usuarios.erroExcluir)),
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
          <Label htmlFor="busca-usuarios">{tu.buscarLabel}</Label>
          <Input
            id="busca-usuarios"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder={tu.buscarPlaceholder}
            className="mt-1"
          />
        </div>
        <div className="w-48">
          <Label htmlFor="tipo-usuarios">{tu.tipoLabel}</Label>
          <Select
            value={tipo}
            onValueChange={(valor) => {
              setTipo(valor as (typeof TIPOS)[number]);
              setPagina(1);
            }}
          >
            <SelectTrigger id="tipo-usuarios" className="mt-1">
              <SelectValue placeholder={tu.tipoPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((item) => (
                <SelectItem key={item} value={item}>
                  {tu.tipos[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="min-h-11">
          {t.admin.comum.filtrar}
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
          <p className="text-sm text-muted-foreground">{tu.erro}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t.comum.tentarNovamente}
          </Button>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Users className="size-8" aria-hidden="true" />
          <p className="text-sm">{tu.vazio}</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tu.colunas.nome}</TableHead>
                <TableHead>{tu.colunas.email}</TableHead>
                <TableHead>{tu.colunas.tipo}</TableHead>
                <TableHead>{tu.colunas.situacao}</TableHead>
                <TableHead className="text-right">{t.admin.comum.acoes}</TableHead>
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
                  <TableCell>{rotuloOuValor(tu.tipos, usuario.tipoUsuario)}</TableCell>
                  <TableCell>
                    <StatusBadge tom={usuario.ativo ? "sucesso" : "perigo"}>
                      {usuario.ativo ? t.admin.comum.ativo : t.admin.comum.bloqueado}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant={usuario.ativo ? "outline" : "default"}
                        onClick={() => setAlvo(usuario)}
                        aria-label={usuario.ativo ? tu.bloquearAria(usuario.nome) : tu.desbloquearAria(usuario.nome)}
                      >
                        {usuario.ativo ? (
                          <>
                            <Lock className="size-4" aria-hidden="true" /> {tu.bloquear}
                          </>
                        ) : (
                          <>
                            <Unlock className="size-4" aria-hidden="true" /> {tu.desbloquear}
                          </>
                        )}
                      </Button>
                      {/* Excluir conta é irreversível e nunca é oferecida contra a própria
                          conta do admin nem contra outra conta administrativa (o backend já
                          recusa os dois casos; aqui só evitamos um clique com resultado
                          garantido). */}
                      {usuario.tipoUsuario !== "administrador" && usuario.id !== usuarioLogado?.id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setAlvoExclusao(usuario)}
                          aria-label={tu.excluirAria(usuario.nome)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" /> {tu.excluirConta}
                        </Button>
                      )}
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
        titulo={alvo?.ativo ? tu.dialogoBloqueio.tituloBloquear : tu.dialogoBloqueio.tituloDesbloquear}
        descricao={
          alvo?.ativo
            ? tu.dialogoBloqueio.confirmaBloquear(alvo.nome)
            : tu.dialogoBloqueio.confirmaDesbloquear(alvo?.nome ?? "")
        }
        textoConfirmar={alvo?.ativo ? tu.bloquear : tu.desbloquear}
        destrutivo={Boolean(alvo?.ativo)}
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate(alvo)}
      />

      <ExcluirContaDialog
        usuario={alvoExclusao}
        idMotivo="motivo-exclusao-usuario"
        motivo={motivoExclusao}
        onMotivoChange={setMotivoExclusao}
        carregando={mutacaoExclusao.isPending}
        onFechar={() => {
          setAlvoExclusao(null);
          setMotivoExclusao("");
        }}
        onConfirmar={() => alvoExclusao && mutacaoExclusao.mutate(alvoExclusao)}
      />
    </div>
  );
}
