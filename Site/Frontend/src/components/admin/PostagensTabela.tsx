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
import { useIdioma } from "@/hooks/useIdioma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { DetalhePostagemSheet } from "@/components/admin/DetalhePostagemSheet";
import { extrairMensagemErro } from "@/services/api";
import { useSessao } from "@/hooks/useSessao";
import { listarPostagens, removerPostagem, type PostagemAdmin } from "@/services/admin.service";
import { formatarDataHora } from "@/utils/formatacao";
import { ListaCarregando, ListaComErro, ListaVazia } from "@/components/ui/estados-de-lista";

type RespostaLista = Awaited<ReturnType<typeof listarPostagens>>;

/** Tira o `id` da lista já em cache, sem esperar nova busca; é a base da remoção otimista. */
function removerDaResposta(atual: RespostaLista | undefined, id: string): RespostaLista | undefined {
  if (!atual) return atual;
  const restantes = atual.postagens.filter((postagem) => postagem.id !== id);
  return { ...atual, postagens: restantes, itens: restantes, total: Math.max(atual.total - 1, 0) } as RespostaLista;
}

/** Publicações para moderação, com busca, paginação e remoção otimista. */
export function PostagensTabela() {
  const { t } = useIdioma();
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
    onSuccess: () => toast.success(t("admin.postagensTabela.publicacaoRemovida")),
    onError: (erro, _postagem, contexto) => {
      const status = (erro as AxiosError)?.response?.status;

      // 409 (já removida por outra aba/admin) ou 404 (não existe mais): o
      // resultado que o admin queria já é verdade no servidor; mantém a
      // remoção otimista, só avisa em tom neutro, sem desfazer.
      if (status === 409 || status === 404) {
        toast.info(status === 409 ? "Esta publicação já havia sido removida." : t("admin.postagensTabela.estaPublicacaoNaoExisteMais"));
        return;
      }

      // Erro de verdade (rede, 500, 403…): desfaz a remoção otimista.
      if (contexto?.anterior) {
        queryClient.setQueryData(chaveConsulta, contexto.anterior);
      }
      toast.error(extrairMensagemErro(erro, t("admin.postagensTabela.naoFoiPossivelRemoverA")));
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
      <ListaCarregando rotulo={t("admin.postagensTabela.carregandoAsPublicacoes")} linhas={5} />
    );
  }

  if (isError) {
    return (
      <ListaComErro mensagem={t("admin.postagensTabela.naoFoiPossivelCarregarAs")} aoTentarDeNovo={() => refetch()} />
    );
  }

  const postagens = data?.postagens ?? [];

  return (
    <div>
      <form className="flex flex-wrap items-end gap-3 p-4" onSubmit={buscar}>
        <div className="min-w-56">
          <Label htmlFor="filtro-postagens">{t("admin.postagensTabela.buscarPorConteudo")}</Label>
          <Input
            id="filtro-postagens"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder={t("admin.postagensTabela.exPalavraNaPublicacao")}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="min-h-11 gap-1.5">
          <Search className="size-4" aria-hidden="true" /> {t("filtro.buscar")}
        </Button>
      </form>

      {postagens.length === 0 ? (
        <ListaVazia icone={FileText} mensagem={t("admin.postagensTabela.nenhumaPublicacaoEncontrada")} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.postagensTabela.autor")}</TableHead>
                <TableHead>{t("admin.postagensTabela.conteudo")}</TableHead>
                <TableHead>{t("admin.postagensTabela.publicadaEm")}</TableHead>
                <TableHead className="text-right">{t("admin.postagensTabela.acoes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postagens.map((postagem) => (
                <TableRow key={postagem.id}>
                  <TableCell className="font-medium">{postagem.usuario?.nome ?? "—"}</TableCell>
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
                        aria-label={t("admin.postagensTabela.verDetalhesDaPublicacaoDe", { var1: postagem.usuario?.nome ?? t("admin.postagensTabela.usuario") })}
                      >
                        <Eye className="size-4" aria-hidden="true" /> {t("admin.postagensTabela.verDetalhes")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setAlvo(postagem)}
                        aria-label={t("admin.postagensTabela.removerPublicacaoDe", { var1: postagem.usuario?.nome ?? t("admin.postagensTabela.usuario") })}
                      >
                        <Trash2 className="size-4" aria-hidden="true" /> {t("acessibilidade.paineisDeAjuda.remover")}
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
        titulo={t("admin.postagensTabela.removerPublicacao")}
        descricao={t("admin.postagensTabela.estaAcaoRemoveAPublicacaoDo")}
        textoConfirmar={t("admin.postagensTabela.remover")}
        destrutivo
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate(alvo)}
      />
    </div>
  );
}
