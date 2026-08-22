import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extrairMensagemErro } from "@/services/api";
import denunciaService, {
  MOTIVO_ROTULO,
  type EntidadeDenunciaTipo,
  type MotivoDenuncia,
} from "@/services/denuncia.service";
import { useSpeech } from "@/contexts/SpeechContext";

const MOTIVOS = Object.keys(MOTIVO_ROTULO) as MotivoDenuncia[];

/**
 * Diálogo genérico de denúncia, reutilizado nos 6 pontos de entrada
 * (postagem, comentário, usuário, empresa, vaga, mensagem).
 *
 * O frontend não repete regras que já são do backend (autodenúncia,
 * duplicidade, existência da entidade, participação na conversa) — só
 * exibe a mensagem de erro que o DenunciaService já valida.
 */
export function DenunciarDialog({
  open,
  onOpenChange,
  entidadeTipo,
  entidadeId,
  nomeExibicao,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidadeTipo: EntidadeDenunciaTipo;
  entidadeId: string;
  nomeExibicao?: string;
}) {
  const { speak } = useSpeech();
  const [motivo, setMotivo] = useState<MotivoDenuncia | "">("");
  const [descricao, setDescricao] = useState("");

  function limparEFechar() {
    setMotivo("");
    setDescricao("");
    onOpenChange(false);
  }

  const enviar = useMutation({
    mutationFn: () =>
      denunciaService.criarDenuncia({
        entidadeTipo,
        entidadeId,
        motivo: motivo as MotivoDenuncia,
        descricao: descricao.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Denúncia enviada. Nossa equipe vai analisar.");
      speak("Denúncia enviada com sucesso.");
      limparEFechar();
    },
    onError: (erro) => {
      const mensagem = extrairMensagemErro(erro, "Não foi possível enviar a denúncia.");
      toast.error(mensagem);
      speak(mensagem);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(aberto) => (aberto ? onOpenChange(true) : limparEFechar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Denunciar{nomeExibicao ? ` "${nomeExibicao}"` : ""}</DialogTitle>
          <DialogDescription>
            Conte para a moderação o que está errado. Denúncias falsas ou repetidas podem limitar o seu
            acesso a esta função.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="denuncia-motivo">Motivo</Label>
            <Select value={motivo} onValueChange={(valor) => setMotivo(valor as MotivoDenuncia)}>
              <SelectTrigger id="denuncia-motivo" className="mt-1">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {MOTIVO_ROTULO[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="denuncia-descricao">Descrição (opcional)</Label>
            <Textarea
              id="denuncia-descricao"
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              placeholder="Detalhe o que aconteceu, se quiser."
              maxLength={1000}
              className="mt-1 min-h-24 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={limparEFechar} disabled={enviar.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!motivo || enviar.isPending}
            onClick={() => enviar.mutate()}
          >
            {enviar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Enviar denúncia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DenunciarDialog;
