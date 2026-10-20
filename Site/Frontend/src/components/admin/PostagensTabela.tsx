import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, FileText, Search, Trash2 } from "lucide-react";
import type { AxiosError } from "axios";

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
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { DetalhePostagemSheet } from "@/components/admin/DetalhePostagemSheet";
import { extrairMensagemErro } from "@/services/api";
import { useSessao } from "@/hooks/useSessao";
import { listarPostagens, removerPostagem, type PostagemAdmin } from "@/services/admin.service";
import { formatarDataHora } from "@/utils/formatacao";
import { dic, useT } from "@/i18n";

type RespostaLista = Awaited<ReturnType<typeof listarPostagens>>;

/** Tira o `id` da lista já em cache, sem esperar nova busca; é a base da remoção otimista. */
function removerDaResposta(atual: RespostaLista | undefined, id: string): RespostaLista | undefined {
  if (!atual) return atual;
  const restantes = atual.postagens.filter((postagem) => postagem.id !== id);
  return { ...atual, postagens: restantes, itens: restantes, total: Math.max(atual.total - 1, 0) } as RespostaLista;
}

/** Publicações para moderação, com busca, paginação e remoção otimista. */
export function PostagensTabela() {
  const t = useT();
  const tp = t.admin.postagens;
  const { usuario } = useSessao();
  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [termoAplicado, setTermoAplicado] = useState("");
  const [alvo, setAlvo] = useState<PostagemAdmin | null>(null);
  const [detalhe, setDetalhe] = useState<PostagemAdmin | null>(null);

  const chaveConsulta = ["admin", "postagens", pagina, termoAplicado] as const;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: chaveConsulta,
    queryFn: () => listarPostagens({ page: pagina, limit: 10, q: termoAplicado || undefined }),
    enabled: Boolean(usuario),
  });

  const mutacao = useMutation({
    mutationFn: (postagem: PostagemAdmin) => removerPostagem(postagem.id),
    onMutate: async (postagem) => {
      await queryClient.cancelQueries({ queryKey: chaveConsulta });
      const anterior = queryClient.getQueryData<RespostaLista>(chaveConsulta);
      queryClient.setQueryData<RespostaLista>(chaveConsulta, (atual) => removerDaResposta(atual, postagem.id));
      return { anterior };
    },
    onSuccess: () => toast.success(dic().admin.postagens.removida),
    onError: (erro, _postagem, contexto) => {
      const status = (erro as AxiosError)?.response?.status;

      // 409 (já removida por outra aba/admin) ou 404 (não existe mais): o
      // resultado que o admin queria já é verdade no servidor; mantém a
      // remoção otimista, só avisa em tom neutro, sem desfazer.
      if (status === 409 || status === 404) {
        const textos = dic().admin.postagens;
        toast.info(status === 409 ? textos.jaRemovida : textos.naoExiste);
        return;
      }

      // Erro de verdade (rede, 500, 403…): desfaz a remoção otimista.
      if (contexto?.anterior) {
        queryClient.setQueryData(chaveConsulta, contexto.anterior);
      }
      toast.error(extrairMensagemErro(erro, dic().admin.postagens.erroRemover));
    },
    onSettled: () => {
      setAlvo(null);
      // Se a remoção esvaziou a página atual (e não é a primeira), volta uma página em vez de
      // deixar a tela vazia.
      const atual = queryClient.getQueryData<RespostaLista>(chaveConsulta);
      if (atual && atual.postagens.length === 0 && pagina > 1) {
        setPagina((p) => Math.max(p - 1, 1));
      }
      // Reconciliação em segundo plano com o servidor (totais/outras páginas).
      void queryClient.invalidateQueries({ queryKey: ["admin", "postagens"] });
    },
  });

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    setPagina(1);
    setTermoAplicado(busca.trim());
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
        {Array.from({ length: 5 }).map((_, indice) => (
          <Skeleton key={indice} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">{tp.erro}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t.comum.tentarNovamente}
        </Button>
      </div>
    );
  }

  const postagens = data?.postagens ?? [];

  return (
    <div>
      <form className="flex flex-wrap items-end gap-3 p-4" onSubmit={buscar}>
        <div className="min-w-56">
          <Label htmlFor="filtro-postagens">{tp.buscarLabel}</Label>
          <Input
            id="filtro-postagens"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder={tp.buscarPlaceholder}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="min-h-11 gap-1.5">
          <Search className="size-4" aria-hidden="true" /> {t.admin.comum.buscar}
        </Button>
      </form>

      {postagens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <FileText className="size-8" aria-hidden="true" />
          <p className="text-sm">{tp.vazio}</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.comum.autor}</TableHead>
                <TableHead>{tp.colunas.conteudo}</TableHead>
                <TableHead>{tp.colunas.publicadaEm}</TableHead>
                <TableHead className="text-right">{t.admin.comum.acoes}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postagens.map((postagem) => (
                <TableRow key={postagem.id}>
                  <TableCell className="font-medium">{postagem.usuario?.nome ?? t.comum.semValor}</TableCell>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{postagem.conteudo}</p>
                  </TableCell>
                  <TableCell>{formatarDataHora(postagem.criadoEm)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetalhe(postagem)}
                        aria-label={tp.verDetalhesAria(postagem.usuario?.nome ?? t.admin.comum.usuarioGenerico)}
                      >
                        <Eye className="size-4" aria-hidden="true" /> {t.admin.comum.verDetalhes}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setAlvo(postagem)}
                        aria-label={tp.removerAria(postagem.usuario?.nome ?? t.admin.comum.usuarioGenerico)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" /> {t.admin.comum.remover}
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

      <DetalhePostagemSheet postagem={detalhe} open={Boolean(detalhe)} onOpenChange={(aberto) => !aberto && setDetalhe(null)} />

      <ConfirmarAcaoDialog
        open={Boolean(alvo)}
        onOpenChange={(aberto) => !aberto && setAlvo(null)}
        titulo={tp.dialogoRemover.titulo}
        descricao={tp.dialogoRemover.texto}
        textoConfirmar={t.admin.comum.remover}
        destrutivo
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate(alvo)}
      />
    </div>
  );
}
