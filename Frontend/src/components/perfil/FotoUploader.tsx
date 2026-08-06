import { useRef, useState, type ReactNode } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { extrairMensagemErro } from "@/services/api";
import { urlArquivo } from "@/services/uploads.service";
import { toast } from "sonner";

/** Avatar com upload real de imagem (PNG/JPEG/WEBP), usado em perfis de pessoa e empresa. */
export function FotoUploader({
  nome,
  fotoUrl,
  fallback,
  onEnviar,
  tamanho = "size-24",
  rotulo = "Alterar foto",
}: {
  nome: string;
  fotoUrl?: string | null;
  fallback: ReactNode;
  onEnviar: (arquivo: File) => Promise<unknown>;
  tamanho?: string;
  rotulo?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function tratarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type)) {
      toast.error("Formato inválido. Envie uma imagem PNG, JPEG ou WEBP.");
      return;
    }
    try {
      setEnviando(true);
      await onEnviar(arquivo);
      toast.success("Foto atualizada.");
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível enviar a foto."));
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative inline-block">
      <Avatar className={`${tamanho} border-4 border-card`}>
        <AvatarImage src={urlArquivo(fotoUrl ?? undefined)} alt={`Foto de ${nome}`} />
        <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">
          {fallback}
        </AvatarFallback>
      </Avatar>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        id="upload-foto-perfil"
        onChange={(e) => tratarArquivo(e.target.files?.[0])}
      />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 size-9 rounded-full border-2 border-card shadow"
        aria-label={rotulo}
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}
