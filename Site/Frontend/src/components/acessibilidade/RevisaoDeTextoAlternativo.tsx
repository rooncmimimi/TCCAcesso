import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAtualizarDescricaoAnexo } from "@/components/feed/hooks";
import { imagensSemDescricao, type ImagemParaRevisar } from "@/lib/imagensSemDescricao";
import { postagensService } from "@/services/postagens.service";

/**
 * Revisão de texto alternativo: lista as imagens que a própria pessoa publicou SEM descrição, para
 * ela descrever uma a uma. Reaproveita a edição de descrição que já existe no feed. Nada é
 * escrito por ela e nenhuma IA é chamada aqui: a descrição é sempre a que a pessoa digita.
 */
export function RevisaoDeTextoAlternativo({ usuarioId }: { usuarioId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["postagens", "revisao-alt", usuarioId],
    queryFn: () => postagensService.listar({ usuarioId, limit: 100 }),
  });

  const pendentes = imagensSemDescricao(data?.dados ?? []);

  return (
    <section aria-labelledby="revisao-alt-titulo" className="mt-8 space-y-3 rounded-xl border border-border p-4">
      <h2 id="revisao-alt-titulo" className="text-xl font-bold">
        Descrever minhas imagens
      </h2>
      <p className="text-sm text-muted-foreground">Uma imagem sem descrição não pode ser entendida por quem usa leitor de tela. Aqui estão as imagens das suas publicações que ainda não têm descrição.</p>

      {isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Procurando imagens sem descrição…
        </p>
      ) : isError ? (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>Não foi possível carregar suas publicações.</p>
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : pendentes.length === 0 ? (
        <p role="status" className="text-sm">
          Todas as imagens das suas publicações já têm descrição.
        </p>
      ) : (
        <>
          <p role="status" className="text-sm font-medium">
            {pendentes.length === 1 ? "1 imagem sem descrição." : `${pendentes.length} imagens sem descrição.`}
          </p>
          <ul className="space-y-4">
            {pendentes.map((item) => (
              <li key={item.anexo.id}>
                <ItemParaDescrever item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ItemParaDescrever({ item }: { item: ImagemParaRevisar }) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const salvar = useAtualizarDescricaoAnexo();
  const pode = texto.trim().length > 0 && !salvar.isPending;

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <img src={item.anexo.url} alt="" className="h-28 w-28 shrink-0 rounded-lg border border-border object-cover" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs text-muted-foreground">Publicação: {item.trechoDaPublicacao || "(sem texto)"}</p>
        <Label htmlFor={id} className="text-sm">
          Descreva esta imagem
        </Label>
        <Input id={id} value={texto} maxLength={500} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: Rampa de acesso na entrada do prédio" />
        <Button type="button" className="min-h-11" disabled={!pode} onClick={() => salvar.mutate({ postagemId: item.postagemId, anexoId: item.anexo.id, descricao: texto })}>
          {salvar.isPending ? "Salvando…" : "Salvar descrição"}
        </Button>
      </div>
    </div>
  );
}
