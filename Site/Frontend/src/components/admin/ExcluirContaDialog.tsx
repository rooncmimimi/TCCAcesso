import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { useT } from "@/i18n";

type ExcluirContaDialogProps = {
  /** Conta a excluir; `null` mantém o diálogo fechado. */
  usuario: { nome: string; email: string } | null;
  /** `id` do campo de motivo, único por tela para o `Label` apontar para ele. */
  idMotivo: string;
  motivo: string;
  onMotivoChange: (motivo: string) => void;
  carregando: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
};

/** Confirmação da exclusão definitiva de uma conta, com o motivo que vai para o log de auditoria. */
export function ExcluirContaDialog({
  usuario,
  idMotivo,
  motivo,
  onMotivoChange,
  carregando,
  onFechar,
  onConfirmar,
}: ExcluirContaDialogProps) {
  const t = useT().admin.usuarios.dialogoExclusao;
  const pergunta = t.pergunta(usuario?.nome ?? "", usuario?.email ?? "");

  return (
    <ConfirmarAcaoDialog
      open={Boolean(usuario)}
      onOpenChange={(aberto) => {
        if (!aberto) onFechar();
      }}
      titulo={t.titulo}
      descricao={
        <div className="space-y-3">
          <p>
            {pergunta.antes}
            <strong>{pergunta.nome}</strong>
            {pergunta.depois}
          </p>
          <p className="font-semibold text-destructive">{t.aviso}</p>
          <div>
            <Label htmlFor={idMotivo}>{t.motivo}</Label>
            <Textarea
              id={idMotivo}
              value={motivo}
              onChange={(evento) => onMotivoChange(evento.target.value)}
              className="mt-1 min-h-20 resize-none"
              placeholder={t.motivoPlaceholder}
            />
          </div>
        </div>
      }
      textoConfirmar={t.confirmar}
      destrutivo
      carregando={carregando}
      onConfirmar={onConfirmar}
    />
  );
}
