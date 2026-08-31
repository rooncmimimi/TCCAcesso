import { useState } from "react";
import { FileText, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { urlArquivo } from "@/services/uploads.service";
import { CampoDescricaoImagem } from "./CampoDescricaoImagem";
import { useAtualizarDescricaoAnexo } from "./hooks";
import type { AnexoPostagem } from "@/types";

const MAX_DESCRICAO = 500;

/**
 * Legenda + ação de editar descrição, compartilhada entre imagem e vídeo.
 * Apresentação discreta: texto pequeno, secundário, só aparece quando há
 * descrição ou quando o autor está editando — nunca ocupa espaço à toa.
 */
function DescricaoAnexo({
  anexo,
  postagemId,
  editavel,
}: {
  anexo: AnexoPostagem;
  postagemId: string;
  editavel: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(anexo.descricao ?? "");
  const atualizar = useAtualizarDescricaoAnexo();

  if (editando) {
    return (
      <div className="mt-1.5 space-y-2 rounded-md border border-border p-2">
        {anexo.tipo === "imagem" ? (
          <CampoDescricaoImagem
            id={`descricao-anexo-editar-${anexo.id}`}
            value={rascunho}
            onChange={setRascunho}
            obterImagem={() => fetch(urlArquivo(anexo.url) ?? "").then((resposta) => resposta.blob())}
            rotulo="Descrição do anexo"
          />
        ) : (
          <Input
            value={rascunho}
            maxLength={MAX_DESCRICAO}
            autoFocus
            placeholder="Descreva o que aparece para pessoas que utilizam leitores de tela"
            onChange={(e) => setRascunho(e.target.value)}
            className="h-8 text-xs"
            aria-label={`Descrição acessível do anexo ${anexo.nomeOriginal ?? ""}`}
          />
        )}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            disabled={atualizar.isPending}
            onClick={() =>
              atualizar.mutate(
                { postagemId, anexoId: anexo.id, descricao: rascunho },
                { onSuccess: () => setEditando(false) },
              )
            }
          >
            Salvar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2 text-xs"
            aria-label="Cancelar edição da descrição"
            onClick={() => {
              setRascunho(anexo.descricao ?? "");
              setEditando(false);
            }}
          >
            <X className="size-3.5" aria-hidden="true" /> Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (!anexo.descricao && !editavel) return null;

  return (
    <div className="mt-1.5 flex items-start justify-between gap-2">
      <p className="min-w-0 text-xs text-muted-foreground">
        {anexo.descricao || (editavel ? "Sem descrição — adicione uma para leitores de tela." : "")}
      </p>
      {editavel && (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Editar descrição do anexo ${anexo.nomeOriginal ?? ""}`}
        >
          <Pencil className="size-3" aria-hidden="true" /> {anexo.descricao ? "Editar" : "Adicionar"}
        </button>
      )}
    </div>
  );
}

/**
 * Exibe os anexos de uma publicação: galeria de imagens, vídeos e — apenas
 * para publicações antigas — links para documentos. "Documento" não é mais
 * uma opção ao criar uma publicação nova, mas anexos desse tipo já
 * existentes no banco continuam sendo exibidos normalmente aqui.
 *
 * `editavel` (só true para o autor da publicação) libera o controle de
 * editar a descrição de cada anexo, sem nunca permitir trocar o arquivo.
 */
export function GaleriaAnexos({
  anexos,
  postagemId,
  editavel = false,
}: {
  anexos: AnexoPostagem[];
  postagemId?: string;
  editavel?: boolean;
}) {
  if (!anexos?.length) return null;

  const imagens = anexos.filter((a) => a.tipo === "imagem");
  const videos = anexos.filter((a) => a.tipo === "video");
  const documentos = anexos.filter((a) => a.tipo === "documento");

  return (
    <div className="mt-4 space-y-3">
      {imagens.length > 0 && (
        <ul
          className={`grid gap-2 ${imagens.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
          aria-label="Imagens anexadas à publicação"
        >
          {imagens.map((imagem) => (
            <li key={imagem.id}>
              <a
                href={urlArquivo(imagem.url)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <img
                  src={urlArquivo(imagem.url)}
                  alt={imagem.descricao || imagem.nomeOriginal || "Imagem sem descrição fornecida pelo autor da publicação"}
                  className="max-h-96 w-full object-cover"
                  loading="lazy"
                />
              </a>
              {postagemId && (
                <DescricaoAnexo anexo={imagem} postagemId={postagemId} editavel={editavel} />
              )}
            </li>
          ))}
        </ul>
      )}

      {videos.length > 0 && (
        <ul className="space-y-2" aria-label="Vídeos anexados à publicação">
          {videos.map((video) => (
            <li key={video.id}>
              <video
                src={urlArquivo(video.url)}
                controls
                preload="metadata"
                aria-label={video.descricao || "Vídeo anexado à publicação, sem descrição fornecida pelo autor"}
                className="max-h-96 w-full rounded-xl border border-border bg-black"
              >
                Seu navegador não suporta a reprodução deste vídeo.
              </video>
              {postagemId && (
                <DescricaoAnexo anexo={video} postagemId={postagemId} editavel={editavel} />
              )}
            </li>
          ))}
        </ul>
      )}

      {documentos.length > 0 && (
        <ul className="space-y-2" aria-label="Documentos anexados à publicação">
          {documentos.map((documento) => (
            <li key={documento.id}>
              <a
                href={urlArquivo(documento.url)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{documento.nomeOriginal ?? "Documento anexado"}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GaleriaAnexos;
