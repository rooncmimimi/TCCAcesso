import { useRef, useState, type ReactNode } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CampoDeArquivoOculto } from "@/components/ui/campo-de-arquivo-oculto";
import { extrairMensagemErro } from "@/services/api";
import { urlArquivo } from "@/utils/arquivos";
import { atributoAccept, verificarArquivo } from "@/lib/arquivos";
import { toast } from "sonner";
import { useIdioma } from "@/hooks/useIdioma";

/** Avatar com upload real de imagem (PNG/JPEG/WEBP), usado em perfis de pessoa e empresa. */
export function FotoUploader({
  nome,
  fotoUrl,
  fallback,
  onEnviar,
  tamanho = "size-24",
  rotulo,
}: {
  nome: string;
  fotoUrl?: string | null;
  fallback: ReactNode;
  onEnviar: (arquivo: File) => Promise<unknown>;
  tamanho?: string;
  rotulo?: string;
}) {
  const { t } = useIdioma();
  // O rotulo e usado em dois lugares (campo escondido e aria-label): calculado uma vez, para nenhum
  // deles ficar sem nome quando a tela nao passa um rotulo proprio.
  const rotuloDoBotao = rotulo ?? t("perfil.fotoUploader.alterarFoto");
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function tratarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    // Tipo e tamanho vêm das regras centrais (`lib/arquivos.ts`); o servidor confere tudo de novo.
    const verificacao = verificarArquivo(arquivo, ["imagem"]);
    if (!verificacao.ok) {
      toast.error(verificacao.mensagem);
      return;
    }
    try {
      setEnviando(true);
      await onEnviar(arquivo);
      toast.success(t("perfil.fotoUploader.fotoAtualizada"));
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t("perfil.fotoUploader.naoFoiPossivelEnviarAFoto")));
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative inline-block">
      <Avatar className={`${tamanho} border-4 border-card`}>
        <AvatarImage src={urlArquivo(fotoUrl ?? undefined)} alt={t("perfil.fotoUploader.fotoDe", { var1: nome })} />
        <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">
          {fallback}
        </AvatarFallback>
      </Avatar>
      <CampoDeArquivoOculto ref={inputRef} id="upload-foto-perfil" rotulo={rotuloDoBotao} accept={atributoAccept(["imagem"])} aoEscolher={(e) => tratarArquivo(e.target.files?.[0])} />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 min-h-11 min-w-11 rounded-full border-2 border-card shadow"
        aria-label={rotuloDoBotao}
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}
