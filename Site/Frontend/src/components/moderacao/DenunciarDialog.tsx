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
  MOTIVO_ROTULO,
  type EntidadeDenunciaTipo,
  type MotivoDenuncia,
} from "@/services/denuncia.service";

const MOTIVOS = Object.keys(MOTIVO_ROTULO) as MotivoDenuncia[];

/**
 * Diálogo genérico de denúncia, reutilizado nos pontos de entrada
 * (postagem, comentário, usuário, empresa, vaga, mensagem).
 *
 * O frontend não repete regras que já são do backend (autodenúncia,
 * duplicidade, existência da entidade, participação na conversa) — só
 * exibe a mensagem de erro que o DenunciaService já valida.
 *
 * Item 4 da auditoria do Site: depois de denunciar, se `autorUsuarioId` foi
 * informado, oferece bloquear o autor na mesma hora — sem isso, quem
 * denuncia uma postagem/comentário/mensagem de um estranho não tinha
 * NENHUM atalho para também bloquear essa pessoa (a única forma era abrir
 * o perfil dela à parte e usar o menu "•••", que já tem sua própria opção
 * de bloquear — por isso `autorUsuarioId` é opcional: quem já tem esse
 * menu ao lado, como `BloquearUsuarioMenu`, pode preferir não repetir a
 * oferta aqui).
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
  /** Id do AUTOR do conteúdo denunciado (não necessariamente igual a `entidadeId` — ex.: denunciar uma postagem informa o id da postagem, mas quem seria bloqueado é o autor dela). Omitir quando não houver como bloquear (ex.: já existe outro controle de bloqueio na mesma tela). */
  autorUsuarioId?: string;
  /** Nome do autor a exibir na oferta de bloqueio, quando é DIFERENTE do nome da entidade denunciada (ex.: denunciar uma vaga mostra o título da vaga em `nomeExibicao`, mas quem seria bloqueado é a empresa). Se omitido, usa `nomeExibicao`. */
  autorNomeExibicao?: string;
  /**
   * Chamado ao fechar, no lugar da devolução de foco automática do Radix.
   * Necessário quando este diálogo é aberto a partir de um item de
   * DropdownMenu (denúncia de mensagem/postagem/vaga): testado ao vivo, o
   * fechamento do menu e a abertura deste diálogo competem pelo foco no
   * mesmo instante, e o item de menu já está desmontado quando o diálogo
   * fecha — sem isso, o foco cai para o `<body>` em vez de voltar pro
   * controle que o usuário realmente abriu (ex.: o botão "Mais opções").
   * Quando abordagem for um botão direto (sem menu no meio), pode omitir —
   * o fallback genérico do `DialogContent` já cobre esse caso.
   */
  aoFecharDevolverFoco?: () => void;
}) {
  const nomeParaBloqueio = autorNomeExibicao ?? nomeExibicao;
  const [motivo, setMotivo] = useState<MotivoDenuncia | "">("");
  const [descricao, setDescricao] = useState("");
  // Preenchido só depois de denunciar com sucesso — troca o conteúdo do
  // MESMO diálogo para a oferta de bloqueio, em vez de empilhar um segundo
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
      // Fase 9, Bloco 7: os toasts já são lidos automaticamente por
      // `useAutoSpeech` — falar aqui também duplicava.
      toast.success("Denúncia enviada. Nossa equipe vai analisar.");
      if (autorUsuarioId) {
        setOferecendoBloqueio(true);
      } else {
        fecharTudo();
      }
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, "Não foi possível enviar a denúncia."));
    },
  });

  const bloquear = useMutation({
    mutationFn: () => bloqueioService.bloquear(autorUsuarioId as string),
    onSuccess: () => {
      toast.success(nomeParaBloqueio ? `${nomeParaBloqueio} foi bloqueado(a).` : "Usuário bloqueado.");
      fecharTudo();
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, "Não foi possível bloquear este usuário."));
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
              <DialogTitle>Bloquear{nomeParaBloqueio ? ` ${nomeParaBloqueio}` : " este usuário"}?</DialogTitle>
              <DialogDescription>
                {nomeParaBloqueio ?? "Esta pessoa"} não vai mais conseguir ver seu perfil, seguir você ou enviar
                mensagens — e o mesmo vale para você. Você pode desbloquear depois em Configurações →
                Privacidade.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharTudo} disabled={bloquear.isPending}>
                Não, obrigado
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
                Bloquear
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
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
              <Button type="button" variant="outline" onClick={fecharTudo} disabled={enviar.isPending}>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DenunciarDialog;
