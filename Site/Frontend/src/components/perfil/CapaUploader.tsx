import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extrairMensagemErro } from "@/services/api";
import { urlArquivo } from "@/services/uploads.service";
import { toast } from "sonner";

// Mesmo limite padrão do backend (MAX_UPLOAD_BYTES, ver src/config/env.js) —
// checar aqui evita que o usuário espere o upload todo só pra descobrir,
// no fim, que o arquivo é grande demais.
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

/** Banner de capa com upload real de imagem (PNG/JPEG/WEBP), usado em perfis de pessoa e empresa. */
export function CapaUploader({
  capaUrl,
  onEnviar,
  rotulo = "Alterar capa",
}: {
  capaUrl?: string | null;
  onEnviar: (arquivo: File) => Promise<unknown>;
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
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      toast.error("Imagem muito grande. O tamanho máximo permitido é 5 MB.");
      return;
    }
    try {
      setEnviando(true);
      await onEnviar(arquivo);
      toast.success("Capa atualizada.");
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível enviar a capa."));
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const url = urlArquivo(capaUrl ?? undefined);

  return (
    <div
      className="relative h-32 w-full bg-primary bg-cover bg-center sm:h-40"
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => tratarArquivo(e.target.files?.[0])}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute bottom-3 right-3 min-h-9 gap-2 shadow"
        aria-label={rotulo}
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="size-4" aria-hidden="true" />
        )}
        {rotulo}
      </Button>
    </div>
  );
}
