import { useCallback, useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { extrairMensagemErro } from "@/services/api";
import { ouvirEvento } from "@/services/socket";
import { useSpeech } from "@/contexts/SpeechContext";
import postagensService, { type FiltroFeed, type NovaPostagem } from "@/services/postagens.service";
import type { Paginado } from "@/services/http";
import type { ComentarioCompleto, PostagemCompleta } from "@/types";

const LIMITE_PADRAO = 10;

export function chaveFeed(filtro: FiltroFeed = {}) {
  return ["postagens", filtro] as const;
}

/** Lista paginada do feed, carregada por páginas ("Carregar mais"). */
export function useFeedInfinito(filtro: FiltroFeed = {}) {
  return useInfiniteQuery({
    queryKey: chaveFeed(filtro),
    queryFn: ({ pageParam }) =>
      postagensService.listar({ ...filtro, page: pageParam, limit: filtro.limit ?? LIMITE_PADRAO }),
    initialPageParam: 1,
    getNextPageParam: (ultimaPagina) =>
      ultimaPagina.pagina < ultimaPagina.totalPaginas ? ultimaPagina.pagina + 1 : undefined,
  });
}

export function usePostagemDetalhe(id: string | undefined) {
  return useQuery({
    queryKey: ["postagem", id],
    queryFn: () => postagensService.detalhar(id as string),
    enabled: Boolean(id),
  });
}

export function useComentarios(postagemId: string | undefined) {
  return useQuery({
    queryKey: ["comentarios", postagemId],
    queryFn: () => postagensService.listarComentarios(postagemId as string, { limit: 50 }),
    enabled: Boolean(postagemId),
  });
}

type PaginasFeed = InfiniteData<Paginado<PostagemCompleta>>;

/** Aplica uma transformação a todas as postagens presentes no cache do feed. */
function atualizarPostagemNoCacheFeed(
  dados: PaginasFeed | undefined,
  postagemId: string,
  transformar: (postagem: PostagemCompleta) => PostagemCompleta,
): PaginasFeed | undefined {
  if (!dados) return dados;
  return {
    ...dados,
    pages: dados.pages.map((pagina) => ({
      ...pagina,
      dados: pagina.dados.map((postagem) =>
        postagem.id === postagemId ? transformar(postagem) : postagem,
      ),
    })),
  };
}

function removerPostagemDoCacheFeed(dados: PaginasFeed | undefined, postagemId: string): PaginasFeed | undefined {
  if (!dados) return dados;
  return {
    ...dados,
    pages: dados.pages.map((pagina) => ({
      ...pagina,
      dados: pagina.dados.filter((postagem) => postagem.id !== postagemId),
      total: Math.max(0, pagina.total - 1),
    })),
  };
}

/**
 * Assina os eventos de tempo real do feed e mantém o cache do React Query em dia.
 *
 * Nomes e formatos de payload espelham exatamente o que o backend emite em
 * `PostagemService` (`feed:postagem`, `feed:curtida`, `feed:comentario` —
 * ver `Site/Backend/src/services/PostagemService.js`).
 */
export function useFeedTempoReal() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const cancelarPostagem = ouvirEvento<{
      postagem?: PostagemCompleta;
      id?: string;
      atualizada?: boolean;
      removida?: boolean;
    }>("feed:postagem", (dados) => {
      if (dados.removida && dados.id) {
        queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
          removerPostagemDoCacheFeed(atual, dados.id as string),
        );
        queryClient.removeQueries({ queryKey: ["postagem", dados.id] });
        return;
      }

      if (dados.atualizada && dados.postagem) {
        const postagemAtualizada = dados.postagem;
        queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
          atualizarPostagemNoCacheFeed(atual, postagemAtualizada.id, () => postagemAtualizada),
        );
        queryClient.setQueryData(["postagem", postagemAtualizada.id], postagemAtualizada);
        return;
      }

      // Nova publicação de outro usuário: só marca como desatualizado,
      // sem interromper quem já está lendo o feed com uma busca automática.
      void queryClient.invalidateQueries({ queryKey: ["postagens"], refetchType: "none" });
    });

    const cancelarCurtida = ouvirEvento<{
      postagemId: string;
      totalCurtidas: number;
    }>("feed:curtida", (dados) => {
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, dados.postagemId, (postagem) => ({
          ...postagem,
          totalCurtidas: dados.totalCurtidas,
        })),
      );
      queryClient.setQueryData<PostagemCompleta>(["postagem", dados.postagemId], (atual) =>
        atual ? { ...atual, totalCurtidas: dados.totalCurtidas } : atual,
      );
    });

    const cancelarComentario = ouvirEvento<{
      postagemId: string;
      totalComentarios: number;
      removido?: boolean;
    }>("feed:comentario", (dados) => {
      void queryClient.invalidateQueries({ queryKey: ["comentarios", dados.postagemId] });
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, dados.postagemId, (postagem) => ({
          ...postagem,
          totalComentarios: dados.totalComentarios,
        })),
      );
      queryClient.setQueryData<PostagemCompleta>(["postagem", dados.postagemId], (atual) =>
        atual ? { ...atual, totalComentarios: dados.totalComentarios } : atual,
      );
    });

    return () => {
      cancelarPostagem();
      cancelarCurtida();
      cancelarComentario();
    };
  }, [queryClient]);
}

export function useCriarPostagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NovaPostagem) => postagensService.criar(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["postagens"] });
      toast.success("Publicação criada com sucesso.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível publicar.")),
  });
}

export function useAtualizarPostagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, conteudo }: { id: string; conteudo: string }) =>
      postagensService.atualizar(id, { conteudo }),
    onSuccess: (postagemAtualizada) => {
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, postagemAtualizada.id, () => postagemAtualizada),
      );
      queryClient.setQueryData(["postagem", postagemAtualizada.id], postagemAtualizada);
      toast.success("Publicação atualizada.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível editar a publicação.")),
  });
}

export function useAtualizarDescricaoAnexo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postagemId, anexoId, descricao }: { postagemId: string; anexoId: string; descricao: string }) =>
      postagensService.atualizarDescricaoAnexo(postagemId, anexoId, descricao),
    onSuccess: (postagemAtualizada) => {
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, postagemAtualizada.id, () => postagemAtualizada),
      );
      queryClient.setQueryData(["postagem", postagemAtualizada.id], postagemAtualizada);
      toast.success("Descrição da imagem atualizada.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível atualizar a descrição.")),
  });
}

export function useRemoverPostagem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postagensService.remover(id),
    onSuccess: (_dados, id) => {
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        removerPostagemDoCacheFeed(atual, id),
      );
      toast.success("Publicação excluída.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível excluir a publicação.")),
  });
}

export function useAlternarCurtida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postagemId: string) => postagensService.alternarCurtida(postagemId),
    onMutate: async (postagemId) => {
      await queryClient.cancelQueries({ queryKey: ["postagens"] });
      await queryClient.cancelQueries({ queryKey: ["postagem", postagemId] });

      const anteriores = queryClient.getQueriesData<PaginasFeed>({ queryKey: ["postagens"] });
      const anteriorDetalhe = queryClient.getQueryData<PostagemCompleta>(["postagem", postagemId]);

      const alternar = (postagem: PostagemCompleta): PostagemCompleta => {
        const curtido = !postagem.curtidoPorMim;
        return {
          ...postagem,
          curtidoPorMim: curtido,
          totalCurtidas: Math.max(0, (postagem.totalCurtidas ?? 0) + (curtido ? 1 : -1)),
        };
      };

      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, postagemId, alternar),
      );
      queryClient.setQueryData<PostagemCompleta>(["postagem", postagemId], (atual) =>
        atual ? alternar(atual) : atual,
      );

      return { anteriores, anteriorDetalhe };
    },
    onError: (erro, postagemId, contexto) => {
      contexto?.anteriores.forEach(([chave, dados]) => queryClient.setQueryData(chave, dados));
      if (contexto?.anteriorDetalhe) {
        queryClient.setQueryData(["postagem", postagemId], contexto.anteriorDetalhe);
      }
      toast.error(extrairMensagemErro(erro, "Não foi possível curtir a publicação."));
    },
    onSuccess: (resultado, postagemId) => {
      const aplicar = (postagem: PostagemCompleta) => ({
        ...postagem,
        curtidoPorMim: resultado.curtido,
        totalCurtidas: resultado.totalCurtidas,
      });
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, postagemId, aplicar),
      );
      queryClient.setQueryData<PostagemCompleta>(["postagem", postagemId], (atual) =>
        atual ? aplicar(atual) : atual,
      );
    },
  });
}

export function useCriarComentario(postagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ comentario, comentarioPaiId }: { comentario: string; comentarioPaiId?: string | null }) =>
      postagensService.comentar(postagemId, comentario, comentarioPaiId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comentarios", postagemId] });
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, postagemId, (postagem) => ({
          ...postagem,
          totalComentarios: (postagem.totalComentarios ?? 0) + 1,
        })),
      );
      queryClient.setQueryData<PostagemCompleta>(["postagem", postagemId], (atual) =>
        atual ? { ...atual, totalComentarios: (atual.totalComentarios ?? 0) + 1 } : atual,
      );
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível enviar o comentário.")),
  });
}

export function useRemoverComentario(postagemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comentarioId: string) => postagensService.removerComentario(comentarioId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comentarios", postagemId] });
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, postagemId, (postagem) => ({
          ...postagem,
          totalComentarios: Math.max(0, (postagem.totalComentarios ?? 0) - 1),
        })),
      );
      toast.success("Comentário excluído.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível excluir o comentário.")),
  });
}

export function useCompartilharPostagem() {
  const queryClient = useQueryClient();
  const { speak, choice } = useSpeech();
  return useMutation({
    mutationFn: ({ postagemId, comentario }: { postagemId: string; comentario?: string }) =>
      postagensService.compartilhar(postagemId, comentario),
    onSuccess: (_dados, variaveis) => {
      const aplicar = (postagem: PostagemCompleta) => ({
        ...postagem,
        compartilhadaPorMim: true,
        totalCompartilhamentos: (postagem.totalCompartilhamentos ?? 0) + 1,
      });
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, variaveis.postagemId, aplicar),
      );
      queryClient.setQueryData<PostagemCompleta>(["postagem", variaveis.postagemId], (atual) =>
        atual ? aplicar(atual) : atual,
      );
      toast.success("Publicação compartilhada.");
      if (choice === "accepted") {
        speak("Publicação compartilhada.");
      }
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível compartilhar.")),
  });
}

export function useDesfazerCompartilhamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; postagemId: string }) => postagensService.removerCompartilhamento(id),
    onSuccess: (_dados, variaveis) => {
      const aplicar = (postagem: PostagemCompleta) => ({
        ...postagem,
        compartilhadaPorMim: false,
        totalCompartilhamentos: Math.max(0, (postagem.totalCompartilhamentos ?? 0) - 1),
      });
      queryClient.setQueriesData<PaginasFeed>({ queryKey: ["postagens"] }, (atual) =>
        atualizarPostagemNoCacheFeed(atual, variaveis.postagemId, aplicar),
      );
      queryClient.setQueryData<PostagemCompleta>(["postagem", variaveis.postagemId], (atual) =>
        atual ? aplicar(atual) : atual,
      );
      toast.success("Compartilhamento desfeito.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível desfazer o compartilhamento.")),
  });
}

export function useInvalidarComentarios() {
  const queryClient = useQueryClient();
  return useCallback(
    (postagemId: string) => queryClient.invalidateQueries({ queryKey: ["comentarios", postagemId] }),
    [queryClient],
  );
}

export type { ComentarioCompleto, PostagemCompleta };
