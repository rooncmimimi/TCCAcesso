import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Video, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initials, useSession } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { CampoDescricaoImagem } from "./CampoDescricaoImagem";
import { useCriarPostagem } from "./hooks";
import {
  MAX_ANEXOS,
  MAX_CARACTERES,
  TIPOS_ACEITOS,
  TIPOS_IMAGEM_ACEITOS,
  TIPOS_VIDEO_ACEITOS,
  ehImagem,
  ehVideo,
} from "./tiposAnexo";

const MAX_DESCRICAO = 500;

/** Formulário de nova publicação: texto + até 4 anexos (imagens/vídeos). */
export function ComposerPostagem() {
  const { user } = useSession();
  const [conteudo, setConteudo] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  // Uma descrição por anexo, no mesmo índice — nunca gerada automaticamente,
  // sempre em branco até o usuário escrever (ver PostagemAnexo.descricao).
  const [descricoes, setDescricoes] = useState<string[]>([]);
  // Dois inputs de arquivo distintos (não um só reaproveitado pelos dois
  // botões) — "Foto" só abre o seletor filtrado para imagem, "Vídeo" só
  // para vídeo. Antes os dois botões chamavam o mesmo input e faziam
  // exatamente a mesma coisa.
  const inputImagemRef = useRef<HTMLInputElement>(null);
  const inputVideoRef = useRef<HTMLInputElement>(null);
  const criar = useCriarPostagem();

  const restantes = MAX_CARACTERES - conteudo.length;

  function adicionarArquivos(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (!arquivos.length) return;

    const invalidos = arquivos.filter((arquivo) => !TIPOS_ACEITOS.includes(arquivo.type));
    if (invalidos.length) {
      toast.error("Apenas imagens (PNG/JPEG/WEBP) e vídeos (MP4/WEBM) são aceitos.");
    }

    const validos = arquivos.filter((arquivo) => TIPOS_ACEITOS.includes(arquivo.type));
    setAnexos((atuais) => {
      const combinados = [...atuais, ...validos].slice(0, MAX_ANEXOS);
      if (atuais.length + validos.length > MAX_ANEXOS) {
        toast.warning(`Você pode anexar no máximo ${MAX_ANEXOS} arquivos.`);
      }
      return combinados;
    });
    setDescricoes((atuais) => [...atuais, ...validos.map(() => "")].slice(0, MAX_ANEXOS));
  }

  function removerAnexo(indice: number) {
    setAnexos((atuais) => atuais.filter((_, i) => i !== indice));
    setDescricoes((atuais) => atuais.filter((_, i) => i !== indice));
  }

  function alterarDescricao(indice: number, valor: string) {
    setDescricoes((atuais) => atuais.map((d, i) => (i === indice ? valor.slice(0, MAX_DESCRICAO) : d)));
  }

  function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!conteudo.trim() && anexos.length === 0) {
      toast.error("Escreva algo ou anexe um arquivo para publicar.");
      return;
    }
    criar.mutate(
      { conteudo: conteudo.trim(), anexos, descricoesAnexos: descricoes },
      {
        onSuccess: () => {
          setConteudo("");
          setAnexos([]);
          setDescricoes([]);
        },
      },
    );
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <form onSubmit={aoEnviar} aria-label="Criar nova publicação">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarImage src={urlArquivo(user?.fotoPerfil)} alt="" />
              <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                {initials(user?.nome ?? "Visitante")}
              </AvatarFallback>
            </Avatar>
            <div>
              <label htmlFor="novo-post" className="sr-only">
                Compartilhe algo com a comunidade
              </label>
              <Textarea
                id="novo-post"
                placeholder="Compartilhe algo…"
                value={conteudo}
                maxLength={MAX_CARACTERES}
                onChange={(e) => setConteudo(e.target.value)}
                className="min-h-12 resize-none"
                aria-describedby="contador-caracteres"
              />
              <p
                id="contador-caracteres"
                className={`mt-1 text-right text-xs ${restantes < 0 ? "text-destructive" : "text-muted-foreground"}`}
                aria-live="polite"
              >
                {restantes} caracteres restantes
              </p>
            </div>
          </div>

          {anexos.length > 0 && (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2" aria-label="Anexos selecionados">
              {anexos.map((arquivo, indice) => (
                <li key={`${arquivo.name}-${indice}`} className="relative rounded-lg border border-border p-2">
                  {ehImagem(arquivo) ? (
                    <img
                      src={URL.createObjectURL(arquivo)}
                      alt={`Pré-visualização de ${arquivo.name}`}
                      className="h-32 w-full rounded-md object-cover"
                    />
                  ) : ehVideo(arquivo) ? (
                    <video
                      src={URL.createObjectURL(arquivo)}
                      controls
                      muted
                      preload="metadata"
                      aria-label={`Pré-visualização de ${arquivo.name}`}
                      className="h-32 w-full rounded-md bg-black object-cover"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 size-7 min-h-0 rounded-full"
                    onClick={() => removerAnexo(indice)}
                    aria-label={`Remover anexo ${arquivo.name}`}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>

                  <div className="mt-2">
                    {ehImagem(arquivo) ? (
                      <CampoDescricaoImagem
                        id={`descricao-anexo-${indice}`}
                        value={descricoes[indice] ?? ""}
                        onChange={(valor) => alterarDescricao(indice, valor)}
                        obterImagem={() => Promise.resolve(arquivo)}
                      />
                    ) : (
                      <>
                        <Label htmlFor={`descricao-anexo-${indice}`} className="text-xs font-semibold">
                          Descrição do vídeo (opcional)
                        </Label>
                        <Input
                          id={`descricao-anexo-${indice}`}
                          value={descricoes[indice] ?? ""}
                          maxLength={MAX_DESCRICAO}
                          placeholder="Descreva o que aparece neste vídeo para pessoas que utilizam leitores de tela"
                          onChange={(e) => alterarDescricao(indice, e.target.value)}
                          className="h-9 text-xs"
                        />
                      </>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      A descrição ajuda pessoas que utilizam leitores de tela a compreender o conteúdo visual.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={inputImagemRef}
              id="anexos-postagem-imagem"
              type="file"
              multiple
              accept={TIPOS_IMAGEM_ACEITOS.join(",")}
              onChange={adicionarArquivos}
              className="sr-only"
            />
            <input
              ref={inputVideoRef}
              id="anexos-postagem-video"
              type="file"
              multiple
              accept={TIPOS_VIDEO_ACEITOS.join(",")}
              onChange={adicionarArquivos}
              className="sr-only"
            />
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 gap-2"
              aria-label="Adicionar foto à publicação"
              onClick={() => inputImagemRef.current?.click()}
              disabled={anexos.length >= MAX_ANEXOS}
            >
              <ImageIcon className="size-4" aria-hidden="true" /> Foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 gap-2"
              aria-label="Adicionar vídeo à publicação"
              onClick={() => inputVideoRef.current?.click()}
              disabled={anexos.length >= MAX_ANEXOS}
            >
              <Video className="size-4" aria-hidden="true" /> Vídeo
            </Button>
            <Button
              type="submit"
              className="ml-auto min-h-11"
              disabled={criar.isPending || restantes < 0 || (!conteudo.trim() && anexos.length === 0)}
            >
              {criar.isPending ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ComposerPostagem;
