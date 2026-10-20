import { useRef, useState, type ReactNode } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { extrairMensagemErro } from "@/services/api";
import { urlArquivo } from "@/utils/arquivos";
import { toast } from "sonner";
import { useT } from "@/i18n";

// Mesmo limite padrão do backend (MAX_UPLOAD_BYTES, ver src/config/env.js):
// checar aqui evita que o usuário espere o upload todo só pra descobrir,
// no fim, que o arquivo é grande demais.
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

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
  const tu = useT().perfilItens.upload;
  const rotuloFinal = rotulo ?? tu.alterarFoto;
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function tratarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type)) {
      toast.error(tu.formatoInvalido);
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      toast.error(tu.grande);
      return;
    }
    try {
      setEnviando(true);
      await onEnviar(arquivo);
      toast.success(tu.fotoAtualizada);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, tu.erroFoto));
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative inline-block">
      <Avatar className={`${tamanho} border-4 border-card`}>
        <AvatarImage src={urlArquivo(fotoUrl ?? undefined)} alt={tu.fotoDe(nome)} />
        <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">
          {fallback}
        </AvatarFallback>
      </Avatar>
      <input
        ref={inputRef}
        type="file"
        tabIndex={-1}
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        id="upload-foto-perfil"
        onChange={(e) => tratarArquivo(e.target.files?.[0])}
      />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 min-h-11 min-w-11 rounded-full border-2 border-card shadow"
        aria-label={rotuloFinal}
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}
