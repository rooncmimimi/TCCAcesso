import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { perfilService } from "@/services/perfil.service";
import { extrairMensagemErro } from "@/services/api";

/**
 * Botões "Visualizar currículo" / "Baixar currículo" (Fase 9, Bloco 4) —
 * reaproveitados no próprio perfil, no perfil de terceiro (empresa com
 * candidatura ou administrador, já autorizados pelo backend) e na lista
 * de candidaturas recebidas pela empresa (`CandidaturasDaVaga`).
 *
 * Nunca deve ser renderizado quando não há `nomeArquivo` conhecido — o
 * backend já decide isso (campo vem `undefined` tanto para "sem
 * currículo" quanto para "sem autorização"; o componente pai só verifica
 * a presença do dado, nunca reimplementa a regra de quem pode ver).
 *
 * Cada clique busca uma URL assinada NOVA na hora — nunca cacheia nem
 * reaproveita a mesma URL entre "visualizar" e "baixar" (mesmo princípio
 * já usado em `LightboxMidia`, Fase 7): o backend reautoriza do zero a
 * cada chamada.
 */
export function BotoesCurriculo({ candidatoId }: { candidatoId: string }) {
  const [visualizando, setVisualizando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  async function visualizar() {
    if (visualizando) return;

    // A aba precisa abrir de forma SÍNCRONA, no mesmo tick do clique —
    // se só abrir depois do `await` abaixo, navegadores tratam como
    // pop-up não solicitado e bloqueiam. Abre em branco primeiro, e só
    // depois aponta para a URL assinada já autorizada.
    const aba = window.open("", "_blank", "noopener");

    setVisualizando(true);
    try {
      const { url } = await perfilService.urlCurriculo(candidatoId);
      if (aba) {
        aba.location.href = url;
      } else {
        // Pop-up bloqueado mesmo assim (raro) — tenta de novo diretamente;
        // se o navegador bloquear também, o usuário já tem a mensagem de
        // erro padrão do próprio navegador para pop-ups.
        window.open(url, "_blank", "noopener");
      }
    } catch (erro) {
      aba?.close();
      toast.error(extrairMensagemErro(erro, "Não foi possível abrir o currículo."));
    } finally {
      setVisualizando(false);
    }
  }

  async function baixar() {
    if (baixando) return;

    setBaixando(true);
    try {
      const { url, nomeArquivo } = await perfilService.urlDownloadCurriculo(candidatoId);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo || "";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível baixar o currículo."));
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-9 gap-1.5"
        disabled={visualizando}
        onClick={visualizar}
        aria-label="Visualizar currículo"
      >
        {visualizando ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
        Visualizar currículo
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-9 gap-1.5"
        disabled={baixando}
        onClick={baixar}
        aria-label="Baixar currículo"
      >
        {baixando ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        Baixar currículo
      </Button>
    </div>
  );
}

export default BotoesCurriculo;
