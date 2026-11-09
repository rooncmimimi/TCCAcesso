import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIdioma } from "@/hooks/useIdioma";
import { ambienteService } from "@/services/ambiente.service";
import { extrairMensagemErro } from "@/services/api";

const TRANSCRICAO_MINIMA = 20;
const LIMITE_DO_VIDEO_BYTES = 50 * 1024 * 1024;
const TIPOS_DE_VIDEO = ["video/mp4", "video/webm"];

/**
 * Gestão do vídeo da vaga em Libras (na edição da vaga): enviar ou trocar o vídeo, com a
 * TRANSCRIÇÃO obrigatória, acrescentar ou remover a legenda WebVTT e remover o vídeo. O ACESSO não
 * traduz para Libras: hospeda o vídeo que a empresa gravou.
 */
export function VideoDaVagaGestao({ vagaId, aoMudar }: { vagaId: string; aoMudar?: (video: { legenda: boolean } | null) => void }) {
  const { t } = useIdioma();
  const idBase = useId();
  const queryClient = useQueryClient();
  const chave = ["vagas", vagaId, "midia"];

  const { data: midia, isLoading } = useQuery({ queryKey: chave, queryFn: () => ambienteService.midia(vagaId) });

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [transcricao, setTranscricao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erroDoArquivo, setErroDoArquivo] = useState<string | null>(null);

  useEffect(() => {
    setTranscricao(midia?.transcricao ?? "");
    setDescricao(midia?.descricao ?? "");
    aoMudar?.(midia ? { legenda: Boolean(midia.legendaVtt) } : null);
    // `aoMudar` costuma ser recriado a cada render de quem chama: só a mídia importa aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midia]);

  const aposMudar = () => queryClient.invalidateQueries({ queryKey: chave });
  const falha = (erro: unknown) => toast.error(extrairMensagemErro(erro));

  const enviar = useMutation({
    mutationFn: () => ambienteService.enviarVideo(vagaId, { video: arquivo as File, transcricao, descricao }),
    onSuccess: () => {
      toast.success("Vídeo enviado.");
      setArquivo(null);
      void aposMudar();
    },
    onError: falha,
  });

  const salvarTextos = useMutation({
    mutationFn: () => ambienteService.atualizarTextos(vagaId, { transcricao, descricao }),
    onSuccess: () => {
      toast.success("Textos do vídeo salvos.");
      void aposMudar();
    },
    onError: falha,
  });

  const enviarLegenda = useMutation({
    mutationFn: (arq: File) => ambienteService.enviarLegenda(vagaId, arq),
    onSuccess: () => {
      toast.success("Legenda enviada.");
      void aposMudar();
    },
    onError: falha,
  });

  const removerLegenda = useMutation({
    mutationFn: () => ambienteService.removerLegenda(vagaId),
    onSuccess: () => {
      toast.success("Legenda removida.");
      void aposMudar();
    },
    onError: falha,
  });

  const removerVideo = useMutation({
    mutationFn: () => ambienteService.removerMidia(vagaId),
    onSuccess: () => {
      toast.success("Vídeo removido.");
      void aposMudar();
    },
    onError: falha,
  });

  function escolherVideo(arq: File | null) {
    setErroDoArquivo(null);
    setArquivo(null);
    if (!arq) return;

    if (!TIPOS_DE_VIDEO.includes(arq.type)) {
      setErroDoArquivo("Formato inválido. Envie um vídeo MP4 ou WEBM.");
      return;
    }

    if (arq.size > LIMITE_DO_VIDEO_BYTES) {
      setErroDoArquivo("O vídeo passa de 50 MB. Reduza o tamanho e envie de novo.");
      return;
    }

    setArquivo(arq);
  }

  const transcricaoValida = transcricao.trim().length >= TRANSCRICAO_MINIMA;

  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("vagas.videoDaVagaGestao.carregandoOVideo")}
      </p>
    );
  }

  return (
    <section aria-labelledby={`${idBase}-titulo`} className="space-y-4 rounded-lg border border-border p-3">
      <h3 id={`${idBase}-titulo`} className="text-sm font-bold">
        {t("vagas.videoDaVagaGestao.videoDaVagaEmLibras")}
      </h3>
      <p className="text-xs text-muted-foreground">
        Envie um vídeo em Libras (MP4 ou WEBM, até 50 MB) com a <strong>{t("vagas.videoDaVagaGestao.transcricao")}</strong>, obrigatória: quem não vê ou não ouve o vídeo lê o texto. O ACESSO não traduz para Libras; o vídeo é o que você gravou.
      </p>

      {!midia || arquivo !== null ? (
        <p className="text-xs text-muted-foreground">{midia ? "Você escolheu um novo vídeo: ele vai substituir o atual e a legenda atual será removida." : "Esta vaga ainda não tem vídeo."}</p>
      ) : (
        <p className="text-sm">
          Vídeo enviado. Legenda: <strong>{midia.legendaVtt ? "enviada" : "não enviada"}</strong>.
        </p>
      )}

      <div className="space-y-1">
        <Label htmlFor={`${idBase}-arquivo`} className="text-sm">
          {midia ? "Trocar o vídeo (opcional)" : "Arquivo de vídeo"}
        </Label>
        <Input id={`${idBase}-arquivo`} type="file" accept="video/mp4,video/webm" onChange={(e) => escolherVideo(e.target.files?.[0] ?? null)} aria-describedby={erroDoArquivo ? `${idBase}-erro` : undefined} />
        {erroDoArquivo ? (
          <p id={`${idBase}-erro`} role="alert" className="text-sm font-medium text-destructive">
            {erroDoArquivo}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idBase}-transcricao`} className="text-sm">
          Transcrição do vídeo (obrigatória)
        </Label>
        <Textarea id={`${idBase}-transcricao`} rows={5} maxLength={8000} value={transcricao} onChange={(e) => setTranscricao(e.target.value)} aria-describedby={`${idBase}-transcricao-ajuda`} />
        <p id={`${idBase}-transcricao-ajuda`} className={`text-xs ${transcricao && !transcricaoValida ? "font-medium text-destructive" : "text-muted-foreground"}`}>
          Escreva o que é dito no vídeo, em português, com no mínimo {TRANSCRICAO_MINIMA} caracteres.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idBase}-descricao`} className="text-sm">
          Descrição curta (opcional)
        </Label>
        <Input id={`${idBase}-descricao`} maxLength={300} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {arquivo || !midia ? (
          <Button type="button" className="min-h-11" disabled={!arquivo || !transcricaoValida || enviar.isPending} onClick={() => enviar.mutate()}>
            {enviar.isPending ? "Enviando…" : midia ? "Enviar o novo vídeo" : "Enviar vídeo"}
          </Button>
        ) : (
          <Button type="button" variant="outline" className="min-h-11" disabled={!transcricaoValida || salvarTextos.isPending} onClick={() => salvarTextos.mutate()}>
            {t("vagas.videoDaVagaGestao.salvarOsTextos")}
          </Button>
        )}
      </div>

      {midia && arquivo === null ? (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="space-y-1">
            <Label htmlFor={`${idBase}-legenda`} className="text-sm">
              Legenda em WebVTT (.vtt, opcional)
            </Label>
            <Input
              id={`${idBase}-legenda`}
              type="file"
              accept=".vtt,text/vtt"
              onChange={(e) => {
                const arq = e.target.files?.[0];
                if (arq) enviarLegenda.mutate(arq);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">{t("vagas.videoDaVagaGestao.aLegendaDeixaOVideo")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {midia.legendaVtt ? (
              <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={removerLegenda.isPending} onClick={() => removerLegenda.mutate()}>
                {t("vagas.videoDaVagaGestao.removerALegenda")}
              </Button>
            ) : null}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" disabled={removerVideo.isPending}>
                  {t("vagas.videoDaVagaGestao.removerOVideo")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("vagas.videoDaVagaGestao.removerOVideoDaVaga")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("vagas.videoDaVagaGestao.oVideoATranscricaoEALegenda")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("auth.voltar")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removerVideo.mutate()}>{t("vagas.videoDaVagaGestao.remover")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}
    </section>
  );
}
