import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoDeArquivoOculto } from "@/components/ui/campo-de-arquivo-oculto";
import { extrairMensagemErro } from "@/services/api";
import { urlArquivo } from "@/utils/arquivos";
import { atributoAccept, verificarArquivo } from "@/lib/arquivos";
import { toast } from "sonner";
import { useIdioma } from "@/hooks/useIdioma";

/** Banner de capa com upload real de imagem (PNG/JPEG/WEBP), usado em perfis de pessoa e empresa. */
export function CapaUploader({
  capaUrl,
  onEnviar,
  rotulo,
}: {
  capaUrl?: string | null;
  onEnviar: (arquivo: File) => Promise<unknown>;
  rotulo?: string;
}) {
  const { t } = useIdioma();
  // O rotulo e usado em tres lugares (campo escondido, aria-label e texto): calculado uma vez, para
  // nenhum deles ficar sem nome quando a tela nao passa um rotulo proprio.
  const nome = rotulo ?? t("perfil.capaUploader.alterarCapa");
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
      toast.success(t("perfil.capaUploader.capaAtualizada"));
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t("perfil.capaUploader.naoFoiPossivelEnviarACapa")));
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
      <CampoDeArquivoOculto ref={inputRef} rotulo={nome} accept={atributoAccept(["imagem"])} aoEscolher={(e) => tratarArquivo(e.target.files?.[0])} />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute bottom-3 right-3 min-h-9 gap-2 shadow"
        aria-label={nome}
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="size-4" aria-hidden="true" />
        )}
        {nome}
      </Button>
    </div>
  );
}
