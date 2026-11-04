import { useRef, useState, type ChangeEvent } from "react";
import { useIdioma } from "@/hooks/useIdioma";
import { toast } from "sonner";
import { verificarArquivo } from "@/lib/arquivos";
import { Image as ImageIcon, Video, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { iniciaisDoNome } from "@/utils/formatacao";
import { useSessao } from "@/hooks/useSessao";
import { urlArquivo } from "@/utils/arquivos";
import { CampoDescricaoImagem } from "./CampoDescricaoImagem";
import { useCriarPostagem } from "./hooks";
import {
  LIMITE_ANEXOS,
  LIMITE_CARACTERES,
  TIPOS_IMAGEM_ACEITOS,
  TIPOS_VIDEO_ACEITOS,
  ehImagem,
  ehVideo,
} from "./tiposAnexo";

const MAX_DESCRICAO = 500;

/** Formulário de nova publicação: texto + até 4 anexos (imagens/vídeos). */
export function FormularioPostagem() {
  const { usuario } = useSessao();
  const { t } = useIdioma();
  const [conteudo, setConteudo] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  // Uma descrição por anexo, no mesmo índice: nunca gerada automaticamente,
  // sempre em branco até o usuário escrever (ver PostagemAnexo.descricao).
  const [descricoes, setDescricoes] = useState<string[]>([]);
  // Dois inputs de arquivo: "Foto" abre o seletor filtrado para imagem, e "Vídeo", para vídeo.
  const inputImagemRef = useRef<HTMLInputElement>(null);
  const inputVideoRef = useRef<HTMLInputElement>(null);
  const criar = useCriarPostagem();

  const restantes = LIMITE_CARACTERES - conteudo.length;

  function adicionarArquivos(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (!arquivos.length) return;

    // Tipo e tamanho de cada arquivo (imagem até 5 MB, vídeo até 50 MB), pelas regras centrais. Antes só o
    // tipo era conferido, e um vídeo grande demais subia inteiro para o servidor recusar no fim.
    const verificados = arquivos.map((arquivo) => ({ arquivo, resultado: verificarArquivo(arquivo, ["imagem", "video"]) }));

    for (const { arquivo, resultado } of verificados) {
      if (!resultado.ok) toast.error(`${arquivo.name}: ${resultado.mensagem}`);
    }

    const validos = verificados.filter(({ resultado }) => resultado.ok).map(({ arquivo }) => arquivo);
    setAnexos((atuais) => {
      const combinados = [...atuais, ...validos].slice(0, LIMITE_ANEXOS);
      if (atuais.length + validos.length > LIMITE_ANEXOS) {
        toast.warning(t("formPost.limiteAnexos", { n: LIMITE_ANEXOS }));
      }
      return combinados;
    });
    setDescricoes((atuais) => [...atuais, ...validos.map(() => "")].slice(0, LIMITE_ANEXOS));
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
      toast.error(t("formPost.erroVazio"));
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
        <form onSubmit={aoEnviar} aria-label={t("formPost.criarRotulo")}>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarImage src={urlArquivo(usuario?.fotoPerfil)} alt="" />
              <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                {iniciaisDoNome(usuario?.nome ?? t("cabecalho.visitante"))}
              </AvatarFallback>
            </Avatar>
            <div>
              <label htmlFor="novo-post" className="sr-only">
                {t("formPost.rotulo")}
              </label>
              <Textarea
                id="novo-post"
                placeholder={t("formPost.placeholder")}
                value={conteudo}
                maxLength={LIMITE_CARACTERES}
                onChange={(e) => setConteudo(e.target.value)}
                className="min-h-12 resize-none"
                aria-describedby="contador-caracteres"
              />
              <p
                id="contador-caracteres"
                className={`mt-1 text-right text-xs ${restantes < 0 ? "text-destructive" : "text-muted-foreground"}`}
                aria-live="polite"
              >
                {t("formPost.restantes", { n: restantes })}
              </p>
            </div>
          </div>

          {anexos.length > 0 && (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2" aria-label={t("formPost.anexosSelecionados")}>
              {anexos.map((arquivo, indice) => (
                <li key={`${arquivo.name}-${indice}`} className="relative rounded-lg border border-border p-2">
                  {ehImagem(arquivo) ? (
                    <img
                      src={URL.createObjectURL(arquivo)}
                      alt={t("formPost.previa", { nome: arquivo.name })}
                      className="h-32 w-full rounded-md object-cover"
                    />
                  ) : ehVideo(arquivo) ? (
                    <video
                      src={URL.createObjectURL(arquivo)}
                      controls
                      muted
                      preload="metadata"
                      aria-label={t("formPost.previa", { nome: arquivo.name })}
                      className="h-32 w-full rounded-md bg-black object-cover"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 size-7 min-h-0 rounded-full"
                    onClick={() => removerAnexo(indice)}
                    aria-label={t("formPost.removerAnexo", { nome: arquivo.name })}
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
                          {t("formPost.descricaoVideo")}
                        </Label>
                        <Input
                          id={`descricao-anexo-${indice}`}
                          value={descricoes[indice] ?? ""}
                          maxLength={MAX_DESCRICAO}
                          placeholder={t("formPost.descricaoVideoDica")}
                          onChange={(e) => alterarDescricao(indice, e.target.value)}
                          className="h-9 text-xs"
                        />
                      </>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("formPost.descricaoAjuda")}
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
              tabIndex={-1}
              accept={TIPOS_IMAGEM_ACEITOS.join(",")}
              onChange={adicionarArquivos}
              className="sr-only"
            />
            <input
              ref={inputVideoRef}
              id="anexos-postagem-video"
              type="file"
              multiple
              tabIndex={-1}
              accept={TIPOS_VIDEO_ACEITOS.join(",")}
              onChange={adicionarArquivos}
              className="sr-only"
            />
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 gap-2"
              aria-label={t("formPost.addFotoRotulo")}
              onClick={() => inputImagemRef.current?.click()}
              disabled={anexos.length >= LIMITE_ANEXOS}
            >
              <ImageIcon className="size-4" aria-hidden="true" /> {t("formPost.foto")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 gap-2"
              aria-label={t("formPost.addVideoRotulo")}
              onClick={() => inputVideoRef.current?.click()}
              disabled={anexos.length >= LIMITE_ANEXOS}
            >
              <Video className="size-4" aria-hidden="true" /> {t("formPost.video")}
            </Button>
            <Button
              type="submit"
              className="ml-auto min-h-11"
              disabled={criar.isPending || restantes < 0 || (!conteudo.trim() && anexos.length === 0)}
            >
              {criar.isPending ? t("formPost.publicando") : t("formPost.publicar")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default FormularioPostagem;
