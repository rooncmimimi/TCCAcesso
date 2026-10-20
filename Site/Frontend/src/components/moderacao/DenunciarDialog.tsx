import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldOff } from "lucide-react";

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
import bloqueioService from "@/services/bloqueio.service";
import denunciaService, {
  MOTIVOS_DENUNCIA,
  type EntidadeDenunciaTipo,
  type MotivoDenuncia,
} from "@/services/denuncia.service";
import { useT } from "@/i18n";

/**
 * Diálogo genérico de denúncia, usado para postagem, comentário, usuário, empresa, vaga e mensagem.
 * Não repete regras do backend (autodenúncia, duplicidade, existência da entidade, participação na
 * conversa): só mostra a mensagem de erro validada pelo `DenunciaService`.
 *
 * Depois de denunciar, se `autorUsuarioId` foi informado, oferece bloquear o autor na hora. É
 * opcional porque telas que já têm o próprio controle de bloqueio, como o `BloquearUsuarioMenu`,
 * não precisam repetir a oferta.
 */
export function DenunciarDialog({
  open,
  onOpenChange,
  entidadeTipo,
  entidadeId,
  nomeExibicao,
  autorUsuarioId,
  autorNomeExibicao,
  aoFecharDevolverFoco,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidadeTipo: EntidadeDenunciaTipo;
  entidadeId: string;
  nomeExibicao?: string;
  /**
   * Id do autor do conteúdo denunciado, que não é necessariamente igual a `entidadeId`: ao
   * denunciar uma postagem, `entidadeId` é o id da postagem, mas quem seria bloqueado é o autor
   * dela. Omita quando não houver como bloquear (por exemplo, quando a tela já tem outro controle
   * de bloqueio).
   */
  autorUsuarioId?: string;
  /** Nome do autor a exibir na oferta de bloqueio, quando é diferente do nome da entidade denunciada (ex.: denunciar uma vaga mostra o título da vaga em `nomeExibicao`, mas quem seria bloqueado é a empresa). Se omitido, usa `nomeExibicao`. */
  autorNomeExibicao?: string;
  /**
   * Chamado ao fechar, no lugar da devolução automática de foco do Radix. É necessário quando o
   * diálogo abre a partir de um item de `DropdownMenu`: o menu fechando e o diálogo abrindo
   * disputam o foco, e o item já está desmontado quando o diálogo fecha, então o foco cairia no
   * `<body>`. Com um botão direto, sem menu no meio, pode ser omitido.
   */
  aoFecharDevolverFoco?: () => void;
}) {
  const t = useT();
  const td = t.moderacao.denunciar;
  const nomeParaBloqueio = autorNomeExibicao ?? nomeExibicao;
  const [motivo, setMotivo] = useState<MotivoDenuncia | "">("");
  const [descricao, setDescricao] = useState("");
  // Preenchido só depois de denunciar com sucesso: troca o conteúdo do
  // mesmo diálogo para a oferta de bloqueio, em vez de empilhar um segundo
  // modal por cima do primeiro.
  const [oferecendoBloqueio, setOferecendoBloqueio] = useState(false);

  function fecharTudo() {
    setMotivo("");
    setDescricao("");
    setOferecendoBloqueio(false);
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
      // Os toasts já são lidos pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(td.enviada);
      if (autorUsuarioId) {
        setOferecendoBloqueio(true);
      } else {
        fecharTudo();
      }
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, td.erroEnviar));
    },
  });

  const bloquear = useMutation({
    mutationFn: () => bloqueioService.bloquear(autorUsuarioId as string),
    onSuccess: () => {
      toast.success(td.bloqueado(nomeParaBloqueio ?? ""));
      fecharTudo();
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, td.erroBloquear));
    },
  });

  return (
    <Dialog open={open} onOpenChange={(aberto) => (aberto ? onOpenChange(true) : fecharTudo())}>
      <DialogContent
        onCloseAutoFocus={
          aoFecharDevolverFoco
            ? (evento) => {
                evento.preventDefault();
                aoFecharDevolverFoco();
              }
            : undefined
        }
      >
        {oferecendoBloqueio ? (
          <>
            <DialogHeader>
              <DialogTitle>{td.bloquearTitulo(nomeParaBloqueio ?? "")}</DialogTitle>
              <DialogDescription>{td.bloquearTexto(nomeParaBloqueio ?? "")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharTudo} disabled={bloquear.isPending}>
                {td.naoObrigado}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={bloquear.isPending}
                onClick={() => bloquear.mutate()}
              >
                {bloquear.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldOff className="size-4" aria-hidden="true" />
                )}
                {td.bloquear}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{td.titulo(nomeExibicao ?? "")}</DialogTitle>
              <DialogDescription>{td.descricao}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="denuncia-motivo">{td.motivo}</Label>
                <Select value={motivo} onValueChange={(valor) => setMotivo(valor as MotivoDenuncia)}>
                  <SelectTrigger id="denuncia-motivo" className="mt-1">
                    <SelectValue placeholder={td.motivoEscolha} />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_DENUNCIA.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t.moderacao.motivos[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="denuncia-descricao">{td.descricaoLabel}</Label>
                <Textarea
                  id="denuncia-descricao"
                  value={descricao}
                  onChange={(evento) => setDescricao(evento.target.value)}
                  placeholder={td.descricaoPlaceholder}
                  maxLength={1000}
                  className="mt-1 min-h-24 resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharTudo} disabled={enviar.isPending}>
                {t.comum.cancelar}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!motivo || enviar.isPending}
                onClick={() => enviar.mutate()}
              >
                {enviar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {td.enviar}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DenunciarDialog;
