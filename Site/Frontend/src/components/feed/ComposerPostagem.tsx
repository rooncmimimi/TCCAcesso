import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Video, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { initials, useSession } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { useCriarPostagem } from "./hooks";
import { MAX_ANEXOS, MAX_CARACTERES, TIPOS_ACEITOS, ehImagem, ehVideo } from "./tiposAnexo";

/** Formulário de nova publicação: texto + até 4 anexos (imagens/vídeos). */
export function ComposerPostagem() {
  const { user } = useSession();
  const [conteudo, setConteudo] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
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
  }

  function removerAnexo(indice: number) {
    setAnexos((atuais) => atuais.filter((_, i) => i !== indice));
  }

  function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!conteudo.trim() && anexos.length === 0) {
      toast.error("Escreva algo ou anexe um arquivo para publicar.");
      return;
    }
    criar.mutate(
      { conteudo: conteudo.trim(), anexos },
      {
        onSuccess: () => {
          setConteudo("");
          setAnexos([]);
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
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Anexos selecionados">
              {anexos.map((arquivo, indice) => (
                <li key={`${arquivo.name}-${indice}`} className="relative rounded-lg border border-border p-2">
                  {ehImagem(arquivo) ? (
                    <img
                      src={URL.createObjectURL(arquivo)}
                      alt={`Pré-visualização de ${arquivo.name}`}
                      className="h-20 w-full rounded-md object-cover"
                    />
                  ) : ehVideo(arquivo) ? (
                    <video
                      src={URL.createObjectURL(arquivo)}
                      controls
                      muted
                      preload="metadata"
                      aria-label={`Pré-visualização de ${arquivo.name}`}
                      className="h-20 w-full rounded-md bg-black object-cover"
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
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              id="anexos-postagem"
              type="file"
              multiple
              accept={TIPOS_ACEITOS.join(",")}
              onChange={adicionarArquivos}
              className="sr-only"
            />
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={anexos.length >= MAX_ANEXOS}
            >
              <ImageIcon className="size-4" aria-hidden="true" /> Foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 gap-2"
              onClick={() => inputRef.current?.click()}
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
